import jsyaml from 'js-yaml'
import { ScoreError } from '../errors'
import { log } from '../debug'
import { PositionStack } from './position'
import { expandMultiMeasures } from './multimeasure'
import { expandChainString } from './chain'
import { Tuner } from './tuning'

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
  /**
   * S32200/RFC §S46140 tempo Shape profile. When present, per-tick TPM
   * varies over the measure; `buildDistinctNotes` integrates 60/tpm[t]
   * to derive each note's offsetSeconds / lengthSeconds. Constant
   * `ticksPerMinute` stays the fast-path default.
   */
  tempo?: string
  /** S46170 per-tick duration multipliers (stressor format). */
  elasticksPattern?: string
  /** S46180 Shape string applied as exponentiation on top of elasticksPattern. */
  elasticksShape?: string
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
  /**
   * S432b0 continuum article values: `START-END` linear ramp resolved at
   * render time using the note's tick offset within the measure.
   */
  continuumArticles: Record<string, { start: number; end: number }>
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
  continuumArticles: Record<string, { start: number; end: number }>
}

const CONTINUUM_RX = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/

/**
 * Classify an article value. Shape literals (containing `:`, `;`, or `,`)
 * route to `shapeArticles`. Continuum `START-END` (S432b0) routes to
 * `continuumArticles`. Booleans and numeric literals become typed statics;
 * anything else is kept as a bare identifier string.
 */
function classifyAttrValue(raw: string):
  | { kind: 'shape'; value: string }
  | { kind: 'continuum'; start: number; end: number }
  | { kind: 'static'; value: number | boolean | string } {
  if (raw === 'true' || raw === 'yes') return { kind: 'static', value: true }
  if (raw === 'false' || raw === 'no') return { kind: 'static', value: false }
  if (/[:;,]/.test(raw)) return { kind: 'shape', value: raw }
  const continuumM = CONTINUUM_RX.exec(raw)
  if (continuumM) {
    return { kind: 'continuum', start: parseFloat(continuumM[1]!), end: parseFloat(continuumM[2]!) }
  }
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
  const continuumArticles: Record<string, { start: number; end: number }> = {}
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
      else if (cls.kind === 'continuum') continuumArticles[k] = { start: cls.start, end: cls.end }
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
    continuumArticles,
  }
}

function readMeta(metaBlock: Record<string, unknown> | undefined, fallback: MeasureMeta): MeasureMeta {
  if (!metaBlock) return fallback
  const next: MeasureMeta = { ...fallback }
  if ('ticks_per_minute' in metaBlock) next.ticksPerMinute = Number(metaBlock.ticks_per_minute)
  if ('stress_pattern' in metaBlock) next.stressPattern = String(metaBlock.stress_pattern)
  if ('lower_stress_bound' in metaBlock) next.lowerStressBound = Number(metaBlock.lower_stress_bound)
  if ('upper_stress_bound' in metaBlock) next.upperStressBound = Number(metaBlock.upper_stress_bound)
  if ('tempo' in metaBlock) {
    next.tempo = typeof metaBlock.tempo === 'string' ? metaBlock.tempo : String(metaBlock.tempo)
  } else if ('ticks_per_minute' in metaBlock) {
    next.tempo = undefined
  }
  if ('elasticks_pattern' in metaBlock) {
    next.elasticksPattern =
      typeof metaBlock.elasticks_pattern === 'string' ? metaBlock.elasticks_pattern : undefined
    next.elasticksShape = undefined
  }
  if ('elasticks_shape' in metaBlock) {
    next.elasticksShape =
      typeof metaBlock.elasticks_shape === 'string' ? metaBlock.elasticks_shape : undefined
  }
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
 * S46232: expand a possibly-composite offset key into one or more tick values.
 *   "4"       → [4]
 *   "0,4,8"   → [0, 4, 8]
 *   "0+2*3"   → [0, 2, 4]   (start=0, step=2, count=3)
 *   "0+2"     → [0]         (step given, count defaults to 1)
 */
export function expandOffsetKey(key: string): number[] {
  const out: number[] = []
  for (const interval of String(key).split(',')) {
    const t = interval.trim()
    const m = /^(\d+(?:\.\d+)?)(?:\+(\d+)(?:\*(\d+))?)?$/.exec(t)
    if (!m) {
      const n = Number(t)
      if (Number.isFinite(n)) out.push(n)
      continue
    }
    const start = parseFloat(m[1]!)
    const dist = m[2] ? parseInt(m[2], 10) : 0
    const times = m[3] ? parseInt(m[3], 10) : 1
    if (dist === 0) {
      out.push(start)
    } else {
      for (let i = 0; i < times; i++) out.push(start + i * dist)
    }
  }
  return out
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
  return { head: result, measures: expandMultiMeasures(docs.slice(1)) }
}

const FIRST_PITCH_RX = /\b([A-Ga-g][#b]?-?\d+)\b/

/**
 * Scan the score body and return the Hz of the first note played by the
 * given instrument, or null if the instrument is not in the score.
 * Used to pick a musically meaningful preview pitch for the instrument panel.
 */
export function firstInstrumentPitchHz(scoreBody: string, instrumentName: string): number | null {
  try {
    const { head, measures } = parseScore(scoreBody)

    const voices = new Set<string>()
    for (const [voice, sv] of Object.entries(head.stage)) {
      if (sv.instrument === instrumentName) voices.add(voice)
    }
    if (voices.size === 0) return null

    const tuner = new Tuner()

    for (const measure of measures) {
      if (!measure || typeof measure !== 'object') continue
      const doc = measure as Record<string, unknown>
      for (const voice of voices) {
        const content = doc[voice]
        if (!content || content === false) continue

        let pitchStr: string | null = null
        if (typeof content === 'string') {
          pitchStr = FIRST_PITCH_RX.exec(content)?.[1] ?? null
        } else if (typeof content === 'object' && !Array.isArray(content)) {
          for (const val of Object.values(content as Record<string, unknown>)) {
            if (typeof val === 'string') { pitchStr = val.trim().split(/\s+/)[0] ?? null; break }
          }
        }

        if (pitchStr) {
          try { return tuner.frequencyOfTone(pitchStr) } catch { /* skip unparseable pitch */ }
        }
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Walk the parsed score, emitting one `RawNote` per (voice, offset, pitch)
 * occurrence in measure order. Stress is resolved against the active
 * stress pattern; tick durations are kept in ticks (conversion to seconds
 * happens once tempo profiles are wired up later).
 *
 * **S46110 measure inheritance (RFC §4.6.1.1)**. Two mechanisms, ported from
 * `Sompyler/score/measure.py:Measure.__init__` lines 226–239:
 *
 * - A voice whose value is `true` (YAML scalar `true` / boolean) copies its
 *   content from the previous measure's same voice. Explicit per-voice opt-in.
 * - `_meta.repeat_unmentioned_voices: true` switches the copy to implicit for
 *   *every* previous-measure voice not redefined in the current measure. The
 *   flag itself is not inherited — it only applies to the measure that sets it.
 *
 * Forward-doors S47000 multimeasure constructs (`_loop`, `|`, `*n`, `%n`) and
 * voice-level `_inherit:` shapes — neither is in v1 scope.
 */
export function* walkMeasures(
  head: ScoreHead,
  measures: unknown[],
  positions: PositionStack = new PositionStack(),
): Generator<RawNote> {
  let activeMeta: MeasureMeta = DEFAULT_META
  // Voice content can be an offset-key mapping (Record) or a chain string.
  const previousVoices: Map<string, Record<string, unknown> | string> = new Map()
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

    // S46193: skip=true → measure produces no notes and no elapsed time.
    if (meta?.skip === true) {
      log('parse', 'info', `Skipping measure ${measureName} (_meta.skip)`)
      continue
    }

    // S46192: positive cut=N → drop notes that start before tick N and
    // shift remaining note offsets left by N.
    const cut = typeof meta?.cut === 'number' ? meta.cut : 0

    const stressOf = buildStressor(activeMeta)
    positions.push({ measure: measureName })

    const repeatUnmentioned = !!(meta && meta.repeat_unmentioned_voices === true)

    const resolvedVoices: Record<string, Record<string, unknown> | string> = {}
    for (const [voice, content] of Object.entries(m)) {
      if (voice.startsWith('_')) continue
      if (content === true) {
        const prev = previousVoices.get(voice)
        if (!prev) {
          throw new ScoreError(
            `Voice '${voice}' inherits from previous measure, but no prior content for it`,
          )
        }
        resolvedVoices[voice] = prev
        continue
      }
      if (content === false) {
        previousVoices.delete(voice)
        continue
      }
      // S53000 chain syntax: a plain string value triggers the chain parser.
      if (typeof content === 'string') {
        resolvedVoices[voice] = content
        continue
      }
      if (!content || typeof content !== 'object') {
        throw new ScoreError(`Voice '${voice}' content must be a mapping or chain string`)
      }
      resolvedVoices[voice] = content as Record<string, unknown>
    }
    if (repeatUnmentioned) {
      for (const [voice, prev] of previousVoices) {
        if (voice in resolvedVoices) continue
        resolvedVoices[voice] = prev
      }
    }

    try {
      for (const [voice, content] of Object.entries(resolvedVoices)) {
        if (!(voice in head.stage)) {
          throw new ScoreError(`Voice '${voice}' not declared in stage`)
        }
        positions.push({ voice })
        try {
          // S53000: chain string voice — no explicit offset keys.
          if (typeof content === 'string') {
            const chainNotes = expandChainString(content)
            for (const cn of chainNotes) {
              if (cut > 0 && cn.offsetTicks < cut) continue
              positions.push({ offset: cn.offsetTicks })
              try {
                yield {
                  voice,
                  offsetTicks: cn.offsetTicks,
                  pitch: cn.pitch,
                  offScale: cn.offScale,
                  lengthTicks: cn.lengthTicks,
                  stress: stressOf(cn.offsetTicks),
                  damp: 0,
                  staticArticles: {},
                  shapeArticles: {},
                  continuumArticles: {},
                  measureIndex: i,
                  measureName,
                }
              } finally {
                positions.pop()
              }
            }
          } else {
          for (const [offsetKey, raw] of Object.entries(content as Record<string, unknown>)) {
            // S46232: offset keys can be composite ("0,4,8" or "0+2*3").
            const expandedOffsets = expandOffsetKey(offsetKey)
            if (expandedOffsets.length === 0) {
              log('parse', 'warn', `Skipping unrecognised offset '${offsetKey}' in voice ${voice}`)
              continue
            }
            if (typeof raw !== 'string') {
              throw new ScoreError(`Note at ${voice}:${offsetKey} must be a string in v1`)
            }
            const parsed = parseShortNote(raw)
            for (const rawOffset of expandedOffsets) {
              // S46192: positive cut — drop notes before the cut point.
              // Survivors keep their original tick positions so the full
              // measure span (including the silent cut range) counts toward
              // the timeline. The cumulative offset advances by the full
              // measure duration; there is no left-shift of surviving notes.
              if (cut > 0 && rawOffset < cut) continue
              const offsetTicks = rawOffset
              positions.push({ offset: offsetTicks })
              try {
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
                  continuumArticles: parsed.continuumArticles,
                  measureIndex: i,
                  measureName,
                }
              } finally {
                positions.pop()
              }
            }
          }
          } // end offset-key else branch
        } finally {
          positions.pop()
        }
      }
    } finally {
      positions.pop()
    }

    for (const [voice, content] of Object.entries(resolvedVoices)) {
      previousVoices.set(voice, content)
    }

    // S46195: is_last=true → halt after this measure; ignore subsequent ones.
    if (meta?.is_last === true) {
      log('parse', 'info', `Halting at measure ${measureName} (_meta.is_last)`)
      return
    }
  }
}

export function ticksToSeconds(ticks: number, ticksPerMinute: number): number {
  return (ticks / ticksPerMinute) * 60
}
