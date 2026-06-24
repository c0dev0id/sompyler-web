import { createEffect, createMemo, createSignal, For, onMount, Show, type Component } from 'solid-js'
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
import { resetDatabase } from '../storage/db'
import { parseScore } from '../parse/score'
import { log } from '../debug'
import { StagingHelpDialog } from './StagingHelpDialog'
import { FileViewModal } from './FileViewModal'

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
  /** Trigger a re-read when a score body may have been edited (staging-only, no editor reload). */
  scoreRefreshSignal?: () => number
  /** Called when the set of in-project files may have changed. */
  onChange: () => void
  mutationsDisabled: boolean
  /** Called when a filename in the active project is clicked — switch editor focus to it. */
  onFocusFile?: (name: string, ext: FileExtension) => void
  /** Called when the user clicks Solo on an instrument in the file-view modal. */
  onSoloRender?: (name: string) => void
}

function getScoreRefs(body: string): Record<'spli' | 'splr' | 'splt', Set<string>> {
  const refs: Record<'spli' | 'splr' | 'splt', Set<string>> = {
    spli: new Set(),
    splr: new Set(),
    splt: new Set(),
  }
  try {
    const { head } = parseScore(body)
    for (const v of Object.values(head.stage)) refs.spli.add(v.instrument)
    if (head.room) refs.splr.add(head.room)
    if (head.tuningConfig) refs.splt.add(head.tuningConfig)
  } catch { /* unparseable score — no deps shown */ }
  return refs
}

export const StagingPane: Component<StagingPaneProps> = (props) => {
  const [files, setFiles] = createSignal<StoredFile[]>([])
  const [collapsed, setCollapsed] = createSignal(false)
  const [showCreate, setShowCreate] = createSignal(false)
  const [newName, setNewName] = createSignal('')
  const [newExt, setNewExt] = createSignal<FileExtension>('spli')
  const [expanded, setExpanded] = createSignal(new Set<string>())
  const [viewFile, setViewFile] = createSignal<StoredFile | null>(null)
  let fileInput: HTMLInputElement | undefined
  let nameInput: HTMLInputElement | undefined
  let helpDialog: HTMLDialogElement | undefined

  function toggleExpanded(id: string) {
    setExpanded((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const grouped = createMemo(() => {
    const all = files()
    const scores = all.filter((f) => f.ext === 'spls')
    const nonScores = all.filter((f) => f.ext !== 'spls')
    const claimedIds = new Set<string>()
    const groups = scores.map((score) => {
      const refs = getScoreRefs(score.body)
      const deps: StoredFile[] = []
      const missing: Array<{ name: string; ext: 'spli' | 'splr' | 'splt' }> = []
      for (const [ext, names] of Object.entries(refs) as Array<['spli' | 'splr' | 'splt', Set<string>]>) {
        for (const name of names) {
          const found = nonScores.find((f) => f.ext === ext && f.name === name)
          if (found) {
            deps.push(found)
            claimedIds.add(found.id)
          } else {
            missing.push({ name, ext })
          }
        }
      }
      return { score, deps, missing }
    })
    const unreferenced = nonScores.filter((f) => !claimedIds.has(f.id))
    return { groups, unreferenced }
  })

  async function refresh() {
    setFiles(await listFiles())
  }
  createEffect(() => {
    props.refreshSignal()
    props.scoreRefreshSignal?.()
    void refresh()
  })

  createEffect(() => {
    if (props.mutationsDisabled) return
    const { groups, unreferenced } = grouped()
    void (async () => {
      let changed = false
      for (const f of unreferenced) {
        if (f.inProject) {
          await setInProject(f.name, f.ext, false)
          changed = true
        }
      }
      for (const { score, deps } of groups) {
        if (!score.inProject) continue
        for (const f of deps) {
          if (!f.inProject) {
            await setInProject(f.name, f.ext, true)
            changed = true
          }
        }
      }
      if (changed) {
        await refresh()
        props.onChange()
      }
    })()
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
      const refs = getScoreRefs(f.body)
      if (Object.values(refs).every((s) => s.size === 0)) {
        log('storage', 'warn', `Cannot parse '${f.id}'; skipping auto-link`)
      }
      for (const g of files()) {
        if (g.id === f.id) continue
        const wanted = refs[g.ext as 'spli' | 'splr' | 'splt']
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

  async function handleCreateMissing(name: string, ext: FileExtension, score: StoredFile) {
    if (props.mutationsDisabled) return
    await putFile({ name, ext, body: '', inProject: score.inProject })
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

  async function handleReset() {
    if (!window.confirm('Delete all files and notes from IndexedDB? This cannot be undone.')) return
    await resetDatabase()
    window.location.reload()
  }

  function openCreate() {
    setNewName('')
    setNewExt('spli')
    setShowCreate(true)
    setTimeout(() => nameInput?.focus(), 0)
  }

  async function handleCreate() {
    const name = newName().trim()
    if (!name) return
    const ext = newExt()
    if (files().some((f) => f.name === name && f.ext === ext)) {
      alert(`'${name}.${ext}' already exists.`)
      return
    }
    await putFile({ name, ext, body: '', inProject: false })
    setShowCreate(false)
    setNewName('')
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
    <>
    <aside class={`staging ${collapsed() ? 'collapsed' : ''}`}>
      <header>
        <button onClick={toggleCollapsed} aria-label="Toggle staging">
          {collapsed() ? '▶' : '◀'}
        </button>
        <Show when={!collapsed()}>
          <h3>Files</h3>
          <button class="help-btn" title="How the file browser works" onClick={() => helpDialog?.showModal()}>?</button>
        </Show>
      </header>
      <StagingHelpDialog ref={(el) => { helpDialog = el }} />
      <Show when={!collapsed()}>
        <div class="staging-body">
          <ul class="staging-tree">
            <For each={grouped().groups}>
              {({ score, deps, missing }) => (
                <li class={`tree-score${score.inProject ? ' in-project' : ''}`}>
                  <div
                    class="tree-row"
                    onClick={() => { if (deps.length > 0 || missing.length > 0) toggleExpanded(score.id) }}
                    style={{ cursor: deps.length > 0 || missing.length > 0 ? 'pointer' : 'default' }}
                  >
                    <button
                      class={`tree-toggle${expanded().has(score.id) ? ' open' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleExpanded(score.id) }}
                      disabled={deps.length === 0 && missing.length === 0}
                      title={deps.length === 0 && missing.length === 0 ? 'No referenced files' : (expanded().has(score.id) ? 'Collapse' : 'Expand')}
                    >▶</button>
                    <span class="filename">{score.name}.{score.ext}</span>
                    <div class="actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => void toggleInProject(score)}
                        disabled={props.mutationsDisabled}
                        title={score.inProject ? 'Remove from project' : 'Add to project'}
                      >
                        {score.inProject ? '−' : '+'}
                      </button>
                      <button
                        onClick={() => void handleRename(score)}
                        disabled={props.mutationsDisabled}
                        title="Rename"
                      >✎</button>
                      <button
                        onClick={() => void handleDelete(score)}
                        disabled={props.mutationsDisabled}
                        title="Delete"
                      >✕</button>
                    </div>
                  </div>
                  <Show when={expanded().has(score.id) && (deps.length > 0 || missing.length > 0)}>
                    <ul class="tree-deps">
                      <For each={deps}>
                        {(f) => (
                          <li class={`tree-dep${f.inProject ? ' in-project' : ''}`}>
                            <span
                              class="filename filename-link"
                              title={f.inProject ? 'Switch editor to this file' : 'View / edit file'}
                              onClick={() => f.inProject ? props.onFocusFile?.(f.name, f.ext) : setViewFile(f)}
                            >{f.name}.{f.ext}</span>
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
                              >✎</button>
                              <button
                                onClick={() => void handleDelete(f)}
                                disabled={props.mutationsDisabled}
                                title="Delete"
                              >✕</button>
                            </div>
                          </li>
                        )}
                      </For>
                      <For each={missing}>
                        {(ghost) => (
                          <li class="tree-dep tree-dep-missing">
                            <span class="filename">{ghost.name}.{ghost.ext}</span>
                            <div class="actions">
                              <button
                                onClick={() => void handleCreateMissing(ghost.name, ghost.ext, score)}
                                disabled={props.mutationsDisabled}
                                title="Create empty file"
                              >Create</button>
                            </div>
                          </li>
                        )}
                      </For>
                    </ul>
                  </Show>
                </li>
              )}
            </For>
            <Show when={grouped().unreferenced.length > 0}>
              <li class={`tree-score unreferenced-group${expanded().has('__unreferenced__') ? ' open' : ''}`}>
                <div class="tree-row" style={{ cursor: 'pointer' }} onClick={() => toggleExpanded('__unreferenced__')}>
                  <button
                    class={`tree-toggle${expanded().has('__unreferenced__') ? ' open' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleExpanded('__unreferenced__') }}
                    title={expanded().has('__unreferenced__') ? 'Collapse' : 'Expand'}
                  >▶</button>
                  <span class="filename unreferenced-label">unreferenced</span>
                </div>
                <Show when={expanded().has('__unreferenced__')}>
                  <ul class="tree-deps">
                    <For each={grouped().unreferenced}>
                      {(f) => (
                        <li class={`tree-dep${f.inProject ? ' in-project' : ''}`}>
                          <span
                            class="filename filename-link"
                            title="View / edit file"
                            onClick={() => setViewFile(f)}
                          >{f.name}.{f.ext}</span>
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
                            >✎</button>
                            <button
                              onClick={() => void handleDelete(f)}
                              disabled={props.mutationsDisabled}
                              title="Delete"
                            >✕</button>
                          </div>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              </li>
            </Show>
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
              onClick={openCreate}
              disabled={props.mutationsDisabled}
            >
              New…
            </button>
            <Show when={showCreate()}>
              <div class="create-form">
                <div class="create-form-row">
                  <input
                    type="text"
                    ref={nameInput}
                    value={newName()}
                    onInput={(e) => setNewName(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleCreate()
                      if (e.key === 'Escape') setShowCreate(false)
                    }}
                    placeholder="filename"
                  />
                  <select
                    value={newExt()}
                    onChange={(e) => setNewExt(e.currentTarget.value as FileExtension)}
                  >
                    <option value="spli">spli</option>
                    <option value="spls">spls</option>
                    <option value="splt">splt</option>
                    <option value="splr">splr</option>
                  </select>
                </div>
                <div class="create-form-row">
                  <button onClick={() => void handleCreate()}>Create</button>
                  <button onClick={() => setShowCreate(false)}>Cancel</button>
                </div>
              </div>
            </Show>
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
            <button
              class="danger"
              onClick={() => void handleReset()}
              title="Delete all IndexedDB data and reload"
            >
              Reset Database
            </button>
          </div>
        </div>
      </Show>
    </aside>
    <Show when={viewFile()} keyed>
      {(f) => (
        <FileViewModal
          file={f}
          onClose={() => setViewFile(null)}
          onSaved={async () => { await refresh(); props.onChange() }}
          onSoloRender={f.ext === 'spli' ? () => props.onSoloRender?.(f.name) : undefined}
        />
      )}
    </Show>
    </>
  )
}
