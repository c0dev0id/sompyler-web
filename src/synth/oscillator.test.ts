import { describe, it, expect } from 'vitest'
import { renderOscillator, renderOscillatorFM } from './oscillator'

describe('renderOscillator', () => {
  it('produces a sine wave with the expected period', () => {
    // 1 Hz at 1000 Hz sample rate ⇒ 1000-sample period.
    const buf = new Float32Array(1000)
    renderOscillator(buf, { waveform: 'sin' }, 1, 1000)
    expect(buf[0]).toBeCloseTo(0, 5)
    expect(buf[250]).toBeCloseTo(1, 2)
    expect(buf[500]).toBeCloseTo(0, 2)
    expect(buf[750]).toBeCloseTo(-1, 2)
  })

  it('produces a square wave that alternates ±1', () => {
    const buf = new Float32Array(100)
    renderOscillator(buf, { waveform: 'square' }, 1, 100)
    expect(buf[0]).toBe(1)
    expect(buf[49]).toBe(1)
    expect(buf[50]).toBe(-1)
    expect(buf[99]).toBe(-1)
  })

  it('produces a saw ramp from -1 to ~+1', () => {
    const buf = new Float32Array(100)
    renderOscillator(buf, { waveform: 'saw' }, 1, 100)
    expect(buf[0]).toBeCloseTo(-1, 5)
    expect(buf[50]).toBeCloseTo(0, 1)
    expect(buf[99]).toBeCloseTo(0.98, 1)
  })

  it('stays bounded for noise', () => {
    const buf = new Float32Array(100)
    renderOscillator(buf, { waveform: 'noise' }, 1, 100)
    for (const v of buf) {
      expect(v).toBeGreaterThanOrEqual(-1)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('preserves phase across chained calls', () => {
    const buf1 = new Float32Array(500)
    const buf2 = new Float32Array(500)
    const phase = renderOscillator(buf1, { waveform: 'sin' }, 1, 1000)
    renderOscillator(buf2, { waveform: 'sin' }, 1, 1000, phase)
    expect(buf2[0]).toBeCloseTo(0, 2)
    expect(buf2[250]).toBeCloseTo(-1, 2)
  })
})

describe('renderOscillatorFM', () => {
  it('depth=0 produces identical output to plain renderOscillator', () => {
    const plain = new Float32Array(1000)
    const fmBuf = new Float32Array(1000)
    renderOscillator(plain, { waveform: 'sin' }, 440, 44100)
    renderOscillatorFM(fmBuf, { waveform: 'sin' }, 440, { freqHz: 1, depth: 0 }, 44100, null)
    for (let i = 0; i < 1000; i++) {
      expect(fmBuf[i]).toBeCloseTo(plain[i]!, 5)
    }
  })

  it('positive depth modifies the output relative to unmodulated carrier', () => {
    const plain = new Float32Array(1000)
    const fmBuf = new Float32Array(1000)
    renderOscillator(plain, { waveform: 'sin' }, 440, 44100)
    renderOscillatorFM(fmBuf, { waveform: 'sin' }, 440,
      { freqHz: 10, depth: 2, initPhase: 0.25 }, 44100, null)
    let maxDiff = 0
    for (let i = 0; i < 1000; i++) {
      maxDiff = Math.max(maxDiff, Math.abs((plain[i] ?? 0) - (fmBuf[i] ?? 0)))
    }
    expect(maxDiff).toBeGreaterThan(0.01)
  })

  it('depthEnv=constant-1 produces same result as depthEnv=null', () => {
    const withNull = new Float32Array(1000)
    const withOnes = new Float32Array(1000)
    const ones = new Float32Array(1000).fill(1)
    const fm = { freqHz: 5, depth: 1 }
    renderOscillatorFM(withNull, { waveform: 'sin' }, 220, fm, 44100, null)
    renderOscillatorFM(withOnes, { waveform: 'sin' }, 220, fm, 44100, ones)
    for (let i = 0; i < 1000; i++) {
      expect(withOnes[i]).toBeCloseTo(withNull[i]!, 5)
    }
  })

  it('frequency sweep: more zero-crossings at start than end when depthEnv decays', () => {
    // depth=5, initPhase=0.25 (modulator at peak), decaying envelope:
    // early samples run at ~6× carrier freq; late samples run near carrier.
    const SR = 22050
    const N = SR  // 1 second
    const buf = new Float32Array(N)
    const depthEnv = new Float32Array(N)
    for (let i = 0; i < N; i++) depthEnv[i] = 1 - i / N  // linear 1→0
    renderOscillatorFM(buf, { waveform: 'sin' }, 100,
      { freqHz: 0.1, depth: 5, initPhase: 0.25 }, SR, depthEnv)
    const tenth = Math.floor(N / 10)
    let early = 0, late = 0
    for (let i = 1; i < tenth; i++) {
      if ((buf[i - 1]! >= 0) !== (buf[i]! >= 0)) early++
    }
    for (let i = N - tenth + 1; i < N; i++) {
      if ((buf[i - 1]! >= 0) !== (buf[i]! >= 0)) late++
    }
    // At start: ~600 Hz → ~120 crossings; at end: ~100 Hz → ~20 crossings
    expect(early).toBeGreaterThan(late * 2)
  })
})
