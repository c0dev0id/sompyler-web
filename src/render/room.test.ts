import { describe, it, expect } from 'vitest'
import { buildRoomPositionIR, freeFieldGains, freeFieldIR } from './room'
import { parseRoom } from '../parse/room'
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

describe('freeFieldIR', () => {
  it('produces a single δ tap with no tail', () => {
    const ir = freeFieldIR('1|1', 0)
    expect(ir.left.length).toBe(1)
    expect(ir.right.length).toBe(1)
    expect(ir.tailSamples).toBe(0)
  })

  it('mirrors freeFieldGains for the single-tap amplitude', () => {
    const ir = freeFieldIR('1|0', 0)
    const g = freeFieldGains('1|0', 0)
    expect(ir.left[0]).toBeCloseTo(g.left)
    expect(ir.right[0]).toBeCloseTo(g.right)
  })
})

describe('buildRoomPositionIR (R13)', () => {
  const ROOM_YAML = `
levels: 100:100;1,80;2,60;4,40;8,15;15,0
delays: 1:0;1,1
border: 5:5;1,1;2,1;6,1
`
  const room = parseRoom(ROOM_YAML)!

  it('produces a non-trivial reverb tail', () => {
    const ir = buildRoomPositionIR(room, '1|1', 0, 44100)
    expect(ir.tailSamples).toBeGreaterThan(0)
    expect(ir.left.length).toBe(ir.tailSamples)
    expect(ir.right.length).toBe(ir.tailSamples)
  })

  it('produces different IRs for different positions', () => {
    const a = buildRoomPositionIR(room, '1|0', 0, 44100)
    const b = buildRoomPositionIR(room, '0|1', 0, 44100)
    // Hard-left and hard-right positions should produce noticeably
    // different per-channel energy.
    const energy = (b: Float32Array) => b.reduce((s, v) => s + v * v, 0)
    expect(energy(a.left)).toBeGreaterThan(energy(a.right))
    expect(energy(b.right)).toBeGreaterThan(energy(b.left))
  })

  it('decays after the direct hit', () => {
    const ir = buildRoomPositionIR(room, '1|1', 0, 44100)
    // The IR should contain non-zero samples beyond index 0.
    let nonzeroLater = 0
    for (let i = 1; i < ir.left.length; i++) {
      if (Math.abs(ir.left[i]!) > 0) nonzeroLater++
    }
    expect(nonzeroLater).toBeGreaterThan(0)
  })
})
