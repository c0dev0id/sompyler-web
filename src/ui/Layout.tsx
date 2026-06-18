import { createEffect, createSignal, For, onCleanup, Show, type Component } from 'solid-js'
import { Editor } from '../editor/Editor'
import {
  listProjectFiles,
  type FileExtension,
  type StoredFile,
} from '../storage/files'
import type { Session } from '../session/Session'
import { downloadWav } from '../export/wav'
import { PlayerVisualizer } from './PlayerVisualizer'
import type { TransportState } from '../player/Player'

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
}

function TabStrip(props: {
  files: StoredFile[]
  selected: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div class="tabs">
      <For each={props.files}>
        {(f) => (
          <button
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
  emptyMessage: string
}) {
  const [files, setFiles] = createSignal<StoredFile[]>([])
  const [selectedId, setSelectedId] = createSignal<string | null>(null)

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

  const selectedFile = () => files().find((f) => f.id === selectedId()) ?? null

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
      </header>
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
            file={f}
            readOnly={props.readOnly}
            lintContext={{ instrumentNames: props.instrumentNames }}
          />
        )}
      </Show>
    </div>
  )
}

export const Layout: Component<LayoutProps> = (props) => {
  const [instrumentNames, setInstrumentNames] = createSignal<Set<string>>(new Set())

  createEffect(() => {
    props.refreshSignal()
    void (async () => {
      const all = await listProjectFiles('spli')
      setInstrumentNames(new Set(all.map((f) => f.name)))
    })()
  })

  // Bridge the imperative onStateChange listener into a real Solid signal so
  // every JSX expression that reads it reacts to transport changes (not just
  // the one that happens to read forcePlayerRender).
  const [playerState, setPlayerState] = createSignal<TransportState>(
    props.session.player.getState(),
  )
  const unsubPlayer = props.session.player.onStateChange(setPlayerState)
  onCleanup(unsubPlayer)

  return (
    <div class="quadrants">
      {/* Top-left: transport + Render + waveform */}
      <section class="quadrant tl player-pane">
        <header class="pane-header">
          <h3 class="pane-title">Player</h3>
          <span class="pane-state">{playerState()}</span>
        </header>
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
      </section>

      {/* Top-right: instruments */}
      <section class="quadrant tr">
        <EditorPanel
          title="Instruments"
          exts={['spli']}
          refreshSignal={props.refreshSignal}
          readOnly={props.session.editLock()}
          instrumentNames={instrumentNames}
          emptyMessage="No instrument files in project. Add a .spli from staging."
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
          emptyMessage="No score in project. Add a .spls from staging."
        />
      </section>

      {/* Bottom-right: tuning / room */}
      <section class="quadrant br">
        <EditorPanel
          title="Tuning / Room"
          exts={['splt', 'splr']}
          refreshSignal={props.refreshSignal}
          readOnly={props.session.editLock()}
          instrumentNames={instrumentNames}
          emptyMessage="No tuning / room files in project."
        />
      </section>
    </div>
  )
}
