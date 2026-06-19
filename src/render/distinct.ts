import { ScoreError } from '../errors'
import { log } from '../debug'
import type { Instrument } from '../parse/instrument'
import { parseScore, walkMeasures, ticksToSeconds, type RawNote } from '../parse/score'
import type { Tuner } from '../parse/tuning'
import { noteCacheKey } from '../storage/hash'

/**
 * Phase 1 deliverable: given a `.spls` body + dependencies (instrument map,
 * tuner), produce the distinct-notes list with content-addressed hashes.
 *
 * Reference: `Sompyler/score/__init__.py:notes_feed_1st_pass` (deduplication
 * via `_distinct_notes` map). The Python version walks (instrument, pitch,
 * stress, length, properties); we walk the same dimensions but the hash is
 * a SHA-256 of canonicalised inputs (R1, R8).
 */

export interface DistinctNote {
  key: string
  instrumentHash: string
  instrumentName: string
  frequencyHz: number
  stress: number
  lengthSeconds: number
  properties: Record<string, unknown>
  occurrences: NoteOccurrence[]
}

export interface NoteOccurrence {
  voice: string
  measureIndex: number
  measureName: string
  offsetTicks: number
  offsetSeconds: number
}

export interface DistinctRenderPlan {
  notes: DistinctNote[]
  totalLengthSeconds: number
  voices: Set<string>
}

export interface DistinctBuildContext {
  tuner: Tuner
  /** Map of instrument-name → loaded instrument. */
  instruments: Map<string, Instrument>
  defaultTicksPerMinute?: number
}

export async function buildDistinctNotes(
  body: string,
  ctx: DistinctBuildContext,
): Promise<DistinctRenderPlan> {
  const { head, measures } = parseScore(body)
  const voices = new Set<string>()
  const byKey = new Map<string, DistinctNote>()

  let cumLengthSeconds = 0
  let activeTicksPerMinute = ctx.defaultTicksPerMinute ?? 60
  let activeMeasureIndex = -1
  let activeMeasureLengthSeconds = 0

  const rawNotes: RawNote[] = []
  for (const note of walkMeasures(head, measures)) rawNotes.push(note)

  for (const note of rawNotes) {
    voices.add(note.voice)
    const voiceSpec = head.stage[note.voice]
    if (!voiceSpec) throw new ScoreError(`Voice '${note.voice}' missing from stage`)

    const instrumentName = voiceSpec.instrument
    const instrument = ctx.instruments.get(instrumentName)
    if (!instrument) {
      throw new ScoreError(
        `Instrument '${instrumentName}' for voice '${note.voice}' not loaded`,
      )
    }

    // For Phase 1 we treat ticksPerMinute as a measure-level constant. The
    // walker re-applies _meta each measure, but doesn't surface it to us
    // here — track via the measure index transitions.
    if (note.measureIndex !== activeMeasureIndex) {
      cumLengthSeconds += activeMeasureLengthSeconds
      activeMeasureIndex = note.measureIndex
      activeMeasureLengthSeconds = 0
      const metaBlock = (measures[note.measureIndex] as Record<string, unknown>)?._meta as
        | Record<string, unknown>
        | undefined
      if (metaBlock && 'ticks_per_minute' in metaBlock) {
        activeTicksPerMinute = Number(metaBlock.ticks_per_minute)
      }
    }

    const offsetSeconds = ticksToSeconds(note.offsetTicks, activeTicksPerMinute) + cumLengthSeconds
    const lengthSeconds = ticksToSeconds(note.lengthTicks, activeTicksPerMinute)
    activeMeasureLengthSeconds = Math.max(
      activeMeasureLengthSeconds,
      ticksToSeconds(note.offsetTicks + note.lengthTicks + note.damp, activeTicksPerMinute),
    )

    const frequencyHz = ctx.tuner.frequencyOfTone(note.pitch)
    const dampSeconds = ticksToSeconds(note.damp, activeTicksPerMinute)
    const properties: Record<string, unknown> = {}
    // S53400 off-scale flags must split the cache: same pitch + different
    // flag = different rendered tone, once scale-aware tuning lands.
    if (note.offScale) properties.offScale = note.offScale
    // S51a10 damp extends the envelope release; different damp ⇒ different PCM.
    if (dampSeconds > 0) properties.dampSeconds = dampSeconds
    // S46300 static article properties enter the cache key directly (R1).
    // Shape-typed articles are deferred to per-tick resolution in phase 16b
    // and are intentionally *not* folded in here.
    for (const [k, v] of Object.entries(note.staticArticles)) {
      properties[k] = v
    }

    const key = await noteCacheKey({
      instrumentHash: instrument.hash,
      frequencyHz,
      stress: note.stress,
      lengthSeconds,
      properties,
    })

    let entry = byKey.get(key)
    if (!entry) {
      entry = {
        key,
        instrumentHash: instrument.hash,
        instrumentName,
        frequencyHz,
        stress: note.stress,
        lengthSeconds,
        properties,
        occurrences: [],
      }
      byKey.set(key, entry)
    }
    entry.occurrences.push({
      voice: note.voice,
      measureIndex: note.measureIndex,
      measureName: note.measureName,
      offsetTicks: note.offsetTicks,
      offsetSeconds,
    })
  }

  const totalLengthSeconds = cumLengthSeconds + activeMeasureLengthSeconds
  const plan: DistinctRenderPlan = {
    notes: Array.from(byKey.values()),
    totalLengthSeconds,
    voices,
  }
  log('parse', 'info', `Built distinct-notes plan`, {
    distinct: plan.notes.length,
    occurrences: rawNotes.length,
    voices: voices.size,
    totalLengthSeconds,
  })
  return plan
}
