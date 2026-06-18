import { describe, it, expect } from 'vitest'
import { PositionStack } from './position'

describe('PositionStack', () => {
  it('accumulates frames', () => {
    const p = new PositionStack()
    p.push({ measure: '0' })
    p.push({ voice: 'piano' })
    p.push({ offset: 3 })
    expect(p.current()).toEqual({ measure: '0', voice: 'piano', offset: 3 })
  })

  it('pops back to the previous scope', () => {
    const p = new PositionStack()
    p.push({ measure: '0' })
    p.push({ voice: 'piano' })
    p.pop()
    expect(p.current()).toEqual({ measure: '0' })
  })

  it('does not unbalance with extra pops', () => {
    const p = new PositionStack()
    p.pop()
    p.pop()
    expect(p.current()).toEqual({})
  })

  it('with() restores the previous scope even on throw', () => {
    const p = new PositionStack()
    p.push({ measure: '0' })
    try {
      p.with({ voice: 'piano' }, () => {
        throw new Error('boom')
      })
    } catch {
      // swallow
    }
    expect(p.current()).toEqual({ measure: '0' })
  })

  it('formats a human-readable trail', () => {
    const p = new PositionStack()
    p.push({ file: 'song.spls', measure: '0', voice: 'piano', offset: 3 })
    expect(p.format()).toBe('song.spls.m=0.v=piano.o=3')
  })
})
