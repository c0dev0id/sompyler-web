import { describe, it, expect } from 'vitest'
import { freeFieldGains } from './room'
import { ScoreError } from '../errors'

describe('freeFieldGains', () => {
  it('centres equal L|R at distance 0', () => {
    const g = freeFieldGains('1|1', 0)
    expect(g.left).toBeCloseTo(1)
    expect(g.right).toBeCloseTo(1)
    expect(g.tailSamples).toBe(0)
  })

  it('hard-pans 1|0 to left', () => {
    const g = freeFieldGains('1|0', 0)
    expect(g.left).toBeCloseTo(1)
    expect(g.right).toBeCloseTo(0)
  })

  it('hard-pans 0|1 to right', () => {
    const g = freeFieldGains('0|1', 0)
    expect(g.left).toBeCloseTo(0)
    expect(g.right).toBeCloseTo(1)
  })

  it('attenuates with distance', () => {
    const g0 = freeFieldGains('1|1', 0)
    const g1 = freeFieldGains('1|1', 1)
    expect(g1.left).toBeLessThan(g0.left)
    expect(g1.left).toBeCloseTo(0.5)
    expect(g1.right).toBeCloseTo(0.5)
  })

  it('normalises non-equal panorama so the louder side is unity', () => {
    const g = freeFieldGains('2|1', 0)
    expect(g.left).toBeCloseTo(1)
    expect(g.right).toBeCloseTo(0.5)
  })

  it('rejects malformed direction', () => {
    expect(() => freeFieldGains('left', 0)).toThrow(ScoreError)
  })

  it('returns zero gains when both channels are zero', () => {
    const g = freeFieldGains('0|0', 0)
    expect(g.left).toBe(0)
    expect(g.right).toBe(0)
  })
})
