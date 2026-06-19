import { TAU } from './constants'

/**
 * Phase 3 oscillator primitives. Reference:
 * `Sompyler/synthesizer/oscillator.py:Oscillator`. The Python port supports
 * waveshaping, AM/FM modulation, frequency variation; we ship the four basic
 * waveforms and FM modulation.
 *
 * Spec: RFC §S32119-waveshape.
 */

export type Waveform = 'sin' | 'square' | 'saw' | 'triangle' | 'noise'

export interface OscillatorSpec {
  waveform: Waveform
  /** Phase offset in turns (0..1). */
  phase?: number
}

/**
 * Frequency-modulation spec. The modulator oscillator varies the carrier's
 * instantaneous frequency each sample.
 *
 * Instantaneous freq = max(1, carrierHz × (1 + depth × depthScale × modVal))
 * where depthScale comes from a pre-evaluated depth envelope (if any).
 */
export interface FMSpec {
  /** Modulator waveform (default: 'sin'). */
  waveform?: Waveform
  /** Modulator frequency in Hz; or ratio of carrier freq when dynamic=true. */
  freqHz: number
  /** When true, freqHz is a ratio of the carrier frequency. */
  dynamic?: boolean
  /**
   * Peak frequency deviation as fraction of the carrier.
   * depth=3 means at peak the carrier plays at 4× its base frequency.
   * Instantaneous frequency is clamped to ≥ 1 Hz.
   */
  depth: number
  /** Modulator start phase in turns (0.25 puts a sin at its positive peak). */
  initPhase?: number
  /**
   * Shape string evaluated once per note to produce per-sample depth
   * multipliers. Pre-evaluated by the caller (Shape → Float32Array); stored
   * here as the raw string for serialisation. Default: constant 1.0.
   */
  depthEnv?: string
}

/**
 * Render `samples` of a continuous wave at frequency `freqHz` into the
 * provided buffer. Returns the phase (in turns) at sample+1 so callers
 * can chain segments without phase discontinuities.
 */
export function renderOscillator(
  out: Float32Array,
  spec: OscillatorSpec,
  freqHz: number,
  sampleRate: number,
  phaseStart = 0,
): number {
  const phaseStep = freqHz / sampleRate
  let phase = phaseStart
  switch (spec.waveform) {
    case 'sin':
      for (let i = 0; i < out.length; i++) {
        out[i] = Math.sin(phase * TAU)
        phase = (phase + phaseStep) % 1
      }
      break
    case 'square':
      for (let i = 0; i < out.length; i++) {
        out[i] = phase < 0.5 ? 1 : -1
        phase = (phase + phaseStep) % 1
      }
      break
    case 'saw':
      for (let i = 0; i < out.length; i++) {
        out[i] = 2 * phase - 1
        phase = (phase + phaseStep) % 1
      }
      break
    case 'triangle':
      for (let i = 0; i < out.length; i++) {
        out[i] = 1 - 4 * Math.abs(Math.round(phase) - phase)
        phase = (phase + phaseStep) % 1
      }
      break
    case 'noise':
      for (let i = 0; i < out.length; i++) {
        out[i] = Math.random() * 2 - 1
      }
      break
  }
  return phase
}

/**
 * FM oscillator: per-sample phase integration with a variable instantaneous
 * frequency driven by a modulator. `depthEnvSamples`, if provided, must
 * have length === out.length; it scales `fm.depth` per sample (pre-evaluated
 * by the caller using the Shape module so oscillator.ts stays dep-free).
 *
 * Returns the carrier phase (in turns) after the last sample, suitable for
 * chaining segments without discontinuities.
 */
export function renderOscillatorFM(
  out: Float32Array,
  carrierSpec: OscillatorSpec,
  carrierFreqHz: number,
  fm: FMSpec,
  sampleRate: number,
  depthEnvSamples: Float32Array | null,
  phaseStart = 0,
): number {
  const modFreqHz = fm.dynamic ? fm.freqHz * carrierFreqHz : fm.freqHz
  const modStep = modFreqHz / sampleRate
  const modWaveform = fm.waveform ?? 'sin'
  let modPhase = fm.initPhase ?? 0
  let phase = phaseStart

  for (let i = 0; i < out.length; i++) {
    let modVal: number
    switch (modWaveform) {
      case 'sin':      modVal = Math.sin(modPhase * TAU); break
      case 'square':   modVal = modPhase < 0.5 ? 1 : -1; break
      case 'saw':      modVal = 2 * modPhase - 1; break
      case 'triangle': modVal = 1 - 4 * Math.abs(Math.round(modPhase) - modPhase); break
      default:         modVal = Math.sin(modPhase * TAU); break
    }

    const depthScale = depthEnvSamples ? (depthEnvSamples[i] ?? 1) : 1
    const instFreq = Math.max(1, carrierFreqHz * (1 + fm.depth * depthScale * modVal))

    switch (carrierSpec.waveform) {
      case 'sin':      out[i] = Math.sin(phase * TAU); break
      case 'square':   out[i] = phase < 0.5 ? 1 : -1; break
      case 'saw':      out[i] = 2 * phase - 1; break
      case 'triangle': out[i] = 1 - 4 * Math.abs(Math.round(phase) - phase); break
      case 'noise':    out[i] = Math.random() * 2 - 1; break
    }

    phase = (phase + instFreq / sampleRate) % 1
    modPhase = (modPhase + modStep) % 1
  }

  return phase
}
