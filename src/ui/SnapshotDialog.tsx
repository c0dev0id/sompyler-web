import { createResource, For, Show, type Component } from 'solid-js'
import { getSnapshots, type Snapshot } from '../storage/snapshots'

interface SnapshotDialogProps {
  fileId: () => string | null
  currentBody: () => string
  ref: (el: HTMLDialogElement) => void
  onRestore: (body: string) => void
}

type DiffLine = { type: 'same' | 'del' | 'add'; text: string }

function diffLines(from: string, to: string): DiffLine[] | null {
  const a = from.split('\n')
  const b = to.split('\n')
  if (a.length * b.length > 60_000) return null  // too large — skip diff

  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i]![j] = a[i - 1] === b[j - 1] ? dp[i - 1]![j - 1]! + 1 : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!)

  const result: DiffLine[] = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: 'same', text: a[i - 1]! })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      result.unshift({ type: 'add', text: b[j - 1]! })
      j--
    } else {
      result.unshift({ type: 'del', text: a[i - 1]! })
      i--
    }
  }
  return result
}

const CTX = 2

function withContext(diff: DiffLine[]): Array<DiffLine | { type: 'ellipsis' }> {
  const visible = new Set<number>()
  diff.forEach((l, i) => {
    if (l.type !== 'same') {
      for (let k = Math.max(0, i - CTX); k <= Math.min(diff.length - 1, i + CTX); k++) visible.add(k)
    }
  })
  if (visible.size === 0) return []

  const out: Array<DiffLine | { type: 'ellipsis' }> = []
  let prev = -1
  for (const idx of [...visible].sort((a, b) => a - b)) {
    if (prev !== -1 && idx > prev + 1) out.push({ type: 'ellipsis' })
    out.push(diff[idx]!)
    prev = idx
  }
  return out
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function SnapshotCard(props: {
  snap: Snapshot
  current: string
  onRestore: (body: string) => void
  dialog: HTMLDialogElement | undefined
}) {
  const raw = diffLines(props.current, props.snap.body)
  const lines = raw ? withContext(raw) : null
  const hasChanges = raw ? raw.some((l) => l.type !== 'same') : true

  return (
    <div class="snap-card">
      <div class="snap-card-header">
        <span class="snap-ts">{formatTs(props.snap.ts)}</span>
        <button
          class="snap-restore"
          onClick={() => { props.onRestore(props.snap.body); props.dialog?.close() }}
        >Restore</button>
      </div>
      <Show when={hasChanges} fallback={<p class="snap-no-diff">No changes from current version</p>}>
        <Show when={lines !== null} fallback={<p class="snap-no-diff">File too large to diff — click Restore to apply</p>}>
          <pre class="snap-diff">
            <For each={lines!}>
              {(l) =>
                l.type === 'ellipsis'
                  ? <div class="diff-ellipsis">…</div>
                  : <div class={`diff-${l.type}`}>{l.type === 'del' ? '−' : l.type === 'add' ? '+' : ' '} {(l as DiffLine).text}</div>
              }
            </For>
          </pre>
        </Show>
      </Show>
    </div>
  )
}

export const SnapshotDialog: Component<SnapshotDialogProps> = (props) => {
  let dialog: HTMLDialogElement | undefined

  const [snapshots] = createResource(props.fileId, async (id) => {
    if (!id) return []
    return getSnapshots(id)
  })

  return (
    <dialog
      class="help-dialog snap-dialog"
      ref={(el) => { dialog = el; props.ref(el) }}
      onClick={(e) => { if (e.target === dialog) dialog?.close() }}
    >
      <div class="help-header">
        <span>Version history</span>
        <button onClick={() => dialog?.close()}>✕</button>
      </div>
      <div class="help-body snap-body">
        <Show when={!snapshots.loading} fallback={<p class="snap-no-diff">Loading…</p>}>
          <Show
            when={(snapshots() ?? []).length > 0}
            fallback={<p class="snap-no-diff">No snapshots yet — snapshots are taken on each render.</p>}
          >
            <For each={snapshots()}>
              {(snap) => (
                <SnapshotCard
                  snap={snap}
                  current={props.currentBody()}
                  onRestore={props.onRestore}
                  dialog={dialog}
                />
              )}
            </For>
          </Show>
        </Show>
      </div>
    </dialog>
  )
}
