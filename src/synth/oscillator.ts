import { TAU } from './constants'

/**
 * Phase 3 oscillator primitives. Reference:
 * `Sompyler/synthesizer/oscillator.py:Oscillator`. The Python port supports
 * waveshaping, AM/FM modulation, frequency variation; we ship the four basic
 * waveforms and leave modulation as a forward door.
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
