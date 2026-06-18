import { DEFAULT_SAMPLE_RATE } from './constants'
import { DEFAULT_ENVELOPE, type EnvelopeSpec } from './envelope'
import type { OscillatorSpec } from './oscillator'
import { renderSympartial, type SympartialSpec } from './sympartial'

/**
 * Top-level instrument → PCM rendering. Reference:
 * `Sompyler/synthesizer/sound_generator.py:SoundGenerator`.
 *
 * The Python `SoundGenerator` composes a list of `Sympartial`s plus
 * variation-driven selection (`Instrument.render_tone()` →
 * `variation.sound_generator_for(note)` → `SoundGenerator.render()`).
 * Phase 3 ships the simple sum-of-partials path. Variation selection
 * lands once we wire in the full instrument compiler.
 */

export interface InstrumentSpec {
  /** Linear amplitude scaling applied after summing partials. */
  amp?: number
  /** Default envelope used by partials that don't specify their own. */
  envelope?: EnvelopeSpec
  /** Default oscillator used by partials that don't specify their own. */
  oscillator?: OscillatorSpec
  /** Harmonic partials. If empty, a single 1× sine partial is implied. */
  partials?: PartialDef[]
}

export interface PartialDef {
  freqMult?: number
  amp?: number
  oscillator?: OscillatorSpec
  envelope?: EnvelopeSpec
}

function resolveSympartials(spec: InstrumentSpec): SympartialSpec[] {
  const defaultOsc: OscillatorSpec = spec.oscillator ?? { waveform: 'sin' }
  const defaultEnv: EnvelopeSpec = spec.envelope ?? DEFAULT_ENVELOPE
  const partials = spec.partials?.length
    ? spec.partials
    : [{ freqMult: 1, amp: 1 } satisfies PartialDef]
  return partials.map((p) => ({
    oscillator: p.oscillator ?? defaultOsc,
    envelope: p.envelope ?? defaultEnv,
    freqMult: p.freqMult ?? 1,
    amp: p.amp ?? 1,
  }))
}

export interface RenderNoteInput {
  instrument: InstrumentSpec
  freqHz: number
  stress: number
  lengthSeconds: number
  sampleRate?: number
}

/**
 * Render one note into a fresh Float32Array of `length * sampleRate`
 * samples. Stress acts as a master amplitude multiplier; per-partial
 * sensitivity to stress lands later when the instrument compiler
 * grows shape-driven curves.
 */
export function renderNote(input: RenderNoteInput): Float32Array {
  const sampleRate = input.sampleRate ?? DEFAULT_SAMPLE_RATE
  const totalSamples = Math.max(1, Math.round(input.lengthSeconds * sampleRate))
  const out = new Float32Array(totalSamples)
  const sympartials = resolveSympartials(input.instrument)
  for (const sp of sympartials) {
    renderSympartial(out, sp, input.freqHz, sampleRate)
  }
  const masterAmp = (input.instrument.amp ?? 1) * input.stress
  if (masterAmp !== 1) {
    for (let i = 0; i < out.length; i++) out[i] = out[i]! * masterAmp
  }
  // Soft clipping to keep partials sums in [-1,1].
  for (let i = 0; i < out.length; i++) {
    const x = out[i]!
    out[i] = x > 1 ? 1 : x < -1 ? -1 : x
  }
  return out
}
