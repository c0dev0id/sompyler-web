import { createResource, createSignal, Show, type Component } from 'solid-js'
import { Editor } from './editor/Editor'
import { putFile, getFile, type StoredFile } from './storage/files'

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

export const App: Component = () => {
  const [file] = createResource(ensureStarterFile)
  const [readOnly] = createSignal(false)
  return (
    <main class="shell">
      <h1>Sompyler</h1>
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
