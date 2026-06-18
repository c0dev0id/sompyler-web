import { describe, it, expect, beforeEach } from 'vitest'
import slowPiano from '../../../sompyler/test_examples/slow_piano-all-keys-cmaj.spls?raw'
import realPiano from '../../../sompyler/lib/instruments/dev/piano.spli?raw'
import { resetForTests } from '../storage/db'
import { loadInstrument } from '../parse/instrument'
import { Tuner } from '../parse/tuning'
import { buildDistinctNotes } from '../render/distinct'
import { compileInstrument } from '../synth/compile'

/**
 * Phase 10 deliverable: instruments using bezier shapes / variations
 * compile without errors and `slow_piano-all-keys-cmaj.spls` builds a
 * complete distinct-notes plan against the *real* `dev/piano` spli.
 *
 * Per R-Test (R8.1): structural parity only — voice count, distinct
 * notes count, total length > 0. Sample-accurate parity is not a goal.
 */

beforeEach(async () => {
  await resetForTests()
})

describe('conformance: slow_piano-all-keys-cmaj.spls (rich piano)', () => {
  it('compiles the rich dev/piano instrument (cycle-detected, S32122)', async () => {
    const piano = await loadInstrument('dev/piano', realPiano)
    expect(() => compileInstrument(piano)).not.toThrow()
  })

  it('builds a distinct-notes plan against the rich dev/piano instrument', async () => {
    const piano = await loadInstrument('dev/piano', realPiano)
    const plan = await buildDistinctNotes(slowPiano, {
      tuner: new Tuner(),
      instruments: new Map([[piano.name, piano]]),
    })
    expect(plan.voices.size).toBe(1)
    expect(plan.voices.has('piano')).toBe(true)
    expect(plan.totalLengthSeconds).toBeGreaterThan(0)
    // The score scans every key of a C-major glissando across many
    // octaves — expect a healthy distinct-pitch count.
    expect(plan.notes.length).toBeGreaterThanOrEqual(20)
  })
})
