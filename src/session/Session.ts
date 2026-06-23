import { createSignal, type Accessor } from 'solid-js'
import { log } from '../debug'
import { listProjectFiles, type StoredFile } from '../storage/files'
import { loadInstrument } from '../parse/instrument'
import { Tuner } from '../parse/tuning'
import { buildDistinctNotes } from '../render/distinct'
import { renderAll, type RenderDiagnostic } from '../render/renderAll'
import { mixOnly, type MixResult } from '../render/mix'
import { createSynthWorker } from '../render/workerClient'
import { compileInstrument } from '../synth/compile'
import { parseScore } from '../parse/score'
import { parseRoom, parseFreeverbRoom, type RoomBody, type FreeverbBody } from '../parse/room'
import { Player } from '../player/Player'

/**
 * Phase 6 / R3: thin coordinator that owns the three pieces of cross-domain
 * state surfaced in the spec — `editLock`, `renderStatus`, `currentBuffer` —
 * and routes the Render workflow end-to-end.
 *
 * Domains keep their internals private. Session just observes:
 *   click Render → startRender() → buildDistinctNotes → renderAll → mixOnly
 *   → player.loadBuffer
 * Cancellation hard-aborts the in-flight pool (R4).
 */

export type RenderState = 'idle' | 'rendering' | 'mixing' | 'error'

export interface RenderStatus {
  state: RenderState
  progress: { done: number; total: number; cacheHits: number; lastKey?: string }
  errorMessage?: string
}

const IDLE_STATUS: RenderStatus = {
  state: 'idle',
  progress: { done: 0, total: 0, cacheHits: 0 },
}

export class Session {
  readonly editLock: Accessor<boolean>
  readonly renderStatus: Accessor<RenderStatus>
  readonly currentBuffer: Accessor<MixResult | null>
  /**
   * Per-note diagnostics from the most recent render run (R6). The score
   * editor lint reads these and renders them inline; they clear on the
   * next successful render or when the user dismisses the error banner.
   */
  readonly renderDiagnostics: Accessor<RenderDiagnostic[]>
  readonly player: Player

  private readonly setEditLock: (v: boolean) => void
  private readonly setStatus: (v: RenderStatus) => void
  private readonly setBuffer: (v: MixResult | null) => void
  private readonly setDiagnostics: (v: RenderDiagnostic[]) => void
  private controller: AbortController | null = null
  private lastScoreId: string | null = null
  private barTimes: number[] = []
  private markerBar: number | null = null

  constructor(audioContextFactory: () => AudioContext) {
    const [editLock, setEditLock] = createSignal(false)
    const [status, setStatus] = createSignal<RenderStatus>(IDLE_STATUS)
    const [buffer, setBuffer] = createSignal<MixResult | null>(null)
    const [diagnostics, setDiagnostics] = createSignal<RenderDiagnostic[]>([])
    this.editLock = editLock
    this.renderStatus = status
    this.currentBuffer = buffer
    this.renderDiagnostics = diagnostics
    this.setEditLock = setEditLock
    this.setStatus = setStatus
    this.setBuffer = setBuffer
    this.setDiagnostics = setDiagnostics
    this.player = new Player(audioContextFactory)
  }

  async startRender(): Promise<void> {
    // Re-clicking Render while a render is in flight is "preempt" (R4):
    // cancel-then-restart on the same path.
    if (this.renderStatus().state !== 'idle' && this.renderStatus().state !== 'error') {
      this.cancelRender()
    }
    const controller = new AbortController()
    this.controller = controller
    this.setEditLock(true)
    this.setStatus({
      state: 'rendering',
      progress: { done: 0, total: 0, cacheHits: 0 },
    })

    try {
      const { scoreFile, instruments, room } = await loadProject()

      const tuner = new Tuner()
      const plan = await buildDistinctNotes(scoreFile.body, { tuner, instruments })
      this.setStatus({
        state: 'rendering',
        progress: { done: 0, total: plan.notes.length, cacheHits: 0 },
      })

      const renderResult = await renderAll(plan, {
        workerFactory: createSynthWorker,
        instruments,
        compileInstrument,
        signal: controller.signal,
        onProgress: (p) => {
          this.setStatus({
            state: 'rendering',
            progress: { done: p.done, total: p.total, cacheHits: p.cacheHits, lastKey: p.lastKey },
          })
        },
      })

      if (controller.signal.aborted) {
        log('session', 'info', 'Render aborted by user; keeping previous buffer')
        return
      }

      if (renderResult.diagnostics.length > 0) {
        // R6: keep the previous buffer looping; surface inline diagnostics.
        this.setDiagnostics(renderResult.diagnostics)
        const first = renderResult.diagnostics[0]!
        this.setStatus({
          ...IDLE_STATUS,
          state: 'error',
          errorMessage: `${renderResult.diagnostics.length} note(s) failed to render — ${first.message}`,
        })
        log('session', 'warn', `Render produced ${renderResult.diagnostics.length} diagnostics; buffer unchanged`)
        return
      }

      this.setStatus({ ...this.renderStatus(), state: 'mixing' })
      const { head } = parseScore(scoreFile.body)
      const mix = await mixOnly(plan, head, { room })

      if (scoreFile.id !== this.lastScoreId) {
        this.player.resetLoopPoints()
        this.markerBar = null
        this.lastScoreId = scoreFile.id
      }
      this.barTimes = plan.barTimes
      // Re-apply bar markers with updated times after re-render.
      if (this.markerBar !== null) {
        const tStart = this.barTimes[this.markerBar] ?? 0
        const tEnd = this.barTimes[this.markerBar + 2] ?? 0
        this.player.setLoopPoints(tStart, tEnd)
      }
      this.player.loadBuffer(mix)
      this.setBuffer(mix)
      this.setDiagnostics([])
      this.setStatus(IDLE_STATUS)
      log('session', 'info', 'Render complete; buffer swapped')
    } catch (e) {
      if (controller.signal.aborted) {
        log('session', 'info', 'Render aborted by user')
      } else {
        log('session', 'error', `Render failed: ${(e as Error).message}`)
        this.setStatus({
          ...IDLE_STATUS,
          state: 'error',
          errorMessage: (e as Error).message,
        })
        return
      }
    } finally {
      this.setEditLock(false)
      if (this.controller === controller) this.controller = null
    }
  }

  cancelRender(): void {
    if (this.controller) {
      log('session', 'info', 'Cancelling in-flight render')
      this.controller.abort()
      this.controller = null
    }
    this.setEditLock(false)
    this.setStatus(IDLE_STATUS)
  }

  clearBarMarker(): void {
    this.markerBar = null
  }

  clearError(): void {
    if (this.renderStatus().state === 'error') {
      this.setStatus(IDLE_STATUS)
      this.setDiagnostics([])
    }
  }

  /**
   * Called when the user clicks a line number in the score editor.
   * Single click sets a 2-bar window (bar N to bar N+2). Clicking the
   * same bar again clears the markers.
   */
  setBarMarker(barIndex: number): void {
    if (this.markerBar === barIndex) {
      this.markerBar = null
      this.player.setLoopPoints(0, 0)
    } else {
      this.markerBar = barIndex
      const tStart = this.barTimes[barIndex] ?? 0
      const tEnd = this.barTimes[barIndex + 2] ?? 0
      this.player.setLoopPoints(tStart, tEnd)
    }
    this.player.restartFromMarkers()
  }
}

interface LoadedProject {
  scoreFile: StoredFile
  instruments: Map<string, Awaited<ReturnType<typeof loadInstrument>>>
  room: RoomBody | FreeverbBody | null
}

async function loadProject(): Promise<LoadedProject> {
  const projectFiles = await listProjectFiles()
  const scoreFile = projectFiles.find((f) => f.ext === 'spls')
  if (!scoreFile) {
    throw new Error('No in-project score (.spls) found')
  }
  const instrumentFiles = projectFiles.filter((f) => f.ext === 'spli')
  const instruments = new Map<string, Awaited<ReturnType<typeof loadInstrument>>>()
  for (const f of instrumentFiles) {
    const compiled = await loadInstrument(f.name, f.body)
    instruments.set(compiled.name, compiled)
  }
  // First in-project room file wins; absent → free-field.
  // Try tap model first (has `levels:`), then freeverb (`type: freeverb`).
  const roomFile = projectFiles.find((f) => f.ext === 'splr')
  const room = roomFile ? (parseRoom(roomFile.body) ?? parseFreeverbRoom(roomFile.body)) : null
  return { scoreFile, instruments, room }
}
