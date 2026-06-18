import { describe, it, expect } from 'vitest'
import { renderNote } from './sound_generator'

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
})
