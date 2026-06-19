/**
 * Phase 3: single Web Worker that renders one note. Inputs are sent via
 * `postMessage`; the resulting Float32Array's underlying buffer is
 * transferred so the main thread gets ownership without a copy.
 *
 * In Phase 4 this gets pooled (one worker per `navigator.hardwareConcurrency`)
 * and orchestrated by `Render.renderAll()`.
 */
import { renderNote, type InstrumentSpec } from './sound_generator'

export interface WorkerRequest {
  id: string
  instrument: InstrumentSpec
  freqHz: number
  stress: number
  lengthSeconds: number
  sampleRate?: number
  /** S51a10 damp: extra release time in seconds. */
  dampSeconds?: number
  /**
   * S32200 shape-typed article values, preserved verbatim. The worker
   * evaluates each shape at the note's tick count when it needs the
   * per-tick profile (currently: `vibrato` modulates the carrier
   * frequency; other names pass through unused).
   */
  shapeArticles?: Record<string, string>
  /** Tick count under the active tempo profile (for shape evaluation). */
  lengthTicks?: number
}

export interface WorkerResponse {
  id: string
  pcm: Float32Array
  sampleRate: number
}

export interface WorkerError {
  id: string
  error: string
}

self.addEventListener('message', (ev: MessageEvent<WorkerRequest>) => {
  const req = ev.data
  try {
    const pcm = renderNote(req)
    const sampleRate = req.sampleRate ?? 44100
    const response: WorkerResponse = { id: req.id, pcm, sampleRate }
    ;(self as unknown as Worker).postMessage(response, [pcm.buffer])
  } catch (err) {
    const errResponse: WorkerError = {
      id: req.id,
      error: (err as Error).message,
    }
    ;(self as unknown as Worker).postMessage(errResponse)
  }
})

export {}
