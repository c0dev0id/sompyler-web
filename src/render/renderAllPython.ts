import { log } from '../debug'
import { orphanSweep, putNote, hasNote } from '../storage/notes'
import type { DistinctRenderPlan, NoteOccurrence } from './distinct'
import type { RenderDiagnostic, RenderAllResult, RenderProgress } from './renderAll'
import type { Instrument } from '../parse/instrument'

/**
 * Python-core render path — delegates to a Pyodide worker instead of the
 * JS synth pool. Sequential by design: Pyodide is single-threaded.
 * Enabled when the project's .splt tuning file contains `core: python`.
 */

export interface RenderAllPythonOptions {
  instruments: Map<string, Instrument>
  sampleRate?: number
  onProgress?: (progress: RenderProgress) => void
  signal?: AbortSignal
  skipOrphanSweep?: boolean
}

type WorkerMsg =
  | { type: 'ready' }
  | { type: 'init_error'; error: string }
  | { type: 'result'; id: string; pcm: Float32Array; sampleRate: number }
  | { type: 'error'; id: string; error: string }

function createPyodideWorker(): Worker {
  return new Worker(new URL('../workers/pyodideWorker.ts', import.meta.url), { type: 'module' })
}

async function initWorker(worker: Worker): Promise<void> {
  const pythonCoreUrl = `${import.meta.env.BASE_URL}python-core/`
  return new Promise((resolve, reject) => {
    function onMsg(ev: MessageEvent<WorkerMsg>) {
      const msg = ev.data
      if (msg.type === 'ready') {
        worker.removeEventListener('message', onMsg)
        resolve()
      } else if (msg.type === 'init_error') {
        worker.removeEventListener('message', onMsg)
        reject(new Error(`Pyodide init failed: ${msg.error}`))
      }
    }
    worker.addEventListener('message', onMsg)
    worker.postMessage({ type: 'init', pythonCoreUrl })
  })
}

export async function renderAllPython(
  plan: DistinctRenderPlan,
  opts: RenderAllPythonOptions,
): Promise<RenderAllResult> {
  const worker = createPyodideWorker()

  try {
    log('render', 'info', 'Initialising Pyodide (first run may take ~30 s)')
    await initWorker(worker)
    log('render', 'info', 'Pyodide ready')

    const total = plan.notes.length
    let done = 0
    let cacheHits = 0
    let rendered = 0
    const diagnostics: RenderDiagnostic[] = []

    const emitProgress = (lastKey?: string) =>
      opts.onProgress?.({ done, total, cacheHits, lastKey })

    emitProgress()

    // Sequential: await each note before starting the next. Pyodide is
    // single-threaded so parallelism doesn't buy anything here.
    for (const note of plan.notes) {
      if (opts.signal?.aborted) break

      if (await hasNote(note.key)) {
        cacheHits++
        done++
        emitProgress(note.key)
        continue
      }

      const instrument = opts.instruments.get(note.instrumentName)
      if (!instrument) {
        const occurrence = note.occurrences[0]!
        diagnostics.push({
          occurrence,
          instrumentName: note.instrumentName,
          frequencyHz: note.frequencyHz,
          message: `Instrument '${note.instrumentName}' not loaded`,
        })
        done++
        emitProgress(note.key)
        continue
      }

      try {
        const result = await renderOneNote(worker, {
          spliYaml: instrument.body,
          freqHz: note.frequencyHz,
          durationS: note.lengthSeconds,
          stress: note.stress,
        })
        await putNote({ key: note.key, pcm: result.pcm, sampleRate: result.sampleRate })
        rendered++
      } catch (e) {
        if (opts.signal?.aborted) break
        const occurrence = note.occurrences[0]!
        const message = e instanceof Error ? e.message : String(e)
        diagnostics.push({ occurrence, instrumentName: note.instrumentName, frequencyHz: note.frequencyHz, message })
        log('render', 'error', `Python note render failed`, { key: note.key, message })
      }

      done++
      emitProgress(note.key)
    }

    if (opts.signal?.aborted) {
      log('render', 'info', 'Python render aborted; skipping orphan sweep')
      return { total, cacheHits, rendered, orphansRemoved: 0, diagnostics }
    }

    if (diagnostics.length > 0) {
      log('render', 'warn', `Python render finished with ${diagnostics.length} diagnostics; orphan sweep skipped`)
      return { total, cacheHits, rendered, orphansRemoved: 0, diagnostics }
    }

    if (opts.skipOrphanSweep) {
      log('render', 'info', `Python render complete (orphan sweep skipped)`, { total, cacheHits, rendered })
      return { total, cacheHits, rendered, orphansRemoved: 0, diagnostics }
    }

    const keep = new Set(plan.notes.map((n) => n.key))
    const orphansRemoved = await orphanSweep(keep)
    log('render', 'info', `Python render complete`, { total, cacheHits, rendered, orphansRemoved })
    return { total, cacheHits, rendered, orphansRemoved, diagnostics }
  } finally {
    worker.terminate()
  }
}

let _jobCounter = 0

function renderOneNote(
  worker: Worker,
  job: { spliYaml: string; freqHz: number; durationS: number; stress: number },
): Promise<{ pcm: Float32Array; sampleRate: number }> {
  const id = `py-${_jobCounter++}`
  return new Promise((resolve, reject) => {
    function onMsg(ev: MessageEvent<WorkerMsg>) {
      const msg = ev.data
      if (!('id' in msg) || msg.id !== id) return
      worker.removeEventListener('message', onMsg)
      if (msg.type === 'result') resolve({ pcm: msg.pcm, sampleRate: msg.sampleRate })
      else if (msg.type === 'error') reject(new Error(msg.error))
    }
    worker.addEventListener('message', onMsg)
    worker.postMessage({ type: 'render', id, ...job })
  })
}
