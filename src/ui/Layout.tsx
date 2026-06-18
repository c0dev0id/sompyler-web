import { createEffect, createSignal, For, Show, type Component } from 'solid-js'
import { Editor } from '../editor/Editor'
import {
  listProjectFiles,
  type FileExtension,
  type StoredFile,
} from '../storage/files'
import type { Session } from '../session/Session'
import { downloadWav } from '../export/wav'

/**
 * R-UI: four-quadrant main area + collapsible staging rail (rendered by App
 * around this component).
 *
 *   ┌─────────────────────┬─────────────────────────┐
 *   │ Player / transport  │ Instrument editor (tab) │
 *   ├─────────────────────┼─────────────────────────┤
 *   │ Score editor        │ Tuning / Room editor    │
 *   └─────────────────────┴─────────────────────────┘
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

  const playerState = () => props.session.player.getState()
  const [forcePlayerRender, setForcePlayerRender] = createSignal(0)
  // Subscribe to player state changes so the transport row updates.
  props.session.player.onStateChange(() => setForcePlayerRender((n) => n + 1))

  return (
    <div class="quadrants">
      {/* Top-left: transport + Render */}
      <section class="quadrant tl">
        <div class="transport">
          <button
            onClick={() => void props.session.startRender()}
            disabled={props.session.editLock()}
          >
            Render
          </button>
          <button
            onClick={() => props.session.player.play()}
            disabled={
              playerState() === 'empty' ||
              playerState() === 'playing' ||
              (forcePlayerRender(), false)
            }
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
            disabled={playerState() === 'empty'}
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
          <span class="state">{playerState()}</span>
        </div>
        <Show when={props.session.renderStatus().state === 'error'}>
          <p class="error">
            {props.session.renderStatus().errorMessage}
            <button onClick={() => props.session.clearError()}>Dismiss</button>
          </p>
        </Show>
      </section>

      {/* Top-right: instruments */}
      <section class="quadrant tr">
        <EditorPanel
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
