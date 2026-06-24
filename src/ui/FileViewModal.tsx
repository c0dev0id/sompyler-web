import { createSignal, onCleanup, type Component } from 'solid-js'
import { putFile, type StoredFile } from '../storage/files'
import { Editor } from '../editor/Editor'

export interface FileViewModalProps {
  file: StoredFile
  onClose: () => void
  onSaved: () => void
}

export const FileViewModal: Component<FileViewModalProps> = (props) => {
  let dialog: HTMLDialogElement | undefined
  let saveTimer = 0
  const [dirty, setDirty] = createSignal(false)

  onCleanup(() => clearTimeout(saveTimer))

  function handleChange(body: string) {
    setDirty(true)
    clearTimeout(saveTimer)
    saveTimer = window.setTimeout(async () => {
      await putFile({ name: props.file.name, ext: props.file.ext, body, inProject: props.file.inProject })
      setDirty(false)
      props.onSaved()
    }, 800)
  }

  function close() {
    clearTimeout(saveTimer)
    props.onClose()
  }

  return (
    <dialog
      class="file-view-dialog"
      ref={(el) => { dialog = el; el.showModal() }}
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
    </dialog>
  )
}
