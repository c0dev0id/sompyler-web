import { log } from '../debug'
import { orphanSweep, putNote, hasNote } from '../storage/notes'
import type { DistinctRenderPlan, NoteOccurrence } from './distinct'
import { Pool, type WorkerFactory } from './pool'
import type { RenderJob, RenderResult } from './workerClient'
import type { InstrumentSpec } from '../synth/sound_generator'
import type { Instrument } from '../parse/instrument'

/**
 * Per-note error surfaced by a worker, enriched with the R-ErrorCtx position
 * of one of the note's occurrences. The score editor lint (R6) renders these
 * inline so the user sees "voice 'cello', measure 5, A4 (440Hz): <reason>"
 * without leaving the editor.
 */
export interface RenderDiagnostic {
  occurrence: NoteOccurrence
  instrumentName: string
  frequencyHz: number
  message: string
}

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
  diagnostics: RenderDiagnostic[]
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

  const diagnostics: RenderDiagnostic[] = []

  const recordDiagnostic = (
    note: DistinctRenderPlan['notes'][number],
    err: unknown,
  ) => {
    const occurrence = note.occurrences[0]!
    const message = err instanceof Error ? err.message : String(err)
    diagnostics.push({
      occurrence,
      instrumentName: note.instrumentName,
      frequencyHz: note.frequencyHz,
      message,
    })
    log('render', 'error', `Note synthesis failed`, {
      key: note.key,
      voice: occurrence.voice,
      measure: occurrence.measureName,
      offsetTicks: occurrence.offsetTicks,
      message,
    })
  }

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
      try {
        const instrument = opts.instruments.get(note.instrumentName)
        if (!instrument) {
          throw new Error(`Instrument '${note.instrumentName}' not loaded`)
        }
        const compiled = opts.compileInstrument(instrument)
        const dampSeconds =
          typeof note.properties.dampSeconds === 'number'
            ? note.properties.dampSeconds
            : undefined
        const hasShapeArticles = Object.keys(note.shapeArticles).length > 0
        const result = await pool.submit({
          input: {
            id: note.key,
            instrument: compiled,
            freqHz: note.frequencyHz,
            stress: note.stress,
            lengthSeconds: note.lengthSeconds,
            sampleRate: opts.sampleRate,
            dampSeconds,
            ...(hasShapeArticles
              ? {
                  shapeArticles: note.shapeArticles,
                  lengthTicks: note.lengthTicks,
                }
              : {}),
          },
        })
        await putNote({
          key: note.key,
          pcm: result.pcm,
          sampleRate: result.sampleRate,
        })
        rendered++
      } catch (e) {
        if (opts.signal?.aborted) return
        // R6: per-worker failures don't abort the render. Collect and
        // surface together at the end so the user sees every broken note.
        recordDiagnostic(note, e)
      } finally {
        done++
        emitProgress(note.key)
      }
    })
    await Promise.all(jobs)

    if (opts.signal?.aborted) {
      log('render', 'info', 'Render aborted; skipping orphan sweep')
      return { total, cacheHits, rendered, orphansRemoved: 0, diagnostics }
    }

    if (diagnostics.length > 0) {
      // R6: render failed → keep the previous buffer untouched and skip
      // the orphan sweep (don't strand the user's last good cache).
      log('render', 'warn', `Render finished with ${diagnostics.length} diagnostics; orphan sweep skipped`)
      return { total, cacheHits, rendered, orphansRemoved: 0, diagnostics }
    }

    const keep = new Set(plan.notes.map((n) => n.key))
    const orphansRemoved = await orphanSweep(keep)
    log('render', 'info', `Render complete`, {
      total,
      cacheHits,
      rendered,
      orphansRemoved,
    })
    return { total, cacheHits, rendered, orphansRemoved, diagnostics }
  } finally {
    opts.signal?.removeEventListener('abort', cancel)
    pool.terminate()
  }
}
