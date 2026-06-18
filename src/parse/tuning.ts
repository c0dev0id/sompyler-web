import { TuningError } from '../errors'

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

export class Tuner {
  readonly config: TunerConfig

  constructor(config: Partial<TunerConfig> = {}) {
    this.config = { ...DEFAULT_TUNER_CONFIG, ...config }
  }

  /** Resolve a tone specifier (e.g. "A4", "C#5", or a numeric frequency) to Hz. */
  frequencyOfTone(spec: string | number): number {
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
    const semitonesFromRef = this.semitonesFromRef(inOctave, octave)

    let freq = this.frequencyFromSemitones(semitonesFromRef)
    for (const adj of parsed.adjustments) {
      if (adj.unit === 'k') {
        freq = this.frequencyFromSemitones(semitonesFromRef + adj.amount)
      } else if (adj.unit === 'c') {
        freq *= Math.pow(2, adj.amount / (100 * this.config.tonesPerOctave))
      }
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
