/**
 * Resonant low-pass filter (biquad, Direct Form I).
 * Coefficients from the RBJ Audio EQ Cookbook (LPF section).
 */

export interface VCFSpec {
  cutoffHz: number
  /** 0–1; mapped to Q via Q = 0.5 + resonance × 9.5 */
  resonance: number
  /** Additional Hz added to cutoffHz at filter-envelope peak. Negative = downward sweep. */
  envAmount?: number
  /** Filter envelope attack in seconds. */
  envAttack?: number
  /** Filter envelope release in seconds (begins at note end). */
  envRelease?: number
}

const BLOCK = 32

/**
 * Apply a resonant LPF in-place to `out`.
 *
 * The filter envelope is independent of the amplitude envelope:
 * - Attack: rises from cutoffHz to cutoffHz + envAmount over envAttack seconds
 * - Sustain: holds at peak for the duration of the note (noteSeconds)
 * - Release: decays back to cutoffHz over envRelease seconds starting at noteSeconds
 *
 * Coefficients are recomputed every BLOCK samples for efficiency; the 32-sample
 * step (0.7 ms at 44100 Hz) is below the threshold of audible stairstepping.
 */
export function applyBiquadLPF(
  out: Float32Array,
  spec: VCFSpec,
  noteSeconds: number,
  dampSeconds: number,
  sampleRate: number,
): void {
  const { cutoffHz, resonance, envAmount = 0, envAttack = 0, envRelease = 0 } = spec
  const Q = 0.5 + resonance * 9.5
  const noteEnd = Math.round(noteSeconds * sampleRate)
  const attackEnd = Math.round(envAttack * sampleRate)
  const releaseEnd = noteEnd + Math.round(envRelease * sampleRate)
  const maxCutoff = sampleRate / 2 - 1

  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0

  for (let i = 0; i < out.length; i++) {
    if (i % BLOCK === 0) {
      let envFrac = 0
      if (envAmount !== 0) {
        if (i < attackEnd) {
          envFrac = attackEnd > 0 ? i / attackEnd : 1
        } else if (i < noteEnd) {
          envFrac = 1
        } else if (i < releaseEnd) {
          const span = releaseEnd - noteEnd
          envFrac = span > 0 ? 1 - (i - noteEnd) / span : 0
        }
      }
      const cutoff = Math.max(20, Math.min(maxCutoff, cutoffHz + envAmount * envFrac))
      const w0 = (Math.PI * 2 * cutoff) / sampleRate
      const cosW0 = Math.cos(w0)
      const alpha = Math.sin(w0) / (2 * Q)
      const a0inv = 1 / (1 + alpha)
      b0 = ((1 - cosW0) / 2) * a0inv
      b1 = (1 - cosW0) * a0inv
      b2 = b0
      a1 = -2 * cosW0 * a0inv
      a2 = (1 - alpha) * a0inv
    }

    const x = out[i]!
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
    x2 = x1; x1 = x
    y2 = y1; y1 = y
    out[i] = y
  }
}
