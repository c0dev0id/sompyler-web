import { describe, it, expect } from 'vitest'
import { applyBiquadLPF, type VCFSpec } from './filter'
import { DEFAULT_SAMPLE_RATE } from './constants'
import { TAU } from './constants'

const SR = DEFAULT_SAMPLE_RATE

function makeSine(freqHz: number, samples: number): Float32Array {
  const buf = new Float32Array(samples)
  for (let i = 0; i < samples; i++) buf[i] = Math.sin((TAU * freqHz * i) / SR)
  return buf
}

function rms(buf: Float32Array, from = 0, to?: number): number {
  const end = to ?? buf.length
  let sum = 0
  for (let i = from; i < end; i++) sum += buf[i]! ** 2
  return Math.sqrt(sum / (end - from))
}

describe('applyBiquadLPF', () => {
  it('attenuates frequencies well above cutoff', () => {
    const spec: VCFSpec = { cutoffHz: 500, resonance: 0 }
    // 5 kHz is 10× above the cutoff — 2nd-order LPF attenuates at −40 dB/decade
    const buf = makeSine(5000, SR)
    const original = rms(buf)
    applyBiquadLPF(buf, spec, 1, 0, SR)
    // Allow a generous 50-sample settling transient before measuring
    const filtered = rms(buf, 50)
    expect(filtered / original).toBeLessThan(0.1)
  })

  it('passes frequencies well below cutoff with minimal attenuation', () => {
    const spec: VCFSpec = { cutoffHz: 5000, resonance: 0 }
    const buf = makeSine(200, SR)
    const original = rms(buf)
    applyBiquadLPF(buf, spec, 1, 0, SR)
    const filtered = rms(buf, 50)
    expect(filtered / original).toBeGreaterThan(0.9)
  })

  it('produces finite output at resonance: 0', () => {
    const spec: VCFSpec = { cutoffHz: 1000, resonance: 0 }
    const buf = makeSine(440, 4096)
    applyBiquadLPF(buf, spec, 4096 / SR, 0, SR)
    for (const v of buf) expect(Number.isFinite(v)).toBe(true)
  })

  it('produces finite output at resonance: 0.9', () => {
    const spec: VCFSpec = { cutoffHz: 1000, resonance: 0.9 }
    const buf = makeSine(440, 4096)
    applyBiquadLPF(buf, spec, 4096 / SR, 0, SR)
    for (const v of buf) expect(Number.isFinite(v)).toBe(true)
  })

  it('filter envelope opens cutoff: first block is attenuated, post-attack is not', () => {
    // cutoff starts at 200 Hz, env opens to 10200 Hz over 0.5 s.
    // 2 kHz signal: well above cutoff at t=0, well inside passband at t=0.6 s.
    // Compare just the first 32-sample block (one coefficient update) vs. the
    // last 32-sample block, avoiding the ringing transient during the sweep.
    const spec: VCFSpec = { cutoffHz: 200, resonance: 0, envAmount: 10000, envAttack: 0.5 }
    const totalSamples = SR  // 1 second
    const buf = makeSine(2000, totalSamples)
    applyBiquadLPF(buf, spec, 1, 0, SR)
    const firstBlockRMS = rms(buf, 1, 32)           // cutoff ~200 Hz, 2 kHz heavily attenuated
    const lastBlockRMS  = rms(buf, totalSamples - 32) // cutoff ~10200 Hz, 2 kHz fully passes
    expect(lastBlockRMS).toBeGreaterThan(firstBlockRMS * 5)
  })
})
