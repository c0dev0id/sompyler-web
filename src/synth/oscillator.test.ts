import { describe, it, expect } from 'vitest'
import { applyAM, renderOscillator, renderOscillatorFM } from './oscillator'

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

describe('renderOscillatorFM (RFC §S32117)', () => {
  it('modShare=0 produces identical output to plain renderOscillator', () => {
    // modShare=0 → modulation formula collapses to 1.0 for any mosc/e
    const plain = new Float32Array(1000)
    const fmBuf = new Float32Array(1000)
    renderOscillator(plain, { waveform: 'sin' }, 440, 44100)
    renderOscillatorFM(fmBuf, { waveform: 'sin' }, 440,
      { freqHz: 1, modShare: 0, baseShare: 1 }, 44100, null)
    for (let i = 0; i < 1000; i++) {
      expect(fmBuf[i]).toBeCloseTo(plain[i]!, 5)
    }
  })

  it('positive modShare modifies the output relative to unmodulated carrier', () => {
    const plain = new Float32Array(1000)
    const fmBuf = new Float32Array(1000)
    renderOscillator(plain, { waveform: 'sin' }, 440, 44100)
    renderOscillatorFM(fmBuf, { waveform: 'sin' }, 440,
      { freqHz: 10, modShare: 2, baseShare: 1, initPhase: 0.25 }, 44100, null)
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
    const fm = { freqHz: 5, modShare: 1, baseShare: 1 }
    renderOscillatorFM(withNull, { waveform: 'sin' }, 220, fm, 44100, null)
    renderOscillatorFM(withOnes, { waveform: 'sin' }, 220, fm, 44100, ones)
    for (let i = 0; i < 1000; i++) {
      expect(withOnes[i]).toBeCloseTo(withNull[i]!, 5)
    }
  })

  it('frequency sweep: more zero-crossings at start than end when modulator at opposite phases', () => {
    // 0.5 Hz modulator at initPhase=+90° (peak): starts at ~1.9× carrier,
    // reaches near-minimum around t=0.9s → dramatic zero-crossing count difference.
    // RFC formula max ≈ 2× carrier (m>>b), so early/late ratio can exceed 2.
    const SR = 22050
    const N = SR  // 1 second
    const buf = new Float32Array(N)
    renderOscillatorFM(buf, { waveform: 'sin' }, 100,
      { freqHz: 0.5, modShare: 20, baseShare: 1, initPhase: 0.25 }, SR, null)
    const tenth = Math.floor(N / 10)
    let early = 0, late = 0
    for (let i = 1; i < tenth; i++) {
      if ((buf[i - 1]! >= 0) !== (buf[i]! >= 0)) early++
    }
    for (let i = N - tenth + 1; i < N; i++) {
      if ((buf[i - 1]! >= 0) !== (buf[i]! >= 0)) late++
    }
    // Early: ~190 Hz → ~38 crossings; late: ~10 Hz → ~2 crossings
    expect(early).toBeGreaterThan(late * 2)
  })
})

describe('applyAM (RFC §S32116)', () => {
  it('modShare=0 leaves buffer unchanged', () => {
    const buf = new Float32Array(500)
    renderOscillator(buf, { waveform: 'sin' }, 440, 44100)
    const before = buf.slice()
    applyAM(buf, { freqHz: 5, modShare: 0, baseShare: 1 }, 440, 44100, null)
    for (let i = 0; i < buf.length; i++) {
      expect(buf[i]).toBeCloseTo(before[i]!, 5)
    }
  })

  it('positive modShare modulates amplitude', () => {
    const buf = new Float32Array(500)
    buf.fill(1)
    applyAM(buf, { freqHz: 2, modShare: 3, baseShare: 1, initPhase: 0.25 }, 440, 44100, null)
    // At initPhase=0.25 (sin peak), AM factor = o = (3+1)/(3/2+1) = 1.6
    // buf[0] should be ~1.6
    expect(buf[0]).toBeCloseTo(1.6, 2)
  })

  it('depthEnv=0 collapses AM factor to 1 (no modulation)', () => {
    const buf = new Float32Array(500)
    buf.fill(1)
    const zeros = new Float32Array(500)
    applyAM(buf, { freqHz: 5, modShare: 5, baseShare: 1, initPhase: 0.25 }, 440, 44100, zeros)
    // When e=0: modulate = o*(m/2+b)/(m+b) = 1 for any mosc
    for (const v of buf) expect(v).toBeCloseTo(1, 5)
  })
})
