import { describe, it, expect } from 'vitest'
import { renderNote, applyRailsback, type RailsbackCurve } from './sound_generator'

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
