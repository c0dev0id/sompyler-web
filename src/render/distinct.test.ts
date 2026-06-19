import { describe, it, expect, beforeAll } from 'vitest'
import { loadInstrument, type Instrument } from '../parse/instrument'
import { Tuner } from '../parse/tuning'
import { buildDistinctNotes } from './distinct'

const SCORE = `
title: dedup test
stage:
  piano: 1|1 0 dev/piano
---
_meta:
  ticks_per_minute: 60
  stress_pattern: "1"
  lower_stress_bound: 100
  upper_stress_bound: 100
piano:
  0: A4 1
  1: A4 1
  2: C4 1
  3: A4 1
`

let piano: Instrument

beforeAll(async () => {
  piano = await loadInstrument('dev/piano', 'oscillator: sin\nenvelope: A.S.R')
})

describe('buildDistinctNotes', () => {
  it('deduplicates identical (instrument, pitch, stress, length, props) notes', async () => {
    const plan = await buildDistinctNotes(SCORE, {
      tuner: new Tuner(),
      instruments: new Map([[piano.name, piano]]),
    })
    expect(plan.notes).toHaveLength(2)
    const a4 = plan.notes.find((n) => Math.abs(n.frequencyHz - 440) < 1e-6)
    const c4 = plan.notes.find((n) => Math.abs(n.frequencyHz - 261.6256) < 0.01)
    expect(a4).toBeTruthy()
    expect(c4).toBeTruthy()
    expect(a4!.occurrences).toHaveLength(3)
    expect(c4!.occurrences).toHaveLength(1)
  })

  it('produces stable, content-addressed hashes', async () => {
    const a = await buildDistinctNotes(SCORE, {
      tuner: new Tuner(),
      instruments: new Map([[piano.name, piano]]),
    })
    const b = await buildDistinctNotes(SCORE, {
      tuner: new Tuner(),
      instruments: new Map([[piano.name, piano]]),
    })
    expect(a.notes.map((n) => n.key).sort()).toEqual(b.notes.map((n) => n.key).sort())
  })

  it('changes the cache key when the instrument body changes', async () => {
    const piano1 = await loadInstrument('dev/piano', 'oscillator: sin')
    const piano2 = await loadInstrument('dev/piano', 'oscillator: square')
    const planA = await buildDistinctNotes(SCORE, {
      tuner: new Tuner(),
      instruments: new Map([[piano1.name, piano1]]),
    })
    const planB = await buildDistinctNotes(SCORE, {
      tuner: new Tuner(),
      instruments: new Map([[piano2.name, piano2]]),
    })
    expect(planA.notes[0]!.key).not.toBe(planB.notes[0]!.key)
  })

  it('throws when an instrument referenced by stage is missing', async () => {
    await expect(
      buildDistinctNotes(SCORE, { tuner: new Tuner(), instruments: new Map() }),
    ).rejects.toThrow(/Instrument 'dev\/piano'/)
  })

  it('computes total length across measures', async () => {
    const plan = await buildDistinctNotes(SCORE, {
      tuner: new Tuner(),
      instruments: new Map([[piano.name, piano]]),
    })
    // 4 ticks at 60 bpm = 4 seconds (single measure of length 4 ticks).
    expect(plan.totalLengthSeconds).toBeCloseTo(4, 3)
  })

  it('splits the cache on static article values (Phase 15a)', async () => {
    const ARTICULATED = `
title: articulated
stage:
  piano: 1|1 0 dev/piano
---
_meta:
  ticks_per_minute: 60
  stress_pattern: "1"
  lower_stress_bound: 100
  upper_stress_bound: 100
piano:
  0: A4 1 100 vibrato=0.5
  1: A4 1 100 vibrato=0.8
  2: A4 1 100 vibrato=0.5
`
    const plan = await buildDistinctNotes(ARTICULATED, {
      tuner: new Tuner(),
      instruments: new Map([[piano.name, piano]]),
    })
    expect(plan.notes).toHaveLength(2)
    const v05 = plan.notes.find((n) => n.properties.vibrato === 0.5)
    const v08 = plan.notes.find((n) => n.properties.vibrato === 0.8)
    expect(v05!.occurrences).toHaveLength(2)
    expect(v08!.occurrences).toHaveLength(1)
  })

  it('splits the cache on shape-typed article values (S32200)', async () => {
    const SHAPED = `
title: shaped
stage:
  piano: 1|1 0 dev/piano
---
_meta:
  ticks_per_minute: 60
  stress_pattern: "1"
  lower_stress_bound: 100
  upper_stress_bound: 100
piano:
  0: A4 1 100 vibrato=1:0,0;1,1
  1: A4 1 100 vibrato=1:1,1;0,0
  2: A4 1 100 vibrato=1:0,0;1,1
`
    const plan = await buildDistinctNotes(SHAPED, {
      tuner: new Tuner(),
      instruments: new Map([[piano.name, piano]]),
    })
    // Same shape source ⇒ same cache entry; different shape source ⇒ a
    // distinct entry. The shape string folds into properties['@vibrato'].
    expect(plan.notes).toHaveLength(2)
    const distinctKeys = new Set(plan.notes.map((n) => n.key))
    expect(distinctKeys.size).toBe(2)
    for (const n of plan.notes) {
      expect(n.shapeArticles.vibrato).toBeDefined()
      expect(typeof n.properties['@vibrato']).toBe('string')
    }
    const shared = plan.notes.find((n) => n.occurrences.length === 2)
    expect(shared).toBeDefined()
  })

  it('resolves per-note length under a tempo Shape profile (S46140, R13 amendment)', async () => {
    // Constant TPM=60: 8 ticks @ 60tpm = 8s.
    const CONST = `
title: const
stage:
  piano: 1|1 0 dev/piano
---
_meta:
  ticks_per_minute: 60
  stress_pattern: "1"
  lower_stress_bound: 100
  upper_stress_bound: 100
piano:
  0: A4 8
`
    // Same note under a tempo Shape that runs at ~120 tpm for the whole
    // measure: 8 ticks at ~120 tpm ≈ 4s (half the constant-60 baseline).
    const SHAPED = `
title: shaped
stage:
  piano: 1|1 0 dev/piano
---
_meta:
  tempo: "8:120;8,120"
  stress_pattern: "1"
  lower_stress_bound: 100
  upper_stress_bound: 100
piano:
  0: A4 8
`
    const constPlan = await buildDistinctNotes(CONST, {
      tuner: new Tuner(),
      instruments: new Map([[piano.name, piano]]),
    })
    const shapedPlan = await buildDistinctNotes(SHAPED, {
      tuner: new Tuner(),
      instruments: new Map([[piano.name, piano]]),
    })
    expect(constPlan.notes[0]!.lengthSeconds).toBeCloseTo(8, 4)
    // Tempo Shape running hotter ⇒ shorter resolved length.
    expect(shapedPlan.notes[0]!.lengthSeconds).toBeCloseTo(4, 1)
    // Different resolved length ⇒ different cache key.
    expect(shapedPlan.notes[0]!.key).not.toBe(constPlan.notes[0]!.key)
  })

  it('offset_seconds inserts a silent gap before the measure (S46196)', async () => {
    const TWO_MEASURES = `
title: offset
stage:
  piano: 1|1 0 dev/piano
---
_meta:
  ticks_per_minute: 60
  stress_pattern: "1"
  lower_stress_bound: 100
  upper_stress_bound: 100
piano:
  0: A4 1
---
_meta:
  offset_seconds: 2
piano:
  0: B4 1
`
    const plan = await buildDistinctNotes(TWO_MEASURES, {
      tuner: new Tuner(),
      instruments: new Map([[piano.name, piano]]),
    })
    // Measure 0: A4 at offsetSeconds=0. Measure 1: B4 starts after 1s (m0)
    // + 2s (offset_seconds gap) = 3s.
    const a4 = plan.notes.find((n) => Math.abs(n.frequencyHz - 440) < 1)
    const b4 = plan.notes.find((n) => Math.abs(n.frequencyHz - 493.88) < 1)
    expect(a4).toBeDefined()
    expect(b4).toBeDefined()
    expect(a4!.occurrences[0]!.offsetSeconds).toBeCloseTo(0, 4)
    expect(b4!.occurrences[0]!.offsetSeconds).toBeCloseTo(3, 3)
  })

  it('splits the cache when ? / ! off-scale flags diverge (S53400)', async () => {
    const FLAGGED = `
title: flag-split
stage:
  piano: 1|1 0 dev/piano
---
_meta:
  ticks_per_minute: 60
  stress_pattern: "1"
  lower_stress_bound: 100
  upper_stress_bound: 100
piano:
  0: A4 1
  1: A4? 1
  2: A4! 1
`
    const plan = await buildDistinctNotes(FLAGGED, {
      tuner: new Tuner(),
      instruments: new Map([[piano.name, piano]]),
    })
    expect(plan.notes).toHaveLength(3)
    const keys = new Set(plan.notes.map((n) => n.key))
    expect(keys.size).toBe(3)
    // The two flagged variants carry the flag in properties; the unflagged
    // one is property-less. All resolve to the same 440Hz frequency.
    for (const n of plan.notes) {
      expect(n.frequencyHz).toBeCloseTo(440, 6)
    }
    expect(plan.notes.some((n) => n.properties.offScale === '?')).toBe(true)
    expect(plan.notes.some((n) => n.properties.offScale === '!')).toBe(true)
    expect(plan.notes.some((n) => n.properties.offScale === undefined)).toBe(true)
  })
})
