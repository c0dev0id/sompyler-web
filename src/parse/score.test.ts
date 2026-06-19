import { describe, it, expect } from 'vitest'
import { parseScore, walkMeasures } from './score'

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
