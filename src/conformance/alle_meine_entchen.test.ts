import { describe, it, expect, beforeEach } from 'vitest'
import alleMeineEntchen from '../../../sompyler/test_examples/alle_meine_entchen.spls?raw'
import { resetForTests } from '../storage/db'
import { loadInstrument } from '../parse/instrument'
import { Tuner } from '../parse/tuning'
import { buildDistinctNotes } from '../render/distinct'
import { normalizePlan } from './_normalize'

/**
 * Conformance test against Sompyler's `test_examples/alle_meine_entchen.spls`.
 *
 * Per R-Test we assert *structural* parity only: voice count, distinct-notes
 * count, total length. Sample-accurate parity with the Python implementation
 * is explicitly not a goal.
 *
 * Phase 15d: two layers of coverage.
 * 1. **Anchor assertions** — 2–3 hand-verified numbers per fixture pulled
 *    from a one-time Python YAML walk against the canonical score. These
 *    detect macro structural drift.
 * 2. **Snapshot** — the full normalised distinct-notes plan goes through
 *    `toMatchSnapshot()` for self-regression. Any change to hashing or
 *    walker semantics produces a reviewable diff.
 */

beforeEach(async () => {
  await resetForTests()
})

describe('conformance: alle_meine_entchen.spls', () => {
  it('matches the hand-verified Sompyler anchors', async () => {
    const piano = await loadInstrument('dev/piano', 'oscillator: sin')
    const plan = await buildDistinctNotes(alleMeineEntchen, {
      tuner: new Tuner(),
      instruments: new Map([[piano.name, piano]]),
    })
    // Anchors — Python YAML walk on `test_examples/alle_meine_entchen.spls`:
    //   1 voice (piano), 5 measures (one ---doc each),
    //   27 note occurrences across the score,
    //   total length 5 × 8 ticks at ticks_per_minute=140 → 17.1428…s.
    expect(plan.voices.size).toBe(1)
    expect(plan.voices.has('piano')).toBe(true)
    const occurrences = plan.notes.reduce((s, n) => s + n.occurrences.length, 0)
    expect(occurrences).toBe(27)
    expect(plan.totalLengthSeconds).toBeCloseTo(17.142857, 4)
  })

  it('matches the normalised distinct-notes snapshot (self-regression)', async () => {
    const piano = await loadInstrument('dev/piano', 'oscillator: sin')
    const plan = await buildDistinctNotes(alleMeineEntchen, {
      tuner: new Tuner(),
      instruments: new Map([[piano.name, piano]]),
    })
    expect(normalizePlan(plan)).toMatchSnapshot()
  })
})
