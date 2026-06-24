import { createEffect, createSignal, For, onCleanup, type Component } from 'solid-js'
import { subscribe, snapshot, type LogEntry } from '../debug'

function formatEntry(e: LogEntry): string {
  const time = new Date(e.ts).toISOString().slice(11, 23)
  const payload = e.payload !== undefined ? ' ' + JSON.stringify(e.payload) : ''
  return `${time} [${e.category}] ${e.level}: ${e.message}${payload}`
}

export const LogPane: Component = () => {
  const [entries, setEntries] = createSignal<LogEntry[]>(snapshot())
  let container: HTMLDivElement | undefined

  const unsub = subscribe((entry) => setEntries((prev) => [...prev, entry]))
  onCleanup(unsub)

  createEffect(() => {
    entries()
    // Let the DOM commit the new row before scrolling.
    setTimeout(() => { if (container) container.scrollTop = container.scrollHeight }, 0)
  })

  function download() {
    const lines = entries().map(formatEntry).join('\n')
    const ts = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const blob = new Blob([lines], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sompyler-web-${ts}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div class="log-pane">
      <header class="log-header">
        <span class="log-title">Log</span>
        <button onClick={download} title="Download log as text file">↓</button>
      </header>
      <div class="log-entries" ref={container}>
        <For each={entries()}>
          {(e) => <div class={`log-entry log-${e.level}`}>{formatEntry(e)}</div>}
        </For>
      </div>
    </div>
  )
}
