import { OffScaleError, TuningError } from '../errors'
import jsyaml from 'js-yaml'

/**
 * Minimal port of `Sompyler/intonation.py` for Phase 1.
 *
 * Supports equal-temperament only (12-TET by default). Just-intonation,
 * microtuning (cent/key adjustments, retuning) are layered in during later
 * phases when synthesis exists to verify them.
 *
 * Conformance: A3 == 220Hz, C4 == 261.6256Hz (matches
 * `sompyler/tests/test_intonation.py::test_equal_temp_tuner`).
 */

const DEFAULT_TONES_PER_OCTAVE = 12

/** Anglo-Saxon tone names mapped to position within an octave. */
const ANGLOSAX_TONES: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1,
  D: 2, 'D#': 3, Eb: 3,
  E: 4, Fb: 4, 'E#': 5,
  F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8,
  A: 9, 'A#': 10, Bb: 10,
  B: 11, Cb: 11, 'B#': 0,
}

export interface TunerConfig {
  refFrequency: number
  /** Octave number containing the reference frequency (e.g. 4 for A4=440). */
  refOctaveNumber: number
  /** Position within `refOctaveNumber` where the reference tone sits (e.g. 9 for A). */
  refOctaveOffset: number
  tonesPerOctave: number
  tones: Record<string, number>
}

export const DEFAULT_TUNER_CONFIG: TunerConfig = {
  refFrequency: 440,
  refOctaveNumber: 4,
  refOctaveOffset: 9,
  tonesPerOctave: DEFAULT_TONES_PER_OCTAVE,
  tones: ANGLOSAX_TONES,
}

const TONE_SPEC_RX = /^([A-Ga-g][#b]?)(-?\d+)?((?:[+-]\d+[a-z])*)$/

interface ParsedToneSpec {
  toneName: string
  octave: number | undefined
  adjustments: { unit: string; amount: number }[]
}

function parseToneSpec(spec: string): ParsedToneSpec {
  const m = TONE_SPEC_RX.exec(spec)
  if (!m) throw new TuningError(`Cannot parse tone spec: ${spec}`)
  const [, toneName, octaveStr, adjStr] = m
  const adjustments: { unit: string; amount: number }[] = []
  if (adjStr) {
    const rx = /([+-]\d+)([a-z])/g
    let am
    while ((am = rx.exec(adjStr)) !== null) {
      adjustments.push({ amount: parseInt(am[1]!, 10), unit: am[2]! })
    }
  }
  return {
    toneName: toneName!,
    octave: octaveStr ? parseInt(octaveStr, 10) : undefined,
    adjustments,
  }
}

/**
 * S45000-4.5 + S53400. Minimal scale subset: a label plus the precomputed
 * set of in-scale positions within one octave (semitones for 12-TET). Built
 * from a step list like `mj = 2 2 1 2 2 2 1` (the cumulative sum modulo
 * `tonesPerOctave` gives the in-scale positions).
 *
 * The `root` is the semitone offset of the scale's tonic relative to C
 * (Sompyler's tuning-shift mechanic). `0` = C-rooted, `7` = G-rooted, etc.
 *
 * Subset of `Sompyler/intonation.py:Scale`. Defers: tempered intervals
 * (just-intonation cent values), chord-relative `^n` tones, `current_chord`
 * mode bias. Those become relevant when chord-relative pitch syntax lands.
 */
export interface Scale {
  name: string
  root: number
  tonesPerOctave: number
  /** Sorted ascending. Each entry is a semitone position within one octave. */
  positions: number[]
  /** Precomputed `positions.includes(...)` query. */
  members: Set<number>
}

export interface ParsedTuning {
  config: Partial<TunerConfig>
  scales: Record<string, Scale>
  defaultScaleName?: string
}

/**
 * Build a Scale from a step list (semitone deltas from the root). Throws if
 * the steps don't sum to `tonesPerOctave` (an invariant of a valid scale).
 */
export function makeScale(
  name: string,
  steps: number[],
  opts: { root?: number; tonesPerOctave?: number } = {},
): Scale {
  const tonesPerOctave = opts.tonesPerOctave ?? DEFAULT_TONES_PER_OCTAVE
  const root = opts.root ?? 0
  const sum = steps.reduce((a, b) => a + b, 0)
  if (sum !== tonesPerOctave) {
    throw new TuningError(
      `Scale '${name}' step list sums to ${sum} but tonesPerOctave is ${tonesPerOctave}`,
    )
  }
  const positions: number[] = []
  let pos = root % tonesPerOctave
  for (const step of steps) {
    positions.push(pos)
    pos = (pos + step) % tonesPerOctave
  }
  positions.sort((a, b) => a - b)
  return {
    name,
    root,
    tonesPerOctave,
    positions,
    members: new Set(positions),
  }
}

/**
 * Parse a YAML-form `.splt` body into tuner config + named scales.
 * Recognised top-level keys:
 *   - `basics:` → `ref_frequency`, `ref_octave_number`, `ref_octave_offset`, `tones_per_octave`
 *   - `scales:` → mapping of name → space-separated step string or `[2, 2, 1, …]` list.
 *   - `default_scale:` → name of one of the scales (becomes the active scale).
 *
 * The richer INI-style RFC §S45000 surface (intervals as `15:1`, alt
 * tone-name tables, chord patterns) lands once a consumer needs it.
 */
export function parseTuning(body: string): ParsedTuning {
  const doc = jsyaml.load(body) as Record<string, unknown> | null
  if (!doc || typeof doc !== 'object') {
    throw new TuningError('Tuning file body must be a YAML mapping')
  }
  const config: Partial<TunerConfig> = {}
  const basics = doc.basics
  if (basics && typeof basics === 'object') {
    const b = basics as Record<string, unknown>
    if ('ref_frequency' in b) config.refFrequency = Number(b.ref_frequency)
    if ('ref_octave_number' in b) config.refOctaveNumber = Number(b.ref_octave_number)
    if ('ref_octave_offset' in b) config.refOctaveOffset = Number(b.ref_octave_offset)
    if ('tones_per_octave' in b) config.tonesPerOctave = Number(b.tones_per_octave)
  }
  const scales: Record<string, Scale> = {}
  const tonesPerOctave = config.tonesPerOctave ?? DEFAULT_TONES_PER_OCTAVE
  const scalesBlock = doc.scales
  if (scalesBlock && typeof scalesBlock === 'object') {
    for (const [name, raw] of Object.entries(scalesBlock as Record<string, unknown>)) {
      let steps: number[]
      if (Array.isArray(raw)) {
        steps = raw.map((x) => Number(x))
      } else if (typeof raw === 'string') {
        steps = raw.trim().split(/\s+/).map((s) => Number(s))
      } else {
        throw new TuningError(`Scale '${name}' must be a step list (string or array)`)
      }
      if (steps.some((s) => Number.isNaN(s))) {
        throw new TuningError(`Scale '${name}' contains non-numeric step`)
      }
      scales[name] = makeScale(name, steps, { tonesPerOctave })
    }
  }
  const defaultScaleName =
    typeof doc.default_scale === 'string' ? doc.default_scale : undefined
  if (defaultScaleName && !(defaultScaleName in scales)) {
    throw new TuningError(`default_scale '${defaultScaleName}' is not declared in scales`)
  }
  return { config, scales, defaultScaleName }
}

export interface FrequencyOpts {
  /** Active scale to enforce S53400 against. `undefined` = no scale check. */
  scale?: Scale
  /** Per-note off-scale flag from the score: `?` snap, `!` literal, `null` strict. */
  offScale?: '?' | '!' | null
}

export class Tuner {
  readonly config: TunerConfig

  constructor(config: Partial<TunerConfig> = {}) {
    this.config = { ...DEFAULT_TUNER_CONFIG, ...config }
  }

  /**
   * Resolve a tone specifier (e.g. "A4", "C#5", or a numeric frequency) to Hz.
   *
   * When `opts.scale` is defined, the resolved key is checked against the
   * scale per S53400:
   *  - `offScale === '?'` → snap to the nearest in-scale semitone. The
   *    snapped Hz enters the cache key naturally (R8 amendment).
   *  - `offScale === '!'` → bypass the check; return the literal Hz.
   *  - `offScale === null`/undefined + off-scale → throw `OffScaleError`
   *    (caller surfaces it as a render diagnostic via R6).
   */
  frequencyOfTone(spec: string | number, opts: FrequencyOpts = {}): number {
    if (typeof spec === 'number') return spec

    // Numeric strings pass through as raw frequencies (matches Sompyler).
    if (/^\d+(\.\d+)?$/.test(spec) && spec.includes('.')) {
      return parseFloat(spec)
    }

    // Score-side parser strips `?`/`!` off-scale flags before reaching us.
    // Tolerate them defensively for callers wiring raw pitch strings.
    let toneSpec = spec
    if (toneSpec.endsWith('!') || toneSpec.endsWith('?')) {
      toneSpec = toneSpec.slice(0, -1)
    }

    const parsed = parseToneSpec(toneSpec)
    const inOctave = this.config.tones[parsed.toneName]
    if (inOctave === undefined) {
      throw new TuningError(`Unknown tone name: ${parsed.toneName}`)
    }

    const octave = parsed.octave ?? this.config.refOctaveNumber
    let semitonesFromRef = this.semitonesFromRef(inOctave, octave)

    // Apply key-shift adjustments *before* the scale check so a flat/sharp
    // accidental moves the note into / out of the scale as intended.
    let centDelta = 0
    for (const adj of parsed.adjustments) {
      if (adj.unit === 'k') semitonesFromRef += adj.amount
      else if (adj.unit === 'c') centDelta += adj.amount
    }

    if (opts.scale && opts.offScale !== '!') {
      const position = mod(semitonesFromRef + this.config.refOctaveOffset, opts.scale.tonesPerOctave)
      if (!opts.scale.members.has(position)) {
        if (opts.offScale === '?') {
          semitonesFromRef += nearestInScaleDelta(position, opts.scale)
        } else {
          throw new OffScaleError(
            `Pitch '${spec}' (position ${position}) is off scale '${opts.scale.name}'`,
            { spec, scale: opts.scale.name, position },
          )
        }
      }
    }

    let freq = this.frequencyFromSemitones(semitonesFromRef)
    if (centDelta !== 0) {
      freq *= Math.pow(2, centDelta / (100 * this.config.tonesPerOctave))
    }
    return freq
  }

  private semitonesFromRef(positionInOctave: number, octave: number): number {
    return (
      (octave - this.config.refOctaveNumber) * this.config.tonesPerOctave +
      (positionInOctave - this.config.refOctaveOffset)
    )
  }

  private frequencyFromSemitones(semitones: number): number {
    return this.config.refFrequency * Math.pow(2, semitones / this.config.tonesPerOctave)
  }
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

/**
 * Return the signed semitone delta from `position` to the nearest in-scale
 * semitone. Ties prefer the lower (downward) neighbour, matching Sompyler's
 * `intonation.py` line 213 (shift direction defaults to ±1 when `shift` is
 * zero, and tested down then up at equal distance).
 */
function nearestInScaleDelta(position: number, scale: Scale): number {
  const tpo = scale.tonesPerOctave
  for (let bias = 1; bias < tpo; bias++) {
    if (scale.members.has(mod(position - bias, tpo))) return -bias
    if (scale.members.has(mod(position + bias, tpo))) return bias
  }
  // Should be unreachable for a non-empty scale, but defensible.
  throw new OffScaleError(
    `No in-scale neighbour found for position ${position} in scale ${scale.name}`,
    { position, scale: scale.name },
  )
}
