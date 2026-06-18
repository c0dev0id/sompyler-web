import { describe, it, expect } from 'vitest'
import { parseRoom, RoomError } from './room'

describe('parseRoom', () => {
  it('returns null for an empty / free-field room', () => {
    expect(parseRoom('')).toBeNull()
    expect(parseRoom('# just a comment\n')).toBeNull()
  })

  it('returns null for a room without a levels shape', () => {
    expect(parseRoom('delays: 1:0;1,1')).toBeNull()
  })

  it('parses a small-hall fixture into shapes', () => {
    const body = `
levels: 100:100;1,50;2,75;4,60;5,30;15,0
delays: 1.05:109;1,390;4,15;9,12;10,7;11,5;15,3
border: 35:5+1;0,0;1,1;2,1;6,1
`
    const room = parseRoom(body)
    expect(room).not.toBeNull()
    expect(room!.levels.length).toBe(100)
    expect(room!.delays.length).toBeCloseTo(1.05, 3)
    expect(room!.border!.length).toBe(35)
  })

  it('defaults delays to a unit ramp when omitted', () => {
    const room = parseRoom('levels: 4:1;1,0.5;2,0.25;3,0')
    expect(room!.delays.length).toBe(1)
    expect(room!.border).toBeNull()
  })

  it('throws RoomError on malformed YAML', () => {
    expect(() => parseRoom('levels: [unclosed')).toThrow(RoomError)
  })
})
