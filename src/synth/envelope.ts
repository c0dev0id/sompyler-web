/**
 * ADSR envelope. Reference: `Sompyler/synthesizer/envelope.py`.
 *
 * Spec: RFC §S32130-envelope.
 */

export interface EnvelopeSpec {
  /** Attack duration in seconds. */
  attack: number
  /** Decay duration in seconds. Ramps from peak (1.0) down to sustainLevel. Defaults to 0. */
  decay?: number
  /** Release duration in seconds (taken from the end of the note). */
  release: number
  /** Sustain level in [0,1]; the level held between decay and release. */
  sustainLevel: number
  /** Tail duration in seconds (RFC §3.2.1.1.4 T: segment). Parsed but not yet applied. */
  tail?: number
  /** Raw RFC A: shape string; when set drives the attack curve via bezier. */
  attackShape?: string
  /** Raw RFC S: shape string; when set drives the decay curve via bezier. */
  decayShape?: string
  /** Raw RFC R: shape string; when set drives the release curve via bezier. */
  releaseShape?: string
}

export const DEFAULT_ENVELOPE: EnvelopeSpec = {
  attack: 0.01,
  decay: 0,
  release: 0.05,
  sustainLevel: 1,
}

/**
 * Multiply the provided buffer by an ADSR envelope curve in place.
 * Caller specifies the total length so segment boundaries are sample-exact.
 *
 * `dampSeconds > 0` extends the release segment by that many seconds — the
 * S51a10 sustain-pedal model. The buffer is assumed to already include the
 * extra samples; the caller (renderNote) sizes the buffer accordingly.
 *
 * With decay=0 and sustainLevel=1 the output is identical to the former ASR.
 */
import { renderShapeString } from './shape'

/**
 * Multiply the provided buffer by an ADSR envelope curve in place.
 * Caller specifies the total length so segment boundaries are sample-exact.
 *
 * `dampSeconds > 0` extends the release segment by that many seconds — the
 * S51a10 sustain-pedal model. The buffer is assumed to already include the
 * extra samples; the caller (renderNote) sizes the buffer accordingly.
 *
 * When A:/S:/R: shape strings are present (RFC §S32130) the bezier curve is
 * evaluated per-sample. Otherwise linear interpolation is used (backwards-
 * compatible for instruments without shape strings).
 *
 * Shape values are in REVERSED_DBFS (0–100). Division by 100 converts them
 * to [0,1] multipliers. Release is additionally scaled by sustainLevel so it
 * tapers from the held sustain level to silence (mirrors Python's y_scale).
 */
export function applyEnvelope(
  buf: Float32Array,
  spec: EnvelopeSpec,
  sampleRate: number,
  dampSeconds = 0,
): void {
  const total = buf.length
  let attackSamples  = Math.round(spec.attack * sampleRate)
  let decaySamples   = Math.round((spec.decay ?? 0) * sampleRate)
  let releaseSamples = Math.round((spec.release + Math.max(0, dampSeconds)) * sampleRate)

  // Clamp so segments fit.
  const fixed = attackSamples + decaySamples + releaseSamples
  if (fixed > total) {
    const ratio = total / fixed
    attackSamples  = Math.floor(attackSamples  * ratio)
    decaySamples   = Math.floor(decaySamples   * ratio)
    releaseSamples = total - attackSamples - decaySamples
  }

  const decayEnd   = attackSamples + decaySamples
  const sustainEnd = total - releaseSamples
  const s = spec.sustainLevel
  // Attack peaks at sustainLevel when there is no decay (continuous, backwards-compatible).
  // When decay > 0, attack peaks at 1.0 and the decay ramp brings it down to sustainLevel.
  const peak = decaySamples > 0 ? 1 : s

  // --- Attack ---
  if (spec.attackShape && attackSamples > 0) {
    const curve = renderShapeString(spec.attackShape, attackSamples)
    for (let i = 0; i < attackSamples; i++) {
      buf[i] = buf[i]! * (curve[i]! / 100)
    }
  } else {
    for (let i = 0; i < attackSamples; i++) {
      buf[i] = buf[i]! * (i / Math.max(1, attackSamples)) * peak
    }
  }

  // --- Decay ---
  if (spec.decayShape && decaySamples > 0) {
    const curve = renderShapeString(spec.decayShape, decaySamples)
    for (let i = attackSamples; i < decayEnd; i++) {
      buf[i] = buf[i]! * (curve[i - attackSamples]! / 100)
    }
  } else {
    for (let i = attackSamples; i < decayEnd; i++) {
      const t = (i - attackSamples) / Math.max(1, decaySamples)
      buf[i] = buf[i]! * (1 - t * (1 - s))
    }
  }

  // --- Sustain ---
  for (let i = decayEnd; i < sustainEnd; i++) {
    buf[i] = buf[i]! * s
  }

  // --- Release ---
  if (spec.releaseShape && releaseSamples > 0) {
    const curve = renderShapeString(spec.releaseShape, releaseSamples)
    for (let i = sustainEnd; i < total; i++) {
      buf[i] = buf[i]! * (curve[i - sustainEnd]! / 100) * s
    }
  } else {
    for (let i = sustainEnd; i < total; i++) {
      const t = (total - 1 - i) / Math.max(1, releaseSamples - 1)
      buf[i] = buf[i]! * t * s
    }
  }
}
