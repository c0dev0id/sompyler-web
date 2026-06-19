import jsyaml from 'js-yaml'
import { ScoreError } from '../errors'
import { log } from '../debug'
import { PositionStack } from './position'

/**
 * Phase 1 walker for `.spls` files.
 *
 * Reference: `Sompyler/score/__init__.py:notes_feed_1st_pass`. The Python
 * version handles chained notes, articles, sub-measures, multimeasures,
 * tempo profiles, and retuning. This port handles the minimum needed to
 * produce a flat note stream from simple offset-keyed measures (matches
 * `test_examples/alle_meine_entchen.spls`).
 *
 * Spec: see `doc/rfc.md` §S31000 (score structure).
 */

export interface ScoreHead {
  title?: string
  author?: string
  /** voice name → "channels|? volume instrument" stage spec */
  stage: Record<string, StageVoice>
  meta?: Record<string, unknown>
  inlinedInstruments?: Record<string, unknown>
  tuningConfig?: string
  room?: string
}

export interface StageVoice {
  raw: string
  channels: string
  volume: number
  instrument: string
  position?: string
}

export interface MeasureMeta {
  ticksPerMinute: number
  stressPattern?: string
  lowerStressBound: number
  upperStressBound: number
}

export interface RawNote {
  voice: string
  offsetTicks: number
  pitch: string
  /** S53400 off-scale flag: `?` = snap-to-nearest, `!` = force-literal. */
  offScale: '?' | '!' | null
  lengthTicks: number
  stress: number
  /**
   * S51a10 sustain-pedal: extra release time in ticks for this note. Sompyler
   * parses `damp:` on chord blocks but never applies it; we wire it through
   * to the envelope as a release extension.
   */
  damp: number
  /**
   * S46300 static article properties (numbers, booleans, identifiers).
   * Folded into the cache-key `properties` so different values split the
   * cache. Shape-typed values land in `shapeArticles` instead.
   */
  staticArticles: Record<string, string | number | boolean>
  /**
   * S32200 shape-typed article values: parsed-and-deferred. The string is
   * preserved here; per-tick resolution happens in the synth worker in
   * phase 16b.
   */
  shapeArticles: Record<string, string>
  measureIndex: number
  measureName: string
}

const DEFAULT_META: MeasureMeta = {
  ticksPerMinute: 60,
  lowerStressBound: 85,
  upperStressBound: 100,
}

function parseStageVoice(raw: string): StageVoice {
  const parts = raw.trim().split(/\s+/)
  if (parts.length < 3) {
    throw new ScoreError(`Stage voice spec needs '<channels> <volume> <instrument>': '${raw}'`)
  }
  const [channels, volumeRaw, instrument, position] = parts
  const volume = parseFloat(volumeRaw!)
  if (Number.isNaN(volume)) {
    throw new ScoreError(`Stage voice volume not a number: '${raw}'`)
  }
  return {
    raw,
    channels: channels!,
    volume,
    instrument: instrument!,
    position,
  }
}

function parseStage(stage: unknown): Record<string, StageVoice> {
  if (!stage || typeof stage !== 'object') {
    throw new ScoreError('Score has no `stage` block')
  }
  const out: Record<string, StageVoice> = {}
  for (const [voice, raw] of Object.entries(stage as Record<string, unknown>)) {
    if (typeof raw !== 'string') {
      throw new ScoreError(`Stage voice '${voice}' is not a string`)
    }
    out[voice] = parseStageVoice(raw)
  }
  return out
}

const NOTE_RX =
  /^(\S+)(?:\s+(\d+(?:\.\d+)?))?(?:\s+(\d+))?((?:\s+[a-zA-Z_]\w*=\S+)*)\s*(?:#.*)?$/

interface ParsedNoteShort {
  pitch: string
  offScale: '?' | '!' | null
  lengthTicks: number
  weight: number
  damp: number
  staticArticles: Record<string, string | number | boolean>
  shapeArticles: Record<string, string>
}

/**
 * Classify an article value. Shape literals (anything containing `:`, `;`, or
 * `,`) are routed to `shapeArticles` for deferred per-tick evaluation in 16b.
 * Booleans (`true|false|yes|no`) and numeric literals become typed statics;
 * anything else is kept as a bare identifier string.
 */
function classifyAttrValue(raw: string):
  | { kind: 'shape'; value: string }
  | { kind: 'static'; value: number | boolean | string } {
  if (raw === 'true' || raw === 'yes') return { kind: 'static', value: true }
  if (raw === 'false' || raw === 'no') return { kind: 'static', value: false }
  if (/[:;,]/.test(raw)) return { kind: 'shape', value: raw }
  const n = Number(raw)
  if (raw !== '' && !Number.isNaN(n)) return { kind: 'static', value: n }
  return { kind: 'static', value: raw }
}

function parseShortNote(raw: string): ParsedNoteShort {
  const trimmed = raw.replace(/#.*$/, '').trim()
  const m = NOTE_RX.exec(trimmed)
  if (!m) throw new ScoreError(`Cannot parse note: '${raw}'`)
  const [, pitchRaw, lenStr, weightStr, attrStr] = m
  let pitch = pitchRaw!
  let offScale: '?' | '!' | null = null
  const tail = pitch.slice(-1)
  if (tail === '?' || tail === '!') {
    offScale = tail
    pitch = pitch.slice(0, -1)
  }
  let damp = 0
  const staticArticles: Record<string, string | number | boolean> = {}
  const shapeArticles: Record<string, string> = {}
  if (attrStr) {
    for (const tok of attrStr.trim().split(/\s+/)) {
      if (!tok) continue
      const eq = tok.indexOf('=')
      if (eq < 0) continue
      const k = tok.slice(0, eq)
      const v = tok.slice(eq + 1)
      if (k === 'damp') {
        const n = parseFloat(v)
        if (!Number.isNaN(n)) damp = n
        continue
      }
      const cls = classifyAttrValue(v)
      if (cls.kind === 'shape') shapeArticles[k] = cls.value
      else staticArticles[k] = cls.value
    }
  }
  return {
    pitch,
    offScale,
    lengthTicks: lenStr ? parseFloat(lenStr) : 1,
    weight: weightStr ? parseInt(weightStr, 10) : 1,
    damp,
    staticArticles,
    shapeArticles,
  }
}

function readMeta(metaBlock: Record<string, unknown> | undefined, fallback: MeasureMeta): MeasureMeta {
  if (!metaBlock) return fallback
  const next: MeasureMeta = { ...fallback }
  if ('ticks_per_minute' in metaBlock) next.ticksPerMinute = Number(metaBlock.ticks_per_minute)
  if ('stress_pattern' in metaBlock) next.stressPattern = String(metaBlock.stress_pattern)
  if ('lower_stress_bound' in metaBlock) next.lowerStressBound = Number(metaBlock.lower_stress_bound)
  if ('upper_stress_bound' in metaBlock) next.upperStressBound = Number(metaBlock.upper_stress_bound)
  return next
}

/**
 * Build a stress-per-tick table for the measure from the `stress_pattern`
 * meta field. Format: groups separated by `;`, each group a comma-separated
 * list of weights mapped linearly onto the upper/lower bound range.
 * (Simplified port of `Sompyler/score/stressor.py::Stressor.of`.)
 *
 * Returns a function `(tick) → stress in [lower, upper]`.
 */
function buildStressor(meta: MeasureMeta): (tick: number) => number {
  const lo = meta.lowerStressBound
  const hi = meta.upperStressBound
  if (!meta.stressPattern) {
    return () => hi / 100
  }
  const groups = meta.stressPattern.split(';').map((g) => g.split(',').map(Number))
  const flat: number[] = []
  for (const group of groups) flat.push(...group)
  if (flat.length === 0) return () => hi / 100
  const maxLevel = Math.max(...flat, 1)
  return (tick: number) => {
    const level = flat[tick % flat.length] ?? 0
    const scaled = lo + ((hi - lo) * level) / maxLevel
    return scaled / 100
  }
}

/**
 * Parse a full `.spls` body into head + measures. Multiple `---`-separated
 * documents follow YAML's standard multi-doc convention; js-yaml gives them
 * back in order.
 */
export function parseScore(body: string): { head: ScoreHead; measures: unknown[] } {
  const docs = jsyaml.loadAll(body)
  if (docs.length === 0) throw new ScoreError('Score body is empty')
  const headDoc = docs[0]
  if (!headDoc || typeof headDoc !== 'object') {
    throw new ScoreError('Score head document must be a mapping')
  }
  const head = headDoc as Record<string, unknown>
  const stage = parseStage(head.stage)
  const result: ScoreHead = {
    stage,
    title: typeof head.title === 'string' ? head.title : undefined,
    author: typeof head.author === 'string' ? head.author : undefined,
    meta: typeof head.meta === 'object' && head.meta !== null ? (head.meta as Record<string, unknown>) : undefined,
    tuningConfig: typeof head.tuning_config === 'string' ? head.tuning_config : undefined,
    room: typeof head.room === 'string' ? head.room : undefined,
    inlinedInstruments:
      typeof head.inlined_instruments === 'object' && head.inlined_instruments !== null
        ? (head.inlined_instruments as Record<string, unknown>)
        : undefined,
  }
  return { head: result, measures: docs.slice(1) }
}

/**
 * Walk the parsed score, emitting one `RawNote` per (voice, offset, pitch)
 * occurrence in measure order. Stress is resolved against the active
 * stress pattern; tick durations are kept in ticks (conversion to seconds
 * happens once tempo profiles are wired up later).
 */
export function* walkMeasures(
  head: ScoreHead,
  measures: unknown[],
  positions: PositionStack = new PositionStack(),
): Generator<RawNote> {
  let activeMeta: MeasureMeta = DEFAULT_META
  for (let i = 0; i < measures.length; i++) {
    const measure = measures[i]
    if (!measure || typeof measure !== 'object') {
      log('parse', 'warn', `Skipping non-mapping measure at index ${i}`)
      continue
    }
    const m = measure as Record<string, unknown>
    const meta = '_meta' in m ? (m._meta as Record<string, unknown>) : undefined
    activeMeta = readMeta(meta, activeMeta)
    const measureName = '_id' in m ? String(m._id) : String(i)
    const stressOf = buildStressor(activeMeta)
    positions.push({ measure: measureName })

    try {
      for (const [voice, content] of Object.entries(m)) {
        if (voice.startsWith('_')) continue
        if (!(voice in head.stage)) {
          throw new ScoreError(`Voice '${voice}' not declared in stage`)
        }
        if (!content || typeof content !== 'object') {
          throw new ScoreError(`Voice '${voice}' content must be a mapping`)
        }
        positions.push({ voice })
        try {
          for (const [offsetKey, raw] of Object.entries(content as Record<string, unknown>)) {
            const offsetTicks = Number(offsetKey)
            if (Number.isNaN(offsetTicks)) {
              log('parse', 'warn', `Skipping non-numeric offset '${offsetKey}' in voice ${voice}`)
              continue
            }
            if (typeof raw !== 'string') {
              throw new ScoreError(`Note at ${voice}:${offsetKey} must be a string in v1`)
            }
            positions.push({ offset: offsetTicks })
            try {
              const parsed = parseShortNote(raw)
              yield {
                voice,
                offsetTicks,
                pitch: parsed.pitch,
                offScale: parsed.offScale,
                lengthTicks: parsed.lengthTicks,
                stress: stressOf(offsetTicks) * parsed.weight,
                damp: parsed.damp,
                staticArticles: parsed.staticArticles,
                shapeArticles: parsed.shapeArticles,
                measureIndex: i,
                measureName,
              }
            } finally {
              positions.pop()
            }
          }
        } finally {
          positions.pop()
        }
      }
    } finally {
      positions.pop()
    }
  }
}

export function ticksToSeconds(ticks: number, ticksPerMinute: number): number {
  return (ticks / ticksPerMinute) * 60
}
