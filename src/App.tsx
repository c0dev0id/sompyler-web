import { createSignal, onMount, type Component } from 'solid-js'
import { Session } from './session/Session'
import { Layout } from './ui/Layout'
import { StagingPane } from './ui/StagingPane'
import { RenderModal } from './ui/RenderModal'
import { seedDefaults } from './defaults'

export const App: Component = () => {
  const [refreshTick, setRefreshTick] = createSignal(0)
  const [stagingTick, setStagingTick] = createSignal(0)
  const session = new Session(() => new AudioContext())

  onMount(() => {
    void (async () => {
      await seedDefaults()
      setRefreshTick((n) => n + 1)
    })()
  })

  const bumpRefresh = () => setRefreshTick((n) => n + 1)
  const bumpStaging = () => setStagingTick((n) => n + 1)

  return (
    <main class="shell">
      <StagingPane
        refreshSignal={refreshTick}
        scoreRefreshSignal={stagingTick}
        onChange={bumpRefresh}
        mutationsDisabled={session.editLock()}
      />
      <Layout session={session} refreshSignal={refreshTick} onScoreSave={bumpStaging} />
      <RenderModal session={session} />
    </main>
  )
}
