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

  it('accepts a rich character block without throwing', async () => {
    const i = await loadInstrument(
      'dev/piano',
      `character:
  - ATTR: pitch
    O: sin
    edb65p01:
      A: '.24:1,91;2,97;3,100'
    27:
      PROFILE:
        - "74 edb65p01"
`,
    )
    expect(() => compileInstrument(i)).not.toThrow()
  })

  it('compiles a railsback curve (S32136)', async () => {
    // Curve string mirrors the form used in lib/instruments/dev/piano.spli:68 —
    // bezier-only control points (no length prefix); the compiler prepends
    // "1:" before parsing, matching Sompyler's convention.
    const i = await loadInstrument(
      'dev/piano',
      `oscillator: sin
railsback:
  - 27
  - 4187
  - "-8+240;0,0;1,8;2,8;13,8;14,8;15,16"
`,
    )
    const spec = compileInstrument(i)
    expect(spec.railsback).toBeTruthy()
    expect(spec.railsback!.lowHz).toBe(27)
    expect(spec.railsback!.highHz).toBe(4187)
    expect(spec.railsback!.curve.length).toBe(88)
  })

  it('rejects a malformed railsback spec', async () => {
    const i = await loadInstrument('bad', 'railsback: [100, 50, "junk"]')
    expect(() => compileInstrument(i)).toThrow(/railsback bounds invalid/)
  })

  it('compiles top-level fm spec', async () => {
    const i = await loadInstrument(
      'dev/kick',
      `oscillator: sin
fm:
  freq_hz: 1
  depth: 3
  init_phase: 0.25
  depth_env: "100:1;1,0"
`,
    )
    const spec = compileInstrument(i)
    expect(spec.fm).toBeTruthy()
    expect(spec.fm!.freqHz).toBe(1)
    expect(spec.fm!.depth).toBe(3)
    expect(spec.fm!.initPhase).toBe(0.25)
    expect(spec.fm!.depthEnv).toBe('100:1;1,0')
  })

  it('compiles per-partial fm spec', async () => {
    const i = await loadInstrument(
      'dev/synth',
      `partials:
  - freqMult: 1
    amp: 1
    fm:
      freq_hz: 200
      depth: 0.5
      waveform: sin
      dynamic: false
`,
    )
    const spec = compileInstrument(i)
    expect(spec.partials).toHaveLength(1)
    expect(spec.partials![0]!.fm).toMatchObject({ freqHz: 200, depth: 0.5, waveform: 'sin' })
  })

  it('rejects fm with missing freq_hz', async () => {
    const i = await loadInstrument('bad', 'fm:\n  depth: 1')
    expect(() => compileInstrument(i)).toThrow(/freq_hz/)
  })

  it('rejects fm with negative depth', async () => {
    const i = await loadInstrument('bad', 'fm:\n  freq_hz: 1\n  depth: -1')
    expect(() => compileInstrument(i)).toThrow(/depth/)
  })

  it('rejects a character block with circular label refs (S32122)', async () => {
    const i = await loadInstrument(
      'bad',
      `character:
  - foobar:
      S: 'leaning on @bazqux'
    bazqux:
      S: 'leaning on @foobar'
`,
    )
    expect(() => compileInstrument(i)).toThrow(/Circular dependencies/)
  })
})
