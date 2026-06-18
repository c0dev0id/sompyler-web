import { describe, it, expect, beforeEach } from 'vitest'
import { resetForTests } from '../storage/db'
import { putNote } from '../storage/notes'
import { loadInstrument } from '../parse/instrument'
import { parseRoom } from '../parse/room'
import { Tuner } from '../parse/tuning'
import { buildDistinctNotes } from './distinct'
import { mixOnly, MissingNoteCacheError } from './mix'

const SCORE = `
title: mix-test
stage:
  piano: 1|1 0 dev/piano
  flute: 1|0 0 dev/piano
---
_meta:
  ticks_per_minute: 60
  stress_pattern: "1"
  lower_stress_bound: 100
  upper_stress_bound: 100
piano:
  0: A4 1
  1: C4 1
flute:
  0: A4 1
`

beforeEach(async () => {
  await resetForTests()
})

async function setUpPlan() {
  const piano = await loadInstrument('dev/piano', 'oscillator: sin')
  return await buildDistinctNotes(SCORE, {
    tuner: new Tuner(),
    instruments: new Map([[piano.name, piano]]),
  })
}

function constPCM(value: number, length: number): Float32Array {
  const a = new Float32Array(length)
  a.fill(value)
  return a
}

describe('mixOnly', () => {
  it('mixes cached notes into a stereo buffer', async () => {
    const plan = await setUpPlan()
    // Each note has length 1s @ 44100 Hz → 44100 samples.
    for (const note of plan.notes) {
      await putNote({ key: note.key, pcm: constPCM(0.1, 44100), sampleRate: 44100 })
    }
    const head = (await import('../parse/score')).parseScore(SCORE).head
    const result = await mixOnly(plan, head)

    expect(result.sampleRate).toBe(44100)
    expect(result.lengthSamples).toBe(2 * 44100)
    expect(result.left.length).toBe(2 * 44100)
    expect(result.right.length).toBe(2 * 44100)

    // Both voices play at t=0; piano centred (L=1,R=1), flute hard-left (L=1,R=0).
    // The left channel sees piano A4 + piano C4 (offset 1s) + flute A4.
    // The right channel sees only piano A4 + piano C4.
    expect(result.left[0]).toBeGreaterThan(0)
    expect(result.right[0]).toBeGreaterThan(0)
    expect(result.left[0]).toBeGreaterThan(result.right[0]!)
  })

  it('clips peaks to [-1, 1]', async () => {
    const plan = await setUpPlan()
    for (const note of plan.notes) {
      // Make each PCM value 2.0 — way above clip threshold.
      await putNote({ key: note.key, pcm: constPCM(2.0, 44100), sampleRate: 44100 })
    }
    const head = (await import('../parse/score')).parseScore(SCORE).head
    const result = await mixOnly(plan, head)
    let peak = 0
    for (let i = 0; i < result.lengthSamples; i++) {
      peak = Math.max(peak, Math.abs(result.left[i]!), Math.abs(result.right[i]!))
    }
    expect(peak).toBeLessThanOrEqual(1)
    expect(peak).toBeCloseTo(1, 5)
  })

  it('throws MissingNoteCacheError when any note is uncached', async () => {
    const plan = await setUpPlan()
    // Cache only the first note; second is missing.
    await putNote({ key: plan.notes[0]!.key, pcm: constPCM(0.1, 100), sampleRate: 44100 })
    const head = (await import('../parse/score')).parseScore(SCORE).head
    await expect(mixOnly(plan, head)).rejects.toThrow(MissingNoteCacheError)
  })

  it('respects note offsets when summing into the buffer', async () => {
    const plan = await setUpPlan()
    for (const note of plan.notes) {
      await putNote({ key: note.key, pcm: constPCM(0.1, 44100), sampleRate: 44100 })
    }
    const head = (await import('../parse/score')).parseScore(SCORE).head
    const result = await mixOnly(plan, head)
    // At t=0: piano+flute A4 left, piano A4 right.
    // At t=1: piano C4 only (piano A4 has ended).
    const atOne = Math.round(1 * 44100)
    const atZero = 0
    expect(result.left[atZero]).toBeGreaterThan(0)
    expect(result.left[atOne]).toBeGreaterThan(0)
    // The C4 note runs from t=1 to t=2 → last sample carries its value.
    expect(result.left[result.lengthSamples - 1]).toBeGreaterThan(0)
  })

  it('extends the buffer with a reverb tail when a Room is loaded', async () => {
    const plan = await setUpPlan()
    for (const note of plan.notes) {
      await putNote({ key: note.key, pcm: constPCM(0.1, 44100), sampleRate: 44100 })
    }
    const head = (await import('../parse/score')).parseScore(SCORE).head
    const room = parseRoom(`
levels: 8:100;1,50;2,30;4,10;7,0
delays: 1:0;1,1
`)
    const noRoom = await mixOnly(plan, head)
    const withRoom = await mixOnly(plan, head, { room })
    expect(withRoom.lengthSamples).toBeGreaterThan(noRoom.lengthSamples)
  })

  it('produces audibly different output when the Room changes', async () => {
    const plan = await setUpPlan()
    for (const note of plan.notes) {
      await putNote({ key: note.key, pcm: constPCM(0.1, 44100), sampleRate: 44100 })
    }
    const head = (await import('../parse/score')).parseScore(SCORE).head
    const smallRoom = parseRoom('levels: 4:100;1,40;3,10;4,0')
    const bigRoom = parseRoom('levels: 16:100;2,60;8,30;16,0')
    const a = await mixOnly(plan, head, { room: smallRoom })
    const b = await mixOnly(plan, head, { room: bigRoom })
    // Different rooms → different stereo energy distributions.
    const energyDelta =
      Math.abs(
        a.left.reduce((s, v) => s + v * v, 0) -
          b.left.reduce((s, v) => s + v * v, 0),
      )
    expect(energyDelta).toBeGreaterThan(0)
  })
})
