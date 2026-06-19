import { ScoreError } from '../errors'
import { log } from '../debug'
import type { Instrument } from '../parse/instrument'
import { parseScore, walkMeasures, ticksToSeconds, type RawNote } from '../parse/score'
import type { Scale, Tuner } from '../parse/tuning'
import { noteCacheKey } from '../storage/hash'
import { evaluateShape } from '../synth/shape'

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
  /**
   * Note length in raw score ticks. Forwarded to the synth worker so
   * Shape-valued articles (S32200) can be evaluated at the right tick
   * resolution. `lengthSeconds` already accounts for the tempo profile;
   * `lengthTicks` is the unweighted span the user wrote.
   */
  lengthTicks: number
  properties: Record<string, unknown>
  /**
   * S32200 shape-typed article values, preserved verbatim from the score
   * for runtime resolution in the synth worker. Stable across cache
   * lookups: identical shape strings ⇒ identical cache keys (the strings
   * fold into `properties` for hashing).
   */
  shapeArticles: Record<string, string>
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
  /**
   * S53400 active scale. When set, pitches must be in-scale (or marked `?`
   * for snap-to-nearest, `!` for force-literal). When undefined, the tuner
   * resolves freely (12-TET fallback behaviour).
   */
  scale?: Scale
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
  /** Active tempo Shape string (RFC §S46140 continuous form). undefined ⇒ constant TPM fast-path. */
  let activeTempoShape: string | undefined
  /**
   * Per-tick durations under the active tempo profile, cached for the
   * current measure. Indexed by integer tick; fractional ticks are
   * interpolated by `tickRangeSeconds`. `undefined` ⇒ constant TPM.
   */
  let activeTickSeconds: Float32Array | undefined
  let activeMeasureIndex = -1
  let activeMeasureLengthSeconds = 0

  const rawNotes: RawNote[] = []
  for (const note of walkMeasures(head, measures)) rawNotes.push(note)

  // Pre-scan: how many ticks does each measure consume? Need this to size
  // the tempo-shape sample buffer. Without notes a measure contributes
  // nothing; tempo shapes on empty measures are not meaningful.
  const measureTickSpan = new Map<number, number>()
  for (const note of rawNotes) {
    const span = note.offsetTicks + note.lengthTicks + note.damp
    const cur = measureTickSpan.get(note.measureIndex) ?? 0
    if (span > cur) measureTickSpan.set(note.measureIndex, span)
  }

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

    if (note.measureIndex !== activeMeasureIndex) {
      cumLengthSeconds += activeMeasureLengthSeconds
      activeMeasureIndex = note.measureIndex
      activeMeasureLengthSeconds = 0
      const metaBlock = (measures[note.measureIndex] as Record<string, unknown>)?._meta as
        | Record<string, unknown>
        | undefined
      if (metaBlock && 'ticks_per_minute' in metaBlock) {
        activeTicksPerMinute = Number(metaBlock.ticks_per_minute)
        // Explicit constant TPM clears any inherited Shape (matches Sompyler).
        activeTempoShape = undefined
      }
      if (metaBlock && 'tempo' in metaBlock && typeof metaBlock.tempo === 'string') {
        activeTempoShape = metaBlock.tempo
      }
      // (Re-)compute the per-tick seconds buffer for this measure.
      activeTickSeconds = activeTempoShape
        ? buildTickSecondsArray(activeTempoShape, measureTickSpan.get(note.measureIndex) ?? 0)
        : undefined
    }

    const offsetSeconds =
      tickRangeSeconds(activeTickSeconds, activeTicksPerMinute, 0, note.offsetTicks) +
      cumLengthSeconds
    const lengthSeconds = tickRangeSeconds(
      activeTickSeconds,
      activeTicksPerMinute,
      note.offsetTicks,
      note.lengthTicks,
    )
    const noteEndSeconds = tickRangeSeconds(
      activeTickSeconds,
      activeTicksPerMinute,
      0,
      note.offsetTicks + note.lengthTicks + note.damp,
    )
    activeMeasureLengthSeconds = Math.max(activeMeasureLengthSeconds, noteEndSeconds)

    const frequencyHz = ctx.tuner.frequencyOfTone(note.pitch, {
      scale: ctx.scale,
      offScale: note.offScale,
    })
    const dampSeconds = tickRangeSeconds(
      activeTickSeconds,
      activeTicksPerMinute,
      note.offsetTicks + note.lengthTicks,
      note.damp,
    )
    const properties: Record<string, unknown> = {}
    // S53400 off-scale flags must split the cache: same pitch + different
    // flag = different rendered tone, once scale-aware tuning lands.
    if (note.offScale) properties.offScale = note.offScale
    // S51a10 damp extends the envelope release; different damp ⇒ different PCM.
    if (dampSeconds > 0) properties.dampSeconds = dampSeconds
    // S46300 static article properties enter the cache key directly (R1).
    for (const [k, v] of Object.entries(note.staticArticles)) {
      properties[k] = v
    }
    // S32200 shape-valued articles: defensive cache split by raw string.
    // Two notes with the same shape source render identically; two notes
    // with different shape sources cannot share a cache entry. The strings
    // re-enter the worker via shapeArticles for per-tick evaluation.
    for (const [k, v] of Object.entries(note.shapeArticles)) {
      properties[`@${k}`] = v
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
        lengthTicks: note.lengthTicks,
        properties,
        shapeArticles: { ...note.shapeArticles },
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

/**
 * Resolve a tempo Shape string into a per-tick seconds buffer. Each entry
 * `out[t]` is the duration of integer tick `t`. The Shape is evaluated at
 * `cumlen` samples (one per tick) and each sample `tpm` is converted to
 * `60 / tpm` seconds. Returns an empty buffer for empty measures.
 *
 * RFC §S46140 + R13 amendment: per-note `lengthSeconds` integrates over
 * this buffer, so the tempo profile flows directly into the cache key.
 */
function buildTickSecondsArray(shape: string, cumlen: number): Float32Array {
  const ticks = Math.max(1, Math.ceil(cumlen))
  const tpm = evaluateShape(shape, ticks)
  const out = new Float32Array(ticks)
  for (let i = 0; i < ticks; i++) {
    const v = tpm[i] ?? 60
    out[i] = v > 0 ? 60 / v : 0
  }
  return out
}

/**
 * Integrate a tick range to seconds. If `tickSec` is undefined, uses the
 * constant fast-path (`length * 60 / tpm`). Otherwise sums seconds-per-tick
 * across `[start, start + length)`, interpolating both endpoints when they
 * fall on fractional ticks.
 *
 * Mirrors `Sompyler/score/measure.py:378-407` for the simple constant-elasticks
 * case (we don't ship elasticks-pattern yet).
 */
function tickRangeSeconds(
  tickSec: Float32Array | undefined,
  ticksPerMinute: number,
  start: number,
  length: number,
): number {
  if (length <= 0) return 0
  if (!tickSec) return ticksToSeconds(length, ticksPerMinute)
  const end = start + length
  const startInt = Math.floor(start)
  const endInt = Math.floor(end)
  const startFrac = start - startInt
  const endFrac = end - endInt
  if (startInt === endInt) {
    return (endFrac - startFrac) * (tickSec[clampIdx(startInt, tickSec.length)] ?? 0)
  }
  let total = (1 - startFrac) * (tickSec[clampIdx(startInt, tickSec.length)] ?? 0)
  for (let i = startInt + 1; i < endInt; i++) {
    total += tickSec[clampIdx(i, tickSec.length)] ?? 0
  }
  if (endFrac > 0) total += endFrac * (tickSec[clampIdx(endInt, tickSec.length)] ?? 0)
  return total
}

function clampIdx(i: number, len: number): number {
  if (i < 0) return 0
  if (i >= len) return len - 1
  return i
}
