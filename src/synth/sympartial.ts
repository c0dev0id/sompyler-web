import { applyEnvelope, type EnvelopeSpec } from './envelope'
import { renderOscillator, type FMSpec, type OscillatorSpec } from './oscillator'

/**
 * Sympartial = a single harmonic partial of an instrument's voice.
 * Reference: `Sompyler/synthesizer/sympartial.py`.
 *
 * Each partial has its own oscillator, envelope, and relative frequency
 * / amplitude relative to the fundamental. Summing all partials produces
 * the timbre. Phase 3 uses a fixed waveform + envelope per partial; the
 * shape-driven partial-modulation path lands in Phase 5+.
 *
 * Spec: RFC §S33000-sympartial.
 */

export interface SympartialSpec {
  oscillator: OscillatorSpec
  envelope: EnvelopeSpec
  /** Multiplier on the fundamental frequency (1.0 = fundamental). */
  freqMult: number
  /** Linear amplitude weight; clamped to >= 0. */
  amp: number
  /** FM spec; when set, the per-partial path in renderNote uses renderOscillatorFM. */
  fm?: FMSpec
}

export type { FMSpec }

export function renderSympartial(
  out: Float32Array,
  spec: SympartialSpec,
  fundamentalHz: number,
  sampleRate: number,
  /** S51a10 damp: extra release-segment seconds (sustain-pedal). */
  dampSeconds = 0,
): void {
  const buf = new Float32Array(out.length)
  renderOscillator(buf, spec.oscillator, fundamentalHz * spec.freqMult, sampleRate)
  applyEnvelope(buf, spec.envelope, sampleRate, dampSeconds)
  const amp = Math.max(0, spec.amp)
  for (let i = 0; i < out.length; i++) out[i] = out[i]! + buf[i]! * amp
}
