import { describe, it, expect } from 'vitest'
import { expandChainString } from './chain'

describe('expandChainString (S53000)', () => {
  it('"A4 B4 C4" yields three sequential notes', () => {
    const notes = expandChainString('A4 B4 C4')
    expect(notes).toHaveLength(3)
    expect(notes[0]).toMatchObject({ pitch: 'A4', offsetTicks: 0, lengthTicks: 1 })
    expect(notes[1]).toMatchObject({ pitch: 'B4', offsetTicks: 1, lengthTicks: 1 })
    expect(notes[2]).toMatchObject({ pitch: 'C4', offsetTicks: 2, lengthTicks: 1 })
  })

  it('"A4; B4" yields two parallel notes both at tick 0', () => {
    const notes = expandChainString('A4; B4')
    expect(notes).toHaveLength(2)
    expect(notes.find((n) => n.pitch === 'A4')?.offsetTicks).toBe(0)
    expect(notes.find((n) => n.pitch === 'B4')?.offsetTicks).toBe(0)
  })

  it('"A4_ B4" — A4 lasts 2 ticks, B4 starts at tick 2', () => {
    const notes = expandChainString('A4_ B4')
    expect(notes[0]).toMatchObject({ pitch: 'A4', offsetTicks: 0, lengthTicks: 2 })
    expect(notes[1]).toMatchObject({ pitch: 'B4', offsetTicks: 2, lengthTicks: 1 })
  })

  it('"A4 *3" yields A4 three times at consecutive ticks', () => {
    const notes = expandChainString('A4 *3')
    expect(notes).toHaveLength(3)
    expect(notes[0]).toMatchObject({ pitch: 'A4', offsetTicks: 0 })
    expect(notes[1]).toMatchObject({ pitch: 'A4', offsetTicks: 1 })
    expect(notes[2]).toMatchObject({ pitch: 'A4', offsetTicks: 2 })
  })

  it('"A4__" yields a 3-tick note (two extra underscores)', () => {
    const notes = expandChainString('A4__')
    expect(notes[0]).toMatchObject({ pitch: 'A4', lengthTicks: 3 })
  })

  it('"A4_3" yields a 4-tick note (3 extra ticks)', () => {
    const notes = expandChainString('A4_3')
    expect(notes[0]).toMatchObject({ pitch: 'A4', lengthTicks: 4 })
  })

  it('passes ? and ! off-scale flags through', () => {
    const notes = expandChainString('A4? B4!')
    expect(notes[0]).toMatchObject({ pitch: 'A4', offScale: '?' })
    expect(notes[1]).toMatchObject({ pitch: 'B4', offScale: '!' })
  })

  it('parallel subchains advance independently', () => {
    // Two parallel subchains: first has A4(1)+B4(1), second has C4(2)
    const notes = expandChainString('A4 B4; C4__')
    const a4 = notes.filter((n) => n.pitch === 'A4')
    const b4 = notes.filter((n) => n.pitch === 'B4')
    const c4 = notes.filter((n) => n.pitch === 'C4')
    expect(a4[0]?.offsetTicks).toBe(0)
    expect(b4[0]?.offsetTicks).toBe(1)
    expect(c4[0]?.offsetTicks).toBe(0)
    expect(c4[0]?.lengthTicks).toBe(3)
  })
})
