import jsyaml from 'js-yaml'
import { log } from '../debug'
import type { Instrument } from '../parse/instrument'
import type { MixResult } from './mix'

export interface RenderScorePythonOptions {
  instruments: Map<string, Instrument>
  rawRoomBody: string | null
  roomIsFreeverb: boolean
  signal?: AbortSignal
}

const WEB_ONLY_CHARACTER_KEYS = ['LFO', 'VCF', 'UNISON'] as const

function normalizeProfile(profile: unknown): unknown {
  if (!Array.isArray(profile)) return profile
  return profile.map((item) =>
    typeof item === 'number' && !Number.isInteger(item) ? Math.round(item) : item,
  )
}

type WorkerMsg =
  | { type: 'ready' }
  | { type: 'init_error'; error: string }
  | { type: 'score_result'; id: string; left: Float32Array; right: Float32Array; sampleRate: number }
  | { type: 'error'; id: string; error: string }

function createWorker(): Worker {
  return new Worker(new URL('../workers/pyodideWorker.ts', import.meta.url), { type: 'module' })
}

function initWorker(worker: Worker): Promise<void> {
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

function stripInstrumentBody(instrument: Instrument): string {
  const parsed = jsyaml.load(instrument.body) as Record<string, unknown>
  const stripped: Record<string, unknown> = { ...parsed }

  if ('amp' in stripped) {
    log('python-core', 'warn', `stripped amp from ${instrument.name}.spli (unsupported in python core)`)
    delete stripped['amp']
  }

  if ('character' in stripped && typeof stripped['character'] === 'object' && stripped['character'] !== null) {
    const char: Record<string, unknown> = { ...(stripped['character'] as Record<string, unknown>) }
    for (const key of WEB_ONLY_CHARACTER_KEYS) {
      if (key in char) {
        log('python-core', 'warn', `stripped ${key} from ${instrument.name}.spli (unsupported in python core)`)
        delete char[key]
      }
    }
    if ('PROFILE' in char) char['PROFILE'] = normalizeProfile(char['PROFILE'])
    stripped['character'] = char
  } else {
    // Flat-key format: oscillator/envelope keys live at top-level
    for (const key of WEB_ONLY_CHARACTER_KEYS) {
      if (key in stripped) {
        log('python-core', 'warn', `stripped ${key} from ${instrument.name}.spli (unsupported in python core)`)
        delete stripped[key]
      }
    }
    if ('PROFILE' in stripped) stripped['PROFILE'] = normalizeProfile(stripped['PROFILE'])
  }

  return jsyaml.dump(stripped)
}

/**
 * Sanitise a score body before handing it to the Python `play()` function.
 *
 * Python understands RFC-defined YAML structure only. Strip or neutralise
 * everything that is sompyler-web-only:
 *  - `tuning_config:` in the head doc (CLI option, not a score field)
 */
function stripScoreBodyForPython(scoreBody: string): string {
  const docs = jsyaml.loadAll(scoreBody) as unknown[]
  const parts = docs.map((doc, i) => {
    if (!doc || typeof doc !== 'object') return jsyaml.dump(doc)
    const obj = { ...(doc as Record<string, unknown>) }
    if (i === 0) {
      delete obj['tuning_config']
    }
    return jsyaml.dump(obj)
  })
  return parts.join('---\n')
}

let _jobCounter = 0

export async function renderScorePython(
  scoreBody: string,
  opts: RenderScorePythonOptions,
): Promise<MixResult> {
  if (opts.roomIsFreeverb) {
    log('python-core', 'warn', 'stripped freeverb room (unsupported in python core) — rendering dry')
  }

  const strippedScore = stripScoreBodyForPython(scoreBody)
  const instruments = [...opts.instruments.values()].map((inst) => ({
    name: inst.name,
    body: stripInstrumentBody(inst),
  }))

  const worker = createWorker()

  try {
    log('python-core', 'info', 'Initialising Pyodide for full-score render')
    await initWorker(worker)
    if (opts.signal?.aborted) throw new Error('render aborted')
    log('python-core', 'info', 'Pyodide ready — handing off to Python play()')

    const id = `score-${_jobCounter++}`

    type ScoreResult = { left: Float32Array; right: Float32Array; sampleRate: number }

    const renderPromise = new Promise<ScoreResult>((resolve, reject) => {
      function onMsg(ev: MessageEvent<WorkerMsg>) {
        const msg = ev.data
        if (!('id' in msg) || msg.id !== id) return
        worker.removeEventListener('message', onMsg)
        if (msg.type === 'score_result') {
          resolve({ left: msg.left, right: msg.right, sampleRate: msg.sampleRate })
        } else if (msg.type === 'error') {
          reject(new Error(msg.error))
        }
      }
      worker.addEventListener('message', onMsg)
      worker.postMessage({
        type: 'render_score',
        id,
        scoreBody: strippedScore,
        instruments,
        roomBody: opts.rawRoomBody,
      })
    })

    let result: ScoreResult
    if (opts.signal) {
      const abortPromise = new Promise<never>((_, reject) => {
        opts.signal!.addEventListener(
          'abort',
          () => {
            worker.terminate()
            reject(new Error('render aborted'))
          },
          { once: true },
        )
      })
      result = await Promise.race([renderPromise, abortPromise])
    } else {
      result = await renderPromise
    }

    log('python-core', 'info', `Python play() complete: ${result.left.length} samples at ${result.sampleRate} Hz`)
    return {
      sampleRate: result.sampleRate,
      lengthSamples: result.left.length,
      left: result.left,
      right: result.right,
    }
  } finally {
    worker.terminate()
  }
}
