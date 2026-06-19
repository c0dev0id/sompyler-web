import { createEffect, createSignal, For, on, onCleanup, Show, type Component } from 'solid-js'
import type { Session } from '../session/Session'
import { subscribe, type LogCategory, type LogEntry } from '../debug'

const LOG_STRIP_CATEGORIES = new Set<LogCategory>(['parse', 'render', 'mix'])
const LOG_STRIP_SIZE = 8

/**
 * R11: modal render dialog. Overlays everything while a render is in flight.
 * Shows stage indicator, progress bar, Cancel button. Auto-closes when the
 * Session transitions back to idle (handled by the parent via `Show`).
 */
export const RenderModal: Component<{ session: Session }> = (props) => {
  const status = () => props.session.renderStatus()
  const inProgress = () =>
    status().state === 'rendering' || status().state === 'mixing'
  const percent = () => {
    const p = status().progress
    return p.total > 0 ? Math.round((p.done / p.total) * 100) : 0
  }

  // R-Debug log strip: tail of the ring buffer, filtered to the categories
  // that describe the render pipeline. Subscribed only while the modal is
  // open so we don't keep a listener for the entire session.
  const [logTail, setLogTail] = createSignal<LogEntry[]>([])

  createEffect(
    on(inProgress, (open) => {
      if (!open) {
        setLogTail([])
        return
      }
      const unsub = subscribe((entry) => {
        if (!LOG_STRIP_CATEGORIES.has(entry.category)) return
        setLogTail((prev) => {
          const next = prev.length >= LOG_STRIP_SIZE ? prev.slice(1) : prev.slice()
          next.push(entry)
          return next
        })
      })
      onCleanup(unsub)
    }),
  )

  return (
    <Show when={inProgress()}>
      <div class="modal-backdrop" role="dialog" aria-modal="true">
        <div class="modal">
          <h2>
            {status().state === 'rendering' ? 'Synthesising' : 'Mixing'}
          </h2>
          <div class="progress">
            <div class="progress-bar" style={{ width: `${percent()}%` }} />
          </div>
          <p class="progress-text">
            {status().progress.done} / {status().progress.total} distinct notes
            {status().progress.cacheHits > 0 ? (
              <span>  ({status().progress.cacheHits} from cache)</span>
            ) : null}
          </p>
          <Show when={status().progress.lastKey}>
            {(key) => <p class="last-key">last: {key().slice(0, 12)}…</p>}
          </Show>
          <Show when={logTail().length > 0}>
            <ul class="log-strip">
              <For each={logTail()}>
                {(entry) => (
                  <li class={`log-strip-entry log-${entry.level}`}>
                    <span class="log-strip-category">[{entry.category}]</span>{' '}
                    <span class="log-strip-message">{entry.message}</span>
                  </li>
                )}
              </For>
            </ul>
          </Show>
          <button onClick={() => props.session.cancelRender()}>Cancel</button>
        </div>
      </div>
    </Show>
  )
}
