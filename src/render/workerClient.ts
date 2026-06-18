import type { WorkerHandle } from './pool'
import type {
  WorkerError,
  WorkerRequest,
  WorkerResponse,
} from '../synth/worker'

/**
 * Web Worker adapter for the synthesis worker. Uses Vite's `new URL()`
 * worker syntax so the bundler picks up the worker chunk.
 *
 * Each submission gets a unique id; the worker responds asynchronously
 * with either a `WorkerResponse` or `WorkerError`.
 */

export interface RenderJob {
  input: WorkerRequest
}

export interface RenderResult {
  pcm: Float32Array
  sampleRate: number
}

export function createSynthWorker(): WorkerHandle<RenderJob, RenderResult> {
  const worker = new Worker(new URL('../synth/worker.ts', import.meta.url), {
    type: 'module',
  })

  const pending = new Map<string, { resolve: (r: RenderResult) => void; reject: (e: unknown) => void }>()
  let counter = 0

  worker.addEventListener('message', (ev: MessageEvent<WorkerResponse | WorkerError>) => {
    const data = ev.data
    const entry = pending.get(data.id)
    if (!entry) return
    pending.delete(data.id)
    if ('error' in data) entry.reject(new Error(data.error))
    else entry.resolve({ pcm: data.pcm, sampleRate: data.sampleRate })
  })

  return {
    submit(job) {
      const id = `${counter++}`
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject })
        worker.postMessage({ ...job.input, id })
      })
    },
    terminate() {
      worker.terminate()
      for (const entry of pending.values()) entry.reject(new Error('Worker terminated'))
      pending.clear()
    },
  }
}
