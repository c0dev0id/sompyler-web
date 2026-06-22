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
  /** S46170 active elasticks pattern (stressor format), if any. Inherited. */
  let activeElasticksPattern: string | undefined
  /** S46180 active elasticks shape string. Clears when elasticksPattern changes. */
  let activeElasticksShape: string | undefined
  /**
   * Canonical bar length in ticks from `_meta.ticks_per_measure`. Inherited.
   * When > 0, the bar's duration is exactly this many ticks regardless of
   * how far individual notes extend past the bar boundary. Notes are free to
   * overflow into the next bar's time; they don't stretch the bar itself.
   * When 0 (not set), bar duration = max note extent (backwards-compat).
   */
  let activeMeasureTicks = 0
  let activeMeasureIndex = -1
  let activeMeasureLengthSeconds = 0

  const rawNotes: RawNote[] = []
  for (const note of walkMeasures(head, measures)) rawNotes.push(note)

  // Pre-scan: how many ticks does each measure consume? Need this to size
  // the tempo-shape sample buffer. Without notes a measure contributes
  // nothing; tempo shapes on empty measures are not meaningful.
  const measureTickSpan = new Map<number, number>()
  for (const note of rawNotes) {
    const span = note.offsetTicks + note.lengthTicks
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
      // S46196: offset_seconds inserts a silent gap before this measure.
      if (metaBlock && typeof metaBlock.offset_seconds === 'number' && metaBlock.offset_seconds > 0) {
        cumLengthSeconds += metaBlock.offset_seconds
      }
      if (metaBlock && 'ticks_per_minute' in metaBlock) {
        activeTicksPerMinute = Number(metaBlock.ticks_per_minute)
        // Explicit constant TPM clears any inherited Shape (matches Sompyler).
        activeTempoShape = undefined
      }
      if (metaBlock && 'tempo' in metaBlock && typeof metaBlock.tempo === 'string') {
        activeTempoShape = metaBlock.tempo
      }
      if (metaBlock && 'elasticks_pattern' in metaBlock) {
        activeElasticksPattern =
          typeof metaBlock.elasticks_pattern === 'string' ? metaBlock.elasticks_pattern : undefined
        activeElasticksShape = undefined
      }
      if (metaBlock && 'elasticks_shape' in metaBlock) {
        activeElasticksShape =
          typeof metaBlock.elasticks_shape === 'string' ? metaBlock.elasticks_shape : undefined
      }
      // Inherited: update explicit bar length only when set in this meta block.
      if (metaBlock && 'ticks_per_measure' in metaBlock) {
        activeMeasureTicks = Number(metaBlock.ticks_per_measure)
      }
      // (Re-)compute the per-tick seconds buffer for this measure.
      const measureLen = measureTickSpan.get(note.measureIndex) ?? 0
      activeTickSeconds = activeTempoShape
        ? buildTickSecondsArray(activeTempoShape, measureLen)
        : undefined
      // S46170/S46180: apply elasticks on top of the tick-seconds buffer.
      if (activeElasticksPattern) {
        const ticks = Math.max(1, Math.ceil(measureLen))
        if (!activeTickSeconds) {
          activeTickSeconds = new Float32Array(ticks).fill(60 / activeTicksPerMinute)
        }
        const elasticks = buildElasticksArray(activeElasticksPattern, activeElasticksShape, measureLen)
        for (let t = 0; t < Math.min(activeTickSeconds.length, elasticks.length); t++) {
          activeTickSeconds[t]! *= elasticks[t]!
        }
      }
      // When ticks_per_measure is set, fix the bar length now so overflow
      // notes (length + offset > bar) cannot stretch the bar.
      if (activeMeasureTicks > 0) {
        activeMeasureLengthSeconds = tickRangeSeconds(
          activeTickSeconds,
          activeTicksPerMinute,
          0,
          activeMeasureTicks,
        )
      }
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
    // Only extend bar duration from note extent when ticks_per_measure is not set.
    // With an explicit bar length, overflow notes don't change when the next bar starts.
    if (activeMeasureTicks === 0) {
      const noteEndSeconds = tickRangeSeconds(
        activeTickSeconds,
        activeTicksPerMinute,
        0,
        note.offsetTicks + note.lengthTicks,
      )
      activeMeasureLengthSeconds = Math.max(activeMeasureLengthSeconds, noteEndSeconds)
    }

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
    // S432b0 continuum articles: resolve to a scalar at the note's tick
    // position within the measure. Different offsets → different values
    // → different cache entries.
    const measureSpan = measureTickSpan.get(note.measureIndex) ?? 1
    for (const [k, { start, end }] of Object.entries(note.continuumArticles)) {
      const t = measureSpan > 0 ? note.offsetTicks / measureSpan : 0
      properties[k] = start + (end - start) * t
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
 * Build a normalised per-tick duration-multiplier array from an elasticks
 * pattern (S46170). Format is the same as `stress_pattern` (`;`-separated
 * groups of comma-separated weights). Values are normalised so their sum
 * equals the array length (total measure time is preserved on average).
 * An optional Shape string (S46180) is applied as exponentiation:
 * `elasticks[t] = pattern[t] ^ shape[t]`.
 */
function buildElasticksArray(
  pattern: string,
  shape: string | undefined,
  cumlen: number,
): Float32Array {
  const groups = pattern.split(';').map((g) => g.split(',').map(Number))
  const flat: number[] = []
  for (const group of groups) flat.push(...group)
  const ticks = Math.max(1, Math.ceil(cumlen))
  const out = new Float32Array(ticks)
  if (flat.length === 0) {
    out.fill(1)
    return out
  }
  for (let t = 0; t < ticks; t++) out[t] = flat[t % flat.length] ?? 1
  // Apply elasticks_shape via exponentiation (S46180).
  if (shape) {
    const shapeVals = evaluateShape(shape, ticks)
    for (let t = 0; t < ticks; t++) {
      const base = out[t] ?? 1
      out[t] = base > 0 ? Math.pow(base, shapeVals[t] ?? 1) : 0
    }
  }
  // Normalise: sum → ticks (preserves total measure duration on average).
  let sum = 0
  for (let t = 0; t < ticks; t++) sum += out[t]!
  if (sum > 0) {
    const scale = ticks / sum
    for (let t = 0; t < ticks; t++) out[t]! *= scale
  }
  return out
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
