import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetForTests } from '../storage/db'
import { putNote, listNoteKeys } from '../storage/notes'
import { renderAll } from './renderAll'
import { buildDistinctNotes } from './distinct'
import { loadInstrument } from '../parse/instrument'
import { Tuner } from '../parse/tuning'
import { renderNote } from '../synth/sound_generator'
import type { WorkerHandle } from './pool'
import type { RenderJob, RenderResult } from './workerClient'

const SCORE = `
title: render-all
stage:
  piano: 1|1 0 dev/piano
---
_meta:
  ticks_per_minute: 60
  stress_pattern: "1"
  lower_stress_bound: 100
  upper_stress_bound: 100
piano:
  0: A4 1
  1: C4 1
  2: A4 1
`

function syncWorkerFactory() {
  return (): WorkerHandle<RenderJob, RenderResult> => ({
    async submit(job) {
      const pcm = renderNote({
        instrument: job.input.instrument,
        freqHz: job.input.freqHz,
        stress: job.input.stress,
        lengthSeconds: job.input.lengthSeconds,
        sampleRate: job.input.sampleRate,
      })
      return { pcm, sampleRate: job.input.sampleRate ?? 44100 }
    },
    terminate() {},
  })
}

beforeEach(async () => {
  await resetForTests()
})

describe('renderAll', () => {
  it('renders every distinct note and reports progress', async () => {
    const piano = await loadInstrument('dev/piano', 'oscillator: sin')
    const plan = await buildDistinctNotes(SCORE, {
      tuner: new Tuner(),
      instruments: new Map([[piano.name, piano]]),
    })
    const progressCalls: number[] = []
    const result = await renderAll(plan, {
      poolSize: 2,
      workerFactory: syncWorkerFactory(),
      instruments: new Map([[piano.name, piano]]),
      compileInstrument: () => ({ partials: [{ freqMult: 1, amp: 1 }] }),
      onProgress: (p) => progressCalls.push(p.done),
    })
    expect(result.total).toBe(2)
    expect(result.rendered).toBe(2)
    expect(result.cacheHits).toBe(0)
    expect(progressCalls).toContain(2)
    const keys = await listNoteKeys()
    expect(keys).toHaveLength(2)
  })

  it('skips notes already in the cache', async () => {
    const piano = await loadInstrument('dev/piano', 'oscillator: sin')
    const plan = await buildDistinctNotes(SCORE, {
      tuner: new Tuner(),
      instruments: new Map([[piano.name, piano]]),
    })
    await putNote({
      key: plan.notes[0]!.key,
      pcm: new Float32Array(100),
      sampleRate: 44100,
    })
    const result = await renderAll(plan, {
      poolSize: 1,
      workerFactory: syncWorkerFactory(),
      instruments: new Map([[piano.name, piano]]),
      compileInstrument: () => ({}),
    })
    expect(result.cacheHits).toBe(1)
    expect(result.rendered).toBe(1)
  })

  it('orphan-sweeps keys not in the current plan', async () => {
    const piano = await loadInstrument('dev/piano', 'oscillator: sin')
    await putNote({ key: 'stale', pcm: new Float32Array(1), sampleRate: 44100 })
    const plan = await buildDistinctNotes(SCORE, {
      tuner: new Tuner(),
      instruments: new Map([[piano.name, piano]]),
    })
    const result = await renderAll(plan, {
      poolSize: 1,
      workerFactory: syncWorkerFactory(),
      instruments: new Map([[piano.name, piano]]),
      compileInstrument: () => ({}),
    })
    expect(result.orphansRemoved).toBe(1)
    const keys = await listNoteKeys()
    expect(keys).not.toContain('stale')
  })

  it('skips the orphan sweep on abort', async () => {
    const piano = await loadInstrument('dev/piano', 'oscillator: sin')
    await putNote({ key: 'stale', pcm: new Float32Array(1), sampleRate: 44100 })
    const plan = await buildDistinctNotes(SCORE, {
      tuner: new Tuner(),
      instruments: new Map([[piano.name, piano]]),
    })
    const controller = new AbortController()

    // Synthetic slow worker that times out long enough for abort to fire.
    const slowFactory = (): WorkerHandle<RenderJob, RenderResult> => ({
      async submit(job) {
        await new Promise((r) => setTimeout(r, 50))
        return { pcm: new Float32Array(1), sampleRate: job.input.sampleRate ?? 44100 }
      },
      terminate() {},
    })

    const promise = renderAll(plan, {
      poolSize: 1,
      workerFactory: slowFactory,
      instruments: new Map([[piano.name, piano]]),
      compileInstrument: () => ({}),
      signal: controller.signal,
    }).catch(() => undefined)
    setTimeout(() => controller.abort(), 10)
    await promise
    // 'stale' should still be present because sweep was skipped.
    const keys = await listNoteKeys()
    expect(keys).toContain('stale')
  })

  it('reports cache hits when re-running a fully-cached plan', async () => {
    const piano = await loadInstrument('dev/piano', 'oscillator: sin')
    const plan = await buildDistinctNotes(SCORE, {
      tuner: new Tuner(),
      instruments: new Map([[piano.name, piano]]),
    })
    const factory = syncWorkerFactory()
    await renderAll(plan, {
      poolSize: 2,
      workerFactory: factory,
      instruments: new Map([[piano.name, piano]]),
      compileInstrument: () => ({}),
    })
    const second = await renderAll(plan, {
      poolSize: 2,
      workerFactory: factory,
      instruments: new Map([[piano.name, piano]]),
      compileInstrument: () => ({}),
    })
    expect(second.cacheHits).toBe(2)
    expect(second.rendered).toBe(0)
  })
})
