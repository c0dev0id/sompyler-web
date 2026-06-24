import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show, type Component } from 'solid-js'
import { Editor } from '../editor/Editor'
import {
  listProjectFiles,
  listFiles,
  type FileExtension,
  type StoredFile,
} from '../storage/files'
import type { Session } from '../session/Session'
import { downloadWav } from '../export/wav'
import { PlayerVisualizer } from './PlayerVisualizer'
import { InstrumentPreview } from './InstrumentPreview'
import type { TransportState } from '../player/Player'
import { HelpDialog } from './HelpDialog'
import { PlayerHelpDialog } from './PlayerHelpDialog'
import { SnapshotDialog } from './SnapshotDialog'
import { LogPane } from './LogPane'
import { Seekbar } from './Seekbar'
import { firstInstrumentPitchHz } from '../parse/score'

/**
 * R-UI: four equal quadrants + collapsible staging rail.
 *
 *   ┌─────────────────────┬─────────────────────────┐
 *   │ Player / transport  │ Instrument editor (tab) │
 *   ├─────────────────────┼─────────────────────────┤
 *   │ Score editor        │ Tuning / Room editor    │
 *   └─────────────────────┴─────────────────────────┘
 *
 * Portrait stacks them vertically: player → score → instruments →
 * tuning/room. The placement is driven by named CSS grid areas.
 */

export interface LayoutProps {
  session: Session
  refreshSignal: () => number
  onScoreSave?: () => void
  instrFocusId?: () => string | null
  tuningFocusId?: () => string | null
}

function TabStrip(props: {
  files: StoredFile[]
  selected: string | null
  onSelect: (id: string) => void
}) {
  let container: HTMLDivElement | undefined

  createEffect(() => {
    const id = props.selected
    if (!id || !container) return
    const btn = container.querySelector<HTMLElement>(`[data-id="${id}"]`)
    btn?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  })

  return (
    <div class="tabs" ref={container}>
      <For each={props.files}>
        {(f) => (
          <button
            data-id={f.id}
            class={props.selected === f.id ? 'tab selected' : 'tab'}
            onClick={() => props.onSelect(f.id)}
          >
            {f.name}.{f.ext}
          </button>
        )}
      </For>
    </div>
  )
}

function EditorPanel(props: {
  title: string
  exts: FileExtension[]
  refreshSignal: () => number
  readOnly: boolean
  instrumentNames: () => Set<string>
  renderDiagnostics: () => ReturnType<Session['renderDiagnostics']>
  emptyMessage: string
  onActiveInstrumentChange?: (name: string | null, body: string | null) => void
  onFileSave?: () => void
  onBarClick?: (barIndex: number, metaLine?: number) => void
  markerBar?: () => number | null
  focusId?: () => string | null
}) {
  const [files, setFiles] = createSignal<StoredFile[]>([])
  const [selectedId, setSelectedId] = createSignal<string | null>(null)
  // Non-reactive cache of the latest editor body per file id.
  // Keyed Show destroys/recreates the Editor on tab switch; without this,
  // the new Editor would mount with the stale body from the files() snapshot
  // instead of the already-saved (but not re-fetched) IndexedDB content.
  const liveBody = new Map<string, string>()
  // Stabilise by file id so that refreshing the files() array (same id,
  // new object reference) does not destroy and recreate the editor — only
  // an actual tab switch (different id) does.
  const selectedFile = createMemo(
    () => files().find((f) => f.id === selectedId()) ?? null,
    null,
    { equals: (a: StoredFile | null, b: StoredFile | null) => a?.id === b?.id },
  )
  // equals:false so re-triggering the same snapshot body still fires the effect.
  const [restoreBody, setRestoreBody] = createSignal<string | null>(null, { equals: false })
  let previewTimer = 0
  let helpDialog: HTMLDialogElement | undefined
  let snapshotDialog: HTMLDialogElement | undefined
  onCleanup(() => clearTimeout(previewTimer))

  createEffect(() => {
    props.refreshSignal()
    void (async () => {
      const all = await listProjectFiles()
      const filtered = all.filter((f) => props.exts.includes(f.ext))
      setFiles(filtered)
      if (filtered.length > 0 && !filtered.some((f) => f.id === selectedId())) {
        setSelectedId(filtered[0]!.id)
      } else if (filtered.length === 0) {
        setSelectedId(null)
      }
    })()
  })

  createEffect(() => {
    const id = props.focusId?.()
    if (!id) return
    if (files().some((f) => f.id === id)) setSelectedId(id)
  })

  createEffect(() => {
    const f = selectedFile()
    props.onActiveInstrumentChange?.(f?.name ?? null, f ? (liveBody.get(f.id) ?? f.body) : null)
  })

  return (
    <div class="editor-panel">
      <header class="pane-header">
        <h3 class="pane-title">{props.title}</h3>
        <Show when={selectedFile()} keyed>
          {(f) => (
            <span class="pane-filename">
              {f.name}.{f.ext}
            </span>
          )}
        </Show>
        <button class="help-btn" title="Version history" onClick={() => snapshotDialog?.showModal()}>⏱</button>
        <button class="help-btn" title="Syntax reference" onClick={() => helpDialog?.showModal()}>?</button>
      </header>
      <HelpDialog exts={props.exts} ref={(el) => { helpDialog = el }} />
      <SnapshotDialog
        fileId={() => selectedId()}
        currentBody={() => {
          const f = selectedFile()
          return f ? (liveBody.get(f.id) ?? f.body) : ''
        }}
        ref={(el) => { snapshotDialog = el }}
        onRestore={(body) => setRestoreBody(body)}
      />
      <Show when={files().length > 1}>
        <TabStrip files={files()} selected={selectedId()} onSelect={setSelectedId} />
      </Show>
      <Show
        when={selectedFile()}
        fallback={<p class="empty">{props.emptyMessage}</p>}
        keyed
      >
        {(f) => (
          <Editor
            file={{ ...f, body: liveBody.get(f.id) ?? f.body }}
            readOnly={props.readOnly}
            lintContext={{
              instrumentNames: props.instrumentNames,
              renderDiagnostics: props.renderDiagnostics,
            }}
            markerBar={props.markerBar}
            restoreBody={restoreBody}
            onBodyRestored={() => setRestoreBody(null)}
            onBodyChange={(body) => {
                liveBody.set(f.id, body)
                clearTimeout(previewTimer)
                previewTimer = window.setTimeout(() => {
                  if (selectedFile()?.id === f.id) {
                    props.onActiveInstrumentChange?.(f.name, body)
                    props.onFileSave?.()
                  }
                }, 1000)
              }}
            onBarClick={(barIndex, metaLine) => props.onBarClick?.(barIndex, metaLine)}
          />
        )}
      </Show>
    </div>
  )
}

export const Layout: Component<LayoutProps> = (props) => {
  const [instrumentNames, setInstrumentNames] = createSignal<Set<string>>(new Set())
  const [previewName, setPreviewName] = createSignal<string | null>(null)
  const [previewBody, setPreviewBody] = createSignal<string | null>(null)
  createEffect(() => {
    props.refreshSignal()
    void (async () => {
      const all = await listFiles()
      setInstrumentNames(new Set(all.filter((f) => f.ext === 'spli').map((f) => f.name)))
    })()
  })

  const resolveHz = async (): Promise<number> => {
    const name = previewName()
    if (!name) return 440
    const files = await listProjectFiles()
    const score = files.find((f) => f.ext === 'spls')
    return score ? (firstInstrumentPitchHz(score.body, name) ?? 440) : 440
  }

  // Bridge the imperative onStateChange listener into a real Solid signal so
  // every JSX expression that reads it reacts to transport changes (not just
  // the one that happens to read forcePlayerRender).
  const [playerState, setPlayerState] = createSignal<TransportState>(
    props.session.player.getState(),
  )
  const unsubPlayer = props.session.player.onStateChange(setPlayerState)
  onCleanup(unsubPlayer)

  onMount(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const inEditor = (e.target as Element | null)?.closest?.('.cm-editor') != null
      if (e.key === 's') {
        e.preventDefault()
        void props.session.startRender()
      } else if (e.key === 'p') {
        e.preventDefault()
        props.session.player.play()
      } else if (e.key === 'x' && !inEditor) {
        e.preventDefault()
        props.session.clearBarMarker()
        props.session.player.setLoopPoints(0, 0)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    onCleanup(() => window.removeEventListener('keydown', onKeyDown))
  })

  let playerHelpDialog: HTMLDialogElement | undefined

  return (
    <div class="quadrants">
      {/* Top-left: transport + Render + waveform + instrument preview */}
      <section class="quadrant tl player-pane">
        <div class="player-transport">
          <header class="pane-header">
            <h3 class="pane-title">Player</h3>
            <span class="pane-state">{playerState()}</span>
            <button class="help-btn" title="Player reference" onClick={() => playerHelpDialog?.showModal()}>?</button>
          </header>
          <PlayerHelpDialog ref={(el) => { playerHelpDialog = el }} />
          <div class="transport">
            <button
              onClick={() => void props.session.startRender()}
              disabled={props.session.editLock()}
            >
              Render
            </button>
            <button
              onClick={() => props.session.player.play()}
              disabled={playerState() === 'empty' || playerState() === 'playing'}
            >
              Play
            </button>
            <button
              onClick={() => props.session.player.pause()}
              disabled={playerState() !== 'playing'}
            >
              Pause
            </button>
            <button
              onClick={() => props.session.player.stop()}
              disabled={playerState() === 'empty' || playerState() === 'stopped'}
            >
              Stop
            </button>
            <label>
              <input
                type="checkbox"
                checked={props.session.player.isLoopEnabled()}
                onChange={(e) => props.session.player.setLoop(e.currentTarget.checked)}
              />{' '}
              Loop
            </label>
            <button
              onClick={() => {
                const buf = props.session.currentBuffer()
                if (!buf) return
                downloadWav(
                  { sampleRate: buf.sampleRate, channels: [buf.left, buf.right] },
                  'sompyler',
                )
              }}
              disabled={!props.session.currentBuffer()}
            >
              Download WAV
            </button>
          </div>
          <Seekbar
            getPosition={() => props.session.player.getPosition()}
            getDuration={() => props.session.player.getDuration()}
            getLoopPoints={() => props.session.player.getLoopPoints()}
            isLooping={() => props.session.player.isLoopEnabled()}
            onSeek={(t) => props.session.player.seek(t)}
            onSetLoopPoints={(s, e) => props.session.player.setLoopPoints(s, e)}
            onLoopPointsCommit={() => {
              props.session.clearBarMarker()
              props.session.player.restartFromMarkers()
            }}
          />
          <Show when={props.session.renderStatus().state === 'error'}>
            <p class="error">
              {props.session.renderStatus().errorMessage}
              <button onClick={() => props.session.clearError()}>Dismiss</button>
            </p>
          </Show>
          <PlayerVisualizer
            getAnalyser={() => props.session.player.getAnalyser()}
            isPlaying={() => playerState() === 'playing'}
          />
        </div>
        <InstrumentPreview name={previewName} body={previewBody} resolveHz={resolveHz} />
      </section>

      {/* Top-right: instruments */}
      <section class="quadrant tr">
        <EditorPanel
          title="Instruments"
          exts={['spli']}
          refreshSignal={props.refreshSignal}
          readOnly={props.session.editLock()}
          instrumentNames={instrumentNames}
          renderDiagnostics={props.session.renderDiagnostics}
          emptyMessage="No instrument files in project. Add a .spli from staging."
          onActiveInstrumentChange={(name, body) => {
            setPreviewName(name)
            setPreviewBody(body)
          }}
          focusId={props.instrFocusId}
        />
      </section>

      {/* Bottom-left: score */}
      <section class="quadrant bl">
        <EditorPanel
          title="Score"
          exts={['spls']}
          refreshSignal={props.refreshSignal}
          readOnly={props.session.editLock()}
          instrumentNames={instrumentNames}
          renderDiagnostics={props.session.renderDiagnostics}
          emptyMessage="No score in project. Add a .spls from staging."
          onFileSave={props.onScoreSave}
          onBarClick={(barIndex, metaLine) => props.session.setBarMarker(barIndex, metaLine)}
          markerBar={props.session.markerBar}
        />
      </section>

      {/* Bottom-right: tuning / room + log */}
      <section class="quadrant br">
        <EditorPanel
          title="Tuning / Room"
          exts={['splt', 'splr']}
          refreshSignal={props.refreshSignal}
          readOnly={props.session.editLock()}
          instrumentNames={instrumentNames}
          renderDiagnostics={props.session.renderDiagnostics}
          emptyMessage="No tuning / room files in project."
          focusId={props.tuningFocusId}
        />
        <LogPane />
      </section>
    </div>
  )
}
