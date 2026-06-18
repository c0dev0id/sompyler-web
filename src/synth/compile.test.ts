import { describe, it, expect } from 'vitest'
import { loadInstrument } from '../parse/instrument'
import { compileInstrument } from './compile'
import { InstrumentError } from '../errors'

describe('compileInstrument', () => {
  it('compiles a minimal sin instrument', async () => {
    const i = await loadInstrument('dev/sin', 'oscillator: sin')
    const spec = compileInstrument(i)
    expect(spec.oscillator).toEqual({ waveform: 'sin' })
  })

  it('compiles partials with envelope + amp', async () => {
    const i = await loadInstrument(
      'dev/piano',
      `amp: 0.5
envelope:
  attack: 0.01
  release: 0.3
  sustainLevel: 0.7
partials:
  - { freqMult: 1, amp: 1.0 }
  - { freqMult: 2, amp: 0.5 }`,
    )
    const spec = compileInstrument(i)
    expect(spec.amp).toBe(0.5)
    expect(spec.envelope).toEqual({ attack: 0.01, release: 0.3, sustainLevel: 0.7 })
    expect(spec.partials).toHaveLength(2)
    expect(spec.partials![0]).toMatchObject({ freqMult: 1, amp: 1.0 })
    expect(spec.partials![1]).toMatchObject({ freqMult: 2, amp: 0.5 })
  })

  it('rejects unknown waveform', async () => {
    const i = await loadInstrument('bad', 'oscillator: kazoo')
    expect(() => compileInstrument(i)).toThrow(InstrumentError)
  })

  it('rejects non-mapping body', async () => {
    const i = await loadInstrument('bad', '"just a string"')
    expect(() => compileInstrument(i)).toThrow(InstrumentError)
  })
})
