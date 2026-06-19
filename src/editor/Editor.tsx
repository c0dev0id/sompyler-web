import { onCleanup, onMount, createEffect } from 'solid-js'
import { EditorState, Compartment } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { forceLinting } from '@codemirror/lint'
import type { FileExtension, StoredFile } from '../storage/files'
import { makeAutosaver } from './autosave'
import { extensionsFor, readOnlyExtension } from './configs'
import type { SemanticLintContext } from './lint'

export interface EditorProps {
  file: StoredFile
  readOnly: boolean
  lintContext: SemanticLintContext
  onBodyChange?: (body: string) => void
}

export function Editor(props: EditorProps) {
  let host!: HTMLDivElement
  let view: EditorView | undefined
  const readOnlyCompartment = new Compartment()
  const autosaver = makeAutosaver(props.file.name, props.file.ext)

  onMount(() => {
    const state = EditorState.create({
      doc: props.file.body,
      extensions: [
        ...extensionsFor(props.file.ext as FileExtension, props.lintContext),
        readOnlyCompartment.of(readOnlyExtension(props.readOnly)),
        EditorView.updateListener.of((u) => {
          if (!u.docChanged) return
          const body = u.state.doc.toString()
          autosaver.schedule(body, props.file.inProject)
          props.onBodyChange?.(body)
        }),
      ],
    })
    view = new EditorView({ state, parent: host })
  })

  createEffect(() => {
    if (!view) return
    view.dispatch({
      effects: readOnlyCompartment.reconfigure(readOnlyExtension(props.readOnly)),
    })
  })

  // R6: when external render diagnostics change, ask CodeMirror to re-run
  // the linter so the inline markers refresh without a doc edit.
  createEffect(() => {
    props.lintContext.renderDiagnostics?.()
    if (view) forceLinting(view)
  })

  onCleanup(() => {
    autosaver.flush()
    view?.destroy()
  })

  return <div class="editor" ref={(el) => (host = el)} />
}
