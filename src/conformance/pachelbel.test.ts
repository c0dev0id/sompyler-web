import { describe, it, expect, beforeEach } from 'vitest'
import { resetForTests } from '../storage/db'
import { loadInstrument } from '../parse/instrument'
import { Tuner } from '../parse/tuning'
import { buildDistinctNotes } from '../render/distinct'
import {
  STARTER_PACHELBEL,
  STARTER_VIOLIN,
  STARTER_CELLO,
} from '../defaults'
import { normalizePlan } from './_normalize'

/**
 * Phase 17 — the Pachelbel showcase is the starter song that ships in
 * project on first run, so it is also a regression contract: drift in
 * the score walker, the cache key, the inheritance logic, the tempo
 * Shape resolver, or the shape-article hashing all surface here.
 *
 * Coverage strategy matches the other conformance fixtures (R-Test):
 *   - **Anchors** — voice count and the total length range under the
 *     m11/m12 ritardando. Hand-derived from the score body.
 *   - **Snapshot** — the full normalised distinct-notes plan goes
 *     through `toMatchSnapshot()` for self-regression. Refresh with
 *     `vitest -u` when an intentional change is made.
 *
 * High cache-hit ratio is the explicit performance contract of the
 * showcase (R1 — the cello ostinato repeats every two bars and the
 * violins canon in lockstep, so distinct notes << occurrences). We
 * assert `occurrences > 2 × distinct` as a guard.
 */

beforeEach(async () => {
  await resetForTests()
})

describe('conformance: starter Pachelbel Canon in D', () => {
  it('matches the hand-verified anchors', async () => {
    const violin = await loadInstrument('violin', STARTER_VIOLIN)
    const cello = await loadInstrument('cello', STARTER_CELLO)
    const plan = await buildDistinctNotes(STARTER_PACHELBEL, {
      tuner: new Tuner(),
      instruments: new Map([
        [violin.name, violin],
        [cello.name, cello],
      ]),
    })
    // Four voices: cello + three violins (canon stagger).
    expect(plan.voices.size).toBe(4)
    expect(plan.voices.has('cello')).toBe(true)
    expect(plan.voices.has('violin1')).toBe(true)
    expect(plan.voices.has('violin2')).toBe(true)
    expect(plan.voices.has('violin3')).toBe(true)

    // stress_pattern "2,0,1,0;1,0;1,0;1,0" → stressorCumlen = 32 ticks/bar.
    // beats_per_minute: 15 × sub_cumlen(8) = 120 tpm → 32/2 = 16 s/bar.
    // 10 full measures × 16 s = 160 s; m11–m12 ritardando (120→55 tpm) adds ~60 s.
    expect(plan.totalLengthSeconds).toBeGreaterThan(160)
    expect(plan.totalLengthSeconds).toBeLessThan(280)

    // Canonic + ostinato → distinct notes << occurrences. The cache hit
    // ratio is the core perf contract of the showcase.
    const occurrences = plan.notes.reduce(
      (s, n) => s + n.occurrences.length,
      0,
    )
    expect(occurrences).toBeGreaterThan(2 * plan.notes.length)
  })

  it('matches the normalised distinct-notes snapshot (self-regression)', async () => {
    const violin = await loadInstrument('violin', STARTER_VIOLIN)
    const cello = await loadInstrument('cello', STARTER_CELLO)
    const plan = await buildDistinctNotes(STARTER_PACHELBEL, {
      tuner: new Tuner(),
      instruments: new Map([
        [violin.name, violin],
        [cello.name, cello],
      ]),
    })
    expect(normalizePlan(plan)).toMatchSnapshot()
  })
})
