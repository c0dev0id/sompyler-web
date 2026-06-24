import { describe, it, expect } from 'vitest'
import { expandChainString } from './chain'

describe('expandChainString (S53000)', () => {
  // ── Baseline behaviour (unchanged from Phase 24) ──────────────────────────

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
    const notes = expandChainString('A4 B4; C4__')
    expect(notes.find((n) => n.pitch === 'A4')?.offsetTicks).toBe(0)
    expect(notes.find((n) => n.pitch === 'B4')?.offsetTicks).toBe(1)
    expect(notes.find((n) => n.pitch === 'C4')?.offsetTicks).toBe(0)
    expect(notes.find((n) => n.pitch === 'C4')?.lengthTicks).toBe(3)
  })

  // ── Pitch-shift operators (Option A) ──────────────────────────────────────

  it('"C4 + +" yields chromatic ascent: C4, C#4, D4', () => {
    const notes = expandChainString('C4 + +')
    expect(notes).toHaveLength(3)
    expect(notes[0]).toMatchObject({ pitch: 'C4', offsetTicks: 0 })
    expect(notes[1]).toMatchObject({ pitch: 'C#4', offsetTicks: 1 })
    expect(notes[2]).toMatchObject({ pitch: 'D4', offsetTicks: 2 })
  })

  it('"E4 -2" shifts down 2 semitones: E4, D4', () => {
    const notes = expandChainString('E4 -2')
    expect(notes).toHaveLength(2)
    expect(notes[0]).toMatchObject({ pitch: 'E4', offsetTicks: 0 })
    expect(notes[1]).toMatchObject({ pitch: 'D4', offsetTicks: 1 })
  })

  it('"C4 +4 =" shifts up then resets to base', () => {
    const notes = expandChainString('C4 +4 =')
    expect(notes).toHaveLength(3)
    expect(notes[0]).toMatchObject({ pitch: 'C4' })
    expect(notes[1]).toMatchObject({ pitch: 'E4' })  // C4 + 4 semitones
    expect(notes[2]).toMatchObject({ pitch: 'C4' })  // reset to base
  })

  it('shift wraps across octave boundaries', () => {
    const notes = expandChainString('B4 +')
    expect(notes[1]).toMatchObject({ pitch: 'C5' })
  })

  it('negative shift wraps downward across octave boundaries', () => {
    const notes = expandChainString('C4 -')
    expect(notes[1]).toMatchObject({ pitch: 'B3' })
  })

  it('shift token honours length suffix', () => {
    // "+4__" = shift up 4 semitones (C4→E4) with 3 ticks length
    const notes = expandChainString('C4 +4__')
    expect(notes[1]).toMatchObject({ pitch: 'E4', lengthTicks: 3 })
  })

  it('new absolute pitch resets base and shift', () => {
    const notes = expandChainString('C4 + + G4 -')
    // C4, C#4(shift=1), D4(shift=2), G4(new base, shift=0), F#4(shift=-1)
    expect(notes[0]).toMatchObject({ pitch: 'C4' })
    expect(notes[1]).toMatchObject({ pitch: 'C#4' })
    expect(notes[2]).toMatchObject({ pitch: 'D4' })
    expect(notes[3]).toMatchObject({ pitch: 'G4' })
    expect(notes[4]).toMatchObject({ pitch: 'F#4' })
  })

  // ── Rest / pause (Option A) ────────────────────────────────────────────────

  it('"A4 . B4" inserts a 1-tick rest between the notes', () => {
    const notes = expandChainString('A4 . B4')
    expect(notes).toHaveLength(2)
    expect(notes[0]).toMatchObject({ pitch: 'A4', offsetTicks: 0 })
    expect(notes[1]).toMatchObject({ pitch: 'B4', offsetTicks: 2 })
  })

  it('"A4 .3 B4" inserts a 3-tick rest', () => {
    const notes = expandChainString('A4 .3 B4')
    expect(notes[1]).toMatchObject({ pitch: 'B4', offsetTicks: 4 })
  })

  // ── Comma-tail overlength (S53200) ───────────────────────────────────────

  it('"A4_,2" — 1 tick chain advance, 2 ticks of dampTicks', () => {
    const notes = expandChainString('A4_,2 B4')
    expect(notes[0]).toMatchObject({ pitch: 'A4', lengthTicks: 2, dampTicks: 2 })
    expect(notes[1]).toMatchObject({ pitch: 'B4', offsetTicks: 2, dampTicks: 0 })
  })

  it('"A4_3,2" — 4 tick length, 2 extra damp ticks, B4 starts at tick 4', () => {
    const notes = expandChainString('A4_3,2 B4')
    expect(notes[0]).toMatchObject({ pitch: 'A4', lengthTicks: 4, dampTicks: 2 })
    expect(notes[1]).toMatchObject({ pitch: 'B4', offsetTicks: 4, dampTicks: 0 })
  })

  it('comma-tail on shift token', () => {
    // C4 (1 tick), C#4 (2 ticks, 3 damp), D4 starts at tick 1+2=3
    const notes = expandChainString('C4 +_,3 D4')
    expect(notes[1]).toMatchObject({ pitch: 'C#4', lengthTicks: 2, dampTicks: 3 })
    expect(notes[2]).toMatchObject({ pitch: 'D4', offsetTicks: 3 })
  })

  it('no dampTicks when no comma suffix', () => {
    const notes = expandChainString('A4_3')
    expect(notes[0]).toMatchObject({ lengthTicks: 4, dampTicks: 0 })
  })

  // ── Semicolon-overlength (S53200) ─────────────────────────────────────────

  it('"A4_3;2 B4 C4" — ;N note gets dampTicks=2 and subsequent notes share the release tick', () => {
    // A4: offset 0, length 4, damp 2 → sounds until 6; chain advances to 4
    // B4: offset 4, length 1, auto-damp = max(0, 6-(4+1)) = 1 → sounds until 6
    // C4: offset 5, length 1, auto-damp = max(0, 6-(5+1)) = 0
    const notes = expandChainString('A4_3;2 B4 C4')
    expect(notes[0]).toMatchObject({ pitch: 'A4', lengthTicks: 4, dampTicks: 2 })
    expect(notes[1]).toMatchObject({ pitch: 'B4', offsetTicks: 4, lengthTicks: 1, dampTicks: 1 })
    expect(notes[2]).toMatchObject({ pitch: 'C4', offsetTicks: 5, lengthTicks: 1, dampTicks: 0 })
  })

  it('note already ending past targetEndTick gets dampTicks=0, not negative', () => {
    // A4_7;2: length=8, damp=2, targetEnd=10; B4_3: length=4, natural end=12 > 10
    const notes = expandChainString('A4_7;2 B4_3')
    expect(notes[0]).toMatchObject({ dampTicks: 2 })
    expect(notes[1]).toMatchObject({ pitch: 'B4', dampTicks: 0 })
  })

  it('explicit comma-tail on subsequent note overrides auto-damp', () => {
    // A4_3;4: length=4, damp=4, targetEnd=8; B4_,1 has explicit damp=1, not auto
    const notes = expandChainString('A4_3;4 B4_,1')
    expect(notes[1]).toMatchObject({ pitch: 'B4', lengthTicks: 2, dampTicks: 1 })
  })

  it('semidamp on shift token propagates to following notes', () => {
    // C4 at 0 (len=1), +_3;2 → C#4 at 1 (len=4, damp=2, targetEnd=7), D4 at 5 (auto-damp=1)
    const notes = expandChainString('C4 +_3;2 D4')
    expect(notes[1]).toMatchObject({ pitch: 'C#4', lengthTicks: 4, dampTicks: 2 })
    expect(notes[2]).toMatchObject({ pitch: 'D4', offsetTicks: 5, dampTicks: 1 })
  })

  it('bare ",N" damp suffix — no underscore needed', () => {
    const notes = expandChainString('Eb4,3 F4')
    expect(notes[0]).toMatchObject({ pitch: 'Eb4', lengthTicks: 1, dampTicks: 3 })
    expect(notes[1]).toMatchObject({ pitch: 'F4', offsetTicks: 1 })
  })

  it('bare ";N" semidamp suffix propagates to following notes', () => {
    // Eb4;6 → length=1, semidamp=6, targetEnd=0+1+6=7
    // G4 at tick 1, length=1 → auto-damp=7-(1+1)=5 so both release at tick 7
    const notes = expandChainString('Eb4;6 G4')
    expect(notes[0]).toMatchObject({ pitch: 'Eb4', lengthTicks: 1, dampTicks: 6 })
    expect(notes[1]).toMatchObject({ pitch: 'G4', offsetTicks: 1, dampTicks: 5 })
  })

  it('rest does not break shift accumulation', () => {
    // Shift should survive a rest between operators
    const notes = expandChainString('C4 + . +')
    expect(notes[0]).toMatchObject({ pitch: 'C4', offsetTicks: 0 })
    // + → shift=1 → C#4 at tick 1
    expect(notes[1]).toMatchObject({ pitch: 'C#4', offsetTicks: 1 })
    // rest at tick 2
    // + → shift=2 → D4 at tick 3
    expect(notes[2]).toMatchObject({ pitch: 'D4', offsetTicks: 3 })
  })
})
