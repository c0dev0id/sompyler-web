import { describe, it, expect, beforeEach } from 'vitest'
import { resetForTests } from '../storage/db'
import { loadInstrument } from '../parse/instrument'
import { Tuner } from '../parse/tuning'
import { buildDistinctNotes } from '../render/distinct'
import {
  STARTER_SANDSTORM,
  STARTER_SANDSTORM_LEAD,
  STARTER_SANDSTORM_ARP,
  STARTER_SANDSTORM_SUBBASS,
  STARTER_SANDSTORM_BASS,
  STARTER_SANDSTORM_PAD,
  STARTER_SANDSTORM_HARMONY,
  STARTER_SANDSTORM_ATMOS,
  STARTER_SANDSTORM_SNARE,
  STARTER_SANDSTORM_HIHAT,
  STARTER_KICK,
} from '../defaults'
import { normalizePlan } from './_normalize'

/**
 * Conformance for the Sandstorm starter showcase. Anchors verify the
 * eleven-voice structure and total duration; the snapshot guards against
 * drift in the score walker, cache key, or inheritance logic.
 *
 * Refresh with `vitest -u` after any intentional score change.
 */

beforeEach(async () => {
  await resetForTests()
})

describe('conformance: starter Sandstorm', () => {
  async function buildPlan() {
    const lead    = await loadInstrument('sandstorm-lead',    STARTER_SANDSTORM_LEAD)
    const arp     = await loadInstrument('sandstorm-arp',     STARTER_SANDSTORM_ARP)
    const subbass = await loadInstrument('sandstorm-subbass', STARTER_SANDSTORM_SUBBASS)
    const bass    = await loadInstrument('sandstorm-bass',    STARTER_SANDSTORM_BASS)
    const pad     = await loadInstrument('sandstorm-pad',     STARTER_SANDSTORM_PAD)
    const harmony = await loadInstrument('sandstorm-harmony', STARTER_SANDSTORM_HARMONY)
    const atmos   = await loadInstrument('sandstorm-atmos',   STARTER_SANDSTORM_ATMOS)
    const kick    = await loadInstrument('sandstorm-kick',    STARTER_KICK)
    const snare   = await loadInstrument('sandstorm-snare',   STARTER_SANDSTORM_SNARE)
    const hihat   = await loadInstrument('sandstorm-hihat',   STARTER_SANDSTORM_HIHAT)
    return buildDistinctNotes(STARTER_SANDSTORM, {
      tuner: new Tuner(),
      instruments: new Map([
        [lead.name,    lead],
        [arp.name,     arp],
        [subbass.name, subbass],
        [bass.name,    bass],
        [pad.name,     pad],
        [harmony.name, harmony],
        [atmos.name,   atmos],
        [kick.name,    kick],
        [snare.name,   snare],
        [hihat.name,   hihat],
      ]),
    })
  }

  it('matches hand-verified anchors', async () => {
    const plan = await buildPlan()

    // Eleven voices as declared in the stage block.
    expect(plan.voices.size).toBe(11)
    expect(plan.voices.has('lead')).toBe(true)
    expect(plan.voices.has('lead2')).toBe(true)
    expect(plan.voices.has('arp')).toBe(true)
    expect(plan.voices.has('subbass')).toBe(true)
    expect(plan.voices.has('bass')).toBe(true)
    expect(plan.voices.has('pad')).toBe(true)
    expect(plan.voices.has('harmony')).toBe(true)
    expect(plan.voices.has('atmos')).toBe(true)
    expect(plan.voices.has('kick')).toBe(true)
    expect(plan.voices.has('snare')).toBe(true)
    expect(plan.voices.has('hihat')).toBe(true)

    // 141 measures × 16 ticks × (60 / 544) s per tick ≈ 249 s (≈ 4:09).
    expect(plan.totalLengthSeconds).toBeGreaterThan(240)
    expect(plan.totalLengthSeconds).toBeLessThan(260)

    // Repeating drums/bass yield high cache hit ratio: occurrences >> distinct.
    const occurrences = plan.notes.reduce((s, n) => s + n.occurrences.length, 0)
    expect(occurrences).toBeGreaterThan(2 * plan.notes.length)
  })

  it('matches the normalised distinct-notes snapshot (self-regression)', async () => {
    const plan = await buildPlan()
    expect(normalizePlan(plan)).toMatchSnapshot()
  })
})
