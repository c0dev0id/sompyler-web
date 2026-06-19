/**
 * Position-dependent Room reverb (R13).
 * Reference: `Sompyler/shapereverb.py:Room.position()` /
 * `Sompyler/shapereverb.py:FreeField`.
 *
 * A Room produces a *per-position* stereo impulse response: convolving a
 * cached note PCM with the IR places the note in the room at that
 * position. FreeField is the degenerate zero-tail case — its IR is a
 * single δ scaled by the panorama gains, and convolution collapses to
 * the additive sum the previous `mixOnly()` already performed.
 *
 * Phase 11 ships a structural port: levels-driven echo train + simple
 * exponential delay grid + border-driven distance attenuation. Sympyler's
 * FFT-EQ, jitter, deldiffs, and diffusion add subtle texture and land
 * incrementally as forward doors.
 */
import { ScoreError } from '../errors'
import { renderDelays, renderLevels, type RoomBody } from '../parse/room'
import { renderShape } from '../synth/shape'

export interface ChannelGains {
  left: number
  right: number
  /** Reverb tail length in samples. Always 0 for FreeField. */
  tailSamples: number
}

export interface PositionIR {
  left: Float32Array
  right: Float32Array
  /** Reverb tail length in samples (length of the longer IR channel). */
  tailSamples: number
}

const DIRECTION_RX = /^(\d+(?:\.\d+)?)\|(\d+(?:\.\d+)?)$/

/**
 * Parse a `'L|R'` direction into raw (left, right) weights. Used by both
 * the Free-Field gain calculator and Room positioning.
 */
function parseDirection(direction: string): { left: number; right: number } {
  const m = DIRECTION_RX.exec(direction)
  if (!m) {
    throw new ScoreError(`Stage direction must be 'L|R', got '${direction}'`)
  }
  return { left: parseFloat(m[1]!), right: parseFloat(m[2]!) }
}

/**
 * Resolve a stage spec to per-channel gains. FreeField fast-path —
 * Sompyler's `FreeField.Position` with `intensity = 1/(1+distance)`.
 */
export function freeFieldGains(direction: string, distance: number): ChannelGains {
  const { left, right } = parseDirection(direction)
  const both = left + right
  if (both === 0) return { left: 0, right: 0, tailSamples: 0 }
  const intensity = 1 / (1 + Math.max(0, distance))
  const max = Math.max(left, right)
  return {
    left: (left / max) * intensity,
    right: (right / max) * intensity,
    tailSamples: 0,
  }
}

/**
 * Build a position-dependent stereo IR from a parsed Room body.
 *
 * @param room    parsed room body (from `parse/room.ts`)
 * @param direction  voice direction string `L|R`
 * @param distance   voice distance (>=0)
 * @param sampleRate audio sample rate
 *
 * Strategy:
 *   - `levels` Shape gives `N` per-echo amplitude weights (rendered along
 *      its own length axis, treated as seconds).
 *   - `delays` Shape gives a monotone per-echo delay curve over the same
 *      axis; we cumulate it to get tap-time positions.
 *   - L/R balance is derived from `direction`; distance attenuates the
 *      *direct* hit while leaving the reverb tail relatively brighter.
 *   - `border` (when present) modulates the tail amplitude — Sompyler
 *      uses it as a distance-falloff curve.
 *
 * Returns a stereo IR where the longer channel determines `tailSamples`.
 */
export function buildRoomPositionIR(
  room: RoomBody,
  direction: string,
  distance: number,
  sampleRate: number,
): PositionIR {
  const { left: rawL, right: rawR } = parseDirection(direction)
  const both = rawL + rawR
  if (both === 0) return emptyIR()

  // Echo count: the levels.length is interpreted as a rendering hint;
  // round to an integer >= 1. Sympyler renders levels at length-driven
  // resolution; for our convolution-by-tap model an echo per integer
  // index is enough.
  const numEchoes = Math.max(1, Math.round(room.levels.length))
  const levels = renderLevels(room, numEchoes)
  const delays = renderDelays(room, numEchoes)

  // Tap times in seconds: cumulative sum of normalized delays, scaled
  // by levels.length (interpreted as the IR span in seconds).
  let maxDelay = 0
  for (const v of delays) if (v > maxDelay) maxDelay = v
  if (maxDelay <= 0) maxDelay = 1

  const taps: { t: number; level: number }[] = []
  let cum = 0
  for (let i = 0; i < numEchoes; i++) {
    const dt = delays[i]! / maxDelay
    cum += dt
    taps.push({ t: cum, level: levels[i]! })
  }
  // Normalise tap times to [0, levels.length]:
  const tMax = taps[taps.length - 1]!.t || 1
  for (const tap of taps) tap.t = (tap.t / tMax) * room.levels.length

  // Determine IR length in samples (the longest tap time).
  const lastT = taps[taps.length - 1]!.t
  const tailSamples = Math.max(1, Math.ceil(lastT * sampleRate))

  // Distance: a 0..1ish scalar that attenuates the direct hit and
  // brightens the tail. Sompyler uses `(intensity - 1) * -1`; we use
  // `clamp(distance, 0, 5) / 5`. Distance 0 = full direct, no tail boost.
  const d = Math.min(5, Math.max(0, distance)) / 5
  const directLevel = 1 - d * 0.7 // never silence the direct hit completely.
  const tailBoost = 1 + d * 0.5

  // L/R balance: positive pan favours right, negative pan favours left.
  // Pan ∈ [-1, 1] from the L|R direction.
  const pan = (rawR - rawL) / (rawL + rawR)
  // Equal-power panning law.
  const angle = ((pan + 1) * Math.PI) / 4
  const gL = Math.cos(angle)
  const gR = Math.sin(angle)

  // Border attenuates the tail uniformly: take the average of its
  // rendered samples (capped to >0) as a single scalar.
  let borderScalar = 1
  if (room.border) {
    const b = renderLevels({ levels: room.border, delays: room.delays, border: null, jitter: null, deldiffs: null }, 16)
    let sum = 0
    let n = 0
    for (const v of b) {
      sum += Math.abs(v)
      n++
    }
    if (n > 0 && sum > 0) borderScalar = sum / n / Math.max(...b.map((v) => Math.abs(v) || 1))
  }

  // S33500 jitter: per-tap amplitude variation rendered separately for L/R.
  let jitterL: Float32Array | null = null
  let jitterR: Float32Array | null = null
  if (room.jitter) {
    jitterL = renderShape(room.jitter.left, taps.length)
    jitterR = renderShape(room.jitter.right, taps.length)
  }

  // S33600 deldiffs: per-tap delay offset (seconds), cycling across taps.
  const deldiffAt = (arr: number[], i: number) => (arr.length > 0 ? (arr[i % arr.length] ?? 0) : 0)
  const deldiffL = room.deldiffs?.left ?? null
  const deldiffR = room.deldiffs?.right ?? null

  // Determine IR length including deldiff shifts.
  let maxExtraSeconds = 0
  if (deldiffL) for (const v of deldiffL) if (v > maxExtraSeconds) maxExtraSeconds = v
  if (deldiffR) for (const v of deldiffR) if (v > maxExtraSeconds) maxExtraSeconds = v
  const extendedTailSamples = tailSamples + Math.ceil(maxExtraSeconds * sampleRate)

  const left = new Float32Array(extendedTailSamples)
  const right = new Float32Array(extendedTailSamples)

  // Normalise level peak to 1, so a "levels: 100:100" peak gives a unit
  // tap. The Python code uses log_to_linear; we treat it as already-
  // linear and divide by peak.
  let peak = 0
  for (const tap of taps) if (tap.level > peak) peak = tap.level
  if (peak === 0) peak = 1

  for (let i = 0; i < taps.length; i++) {
    const tap = taps[i]!
    const normLevel = tap.level / peak
    const isDirect = i === 0
    const baseWeight = isDirect ? directLevel : normLevel * tailBoost * borderScalar

    // Jitter: ±jitter[i] random amplitude deviation (applied to non-direct taps).
    const jAmpL = jitterL && !isDirect ? (jitterL[i] ?? 0) : 0
    const jAmpR = jitterR && !isDirect ? (jitterR[i] ?? 0) : 0
    const weightL = baseWeight + jAmpL * (Math.random() * 2 - 1)
    const weightR = baseWeight + jAmpR * (Math.random() * 2 - 1)

    // Deldiffs: per-channel tap-time offset in seconds, cycling via modulo.
    const ddL = deldiffL ? deldiffAt(deldiffL, i) : 0
    const ddR = deldiffR ? deldiffAt(deldiffR, i) : 0

    const idxL = Math.min(extendedTailSamples - 1, Math.max(0, Math.floor((tap.t + ddL) * sampleRate)))
    const idxR = Math.min(extendedTailSamples - 1, Math.max(0, Math.floor((tap.t + ddR) * sampleRate)))

    left[idxL] = left[idxL]! + weightL * gL
    right[idxR] = right[idxR]! + weightR * gR
  }

  return { left, right, tailSamples: extendedTailSamples }
}

/**
 * Free-field as a degenerate IR: a single δ at index 0 scaled by the
 * panorama gains. Convolving a PCM with this collapses to multiplication
 * — what the previous `mixOnly()` already did.
 */
export function freeFieldIR(direction: string, distance: number): PositionIR {
  const gains = freeFieldGains(direction, distance)
  const left = new Float32Array(1)
  const right = new Float32Array(1)
  left[0] = gains.left
  right[0] = gains.right
  return { left, right, tailSamples: 0 }
}

function emptyIR(): PositionIR {
  return { left: new Float32Array(1), right: new Float32Array(1), tailSamples: 0 }
}
