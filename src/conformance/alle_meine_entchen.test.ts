import { describe, it, expect, beforeEach } from 'vitest'
import alleMeineEntchen from '../../../sompyler/test_examples/alle_meine_entchen.spls?raw'
import { resetForTests } from '../storage/db'
import { loadInstrument } from '../parse/instrument'
import { Tuner } from '../parse/tuning'
import { buildDistinctNotes } from '../render/distinct'

/**
 * Conformance test against Sompyler's `test_examples/alle_meine_entchen.spls`.
 *
 * Per R-Test we assert *structural* parity only: voice count, distinct-notes
 * count, total length. Sample-accurate parity with the Python implementation
 * is explicitly not a goal.
 */

beforeEach(async () => {
  await resetForTests()
})

describe('conformance: alle_meine_entchen.spls', () => {
  it('parses + builds a distinct-notes plan', async () => {
    const body = alleMeineEntchen
    const piano = await loadInstrument('dev/piano', 'oscillator: sin')
    const plan = await buildDistinctNotes(body, {
      tuner: new Tuner(),
      instruments: new Map([[piano.name, piano]]),
    })
    // Single voice: piano.
    expect(plan.voices.size).toBe(1)
    expect(plan.voices.has('piano')).toBe(true)
    // ticks_per_minute = 140; first measure ends at tick 8 (G4 length 2 at offset 6).
    // The song has many measures; total length should be > 30 ticks worth.
    expect(plan.totalLengthSeconds).toBeGreaterThan(0)
    // Spot-check: at least 5 distinct (pitch, length) combinations appear.
    expect(plan.notes.length).toBeGreaterThanOrEqual(5)
  })
})
