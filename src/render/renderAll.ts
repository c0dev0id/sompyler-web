import { log } from '../debug'
import { orphanSweep, putNote, hasNote } from '../storage/notes'
import type { DistinctRenderPlan } from './distinct'
import { Pool, type WorkerFactory } from './pool'
import type { RenderJob, RenderResult } from './workerClient'
import type { InstrumentSpec } from '../synth/sound_generator'
import type { Instrument } from '../parse/instrument'

/**
 * Phase 4: orchestrate synthesis for one render run. Walk the plan,
 * dispatch every cache-miss note to the pool, store the result PCM in
 * the `notes` object store, then orphan-sweep keys that fell out of
 * scope (R1). Cancellation hard-terminates the pool (R4).
 */

export interface RenderAllOptions {
  poolSize?: number
  workerFactory: WorkerFactory<RenderJob, RenderResult>
  instruments: Map<string, Instrument>
  /** YAML-text → compiled InstrumentSpec. Phase 8 plugs in the real compiler. */
  compileInstrument: (instrument: Instrument) => InstrumentSpec
  sampleRate?: number
  onProgress?: (progress: RenderProgress) => void
  signal?: AbortSignal
}

export interface RenderProgress {
  done: number
  total: number
  cacheHits: number
  lastKey?: string
}

export interface RenderAllResult {
  total: number
  cacheHits: number
  rendered: number
  orphansRemoved: number
}

export async function renderAll(
  plan: DistinctRenderPlan,
  opts: RenderAllOptions,
): Promise<RenderAllResult> {
  const size = opts.poolSize ?? Math.max(1, navigator.hardwareConcurrency || 2)
  const pool = new Pool(opts.workerFactory, size)

  const total = plan.notes.length
  let done = 0
  let cacheHits = 0
  let rendered = 0

  const emitProgress = (lastKey?: string) =>
    opts.onProgress?.({ done, total, cacheHits, lastKey })

  const cancel = () => {
    pool.terminate()
  }
  opts.signal?.addEventListener('abort', cancel, { once: true })

  try {
    emitProgress()
    const jobs = plan.notes.map(async (note) => {
      if (opts.signal?.aborted) return
      if (await hasNote(note.key)) {
        cacheHits++
        done++
        emitProgress(note.key)
        return
      }
      const instrument = opts.instruments.get(note.instrumentName)
      if (!instrument) {
        throw new Error(`Instrument '${note.instrumentName}' not loaded`)
      }
      const compiled = opts.compileInstrument(instrument)
      const dampSeconds =
        typeof note.properties.dampSeconds === 'number'
          ? note.properties.dampSeconds
          : undefined
      const result = await pool.submit({
        input: {
          id: note.key,
          instrument: compiled,
          freqHz: note.frequencyHz,
          stress: note.stress,
          lengthSeconds: note.lengthSeconds,
          sampleRate: opts.sampleRate,
          dampSeconds,
        },
      })
      await putNote({
        key: note.key,
        pcm: result.pcm,
        sampleRate: result.sampleRate,
      })
      rendered++
      done++
      emitProgress(note.key)
    })
    await Promise.all(jobs)

    if (opts.signal?.aborted) {
      log('render', 'info', 'Render aborted; skipping orphan sweep')
      return { total, cacheHits, rendered, orphansRemoved: 0 }
    }

    const keep = new Set(plan.notes.map((n) => n.key))
    const orphansRemoved = await orphanSweep(keep)
    log('render', 'info', `Render complete`, {
      total,
      cacheHits,
      rendered,
      orphansRemoved,
    })
    return { total, cacheHits, rendered, orphansRemoved }
  } finally {
    opts.signal?.removeEventListener('abort', cancel)
    pool.terminate()
  }
}
