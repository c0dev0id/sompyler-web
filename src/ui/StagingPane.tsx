import { createEffect, createSignal, For, onMount, Show, type Component } from 'solid-js'
import {
  deleteFile,
  listFiles,
  putFile,
  setInProject,
  type FileExtension,
  type StoredFile,
} from '../storage/files'
import { getPref, setPref } from '../storage/prefs'
import { log } from '../debug'

const COLLAPSED_PREF_KEY = 'staging.collapsed'

/**
 * R9: flat-file staging rail. Every file in IndexedDB is shown here; rows
 * have per-file Add / Remove / Rename / Delete controls. The active project
 * is the subset where `inProject = true`.
 *
 * Import/Export of .zip archives lands in Phase 7 (zip library decision was
 * deferred — for now the pane handles individual file picker imports).
 */

const VALID_EXTS: FileExtension[] = ['spls', 'spli', 'splt', 'splr']

function parseFilename(filename: string): { name: string; ext: FileExtension } | null {
  const dot = filename.lastIndexOf('.')
  if (dot <= 0) return null
  const ext = filename.slice(dot + 1).toLowerCase()
  if (!VALID_EXTS.includes(ext as FileExtension)) return null
  return { name: filename.slice(0, dot), ext: ext as FileExtension }
}

export interface StagingPaneProps {
  /** Trigger a re-read of storage when files change. */
  refreshSignal: () => number
  /** Called when the set of in-project files may have changed. */
  onChange: () => void
  mutationsDisabled: boolean
}

export const StagingPane: Component<StagingPaneProps> = (props) => {
  const [files, setFiles] = createSignal<StoredFile[]>([])
  const [collapsed, setCollapsed] = createSignal(false)
  let fileInput: HTMLInputElement | undefined

  async function refresh() {
    setFiles(await listFiles())
  }
  createEffect(() => {
    props.refreshSignal()
    void refresh()
  })

  onMount(() => {
    void (async () => {
      setCollapsed(await getPref<boolean>(COLLAPSED_PREF_KEY, false))
    })()
  })

  function toggleCollapsed() {
    const next = !collapsed()
    setCollapsed(next)
    void setPref(COLLAPSED_PREF_KEY, next)
  }

  async function toggleInProject(f: StoredFile) {
    if (props.mutationsDisabled) return
    // Score multiplicity: at most one .spls may be inProject.
    if (f.ext === 'spls' && !f.inProject) {
      const otherScore = files().find((g) => g.ext === 'spls' && g.inProject && g.id !== f.id)
      if (otherScore) {
        await setInProject(otherScore.name, otherScore.ext, false)
      }
    }
    await setInProject(f.name, f.ext, !f.inProject)
    await refresh()
    props.onChange()
  }

  async function handleDelete(f: StoredFile) {
    if (props.mutationsDisabled) return
    if (f.inProject && !confirm(`Delete in-project file '${f.id}'?`)) return
    await deleteFile(f.name, f.ext)
    await refresh()
    props.onChange()
  }

  async function handleRename(f: StoredFile) {
    if (props.mutationsDisabled) return
    const next = prompt(`Rename '${f.name}' to:`, f.name)
    if (next == null || next === f.name) return
    await deleteFile(f.name, f.ext)
    await putFile({ name: next, ext: f.ext, body: f.body, inProject: f.inProject })
    await refresh()
    props.onChange()
  }

  async function handleImport(ev: Event) {
    const input = ev.currentTarget as HTMLInputElement
    if (!input.files) return
    for (const file of Array.from(input.files)) {
      const parsed = parseFilename(file.name)
      if (!parsed) {
        log('storage', 'warn', `Skipping unrecognised file '${file.name}'`)
        continue
      }
      const body = await file.text()
      await putFile({ name: parsed.name, ext: parsed.ext, body, inProject: false })
    }
    input.value = ''
    await refresh()
    props.onChange()
  }

  return (
    <aside class={`staging ${collapsed() ? 'collapsed' : ''}`}>
      <header>
        <button onClick={toggleCollapsed} aria-label="Toggle staging">
          {collapsed() ? '▶' : '◀'}
        </button>
        <Show when={!collapsed()}>
          <h3>Files</h3>
        </Show>
      </header>
      <Show when={!collapsed()}>
        <div class="staging-body">
          <ul class="staging-list">
            <For each={files()}>
              {(f) => (
                <li class={f.inProject ? 'in-project' : ''}>
                  <span class="filename">
                    {f.name}.{f.ext}
                  </span>
                  <div class="actions">
                    <button
                      onClick={() => void toggleInProject(f)}
                      disabled={props.mutationsDisabled}
                      title={f.inProject ? 'Remove from project' : 'Add to project'}
                    >
                      {f.inProject ? '−' : '+'}
                    </button>
                    <button
                      onClick={() => void handleRename(f)}
                      disabled={props.mutationsDisabled}
                      title="Rename"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => void handleDelete(f)}
                      disabled={props.mutationsDisabled}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              )}
            </For>
          </ul>
          <div class="staging-footer">
            <input
              type="file"
              ref={fileInput}
              multiple
              accept=".spls,.spli,.splt,.splr"
              onChange={(e) => void handleImport(e)}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInput?.click()}
              disabled={props.mutationsDisabled}
            >
              Import…
            </button>
          </div>
        </div>
      </Show>
    </aside>
  )
}
