import { Show, type Component } from 'solid-js'
import type { Session } from '../session/Session'

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
          <button onClick={() => props.session.cancelRender()}>Cancel</button>
        </div>
      </div>
    </Show>
  )
}
