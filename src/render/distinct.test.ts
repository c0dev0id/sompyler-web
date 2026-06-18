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
})
