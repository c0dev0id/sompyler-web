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
  /** S32136 railsback per-key frequency deviation curve. */
  railsback?: RailsbackCurve
}

/**
 * Pre-rendered railsback curve. `curve[i]` is the octave shift applied
 * to a note whose base frequency sits at the i-th of 88 piano-key slots
 * between `lowHz` and `highHz`. Mirrors
 * `Sompyler/synthesizer/sound_generator.py:165-173`.
 */
export interface RailsbackCurve {
  lowHz: number
  highHz: number
  /** 88 octave-fraction offsets; the rendered Shape over the keyboard span. */
  curve: Float32Array
}

/**
 * Apply the railsback shift to a base frequency. Out-of-range pitches
 * pass through unchanged — Sompyler raises here, but in v1 we treat
 * railsback as advisory rather than a hard constraint (single-song
 * workspace; the user is the only listener).
 */
export function applyRailsback(baseFreq: number, rb: RailsbackCurve | undefined): number {
  if (!rb) return baseFreq
  const { lowHz, highHz, curve } = rb
  if (baseFreq < lowHz || baseFreq > highHz) return baseFreq
  const idx = Math.floor(
    (Math.log(baseFreq) / Math.log(lowHz)) /
      (Math.log(highHz) / Math.log(lowHz)) *
      (curve.length - 1),
  )
  const offset = curve[Math.max(0, Math.min(curve.length - 1, idx))] ?? 0
  return baseFreq * Math.pow(2, offset)
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
  /** S51a10 damp: per-note release extension in seconds. */
  dampSeconds?: number
}

/**
 * Render one note into a fresh Float32Array of `length * sampleRate`
 * samples. Stress acts as a master amplitude multiplier; per-partial
 * sensitivity to stress lands later when the instrument compiler
 * grows shape-driven curves.
 */
export function renderNote(input: RenderNoteInput): Float32Array {
  const sampleRate = input.sampleRate ?? DEFAULT_SAMPLE_RATE
  const damp = Math.max(0, input.dampSeconds ?? 0)
  const totalSamples = Math.max(
    1,
    Math.round((input.lengthSeconds + damp) * sampleRate),
  )
  const out = new Float32Array(totalSamples)
  const sympartials = resolveSympartials(input.instrument)
  const baseFreq = applyRailsback(input.freqHz, input.instrument.railsback)
  for (const sp of sympartials) {
    renderSympartial(out, sp, baseFreq, sampleRate, damp)
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
