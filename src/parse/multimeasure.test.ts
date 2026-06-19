import { describe, it, expect } from 'vitest'
import { flattenCycleString, expandMultiMeasures } from './multimeasure'
import { parseScore, walkMeasures } from './score'

describe('flattenCycleString', () => {
  it('returns a single-item array when no pipe present', () => {
    expect(flattenCycleString('A4 1')).toEqual(['A4 1'])
  })

  it('splits on " |" into separate alternatives', () => {
    expect(flattenCycleString('A4 | B4')).toEqual(['A4', 'B4'])
  })

  it('*N repeats the preceding item N additional times', () => {
    expect(flattenCycleString('A4 | B4 | *2')).toEqual(['A4', 'B4', 'B4', 'B4'])
  })

  it('%N references the Nth literal value (1-indexed)', () => {
    expect(flattenCycleString('A4 | B4 | %1')).toEqual(['A4', 'B4', 'A4'])
  })

  it('handles three alternatives', () => {
    expect(flattenCycleString('A4 | B4 | C4')).toEqual(['A4', 'B4', 'C4'])
  })

  it('maps + → true and - → false', () => {
    expect(flattenCycleString('+ | -')).toEqual([true, false])
  })

  it('maps empty segment → null', () => {
    expect(flattenCycleString('A4 | ')).toEqual(['A4', null])
  })
})

describe('expandMultiMeasures', () => {
  it('passes through plain measures unchanged', () => {
    const m = { piano: { '0': 'A4 1' } }
    expect(expandMultiMeasures([m])).toEqual([m])
  })

  it('expands _loop: 2 with no cycling → 2 identical copies', () => {
    const m = { _meta: { _loop: 2 }, piano: { '0': 'A4 1' } }
    const out = expandMultiMeasures([m]) as Record<string, unknown>[]
    expect(out).toHaveLength(2)
    expect((out[0]!.piano as Record<string, unknown>)['0']).toBe('A4 1')
    expect((out[1]!.piano as Record<string, unknown>)['0']).toBe('A4 1')
  })

  it('cycles note values with | over _loop iterations', () => {
    const m = { _meta: { _loop: 2 }, piano: { '0': 'A4 | B4' } }
    const out = expandMultiMeasures([m]) as Record<string, unknown>[]
    expect(out).toHaveLength(2)
    expect((out[0]!.piano as Record<string, unknown>)['0']).toBe('A4')
    expect((out[1]!.piano as Record<string, unknown>)['0']).toBe('B4')
  })

  it('auto-detects loop count from the longest cycle', () => {
    const m = { piano: { '0': 'A4 | B4 | C4' } }
    const out = expandMultiMeasures([m])
    expect(out).toHaveLength(3)
  })

  it('wraps a 2-value cycle across 4 _loop iterations', () => {
    const m = { _meta: { _loop: 4 }, piano: { '0': 'A4 | B4' } }
    const out = expandMultiMeasures([m]) as Record<string, unknown>[]
    expect(out).toHaveLength(4)
    const pitches = out.map((x) => (x.piano as Record<string, unknown>)['0'])
    expect(pitches).toEqual(['A4', 'B4', 'A4', 'B4'])
  })

  it('*2 repeats the preceding value 2 additional times', () => {
    const m = { piano: { '0': 'A4 | B4 | *2' } }
    const out = expandMultiMeasures([m]) as Record<string, unknown>[]
    expect(out).toHaveLength(4)
    const pitches = out.map((x) => (x.piano as Record<string, unknown>)['0'])
    expect(pitches).toEqual(['A4', 'B4', 'B4', 'B4'])
  })

  it('%1 back-references the first literal', () => {
    const m = { piano: { '0': 'A4 | B4 | %1' } }
    const out = expandMultiMeasures([m]) as Record<string, unknown>[]
    expect(out).toHaveLength(3)
    const pitches = out.map((x) => (x.piano as Record<string, unknown>)['0'])
    expect(pitches).toEqual(['A4', 'B4', 'A4'])
  })

  it('cycles meta field values', () => {
    const m = { _meta: { _loop: 2, ticks_per_minute: '60 | 120' }, piano: { '0': 'A4 1' } }
    const out = expandMultiMeasures([m]) as Record<string, unknown>[]
    expect(out).toHaveLength(2)
    expect((out[0]!._meta as Record<string, unknown>).ticks_per_minute).toBe('60')
    expect((out[1]!._meta as Record<string, unknown>).ticks_per_minute).toBe('120')
  })

  it('assigns _id like "name[i]" to each sub-measure', () => {
    const m = { _id: 'intro', _meta: { _loop: 2 }, piano: { '0': 'A4 1' } }
    const out = expandMultiMeasures([m]) as Record<string, unknown>[]
    expect(out[0]!._id).toBe('intro[0]')
    expect(out[1]!._id).toBe('intro[1]')
  })
})

describe('walkMeasures with multi-measures (S47000)', () => {
  it('produces the same notes as an equivalent explicit repetition', () => {
    const multi = `
title: multi
stage:
  piano: 1|1 0 dev/piano
---
_meta:
  ticks_per_minute: 60
  stress_pattern: "1"
  _loop: 2
piano:
  "0": "A4 1 | B4 1"
`
    const explicit = `
title: explicit
stage:
  piano: 1|1 0 dev/piano
---
_meta:
  ticks_per_minute: 60
  stress_pattern: "1"
piano:
  0: A4 1
---
piano:
  0: B4 1
`
    const { head: h1, measures: m1 } = parseScore(multi)
    const { head: h2, measures: m2 } = parseScore(explicit)
    const n1 = [...walkMeasures(h1, m1)].map((n) => n.pitch)
    const n2 = [...walkMeasures(h2, m2)].map((n) => n.pitch)
    expect(n1).toEqual(n2)
  })
})
