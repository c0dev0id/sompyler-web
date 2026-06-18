import { describe, it, expect } from 'vitest'
import { Tuner } from './tuning'

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
