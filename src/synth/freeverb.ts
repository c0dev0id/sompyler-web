/**
 * Freeverb — public-domain algorithmic reverb by Jezar at Dreampoint.
 *
 * Architecture: 8 parallel feedback comb filters (each with a one-pole LPF
 * in the feedback path) → 4 series all-pass diffusers. L/R channels use
 * slightly different delay lengths (+23 samples on right) for stereo width.
 *
 * Reference tuning constants are for 44100 Hz and are scaled linearly for
 * other sample rates.
 */

export interface FreeverbBody {
  kind: 'freeverb'
  /** Reverb time (0–1). Higher → longer decay. */
  roomSize: number
  /** High-frequency damping (0–1). Higher → warmer/darker tail. */
  damping: number
  /** Wet mix added to dry signal (0–1). */
  wet: number
  /** Stereo width (0–1). Default 1 = full stereo. */
  width: number
  /** Pre-delay before reverb input in milliseconds. Default 0. */
  preDelayMs: number
}

// ── Tuning (44100 Hz baseline) ────────────────────────────────────────────────

const COMB_TUNINGS    = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617] as const
const AP_TUNINGS      = [556, 441, 341, 225] as const
const STEREO_SPREAD   = 23
const FIXED_GAIN      = 0.015
const SCALE_DAMPING   = 0.4
const SCALE_ROOM      = 0.28
const OFFSET_ROOM     = 0.7
const AP_FEEDBACK     = 0.5

// ── Filters ───────────────────────────────────────────────────────────────────

class CombFilter {
  private buf: Float32Array
  private pos = 0
  private store = 0
  feedback = 0
  damp1 = 0   // LPF coefficient (previous)
  damp2 = 1   // LPF coefficient (current)

  constructor(size: number) { this.buf = new Float32Array(size) }

  process(input: number): number {
    const out = this.buf[this.pos]!
    this.store = out * this.damp2 + this.store * this.damp1
    this.buf[this.pos] = input + this.store * this.feedback
    if (++this.pos >= this.buf.length) this.pos = 0
    return out
  }
}

class AllPassFilter {
  private buf: Float32Array
  private pos = 0

  constructor(size: number) { this.buf = new Float32Array(size) }

  process(input: number): number {
    const bufout = this.buf[this.pos]!
    const out = -input + bufout
    this.buf[this.pos] = input + bufout * AP_FEEDBACK
    if (++this.pos >= this.buf.length) this.pos = 0
    return out
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Apply Freeverb reverb in-place to a stereo pair.
 * The wet reverb is ADDED to the existing dry content of `left`/`right`.
 */
export function applyFreeverb(
  left: Float32Array,
  right: Float32Array,
  spec: FreeverbBody,
  sampleRate: number,
): void {
  const scale = sampleRate / 44100

  const combsL = COMB_TUNINGS.map((t) => new CombFilter(Math.round(t * scale)))
  const combsR = COMB_TUNINGS.map((t) => new CombFilter(Math.round((t + STEREO_SPREAD) * scale)))
  const apsL   = AP_TUNINGS.map((t) => new AllPassFilter(Math.round(t * scale)))
  const apsR   = AP_TUNINGS.map((t) => new AllPassFilter(Math.round((t + STEREO_SPREAD) * scale)))

  const feedback = spec.roomSize * SCALE_ROOM + OFFSET_ROOM
  const damp1    = spec.damping * SCALE_DAMPING
  const damp2    = 1 - damp1

  for (const c of [...combsL, ...combsR]) {
    c.feedback = feedback
    c.damp1    = damp1
    c.damp2    = damp2
  }

  const width = spec.width ?? 1
  const wet1  = spec.wet * (width / 2 + 0.5)
  const wet2  = spec.wet * ((1 - width) / 2)

  const preDelaySamples = Math.max(0, Math.round(spec.preDelayMs * sampleRate / 1000))
  const preBuf = new Float32Array(Math.max(1, preDelaySamples))
  let prePos = 0

  const N = left.length
  for (let i = 0; i < N; i++) {
    const monoIn = (left[i]! + right[i]!) * FIXED_GAIN

    let reverbIn: number
    if (preDelaySamples > 0) {
      reverbIn       = preBuf[prePos]!
      preBuf[prePos] = monoIn
      prePos         = (prePos + 1) % preDelaySamples
    } else {
      reverbIn = monoIn
    }

    // 8 comb filters in parallel
    let outL = 0, outR = 0
    for (let c = 0; c < 8; c++) {
      outL += combsL[c]!.process(reverbIn)
      outR += combsR[c]!.process(reverbIn)
    }

    // 4 all-pass filters in series
    for (let a = 0; a < 4; a++) {
      outL = apsL[a]!.process(outL)
      outR = apsR[a]!.process(outR)
    }

    // Add wet reverb to existing dry output (stereo matrix for width)
    left[i]!  += outL * wet1 + outR * wet2
    right[i]! += outR * wet1 + outL * wet2
  }
}
