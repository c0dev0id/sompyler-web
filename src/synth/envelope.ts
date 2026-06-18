/**
 * ASR envelope. Reference: `Sompyler/synthesizer/envelope.py`.
 *
 * The Python version supports shape-driven attack/sustain/release curves
 * via the bezier kernel. Phase 3 uses linear interpolation as the simplest
 * viable curve; the bezier port lands when we have audible reference output
 * to A/B against.
 *
 * Spec: RFC §S32130-envelope.
 */

export interface EnvelopeSpec {
  /** Attack duration in seconds. */
  attack: number
  /** Release duration in seconds (taken from the end of the note). */
  release: number
  /** Sustain level in [0,1]; the level held between attack and release. */
  sustainLevel: number
}

export const DEFAULT_ENVELOPE: EnvelopeSpec = {
  attack: 0.01,
  release: 0.05,
  sustainLevel: 1,
}

/**
 * Multiply the provided buffer by an A.S.R envelope curve in place.
 * Caller specifies the total length so segment boundaries are sample-exact.
 *
 * `dampSeconds > 0` extends the release segment by that many seconds — the
 * S51a10 sustain-pedal model. The buffer is assumed to already include the
 * extra samples; the caller (renderNote) sizes the buffer accordingly.
 */
export function applyEnvelope(
  buf: Float32Array,
  spec: EnvelopeSpec,
  sampleRate: number,
  dampSeconds = 0,
): void {
  const total = buf.length
  let attackSamples = Math.round(spec.attack * sampleRate)
  let releaseSamples = Math.round((spec.release + Math.max(0, dampSeconds)) * sampleRate)
  if (attackSamples + releaseSamples > total) {
    const ratio = total / (attackSamples + releaseSamples)
    attackSamples = Math.floor(attackSamples * ratio)
    releaseSamples = total - attackSamples
  }
  const sustainEnd = total - releaseSamples
  const s = spec.sustainLevel

  for (let i = 0; i < attackSamples; i++) {
    buf[i] = buf[i]! * (i / Math.max(1, attackSamples)) * s
  }
  for (let i = attackSamples; i < sustainEnd; i++) {
    buf[i] = buf[i]! * s
  }
  for (let i = sustainEnd; i < total; i++) {
    const t = (total - 1 - i) / Math.max(1, releaseSamples - 1)
    buf[i] = buf[i]! * t * s
  }
}
