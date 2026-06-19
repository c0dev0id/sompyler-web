import { describe, it, expect } from 'vitest'
import { Tuner, makeScale, parseTuning } from './tuning'
import { OffScaleError, TuningError } from '../errors'

/** Conformance against `sompyler/tests/test_intonation.py::test_equal_temp_tuner`. */
describe('Tuner (equal-temperament)', () => {
  const tuner = new Tuner()

  it('resolves A4 to 440Hz', () => {
    expect(tuner.frequencyOfTone('A4')).toBeCloseTo(440, 6)
  })

  it('resolves A3 to 220Hz', () => {
    expect(tuner.frequencyOfTone('A3')).toBeCloseTo(220, 6)
  })

  it('resolves C4 to 261.6256Hz', () => {
    expect(tuner.frequencyOfTone('C4')).toBeCloseTo(261.6256, 3)
  })

  it('resolves C5 to one octave above C4', () => {
    expect(tuner.frequencyOfTone('C5') / tuner.frequencyOfTone('C4')).toBeCloseTo(2, 6)
  })

  it('resolves D#4 and Eb4 to the same frequency', () => {
    expect(tuner.frequencyOfTone('D#4')).toBe(tuner.frequencyOfTone('Eb4'))
  })

  it('honours +Nk key-shift adjustment', () => {
    expect(tuner.frequencyOfTone('A4+12k')).toBeCloseTo(880, 6)
  })

  it('honours +Nc cent adjustment', () => {
    const cents100 = tuner.frequencyOfTone('A4+100c')
    expect(cents100 / 440).toBeCloseTo(Math.pow(2, 1 / 12), 6)
  })

  it('passes raw numeric frequencies through unchanged', () => {
    expect(tuner.frequencyOfTone(123.456)).toBe(123.456)
  })

  it('strips off-scale ! / ? flags', () => {
    expect(tuner.frequencyOfTone('A4!')).toBe(440)
    expect(tuner.frequencyOfTone('A4?')).toBe(440)
  })

  it('rejects unknown tone names', () => {
    expect(() => tuner.frequencyOfTone('X4')).toThrow()
  })
})

describe('makeScale', () => {
  it('builds a C-major scale from step list [2 2 1 2 2 2 1]', () => {
    const scale = makeScale('major', [2, 2, 1, 2, 2, 2, 1])
    expect(scale.positions).toEqual([0, 2, 4, 5, 7, 9, 11])
    expect(scale.members.has(0)).toBe(true)
    expect(scale.members.has(1)).toBe(false)
  })

  it('builds a G-major scale via root=7 with same step list', () => {
    const scale = makeScale('major', [2, 2, 1, 2, 2, 2, 1], { root: 7 })
    expect(scale.positions).toEqual([0, 2, 4, 6, 7, 9, 11])
  })

  it('rejects step lists that do not sum to tonesPerOctave', () => {
    expect(() => makeScale('bad', [2, 2, 2, 2])).toThrow(TuningError)
  })
})

describe('Tuner with scale (S53400)', () => {
  const tuner = new Tuner()
  const cmaj = makeScale('major', [2, 2, 1, 2, 2, 2, 1])

  it('returns literal Hz when pitch is in-scale and no flag is set', () => {
    expect(tuner.frequencyOfTone('C4', { scale: cmaj })).toBeCloseTo(261.6256, 3)
    expect(tuner.frequencyOfTone('E4', { scale: cmaj })).toBeCloseTo(329.6276, 3)
  })

  it('throws OffScaleError for an off-scale pitch without a flag', () => {
    expect(() => tuner.frequencyOfTone('C#4', { scale: cmaj })).toThrow(OffScaleError)
    expect(() => tuner.frequencyOfTone('C#4', { scale: cmaj, offScale: null })).toThrow(
      OffScaleError,
    )
  })

  it('snaps `?` off-scale notes to the nearest in-scale neighbour', () => {
    // C#4 (position 1) is 1 semitone above C (in scale) and 1 semitone below D
    // (in scale). Ties prefer the lower neighbour → snaps down to C4 (261.6256).
    expect(tuner.frequencyOfTone('C#4', { scale: cmaj, offScale: '?' })).toBeCloseTo(
      261.6256,
      3,
    )
    // F#4 (position 6) sits between F (in scale) and G (in scale). Tie → F.
    expect(tuner.frequencyOfTone('F#4', { scale: cmaj, offScale: '?' })).toBeCloseTo(
      349.2282,
      3,
    )
  })

  it('`!` off-scale forces the literal frequency through', () => {
    expect(tuner.frequencyOfTone('C#4', { scale: cmaj, offScale: '!' })).toBeCloseTo(
      277.1826,
      3,
    )
  })

  it('no scale → falls back to free 12-TET (off-scale notes pass through)', () => {
    expect(tuner.frequencyOfTone('C#4')).toBeCloseTo(277.1826, 3)
  })

  it('cent adjustments still apply on top of an in-scale resolution', () => {
    const c4 = tuner.frequencyOfTone('C4', { scale: cmaj })
    const c4plus50 = tuner.frequencyOfTone('C4+50c', { scale: cmaj })
    expect(c4plus50 / c4).toBeCloseTo(Math.pow(2, 0.5 / 12), 6)
  })

  it('key-shift adjustment moves a `?`-snapped note differently than a literal', () => {
    // C+1k = C# → off-scale → with `?` snaps back to C (down 1) so equals C4.
    expect(tuner.frequencyOfTone('C4+1k', { scale: cmaj, offScale: '?' })).toBeCloseTo(
      261.6256,
      3,
    )
    // Without scale, +1k just becomes C#4.
    expect(tuner.frequencyOfTone('C4+1k')).toBeCloseTo(277.1826, 3)
  })
})

describe('parseTuning', () => {
  it('extracts ref_frequency and tones_per_octave from basics block', () => {
    const t = parseTuning(`
basics:
  ref_frequency: 442
  ref_octave_number: 4
  ref_octave_offset: 9
  tones_per_octave: 12
`)
    expect(t.config.refFrequency).toBe(442)
    expect(t.config.tonesPerOctave).toBe(12)
  })

  it('parses scales as space-separated step strings', () => {
    const t = parseTuning(`
scales:
  major: "2 2 1 2 2 2 1"
  minor: "2 1 2 2 1 2 2"
`)
    expect(t.scales.major?.positions).toEqual([0, 2, 4, 5, 7, 9, 11])
    expect(t.scales.minor?.positions).toEqual([0, 2, 3, 5, 7, 8, 10])
  })

  it('parses scales as YAML arrays as well', () => {
    const t = parseTuning(`
scales:
  major: [2, 2, 1, 2, 2, 2, 1]
`)
    expect(t.scales.major?.positions).toEqual([0, 2, 4, 5, 7, 9, 11])
  })

  it('extracts default_scale name', () => {
    const t = parseTuning(`
scales:
  major: "2 2 1 2 2 2 1"
default_scale: major
`)
    expect(t.defaultScaleName).toBe('major')
  })

  it('rejects an unknown default_scale name', () => {
    expect(() =>
      parseTuning(`
scales:
  major: "2 2 1 2 2 2 1"
default_scale: blues
`),
    ).toThrow(/default_scale/)
  })
})
