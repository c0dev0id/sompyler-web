import { renderOscillator, type OscillatorSpec, type Waveform } from './oscillator'

/**
 * Low-frequency oscillator. Generates a slow modulation signal that can
 * be routed to the VCF cutoff ('vcf') or to the output amplitude ('amp').
 *
 * depth unit depends on target:
 *   vcf  — Hz added/subtracted from cutoff_hz at LFO peak
 *   amp  — 0..1 amplitude swing (depth=0.3 → ±30% amplitude variation)
 */
export interface LFOSpec {
  rateHz: number
  depth: number
  target: 'vcf' | 'amp'
  waveform?: Waveform
  /** Initial phase in turns (0..1). */
  phase?: number
  /** Seconds over which the LFO fades in from zero. Classic synth behaviour. */
  delaySeconds?: number
}

/**
 * Render one LFO cycle into a fresh Float32Array of `totalSamples`.
 * Output is a raw [-1, 1] signal; the caller multiplies by `spec.depth`
 * when accumulating multiple LFOs per target.
 */
export function renderLFO(
  spec: LFOSpec,
  totalSamples: number,
  sampleRate: number,
): Float32Array {
  const buf = new Float32Array(totalSamples)
  const oscSpec: OscillatorSpec = { waveform: spec.waveform ?? 'sin' }
  renderOscillator(buf, oscSpec, spec.rateHz, sampleRate, spec.phase ?? 0)
  const delaySamples = spec.delaySeconds ? Math.round(spec.delaySeconds * sampleRate) : 0
  if (delaySamples > 0) {
    for (let i = 0; i < Math.min(delaySamples, totalSamples); i++) {
      buf[i] = buf[i]! * (i / delaySamples)
    }
  }
  return buf
}
