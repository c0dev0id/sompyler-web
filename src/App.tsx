import {
  createResource,
  createSignal,
  onCleanup,
  Show,
  type Component,
} from 'solid-js'
import { Editor } from './editor/Editor'
import { putFile, getFile, type StoredFile } from './storage/files'
import { loadInstrument } from './parse/instrument'
import { Tuner } from './parse/tuning'
import { buildDistinctNotes } from './render/distinct'
import { renderAll } from './render/renderAll'
import { mixOnly } from './render/mix'
import { createSynthWorker } from './render/workerClient'
import { compileInstrument } from './synth/compile'
import { Player } from './player/Player'
import { parseScore } from './parse/score'
import { log } from './debug'

const STARTER_SCORE = `title: Starter song
stage:
  piano: 1|1 0 dev/piano
---
_meta:
  ticks_per_minute: 120
  stress_pattern: "2,0,1,0;1,0"
  lower_stress_bound: 85
  upper_stress_bound: 100
piano:
  0: C4 1
  1: D4 1
  2: E4 1
  3: F4 1
  4: G4 2
  6: G4 2
`

const STARTER_PIANO = `amp: 0.5
oscillator: sin
envelope:
  attack: 0.005
  release: 0.4
  sustainLevel: 0.7
partials:
  - { freqMult: 1, amp: 1.0 }
  - { freqMult: 2, amp: 0.5 }
  - { freqMult: 3, amp: 0.25 }
  - { freqMult: 4, amp: 0.12 }
`

async function seedStarterFiles(): Promise<StoredFile> {
  const score = await getFile('starter', 'spls')
  const scoreFile =
    score ?? (await putFile({ name: 'starter', ext: 'spls', body: STARTER_SCORE, inProject: true }))
  const piano = await getFile('dev/piano', 'spli')
  if (!piano) {
    await putFile({ name: 'dev/piano', ext: 'spli', body: STARTER_PIANO, inProject: true })
  }
  return scoreFile
}

export const App: Component = () => {
  const [file] = createResource(seedStarterFiles)
  const [renderState, setRenderState] = createSignal<
    'idle' | 'rendering' | 'mixing' | 'error'
  >('idle')
  const [progress, setProgress] = createSignal<{ done: number; total: number }>({
    done: 0,
    total: 0,
  })
  const [errorMsg, setErrorMsg] = createSignal<string | null>(null)
  const [playerState, setPlayerState] = createSignal<string>('empty')

  const player = new Player(() => new AudioContext())
  const off = player.onStateChange(setPlayerState)
  onCleanup(off)

  async function handleRender() {
    setErrorMsg(null)
    setRenderState('rendering')
    setProgress({ done: 0, total: 0 })
    try {
      const scoreFile = await getFile('starter', 'spls')
      if (!scoreFile) throw new Error('Starter score missing')
      const pianoFile = await getFile('dev/piano', 'spli')
      if (!pianoFile) throw new Error('Starter instrument missing')
      const piano = await loadInstrument('dev/piano', pianoFile.body)
      const instruments = new Map([[piano.name, piano]])
      const tuner = new Tuner()

      const plan = await buildDistinctNotes(scoreFile.body, { tuner, instruments })
      await renderAll(plan, {
        workerFactory: createSynthWorker,
        instruments,
        compileInstrument,
        onProgress: (p) => setProgress({ done: p.done, total: p.total }),
      })

      setRenderState('mixing')
      const { head } = parseScore(scoreFile.body)
      const mix = await mixOnly(plan, head)
      player.loadBuffer(mix)
      setRenderState('idle')
    } catch (e) {
      log('session', 'error', `Render failed: ${(e as Error).message}`)
      setErrorMsg((e as Error).message)
      setRenderState('error')
    }
  }

  return (
    <main class="shell">
      <h1>Sompyler</h1>
      <div class="transport">
        <button onClick={() => void handleRender()} disabled={renderState() !== 'idle' && renderState() !== 'error'}>
          {renderState() === 'rendering'
            ? `Rendering ${progress().done}/${progress().total}…`
            : renderState() === 'mixing'
              ? 'Mixing…'
              : 'Render'}
        </button>
        <button onClick={() => player.play()} disabled={playerState() === 'empty' || playerState() === 'playing'}>
          Play
        </button>
        <button onClick={() => player.pause()} disabled={playerState() !== 'playing'}>
          Pause
        </button>
        <button onClick={() => player.stop()} disabled={playerState() === 'empty'}>
          Stop
        </button>
        <label>
          <input
            type="checkbox"
            checked={player.isLoopEnabled()}
            onChange={(e) => player.setLoop(e.currentTarget.checked)}
          />{' '}
          Loop
        </label>
        <span class="state">{playerState()}</span>
      </div>
      <Show when={errorMsg()}>
        {(msg) => <p class="error">{msg()}</p>}
      </Show>
      <Show when={file()} fallback={<p>Loading…</p>}>
        {(f) => (
          <Editor
            file={f()}
            readOnly={renderState() !== 'idle' && renderState() !== 'error'}
            lintContext={{ instrumentNames: () => new Set(['dev/piano']) }}
          />
        )}
      </Show>
    </main>
  )
}
