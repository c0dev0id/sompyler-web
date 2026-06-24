import { createSignal, onMount, type Component } from 'solid-js'
import { Session } from './session/Session'
import { Layout } from './ui/Layout'
import { StagingPane } from './ui/StagingPane'
import { RenderModal } from './ui/RenderModal'
import { seedDefaults } from './defaults'
import type { FileExtension } from './storage/files'

export const App: Component = () => {
  const [refreshTick, setRefreshTick] = createSignal(0)
  const [stagingTick, setStagingTick] = createSignal(0)
  // equals:false so re-clicking the same filename always fires the EditorPanel effect
  const [instrFocusId, setInstrFocusId] = createSignal<string | null>(null, { equals: false })
  const [tuningFocusId, setTuningFocusId] = createSignal<string | null>(null, { equals: false })
  const session = new Session(() => new AudioContext())

  onMount(() => {
    void (async () => {
      await seedDefaults()
      setRefreshTick((n) => n + 1)
    })()
  })

  const bumpRefresh = () => setRefreshTick((n) => n + 1)
  const bumpStaging = () => setStagingTick((n) => n + 1)

  function handleFocusFile(name: string, ext: FileExtension) {
    const id = `${name}.${ext}`
    if (ext === 'spli') setInstrFocusId(id)
    else if (ext === 'splt' || ext === 'splr') setTuningFocusId(id)
  }

  return (
    <main class="shell">
      <StagingPane
        refreshSignal={refreshTick}
        scoreRefreshSignal={stagingTick}
        onChange={bumpRefresh}
        mutationsDisabled={session.editLock()}
        onFocusFile={handleFocusFile}
      />
      <Layout
        session={session}
        refreshSignal={refreshTick}
        onScoreSave={bumpStaging}
        instrFocusId={instrFocusId}
        tuningFocusId={tuningFocusId}
      />
      <RenderModal session={session} />
    </main>
  )
}
