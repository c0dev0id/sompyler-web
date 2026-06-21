import { log } from '../debug'
import { getNote } from '../storage/notes'
import type { ScoreHead } from '../parse/score'
import type { RoomBody, FreeverbBody } from '../parse/room'
import type { DistinctRenderPlan } from './distinct'
import {
  buildRoomPositionIR,
  freeFieldGains,
  freeFieldIR,
  type ChannelGains,
  type PositionIR,
} from './room'
import { applyFreeverb } from '../synth/freeverb'

/**
 * `Render.mixOnly()` — fast path; assumes every distinct note is in the
 * cache. Returns a stereo Float32Array pair (left, right) at a single
 * sample rate.
 *
 * Reference: `Sompyler/orchestra/__init__.py:241–291` (samples loop) and
 * `Sompyler/shapereverb.py:Room.position`.
 *
 * Phase 11 generalises the model: each voice position resolves to a
 * stereo *impulse response*. Free-field is the degenerate δ-IR case
 * (`tailSamples = 0`) — convolution collapses to multiplication, which
 * is the existing additive-sum path. Loaded rooms produce non-trivial
 * IRs whose tail extends the total buffer length.
 */

export interface MixOptions {
  sampleRate?: number
  /**
   * Parsed room body. When undefined, every voice uses the free-field IR.
   * Tap rooms (RoomBody) apply per-voice position IRs; freeverb (FreeverbBody)
   * runs as a post-mix bus effect with per-voice free-field panning.
   */
  room?: RoomBody | FreeverbBody | null
}

export interface MixResult {
  sampleRate: number
  lengthSamples: number
  left: Float32Array
  right: Float32Array
}

export class MissingNoteCacheError extends Error {
  constructor(public readonly keys: string[]) {
    super(`Cache miss for ${keys.length} notes; cannot mix without rendering`)
    this.name = 'MissingNoteCacheError'
  }
}

interface ResolvedVoice {
  ir: PositionIR
  gains: ChannelGains
}

export async function mixOnly(
  plan: DistinctRenderPlan,
  head: ScoreHead,
  opts: MixOptions = {},
): Promise<MixResult> {
  const sampleRate = opts.sampleRate ?? 44100
  const room = opts.room ?? null

  // Freeverb is a post-mix bus effect — voices use free-field panning for dry mix.
  const isFV = room !== null && room !== undefined && 'kind' in room && room.kind === 'freeverb'

  // Pre-compute one IR per voice. Tap rooms vary the IR by position; freeverb
  // and free-field both use the δ-IR (free-field panning, no tail).
  const byVoice = new Map<string, ResolvedVoice>()
  for (const [voice, spec] of Object.entries(head.stage)) {
    let ir: PositionIR
    if (room && !isFV) {
      ir = buildRoomPositionIR(room as RoomBody, spec.channels, spec.volume, sampleRate)
    } else {
      ir = freeFieldIR(spec.channels, spec.volume)
    }
    const gains = freeFieldGains(spec.channels, spec.volume)
    byVoice.set(voice, { ir, gains })
  }

  // Pre-load every note. If any is missing, fail fast — no point doing
  // the additive work just to throw at the end.
  log('mix', 'info', `Loading ${plan.notes.length} cached notes`)
  const cachedNotes = new Map<string, Float32Array>()
  const missingKeys: string[] = []
  for (const note of plan.notes) {
    const cached = await getNote(note.key)
    if (!cached) missingKeys.push(note.key)
    else cachedNotes.set(note.key, cached.pcm)
  }
  if (missingKeys.length > 0) {
    throw new MissingNoteCacheError(missingKeys)
  }

  // Total length includes the longest reverb tail across all voices.
  let maxTail = 0
  for (const v of byVoice.values()) {
    if (v.ir.tailSamples > maxTail) maxTail = v.ir.tailSamples
  }
  const lengthSamples =
    Math.ceil(plan.totalLengthSeconds * sampleRate) + maxTail
  const left = new Float32Array(lengthSamples)
  const right = new Float32Array(lengthSamples)

  const occurrenceCount = plan.notes.reduce((s, n) => s + n.occurrences.length, 0)
  log(
    'mix',
    'info',
    `Convolving ${occurrenceCount} placements across ${byVoice.size} voice IR${byVoice.size === 1 ? '' : 's'}`,
  )
  for (const note of plan.notes) {
    const pcm = cachedNotes.get(note.key)!
    for (const occ of note.occurrences) {
      const v = byVoice.get(occ.voice)
      if (!v) continue
      const start = Math.round(occ.offsetSeconds * sampleRate)

      if (v.ir.tailSamples === 0) {
        // FreeField δ-IR fast path: multiplication, not convolution.
        const gL = v.ir.left[0]!
        const gR = v.ir.right[0]!
        const span = Math.min(pcm.length, lengthSamples - start)
        if (span <= 0) continue
        if (gL !== 0) {
          for (let i = 0; i < span; i++) left[start + i]! += pcm[i]! * gL
        }
        if (gR !== 0) {
          for (let i = 0; i < span; i++) right[start + i]! += pcm[i]! * gR
        }
      } else {
        convolveAccumulate(left, pcm, v.ir.left, start, lengthSamples)
        convolveAccumulate(right, pcm, v.ir.right, start, lengthSamples)
      }
    }
  }

  // Freeverb post-mix bus: add reverb to the accumulated dry stereo output.
  if (isFV) {
    applyFreeverb(left, right, room as FreeverbBody, sampleRate)
  }

  // Clip to [-1, 1] to keep playback safe regardless of overlap density.
  log('mix', 'info', `Scanning peak and clipping to [-1, 1]`)
  let peak = 0
  for (let i = 0; i < lengthSamples; i++) {
    const l = Math.abs(left[i]!)
    if (l > peak) peak = l
    const r = Math.abs(right[i]!)
    if (r > peak) peak = r
  }
  if (peak > 1) {
    const scale = 1 / peak
    for (let i = 0; i < lengthSamples; i++) {
      left[i] = left[i]! * scale
      right[i] = right[i]! * scale
    }
  }

  log('mix', 'info', `mixOnly complete`, {
    distinct: plan.notes.length,
    lengthSamples,
    peak,
    sampleRate,
    reverbTail: maxTail,
  })

  return { sampleRate, lengthSamples, left, right }
}

/**
 * In-place: `out[start + i] += pcm[*] convolved with ir`. Sparse IRs
 * (many zero taps) are fine — the inner conv loop is direct because the
 * IR length is typically small (msec scale).
 */
function convolveAccumulate(
  out: Float32Array,
  pcm: Float32Array,
  ir: Float32Array,
  start: number,
  total: number,
): void {
  const pcmLen = pcm.length
  const irLen = ir.length
  for (let k = 0; k < irLen; k++) {
    const tap = ir[k]!
    if (tap === 0) continue
    const base = start + k
    const end = Math.min(pcmLen, total - base)
    if (end <= 0) continue
    for (let i = 0; i < end; i++) {
      out[base + i]! += pcm[i]! * tap
    }
  }
}
