import { describe, it, expect } from 'vitest'
import { parseScore, walkMeasures, expandOffsetKey } from './score'

const SIMPLE = `
title: tiny
stage:
  piano: 1|1 0 dev/piano
---
_meta:
  ticks_per_minute: 60
  stress_pattern: "2,0,1,0"
  lower_stress_bound: 50
  upper_stress_bound: 100
piano:
  0: C4 1
  1: E4 1
  2: G4 2
---
piano:
  0: G4 1
  1: G4 1
`

describe('parseScore', () => {
  it('extracts title and stage', () => {
    const { head, measures } = parseScore(SIMPLE)
    expect(head.title).toBe('tiny')
    expect(head.stage.piano?.instrument).toBe('dev/piano')
    expect(head.stage.piano?.channels).toBe('1|1')
    expect(head.stage.piano?.volume).toBe(0)
    expect(measures).toHaveLength(2)
  })

  it('throws when stage is missing', () => {
    expect(() => parseScore('title: nope')).toThrow()
  })
})

describe('walkMeasures', () => {
  it('emits every offset as a RawNote', () => {
    const { head, measures } = parseScore(SIMPLE)
    const notes = [...walkMeasures(head, measures)]
    expect(notes).toHaveLength(5)
    expect(notes[0]).toMatchObject({ voice: 'piano', offsetTicks: 0, pitch: 'C4', lengthTicks: 1 })
    expect(notes[2]).toMatchObject({ pitch: 'G4', lengthTicks: 2 })
  })

  it('inherits meta across measures', () => {
    const { head, measures } = parseScore(SIMPLE)
    const notes = [...walkMeasures(head, measures)]
    const m1Stress = notes[0]!.stress
    const m2Stress = notes[3]!.stress
    expect(m1Stress).toBeGreaterThan(0)
    expect(m2Stress).toBeGreaterThan(0)
  })

  it('rejects voices not declared in stage', () => {
    const bad = SIMPLE.replace('piano:\n  0: C4 1', 'unknown:\n  0: C4 1')
    const { head, measures } = parseScore(bad)
    expect(() => [...walkMeasures(head, measures)]).toThrow(/Voice 'unknown'/)
  })

  it('parses trailing damp=N tokens as a per-note attribute (S51a10)', () => {
    const body = `
title: damped
stage:
  piano: 1|1 0 dev/piano
---
piano:
  0: C4 1 100 damp=2
  1: C4 1
`
    const { head, measures } = parseScore(body)
    const notes = [...walkMeasures(head, measures)]
    expect(notes[0]).toMatchObject({ pitch: 'C4', damp: 2 })
    expect(notes[1]).toMatchObject({ pitch: 'C4', damp: 0 })
  })

  it('parses trailing key=value tokens as typed static articles (S46300)', () => {
    const body = `
title: articles
stage:
  piano: 1|1 0 dev/piano
---
piano:
  0: C4 1 100 vibrato=0.4 legato=true accent=soft
`
    const { head, measures } = parseScore(body)
    const notes = [...walkMeasures(head, measures)]
    expect(notes[0]!.staticArticles).toEqual({
      vibrato: 0.4,
      legato: true,
      accent: 'soft',
    })
    expect(notes[0]!.shapeArticles).toEqual({})
  })

  it('routes shape-literal article values (containing : ; ,) into shapeArticles', () => {
    const body = `
title: shaped
stage:
  piano: 1|1 0 dev/piano
---
piano:
  0: C4 1 100 vibrato=1:0,0;1,1 swell=0,1;1,0
`
    const { head, measures } = parseScore(body)
    const notes = [...walkMeasures(head, measures)]
    expect(notes[0]!.staticArticles).toEqual({})
    expect(notes[0]!.shapeArticles).toEqual({
      vibrato: '1:0,0;1,1',
      swell: '0,1;1,0',
    })
  })

  it('inherits a voice marked `true` from the previous measure (S46110)', () => {
    const body = `
title: inherit
stage:
  piano: 1|1 0 dev/piano
---
_meta:
  ticks_per_minute: 60
  stress_pattern: "2,0,1,0"
piano:
  0: C4 1
  1: E4 1
---
piano: true
`
    const { head, measures } = parseScore(body)
    const notes = [...walkMeasures(head, measures)]
    // Measure 0: 2 notes; measure 1: same 2 notes inherited.
    expect(notes).toHaveLength(4)
    expect(notes[2]).toMatchObject({ voice: 'piano', measureName: '1', pitch: 'C4' })
    expect(notes[3]).toMatchObject({ voice: 'piano', measureName: '1', pitch: 'E4' })
  })

  it('throws when a voice inherits without prior content', () => {
    const body = `
title: bad-inherit
stage:
  piano: 1|1 0 dev/piano
---
piano: true
`
    const { head, measures } = parseScore(body)
    expect(() => [...walkMeasures(head, measures)]).toThrow(
      /inherits from previous measure/,
    )
  })

  it('repeats unmentioned voices when _meta.repeat_unmentioned_voices is true (S46110)', () => {
    const body = `
title: repeat
stage:
  violin: 1|1 0 dev/piano
  cello: 1|1 0 dev/piano
---
_meta:
  ticks_per_minute: 60
  stress_pattern: "1"
violin:
  0: A4 1
cello:
  0: C3 1
---
_meta:
  repeat_unmentioned_voices: true
violin:
  0: B4 1
`
    const { head, measures } = parseScore(body)
    const notes = [...walkMeasures(head, measures)]
    // Measure 0: violin A4 + cello C3 (2 notes).
    // Measure 1: violin B4 (explicit override) + cello C3 (auto-inherited) → 2 more.
    expect(notes).toHaveLength(4)
    const m1 = notes.filter((n) => n.measureName === '1')
    expect(m1).toHaveLength(2)
    expect(m1.some((n) => n.voice === 'violin' && n.pitch === 'B4')).toBe(true)
    expect(m1.some((n) => n.voice === 'cello' && n.pitch === 'C3')).toBe(true)
  })

  it('does not propagate repeat_unmentioned_voices across measures', () => {
    const body = `
title: nopropagate
stage:
  violin: 1|1 0 dev/piano
  cello: 1|1 0 dev/piano
---
_meta:
  ticks_per_minute: 60
  stress_pattern: "1"
violin:
  0: A4 1
cello:
  0: C3 1
---
_meta:
  repeat_unmentioned_voices: true
violin:
  0: B4 1
---
violin:
  0: C5 1
`
    const { head, measures } = parseScore(body)
    const notes = [...walkMeasures(head, measures)]
    // Measure 2: only violin (cello NOT auto-inherited because flag wasn't set).
    const m2 = notes.filter((n) => n.measureName === '2')
    expect(m2).toHaveLength(1)
    expect(m2[0]).toMatchObject({ voice: 'violin', pitch: 'C5' })
  })

  it('chains voice-true inheritance across three measures', () => {
    const body = `
title: chain
stage:
  piano: 1|1 0 dev/piano
---
_meta:
  ticks_per_minute: 60
  stress_pattern: "1"
piano:
  0: A4 1
---
piano: true
---
piano: true
`
    const { head, measures } = parseScore(body)
    const notes = [...walkMeasures(head, measures)]
    expect(notes).toHaveLength(3)
    expect(notes.map((n) => n.pitch)).toEqual(['A4', 'A4', 'A4'])
    expect(notes.map((n) => n.measureName)).toEqual(['0', '1', '2'])
  })

  it('skip=true produces no notes and does not advance elapsed time (S46193)', () => {
    const body = `
title: skip
stage:
  piano: 1|1 0 dev/piano
---
_meta:
  ticks_per_minute: 60
  stress_pattern: "1"
piano:
  0: A4 1
---
_meta:
  skip: true
piano:
  0: B4 1
---
piano:
  0: C4 1
`
    const { head, measures } = parseScore(body)
    const notes = [...walkMeasures(head, measures)]
    expect(notes).toHaveLength(2)
    expect(notes.map((n) => n.pitch)).toEqual(['A4', 'C4'])
    expect(notes.map((n) => n.measureName)).toEqual(['0', '2'])
  })

  it('is_last=true halts the generator after that measure (S46195)', () => {
    const body = `
title: last
stage:
  piano: 1|1 0 dev/piano
---
_meta:
  ticks_per_minute: 60
  stress_pattern: "1"
  is_last: true
piano:
  0: A4 1
---
piano:
  0: B4 1
`
    const { head, measures } = parseScore(body)
    const notes = [...walkMeasures(head, measures)]
    expect(notes).toHaveLength(1)
    expect(notes[0]!.pitch).toBe('A4')
  })

  it('cut=N drops notes before tick N and shifts remaining (S46192)', () => {
    const body = `
title: cut
stage:
  piano: 1|1 0 dev/piano
---
_meta:
  ticks_per_minute: 60
  stress_pattern: "1"
  cut: 4
piano:
  0: A4 1
  2: B4 1
  4: C4 1
  6: D4 1
`
    const { head, measures } = parseScore(body)
    const notes = [...walkMeasures(head, measures)]
    // Only offsets ≥ 4 survive; they are shifted left by 4.
    expect(notes).toHaveLength(2)
    expect(notes[0]).toMatchObject({ pitch: 'C4', offsetTicks: 0 })
    expect(notes[1]).toMatchObject({ pitch: 'D4', offsetTicks: 2 })
  })

  it('extracts ? / ! off-scale flags from pitch and strips them', () => {
    const body = `
title: flags
stage:
  piano: 1|1 0 dev/piano
---
piano:
  0: C4? 1
  1: C4! 1
  2: C4 1
`
    const { head, measures } = parseScore(body)
    const notes = [...walkMeasures(head, measures)]
    expect(notes[0]).toMatchObject({ pitch: 'C4', offScale: '?' })
    expect(notes[1]).toMatchObject({ pitch: 'C4', offScale: '!' })
    expect(notes[2]).toMatchObject({ pitch: 'C4', offScale: null })
  })
})

describe('expandOffsetKey (S46232)', () => {
  it('handles a plain integer', () => {
    expect(expandOffsetKey('0')).toEqual([0])
    expect(expandOffsetKey('4')).toEqual([4])
  })

  it('expands a comma-separated list', () => {
    expect(expandOffsetKey('0,4,8')).toEqual([0, 4, 8])
  })

  it('expands start+step*count', () => {
    expect(expandOffsetKey('0+2*3')).toEqual([0, 2, 4])
  })

  it('step without count yields one value', () => {
    expect(expandOffsetKey('0+2')).toEqual([0])
  })

  it('mixes comma list and range in one key', () => {
    expect(expandOffsetKey('0,8+4*3')).toEqual([0, 8, 12, 16])
  })
})
