import { createSignal, onMount, type Component } from 'solid-js'
import { putFile, getFile } from './storage/files'
import { Session } from './session/Session'
import { Layout } from './ui/Layout'
import { StagingPane } from './ui/StagingPane'
import { RenderModal } from './ui/RenderModal'

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

async function seedStarterFiles(): Promise<void> {
  if (!(await getFile('starter', 'spls'))) {
    await putFile({ name: 'starter', ext: 'spls', body: STARTER_SCORE, inProject: true })
  }
  if (!(await getFile('dev/piano', 'spli'))) {
    await putFile({ name: 'dev/piano', ext: 'spli', body: STARTER_PIANO, inProject: true })
  }
}

export const App: Component = () => {
  const [refreshTick, setRefreshTick] = createSignal(0)
  const session = new Session(() => new AudioContext())

  onMount(() => {
    void (async () => {
      await seedStarterFiles()
      setRefreshTick((n) => n + 1)
    })()
  })

  const bumpRefresh = () => setRefreshTick((n) => n + 1)

  return (
    <main class="shell">
      <StagingPane
        refreshSignal={refreshTick}
        onChange={bumpRefresh}
        mutationsDisabled={session.editLock()}
      />
      <Layout session={session} refreshSignal={refreshTick} />
      <RenderModal session={session} />
    </main>
  )
}
