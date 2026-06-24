import { describe, it, expect, beforeEach } from 'vitest'
import slowPiano from '../../../sompyler/test_examples/slow_piano-all-keys-cmaj.spls?raw'
import realPiano from '../../../sompyler/lib/instruments/dev/piano.spli?raw'
import { resetForTests } from '../storage/db'
import { loadInstrument } from '../parse/instrument'
import { Tuner } from '../parse/tuning'
import { buildDistinctNotes } from '../render/distinct'
import { compileInstrument } from '../synth/compile'
import { normalizePlan } from './_normalize'

/**
 * Phase 10 deliverable: instruments using bezier shapes / variations
 * compile without errors and `slow_piano-all-keys-cmaj.spls` builds a
 * complete distinct-notes plan against the *real* `dev/piano` spli.
 *
 * Per R-Test (R8.1): structural parity only — voice count, distinct
 * notes count, total length > 0. Sample-accurate parity is not a goal.
 *
 * Phase 15d adds anchor + snapshot coverage (see alle_meine_entchen
 * conformance test for the rationale).
 */

beforeEach(async () => {
  await resetForTests()
})

describe('conformance: slow_piano-all-keys-cmaj.spls (rich piano)', () => {
  it('compiles the rich dev/piano instrument (cycle-detected, S32122)', async () => {
    const piano = await loadInstrument('dev/piano', realPiano)
    expect(() => compileInstrument(piano)).not.toThrow()
  })

  it('matches the hand-verified Sompyler anchors', async () => {
    const piano = await loadInstrument('dev/piano', realPiano)
    const plan = await buildDistinctNotes(slowPiano, {
      tuner: new Tuner(),
      instruments: new Map([[piano.name, piano]]),
    })
    // Anchors — Python YAML walk on `test_examples/slow_piano-all-keys-cmaj.spls`:
    //   1 voice (piano), 9 measures, 52 distinct (pitch, length) tuples,
    //   52 note occurrences (each tone unique), total length 60 ticks
    //   at ticks_per_minute=100 → 36.0 seconds.
    //   (Cut bars: m0 cut=6→2 ticks, m8 cut=-7→1 tick; remaining 7×8=56 ticks.)
    expect(plan.voices.size).toBe(1)
    expect(plan.voices.has('piano')).toBe(true)
    const occurrences = plan.notes.reduce((s, n) => s + n.occurrences.length, 0)
    expect(occurrences).toBe(52)
    expect(plan.notes.length).toBe(52)
    expect(plan.totalLengthSeconds).toBeCloseTo(36.0, 4)
  })

  it('matches the normalised distinct-notes snapshot (self-regression)', async () => {
    const piano = await loadInstrument('dev/piano', realPiano)
    const plan = await buildDistinctNotes(slowPiano, {
      tuner: new Tuner(),
      instruments: new Map([[piano.name, piano]]),
    })
    expect(normalizePlan(plan)).toMatchSnapshot()
  })
})
