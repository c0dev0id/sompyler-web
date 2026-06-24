import { createSignal, onCleanup, onMount, Show, type Component } from 'solid-js'
import { listProjectFiles, putFile, type StoredFile } from '../storage/files'
import { Editor } from '../editor/Editor'
import { InstrumentPreview } from './InstrumentPreview'
import { firstInstrumentPitchHz } from '../parse/score'

export interface FileViewModalProps {
  file: StoredFile
  onClose: () => void
  onSaved: () => void
}

export const FileViewModal: Component<FileViewModalProps> = (props) => {
  let dialog: HTMLDialogElement | undefined
  let saveTimer = 0
  const [dirty, setDirty] = createSignal(false)
  const [previewBody, setPreviewBody] = createSignal(props.file.body)

  onMount(() => dialog?.showModal())
  onCleanup(() => clearTimeout(saveTimer))

  function handleChange(body: string) {
    setDirty(true)
    clearTimeout(saveTimer)
    saveTimer = window.setTimeout(async () => {
      await putFile({ name: props.file.name, ext: props.file.ext, body, inProject: props.file.inProject })
      setDirty(false)
      setPreviewBody(body)
      props.onSaved()
    }, 800)
  }

  const resolveHz = async (): Promise<number> => {
    const files = await listProjectFiles()
    const score = files.find((f) => f.ext === 'spls')
    return score ? (firstInstrumentPitchHz(score.body, props.file.name) ?? 440) : 440
  }

  function close() {
    clearTimeout(saveTimer)
    props.onClose()
  }

  return (
    <dialog
      class="file-view-dialog"
      ref={(el) => { dialog = el }}
      onClick={(e) => { if (e.target === dialog) close() }}
      onClose={close}
    >
      <div class="file-view-header">
        <span class="file-view-filename">{props.file.name}.{props.file.ext}</span>
        {dirty() && <span class="file-view-saving">saving…</span>}
        <button onClick={close}>✕</button>
      </div>
      <div class="file-view-body">
        <Editor
          file={props.file}
          readOnly={false}
          lintContext={{ instrumentNames: () => new Set(), renderDiagnostics: () => [] }}
          onBodyChange={handleChange}
        />
      </div>
      <Show when={props.file.ext === 'spli'}>
        <div class="file-view-preview">
          <InstrumentPreview
            name={() => props.file.name}
            body={previewBody}
            resolveHz={resolveHz}
          />
        </div>
      </Show>
    </dialog>
  )
}
