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

  it('shaped attack follows bezier curve from shape string', () => {
    // A: "0.1:1,100" — linear ramp from 1 to 100 REVERSED_DBFS over 100 ms
    const buf = flat(SR)
    applyEnvelope(buf, {
      attack: 0.1, decay: 0.2, sustainLevel: 0.4, release: 0,
      attackShape: '0.1:1,100',
    }, SR)
    // Start of attack: ~1/100 = 0.01
    expect(buf[0]).toBeCloseTo(0.01, 1)
    // End of attack: 100/100 = 1.0
    expect(buf[99]).toBeCloseTo(1, 1)
  })

  it('shaped decay follows bezier curve from shape string', () => {
    // S: ".2:100;1,0" — from 100 down to 0 over 200 ms
    const buf = flat(SR)
    applyEnvelope(buf, {
      attack: 0, decay: 0.2, sustainLevel: 0, release: 0,
      decayShape: '.2:100;1,0',
    }, SR)
    // Start of decay: 100/100 = 1.0
    expect(buf[0]).toBeCloseTo(1, 1)
    // End of decay: 0/100 = 0
    expect(buf[199]).toBeCloseTo(0, 1)
    // Sustain holds at 0
    expect(buf[500]).toBeCloseTo(0, 5)
  })

  it('shaped release scales by sustainLevel', () => {
    // R: "0.2:100;1,0" — shape from 100→0, scaled by sustainLevel=0.6
    const buf = flat(SR)
    applyEnvelope(buf, {
      attack: 0, decay: 0, sustainLevel: 0.6, release: 0.2,
      releaseShape: '0.2:100;1,0',
    }, SR)
    // Sustain holds at 0.6 up to sample 799
    expect(buf[500]).toBeCloseTo(0.6, 5)
    // Start of release (sample 800): 100/100 * 0.6 = 0.6
    expect(buf[800]).toBeCloseTo(0.6, 1)
    // End of release (sample 999): 0/100 * 0.6 = 0
    expect(buf[999]).toBeCloseTo(0, 1)
  })

  it('multi-segment shaped decay reaches intermediate waypoints', () => {
    // S: ".2:100;1,60;2,0" — three control points: 100→60→0
    // The bezier curve passes through these points (approximately for bezier,
    // exactly for linear segments). Midpoint should be well below 100 and above 0.
    const buf = flat(SR)
    applyEnvelope(buf, {
      attack: 0, decay: 0.2, sustainLevel: 0, release: 0,
      decayShape: '.2:100;1,60;2,0',
    }, SR)
    // At decay midpoint (~sample 100), value should be around 60 / 100 = 0.6
    expect(buf[100]).toBeGreaterThan(0.3)
    expect(buf[100]).toBeLessThan(0.9)
    // End of decay: 0
    expect(buf[199]).toBeCloseTo(0, 1)
  })
})
