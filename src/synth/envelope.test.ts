import { describe, it, expect } from 'vitest'
import { applyEnvelope } from './envelope'

describe('applyEnvelope', () => {
  it('ramps up over the attack window', () => {
    const buf = new Float32Array(1000).fill(1)
    applyEnvelope(buf, { attack: 0.1, release: 0, sustainLevel: 1 }, 1000)
    expect(buf[0]).toBeCloseTo(0, 5)
    expect(buf[99]).toBeCloseTo(0.99, 1)
    expect(buf[500]).toBeCloseTo(1, 5)
  })

  it('holds the sustain level in the middle', () => {
    const buf = new Float32Array(1000).fill(1)
    applyEnvelope(buf, { attack: 0.1, release: 0.1, sustainLevel: 0.5 }, 1000)
    expect(buf[500]).toBeCloseTo(0.5, 5)
  })

  it('ramps down over the release window', () => {
    const buf = new Float32Array(1000).fill(1)
    applyEnvelope(buf, { attack: 0, release: 0.1, sustainLevel: 1 }, 1000)
    expect(buf[999]).toBeCloseTo(0, 5)
    expect(buf[950]).toBeGreaterThan(0)
    expect(buf[950]).toBeLessThan(1)
  })

  it('clamps when attack+release exceed total length', () => {
    const buf = new Float32Array(100).fill(1)
    applyEnvelope(buf, { attack: 1, release: 1, sustainLevel: 1 }, 100)
    expect(buf[0]).toBeCloseTo(0, 5)
    expect(buf[99]).toBeCloseTo(0, 5)
  })
})
