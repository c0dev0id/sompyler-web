import { describe, it, expect } from 'vitest'
import { renderOscillator } from './oscillator'

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
