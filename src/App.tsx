import { createResource, createSignal, Show, type Component } from 'solid-js'
import { Editor } from './editor/Editor'
import { putFile, getFile, type StoredFile } from './storage/files'
import { renderNote } from './synth/sound_generator'

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

async function ensureStarterFile(): Promise<StoredFile> {
  const existing = await getFile('starter', 'spls')
  if (existing) return existing
  return putFile({ name: 'starter', ext: 'spls', body: STARTER_SCORE, inProject: true })
}

async function playPreviewTone() {
  const ctx = new AudioContext()
  if (ctx.state === 'suspended') await ctx.resume()
  const pcm = renderNote({
    instrument: {
      partials: [
        { freqMult: 1, amp: 0.7 },
        { freqMult: 2, amp: 0.3 },
        { freqMult: 3, amp: 0.15 },
      ],
      envelope: { attack: 0.02, release: 0.3, sustainLevel: 0.7 },
    },
    freqHz: 440,
    stress: 0.9,
    lengthSeconds: 1.0,
    sampleRate: ctx.sampleRate,
  })
  const buffer = ctx.createBuffer(1, pcm.length, ctx.sampleRate)
  buffer.getChannelData(0).set(pcm)
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.connect(ctx.destination)
  src.start()
  src.onended = () => ctx.close()
}

export const App: Component = () => {
  const [file] = createResource(ensureStarterFile)
  const [readOnly] = createSignal(false)
  return (
    <main class="shell">
      <h1>Sompyler</h1>
      <p>
        <button onClick={() => void playPreviewTone()}>Preview A4 tone</button>
      </p>
      <Show when={file()} fallback={<p>Loading…</p>}>
        {(f) => (
          <Editor
            file={f()}
            readOnly={readOnly()}
            lintContext={{ instrumentNames: () => new Set() }}
          />
        )}
      </Show>
    </main>
  )
}
