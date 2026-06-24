import { describe, it, expect } from 'vitest'
import { loadInstrument } from '../parse/instrument'
import { compileInstrument } from './compile'
import { InstrumentError } from '../errors'

describe('compileInstrument', () => {
  it('compiles a minimal sine instrument via character block', async () => {
    const i = await loadInstrument(
      'dev/sin',
      `character:
  O: sine`,
    )
    const spec = compileInstrument(i)
    expect(spec.oscillator).toEqual({ waveform: 'sin' })
  })

  it('compiles PROFILE + envelope + amp via character block', async () => {
    const i = await loadInstrument(
      'dev/piano',
      `character:
  O: sine
  AMP: 0.5
  A: "0.01:1,100"
  S: "0.0:100;1,70"
  R: "0.3:100;1,0"
  PROFILE: [100, 50]`,
    )
    const spec = compileInstrument(i)
    expect(spec.amp).toBe(0.5)
    expect(spec.envelope).toMatchObject({ attack: 0.01, release: 0.3, sustainLevel: 0.7 })
    expect(spec.partials).toHaveLength(2)
    expect(spec.partials![0]).toMatchObject({ freqMult: 1, amp: 1.0 })
    // V=50 → 10^(-5*(1-50/100)) = 10^-2.5 ≈ 0.003162 (RFC %dB scale)
    expect(spec.partials![1]!.amp).toBeCloseTo(Math.pow(10, -2.5), 10)
  })

  it('compiles VOLUMES alone → implicit partials at those amplitudes', async () => {
    const i = await loadInstrument(
      'dev/piano',
      `character:
  O: sine
  VOLUMES: [100, 50]`,
    )
    const spec = compileInstrument(i)
    expect(spec.partials).toHaveLength(2)
    expect(spec.partials![0]).toMatchObject({ freqMult: 1, amp: 1.0 })
    expect(spec.partials![1]!.amp).toBeCloseTo(Math.pow(10, -2.5), 10)
  })

  it('compiles VOLUMES + PROFILE: V values are additive on top of VOLUMES', async () => {
    const i = await loadInstrument(
      'dev/piano',
      `character:
  O: sine
  VOLUMES: [80, 60]
  PROFILE:
    - 10
    - V: 5`,
    )
    const spec = compileInstrument(i)
    // Partial 1: 10 + 80 = 90 REVERSED_DBFS
    expect(spec.partials![0]!.amp).toBeCloseTo(Math.pow(10, -5 * (1 - 90 / 100)), 10)
    // Partial 2: 5 + 60 = 65 REVERSED_DBFS
    expect(spec.partials![1]!.amp).toBeCloseTo(Math.pow(10, -5 * (1 - 65 / 100)), 10)
  })

  it('compiles VOLUMES longer than PROFILE → extra implicit partials from VOLUMES', async () => {
    const i = await loadInstrument(
      'dev/piano',
      `character:
  O: sine
  VOLUMES: [100, 80, 60]
  PROFILE:
    - 0`,
    )
    const spec = compileInstrument(i)
    expect(spec.partials).toHaveLength(3)
    // Partial 1: PROFILE 0 + VOLUMES 100 = 100
    expect(spec.partials![0]!.amp).toBeCloseTo(1.0, 10)
    // Partial 2: implicit (V=0) + VOLUMES 80 = 80
    expect(spec.partials![1]!.amp).toBeCloseTo(Math.pow(10, -5 * (1 - 80 / 100)), 10)
    // Partial 3: implicit (V=0) + VOLUMES 60 = 60
    expect(spec.partials![2]!.amp).toBeCloseTo(Math.pow(10, -5 * (1 - 60 / 100)), 10)
  })

  it('compiles complex PROFILE entry with per-partial A: envelope override', async () => {
    const i = await loadInstrument(
      'dev/piano',
      `character:
  O: sine
  A: "0.01:1,100"
  S: "0.1:100;1,80"
  R: "0.3:100;1,0"
  PROFILE:
    - 100
    - V: 72
      A: "0.05:1,100"`,
    )
    const spec = compileInstrument(i)
    expect(spec.partials).toHaveLength(2)
    // First partial: simple numeric — no per-partial envelope
    expect(spec.partials![0]!.envelope).toBeUndefined()
    // Second partial: A overridden to 0.05s; S and R inherited from root
    const env = spec.partials![1]!.envelope!
    expect(env).toBeDefined()
    expect(env.attack).toBeCloseTo(0.05)
    expect(env.sustainLevel).toBeCloseTo(0.8)
    expect(env.release).toBeCloseTo(0.3)
  })

  it('compiles complex PROFILE entry with D: deviance', async () => {
    const i = await loadInstrument(
      'dev/piano',
      `character:
  O: sine
  PROFILE:
    - 100
    - V: 80
      D: 14`,
    )
    const spec = compileInstrument(i)
    expect(spec.partials![1]!.devianceCents).toBe(14)
    expect(spec.partials![0]!.devianceCents).toBeUndefined()
  })

  it('rejects unknown waveform', async () => {
    const i = await loadInstrument(
      'bad',
      `character:
  O: kazoo`,
    )
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

  it('compiles a railsback curve via RAILSBACK_CURVE in character block (S32136)', async () => {
    const i = await loadInstrument(
      'dev/piano',
      `character:
  O: sine
  RAILSBACK_CURVE:
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

  it('rejects a malformed RAILSBACK_CURVE spec', async () => {
    const i = await loadInstrument(
      'bad',
      `character:
  RAILSBACK_CURVE: [100, 50, "junk"]`,
    )
    expect(() => compileInstrument(i)).toThrow(/railsback bounds invalid/)
  })

  it('compiles FM: string in character block (RFC §S32117)', async () => {
    const i = await loadInstrument(
      'dev/kick',
      `character:
  O: sine
  A: "0.002:1,100"
  R: "0.3:100;1,0"
  FM: "1[100:1;1,0];15:1+90"
`,
    )
    const spec = compileInstrument(i)
    expect(spec.fm).toBeTruthy()
    expect(spec.fm!.freqHz).toBe(1)
    expect(spec.fm!.modShare).toBe(15)
    expect(spec.fm!.baseShare).toBe(1)
    expect(spec.fm!.initPhase).toBeCloseTo(0.25, 5)
    expect(spec.fm!.depthEnv).toBe('100:1;1,0')
  })

  it('compiles AM: string in character block (RFC §S32116)', async () => {
    const i = await loadInstrument(
      'dev/am',
      `character:
  O: sine
  AM: "2f@sin;3:1"
`,
    )
    const spec = compileInstrument(i)
    expect(spec.am).toBeTruthy()
    expect(spec.am!.freqHz).toBe(2)
    expect(spec.am!.dynamic).toBe('f')
    expect(spec.am!.modShare).toBe(3)
    expect(spec.am!.baseShare).toBe(1)
  })

  it('rejects FM: with invalid syntax', async () => {
    const i = await loadInstrument('bad', 'character:\n  O: sine\n  FM: "notvalid"')
    expect(() => compileInstrument(i)).toThrow(/FM/)
  })

  it('rejects FM: with negative BASE', async () => {
    const i = await loadInstrument('bad', 'character:\n  O: sine\n  FM: "1;3:0"')
    expect(() => compileInstrument(i)).toThrow(/FM/)
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
