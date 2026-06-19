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
import { packZip, unpackZip } from '../storage/zip'
import { parseScore } from '../parse/score'
import { log } from '../debug'

const COLLAPSED_PREF_KEY = 'staging.collapsed'

/**
 * R9: flat-file staging rail. Every file in IndexedDB is shown here; rows
 * have per-file Add / Remove / Rename / Delete controls. The active project
 * is the subset where `inProject = true`. Import accepts loose files or a
 * .zip archive; Export writes a flat .zip of every staged file.
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
    // Adding a .spls is a full project reset: unload every other in-project
    // file, then auto-add the .spli / .splr / .splt the new score names.
    // Referenced files missing from staging are silently skipped (editor
    // lint surfaces them at render time per R6).
    if (f.ext === 'spls' && !f.inProject) {
      for (const g of files()) {
        if (g.inProject && g.id !== f.id) {
          await setInProject(g.name, g.ext, false)
        }
      }
      const referenced: Record<'spli' | 'splr' | 'splt', Set<string>> = {
        spli: new Set(),
        splr: new Set(),
        splt: new Set(),
      }
      try {
        const { head } = parseScore(f.body)
        for (const v of Object.values(head.stage)) referenced.spli.add(v.instrument)
        if (head.room) referenced.splr.add(head.room)
        if (head.tuningConfig) referenced.splt.add(head.tuningConfig)
      } catch (err) {
        log('storage', 'warn', `Cannot parse '${f.id}'; skipping auto-link`, {
          error: String(err),
        })
      }
      for (const g of files()) {
        if (g.id === f.id) continue
        const wanted = referenced[g.ext as 'spli' | 'splr' | 'splt']
        if (wanted && wanted.has(g.name)) {
          await setInProject(g.name, g.ext, true)
        }
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
      if (file.name.toLowerCase().endsWith('.zip')) {
        const bytes = new Uint8Array(await file.arrayBuffer())
        let unpacked: ReturnType<typeof unpackZip>
        try {
          unpacked = unpackZip(bytes)
        } catch (err) {
          log('storage', 'warn', `Failed to unpack '${file.name}'`, { error: String(err) })
          continue
        }
        for (const entry of unpacked) {
          await putFile({ name: entry.name, ext: entry.ext, body: entry.body, inProject: false })
        }
        log('storage', 'info', `Unpacked '${file.name}'`, { count: unpacked.length })
        continue
      }
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

  async function handleExport() {
    const all = await listFiles()
    if (all.length === 0) return
    const bytes = packZip(all)
    const blob = new Blob([bytes as BlobPart], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sompyler-${new Date().toISOString().slice(0, 10)}.zip`
    a.click()
    URL.revokeObjectURL(url)
    log('storage', 'info', `Exported zip`, { count: all.length })
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
              accept=".spls,.spli,.splt,.splr,.zip"
              onChange={(e) => void handleImport(e)}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInput?.click()}
              disabled={props.mutationsDisabled}
            >
              Import…
            </button>
            <button
              onClick={() => void handleExport()}
              disabled={files().length === 0}
              title="Download every staged file as a .zip"
            >
              Export…
            </button>
          </div>
        </div>
      </Show>
    </aside>
  )
}
