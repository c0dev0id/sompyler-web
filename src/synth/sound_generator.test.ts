import { describe, it, expect } from 'vitest'
import { renderNote, applyRailsback, type RailsbackCurve, type MorphEntry } from './sound_generator'

describe('renderNote', () => {
  it('returns a buffer of the requested duration', () => {
    const pcm = renderNote({
      instrument: {},
      freqHz: 440,
      stress: 1,
      lengthSeconds: 0.5,
      sampleRate: 44100,
    })
    expect(pcm.length).toBe(44100 * 0.5)
  })

  it('renders silence when stress is zero', () => {
    const pcm = renderNote({
      instrument: { partials: [{ freqMult: 1, amp: 1 }] },
      freqHz: 440,
      stress: 0,
      lengthSeconds: 0.1,
    })
    let sumSq = 0
    for (const s of pcm) sumSq += s * s
    expect(sumSq).toBe(0)
  })

  it('clips to [-1, 1] after summation', () => {
    const pcm = renderNote({
      instrument: {
        partials: [
          { freqMult: 1, amp: 1 },
          { freqMult: 2, amp: 1 },
          { freqMult: 3, amp: 1 },
        ],
      },
      freqHz: 100,
      stress: 5,
      lengthSeconds: 0.1,
    })
    for (const s of pcm) {
      expect(s).toBeGreaterThanOrEqual(-1)
      expect(s).toBeLessThanOrEqual(1)
    }
  })

  it('produces output energy that scales with stress', () => {
    const opts = {
      instrument: { oscillator: { waveform: 'sin' as const }, envelope: { attack: 0.01, release: 0.01, sustainLevel: 1 } },
      freqHz: 440,
      lengthSeconds: 0.1,
    }
    const low = renderNote({ ...opts, stress: 0.25 })
    const high = renderNote({ ...opts, stress: 0.75 })
    const energy = (buf: Float32Array) => buf.reduce((acc, v) => acc + v * v, 0)
    expect(energy(high)).toBeGreaterThan(energy(low))
  })

  it('applies shape articles as multiplicative amplitude envelopes (S32200)', () => {
    const base = {
      instrument: {
        oscillator: { waveform: 'sin' as const },
        envelope: { attack: 0.001, release: 0.001, sustainLevel: 1 },
      },
      freqHz: 440,
      stress: 1,
      lengthSeconds: 0.2,
      sampleRate: 44100,
      lengthTicks: 8,
    }
    const dry = renderNote(base)
    // Linear ramp 0 → 1 across the note: peak energy lives in the second half.
    const ramp = renderNote({ ...base, shapeArticles: { vibrato: '1:0,0;1,1' } })
    const half = Math.floor(dry.length / 2)
    const energy = (buf: Float32Array, from: number, to: number) => {
      let s = 0
      for (let i = from; i < to; i++) s += buf[i]! * buf[i]!
      return s
    }
    expect(energy(ramp, 0, half)).toBeLessThan(energy(ramp, half, ramp.length))
    // The ramp must attenuate the start (silent at t=0).
    expect(energy(ramp, 0, half)).toBeLessThan(energy(dry, 0, half))
  })

  it('is a no-op when shapeArticles is empty or lengthTicks is missing', () => {
    const base = {
      instrument: {
        oscillator: { waveform: 'sin' as const },
        envelope: { attack: 0.001, release: 0.001, sustainLevel: 1 },
      },
      freqHz: 440,
      stress: 1,
      lengthSeconds: 0.1,
      sampleRate: 44100,
    }
    const baseline = renderNote(base)
    const empty = renderNote({ ...base, shapeArticles: {}, lengthTicks: 4 })
    const noTicks = renderNote({ ...base, shapeArticles: { vibrato: '1:0,0;1,1' } })
    expect(empty.length).toBe(baseline.length)
    for (let i = 0; i < baseline.length; i++) {
      expect(empty[i]).toBe(baseline[i])
      expect(noTicks[i]).toBe(baseline[i])
    }
  })

  it('extends the rendered buffer by dampSeconds (S51a10)', () => {
    const base = {
      instrument: {
        oscillator: { waveform: 'sin' as const },
        envelope: { attack: 0.01, release: 0.1, sustainLevel: 1 },
      },
      freqHz: 440,
      stress: 1,
      lengthSeconds: 0.2,
      sampleRate: 44100,
    }
    const dry = renderNote(base)
    const damped = renderNote({ ...base, dampSeconds: 0.3 })
    expect(damped.length).toBe(dry.length + Math.round(0.3 * 44100))
  })
})

describe('SPREAD (S32132)', () => {
  const base = {
    freqHz: 440,
    stress: 1,
    lengthSeconds: 0.05,
    sampleRate: 8000,
  }

  it('does not change output when spread is absent', () => {
    const without = renderNote({ ...base, instrument: { partials: [{ freqMult: 2, amp: 1 }] } })
    const with0 = renderNote({ ...base, instrument: { spread: [0], partials: [{ freqMult: 2, amp: 1 }] } })
    // Zero spread = no shift
    for (let i = 0; i < without.length; i++) {
      expect(with0[i]).toBeCloseTo(without[i]!, 6)
    }
  })

  it('shifts partial frequency by cumulative cents', () => {
    // A 1200-cent (one octave) spread on partial 1 doubles its frequency.
    // Compare RMS energy in a fixed window: different frequency → different waveform.
    const dry = renderNote({ ...base, instrument: { partials: [{ freqMult: 1, amp: 1 }] } })
    const shifted = renderNote({
      ...base,
      instrument: { spread: [1200], partials: [{ freqMult: 1, amp: 1 }] },
    })
    // Shifted (2× freq) and unshifted (1× freq) must differ
    let differ = false
    for (let i = 0; i < dry.length; i++) {
      if (Math.abs((dry[i] ?? 0) - (shifted[i] ?? 0)) > 1e-4) { differ = true; break }
    }
    expect(differ).toBe(true)
  })

  it('applies cumulative cents: spread [0, 1200] shifts partial 2 by 1200c', () => {
    // With [0, 1200]: partial 1 unchanged (0c), partial 2 shifted by 1200c.
    const twoPartial = {
      partials: [
        { freqMult: 1, amp: 1 },
        { freqMult: 2, amp: 1 },
      ],
    }
    const noSpread = renderNote({ ...base, instrument: twoPartial })
    const withSpread = renderNote({ ...base, instrument: { ...twoPartial, spread: [0, 1200] } })
    let differ = false
    for (let i = 0; i < noSpread.length; i++) {
      if (Math.abs((noSpread[i] ?? 0) - (withSpread[i] ?? 0)) > 1e-4) { differ = true; break }
    }
    expect(differ).toBe(true)
  })
})

describe('TIMBRE (S32134)', () => {
  const base = {
    freqHz: 440,
    stress: 1,
    lengthSeconds: 0.05,
    sampleRate: 8000,
    envelope: { attack: 0.001, release: 0.001, sustainLevel: 1 },
  }

  it('is neutral when all timbre values are 1.0', () => {
    const inst = { partials: [{ freqMult: 1, amp: 1 }, { freqMult: 2, amp: 1 }] }
    const dry = renderNote({ ...base, instrument: inst })
    // Flat timbre at 1.0 = neutral; 2 partials, width 2
    const wet = renderNote({ ...base, instrument: { ...inst, timbre: '2:1;1,1;2,1' } })
    for (let i = 0; i < dry.length; i++) {
      expect(wet[i]).toBeCloseTo(dry[i]!, 5)
    }
  })

  it('silences all partials when timbre is 0 everywhere', () => {
    const inst = { partials: [{ freqMult: 1, amp: 1 }, { freqMult: 2, amp: 1 }] }
    const wet = renderNote({ ...base, instrument: { ...inst, timbre: '2:0;1,0;2,0' } })
    for (const s of wet) expect(s).toBeCloseTo(0, 5)
  })

  it('attenuates later partials when timbre ramps down', () => {
    // Timbre: 1.0 at partial 1, 0.0 at partial 2. So partial 2 is silenced.
    const env = { attack: 0, release: 0, sustainLevel: 1 }
    const instA = { envelope: env, partials: [{ freqMult: 1, amp: 1 }] }
    const instAB = { envelope: env, partials: [{ freqMult: 1, amp: 1 }, { freqMult: 3.7, amp: 1 }] }
    const onePartial = renderNote({ ...base, instrument: instA })
    const twoPartialTimbre = renderNote({ ...base, instrument: { ...instAB, timbre: '2:1;1,1;2,0' } })
    // With timbre zeroing out partial 2, output should be close to single-partial
    let maxDiff = 0
    for (let i = 0; i < onePartial.length; i++) {
      maxDiff = Math.max(maxDiff, Math.abs((onePartial[i] ?? 0) - (twoPartialTimbre[i] ?? 0)))
    }
    expect(maxDiff).toBeLessThan(0.01)
  })
})

describe('MORPH (S32135)', () => {
  const base = {
    freqHz: 440,
    stress: 1,
    lengthSeconds: 0.1,
    sampleRate: 8000,
    lengthTicks: 4,
  }

  it('is a no-op when morph list is empty', () => {
    const inst = { partials: [{ freqMult: 1, amp: 1 }] }
    const dry = renderNote({ ...base, instrument: inst })
    const wet = renderNote({ ...base, instrument: { ...inst, morph: [] } })
    for (let i = 0; i < dry.length; i++) expect(wet[i]).toBeCloseTo(dry[i]!, 6)
  })

  it('silences a partial when its morph shape is all zeros', () => {
    const morph: MorphEntry[] = [{ divisor: 0, remainder: 2, weight: 1, shape: '1:0;1,0' }]
    // Two partials at very different frequencies; partial 2 morphed to silence
    const instA = { envelope: { attack: 0, release: 0, sustainLevel: 1 }, partials: [{ freqMult: 1, amp: 1 }] }
    const instAB = {
      ...instA,
      partials: [{ freqMult: 1, amp: 1 }, { freqMult: 7.3, amp: 1 }],
      morph,
    }
    const onePartial = renderNote({ ...base, instrument: instA })
    const twoMorphed = renderNote({ ...base, instrument: instAB })
    let maxDiff = 0
    for (let i = 0; i < onePartial.length; i++) {
      maxDiff = Math.max(maxDiff, Math.abs((onePartial[i] ?? 0) - (twoMorphed[i] ?? 0)))
    }
    expect(maxDiff).toBeLessThan(0.01)
  })

  it('applies morph as a time-varying envelope (ramp silences the start)', () => {
    const morph: MorphEntry[] = [{ divisor: 0, remainder: 1, weight: 1, shape: '1:0;1,1' }]
    const inst = {
      envelope: { attack: 0, release: 0, sustainLevel: 1 },
      partials: [{ freqMult: 1, amp: 1 }],
      morph,
    }
    const dry = renderNote({ ...base, instrument: { ...inst, morph: undefined } })
    const wet = renderNote({ ...base, instrument: inst })
    const half = Math.floor(dry.length / 2)
    const energy = (buf: Float32Array, from: number, to: number) =>
      Array.from(buf.slice(from, to)).reduce((s, v) => s + v * v, 0)
    // Morph ramp 0→1: first half has less energy than without morph
    expect(energy(wet, 0, half)).toBeLessThan(energy(dry, 0, half))
    // Second half gets more of the energy
    expect(energy(wet, half, wet.length)).toBeGreaterThan(energy(wet, 0, half) * 0.5)
  })

  it('matches modular patterns: "2n" matches partials 2, 4, ...; "0" = no partial matches', () => {
    // Modular: divisor=2, remainder=0 → matches even-indexed partials (2, 4, ...)
    const morph: MorphEntry[] = [{ divisor: 2, remainder: 0, weight: 1, shape: '1:0;1,0' }]
    const env = { attack: 0, release: 0, sustainLevel: 1 }
    const inst1 = { envelope: env, partials: [{ freqMult: 1, amp: 1 }] }
    const inst12 = {
      envelope: env,
      partials: [{ freqMult: 1, amp: 1 }, { freqMult: 6.1, amp: 1 }],
      morph,
    }
    const onePartial = renderNote({ ...base, instrument: inst1 })
    const twoMorphed = renderNote({ ...base, instrument: inst12 })
    // Partial 2 is silenced by 2n morph → output matches partial-1-only
    let maxDiff = 0
    for (let i = 0; i < onePartial.length; i++) {
      maxDiff = Math.max(maxDiff, Math.abs((onePartial[i] ?? 0) - (twoMorphed[i] ?? 0)))
    }
    expect(maxDiff).toBeLessThan(0.01)
  })
})

describe('applyRailsback (S32136)', () => {
  it('passes through when no curve is given', () => {
    expect(applyRailsback(440, undefined)).toBe(440)
  })

  it('passes through frequencies outside the curve range', () => {
    const curve = new Float32Array(88).fill(1)
    const rb: RailsbackCurve = { lowHz: 100, highHz: 1000, curve }
    expect(applyRailsback(50, rb)).toBe(50)
    expect(applyRailsback(2000, rb)).toBe(2000)
  })

  it('is a no-op when the curve is uniformly zero', () => {
    const curve = new Float32Array(88)
    const rb: RailsbackCurve = { lowHz: 100, highHz: 1000, curve }
    expect(applyRailsback(440, rb)).toBeCloseTo(440, 5)
  })

  it('shifts by 2^curve[i] when the curve is uniformly nonzero', () => {
    const curve = new Float32Array(88).fill(1)
    const rb: RailsbackCurve = { lowHz: 100, highHz: 1000, curve }
    // Uniform +1 octave for every in-range pitch.
    expect(applyRailsback(440, rb)).toBeCloseTo(880, 3)
  })

  it('produces deterministic output for a deterministic input', () => {
    const curve = new Float32Array(88)
    for (let i = 0; i < 88; i++) curve[i] = (i % 10) * 0.001
    const rb: RailsbackCurve = { lowHz: 27.5, highHz: 4186, curve }
    expect(applyRailsback(440, rb)).toBe(applyRailsback(440, rb))
  })
})
