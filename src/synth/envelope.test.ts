import { describe, it, expect } from 'vitest'
import { applyEnvelope } from './envelope'

const SR = 1000

function flat(n: number) { return new Float32Array(n).fill(1) }

describe('applyEnvelope', () => {
  it('ramps up over the attack window', () => {
    const buf = flat(SR)
    applyEnvelope(buf, { attack: 0.1, decay: 0, release: 0, sustainLevel: 1 }, SR)
    expect(buf[0]).toBeCloseTo(0, 5)
    expect(buf[99]).toBeCloseTo(0.99, 1)
    expect(buf[500]).toBeCloseTo(1, 5)
  })

  it('holds the sustain level in the middle', () => {
    const buf = flat(SR)
    applyEnvelope(buf, { attack: 0.1, decay: 0, release: 0.1, sustainLevel: 0.5 }, SR)
    expect(buf[500]).toBeCloseTo(0.5, 5)
  })

  it('ramps down over the release window', () => {
    const buf = flat(SR)
    applyEnvelope(buf, { attack: 0, decay: 0, release: 0.1, sustainLevel: 1 }, SR)
    expect(buf[999]).toBeCloseTo(0, 5)
    expect(buf[950]).toBeGreaterThan(0)
    expect(buf[950]).toBeLessThan(1)
  })

  it('clamps when all segments exceed total length', () => {
    const buf = flat(100)
    applyEnvelope(buf, { attack: 1, decay: 0, release: 1, sustainLevel: 1 }, 100)
    expect(buf[0]).toBeCloseTo(0, 5)
    expect(buf[99]).toBeCloseTo(0, 5)
  })

  it('peaks at 1.0 at end of attack, then decays to sustainLevel', () => {
    // 100 ms attack, 200 ms decay, sustainLevel=0.4 — 1000-sample buffer
    const buf = flat(SR)
    applyEnvelope(buf, { attack: 0.1, decay: 0.2, release: 0, sustainLevel: 0.4 }, SR)
    // Peak at end of attack (sample 99)
    expect(buf[99]).toBeCloseTo(1, 1)
    // Midpoint of decay (sample 199) ≈ 0.7  (linear: 1 - 0.5*(1-0.4))
    expect(buf[199]).toBeCloseTo(0.7, 1)
    // After decay, holds at sustainLevel
    expect(buf[400]).toBeCloseTo(0.4, 5)
  })

  it('decay=0 attack ramps to sustainLevel (no discontinuity)', () => {
    // With no decay, attack should ramp to sustainLevel, not 1.0,
    // so there is no amplitude step at the attack boundary.
    const buf = flat(SR)
    applyEnvelope(buf, { attack: 0.1, decay: 0, release: 0, sustainLevel: 0.6 }, SR)
    // End of attack (sample 99) should be at or very near sustainLevel
    expect(buf[99]).toBeCloseTo(0.6, 1)
    // Sustain region holds at sustainLevel — no jump
    expect(buf[100]).toBeCloseTo(0.6, 5)
    expect(buf[500]).toBeCloseTo(0.6, 5)
  })
})
