import { TAU } from './constants'

/**
 * Phase 3 oscillator primitives. Reference:
 * `Sompyler/synthesizer/oscillator.py:Oscillator`.
 *
 * Spec: RFC §S32116 (AM), §S32117 (FM), §S32119 (waveshape).
 */

export type Waveform = 'sin' | 'square' | 'saw' | 'triangle' | 'noise'

export interface OscillatorSpec {
  waveform: Waveform
  /** Phase offset in turns (0..1). */
  phase?: number
}

/**
 * RFC §S32116 / §S32117 modulation spec (shared by AM and FM).
 *
 * Format: `FREQ["f"/"F"][@OSC]["["SHAPE"]"]";"MOD":"BASE["+"PHASE_DEG]`
 *
 * Modulation signal = o × (m × (e×mosc + 1) / 2 + b) / (m + b)
 * where m=modShare, b=baseShare, o=(m+b)/(m/2+b), e=depthEnv sample (0…1),
 * mosc=modulator waveform sample (−1…1). Center (mosc=0, e=1) = 1.0.
 *
 * For FM: instFreq = max(1, carrierHz × modSignal).
 * For AM: sample *= modSignal.
 */
export interface ModulationSpec {
  /** Modulator waveform (default: 'sin'). */
  waveform?: Waveform
  /** Modulator frequency. Absolute Hz when dynamic is unset; ratio when 'f'/'F'. */
  freqHz: number
  /** 'f' = ratio of carrier; 'F' = ratio of carrier × partial ordinal. */
  dynamic?: 'f' | 'F'
  /** RFC MOD value — modulation depth part of the MOD:BASE ratio. */
  modShare: number
  /** RFC BASE value — base (unmodulated floor) part of the MOD:BASE ratio. */
  baseShare: number
  /** Modulator start phase in turns (0.25 = sin at positive peak). */
  initPhase?: number
  /** Optional depth-envelope shape string; pre-evaluated to Float32Array by caller. */
  depthEnv?: string
}

export type FMSpec = ModulationSpec
export type AMSpec = ModulationSpec

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
 * Pitch-modulated oscillator: per-sample phase integration where instantaneous
 * frequency = freqHz × 2^(pitchMod[i] × depthCents / 1200). Used for vibrato.
 * pitchMod must have length === out.length; values are [-1, 1].
 */
export function renderOscillatorPitchMod(
  out: Float32Array,
  spec: OscillatorSpec,
  freqHz: number,
  sampleRate: number,
  pitchMod: Float32Array,
  depthCents: number,
  phaseStart = 0,
): number {
  let phase = phaseStart
  const log2centsFactor = depthCents / 1200
  for (let i = 0; i < out.length; i++) {
    const instFreq = freqHz * Math.pow(2, (pitchMod[i]!) * log2centsFactor)
    switch (spec.waveform) {
      case 'sin':      out[i] = Math.sin(phase * TAU); break
      case 'square':   out[i] = phase < 0.5 ? 1 : -1; break
      case 'saw':      out[i] = 2 * phase - 1; break
      case 'triangle': out[i] = 1 - 4 * Math.abs(Math.round(phase) - phase); break
      case 'noise':    out[i] = Math.random() * 2 - 1; break
    }
    phase = (phase + instFreq / sampleRate) % 1
  }
  return phase
}

/**
 * Compute the RFC Modulation signal: per-sample multiplier array.
 *
 * RFC §S32117 formula (Python Modulation.modulate, overdrive=True):
 *   o = (m + b) / (m/2 + b)              — normalises center to 1.0
 *   signal[i] = o × (m×(e×mosc + 1)/2 + b) / (m + b)
 *
 * For FM: instFreq = max(1, carrierHz × signal[i]).
 * For AM: sample *= signal[i].
 */
function renderModulation(
  spec: ModulationSpec,
  baseFreqHz: number,
  totalSamples: number,
  sampleRate: number,
  depthEnvSamples: Float32Array | null,
  partialOrdinal: number,
): Float32Array {
  const modFreqHz = spec.dynamic === 'F'
    ? spec.freqHz * baseFreqHz * partialOrdinal
    : spec.dynamic === 'f'
    ? spec.freqHz * baseFreqHz
    : spec.freqHz
  const modStep = modFreqHz / sampleRate
  const wf = spec.waveform ?? 'sin'
  let modPhase = spec.initPhase ?? 0
  const m = spec.modShare
  const b = spec.baseShare
  const o = (m + b) / (m / 2 + b)
  const mb = m + b
  const sig = new Float32Array(totalSamples)
  for (let i = 0; i < totalSamples; i++) {
    let mosc: number
    switch (wf) {
      case 'sin':      mosc = Math.sin(modPhase * TAU); break
      case 'square':   mosc = modPhase < 0.5 ? 1 : -1; break
      case 'saw':      mosc = 2 * modPhase - 1; break
      case 'triangle': mosc = 1 - 4 * Math.abs(Math.round(modPhase) - modPhase); break
      default:         mosc = Math.sin(modPhase * TAU); break
    }
    const e = depthEnvSamples ? (depthEnvSamples[i] ?? 1) : 1
    sig[i] = o * (m * (e * mosc + 1) / 2 + b) / mb
    modPhase = (modPhase + modStep) % 1
  }
  return sig
}

/**
 * FM oscillator: per-sample phase integration with frequency driven by the
 * RFC §S32117 modulation signal.
 *
 * Returns the carrier phase (in turns) after the last sample.
 */
export function renderOscillatorFM(
  out: Float32Array,
  carrierSpec: OscillatorSpec,
  carrierFreqHz: number,
  fm: FMSpec,
  sampleRate: number,
  depthEnvSamples: Float32Array | null,
  phaseStart = 0,
  partialOrdinal = 1,
): number {
  const modSig = renderModulation(fm, carrierFreqHz, out.length, sampleRate, depthEnvSamples, partialOrdinal)
  let phase = phaseStart
  for (let i = 0; i < out.length; i++) {
    switch (carrierSpec.waveform) {
      case 'sin':      out[i] = Math.sin(phase * TAU); break
      case 'square':   out[i] = phase < 0.5 ? 1 : -1; break
      case 'saw':      out[i] = 2 * phase - 1; break
      case 'triangle': out[i] = 1 - 4 * Math.abs(Math.round(phase) - phase); break
      case 'noise':    out[i] = Math.random() * 2 - 1; break
    }
    const instFreq = Math.max(1, carrierFreqHz * modSig[i]!)
    phase = (phase + instFreq / sampleRate) % 1
  }
  return phase
}

/**
 * AM: multiply the buffer in-place by the RFC §S32116 modulation signal.
 * Applied after oscillator rendering, before the amplitude envelope.
 */
export function applyAM(
  out: Float32Array,
  spec: AMSpec,
  baseFreqHz: number,
  sampleRate: number,
  depthEnvSamples: Float32Array | null,
  partialOrdinal = 1,
): void {
  const modSig = renderModulation(spec, baseFreqHz, out.length, sampleRate, depthEnvSamples, partialOrdinal)
  for (let i = 0; i < out.length; i++) out[i]! *= modSig[i]!
}
