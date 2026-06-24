import { onCleanup, onMount, createEffect } from 'solid-js'
import { EditorState, Compartment, RangeSet } from '@codemirror/state'
import { EditorView, lineNumberMarkers, type GutterMarker } from '@codemirror/view'
import { forceLinting } from '@codemirror/lint'
import type { FileExtension, StoredFile } from '../storage/files'
import { makeAutosaver } from './autosave'
import { extensionsFor, readOnlyExtension, buildBarMarkerSet } from './configs'
import type { SemanticLintContext } from './lint'

export interface EditorProps {
  file: StoredFile
  readOnly: boolean
  lintContext: SemanticLintContext
  onBodyChange?: (body: string) => void
  onBarClick?: (barIndex: number, metaLine?: number) => void
  markerBar?: () => number | null
  restoreBody?: () => string | null
  onBodyRestored?: () => void
  onFlushReady?: (flush: (() => Promise<void>) | null) => void
}

export function Editor(props: EditorProps) {
  let host!: HTMLDivElement
  let view: EditorView | undefined
  const readOnlyCompartment = new Compartment()
  const markerBarCompartment = new Compartment()
  const autosaver = makeAutosaver(props.file.name, props.file.ext)

  onMount(() => {
    props.onFlushReady?.(autosaver.flush)
    const extensions = [
      ...extensionsFor(props.file.ext as FileExtension, props.lintContext, props.onBarClick),
      readOnlyCompartment.of(readOnlyExtension(props.readOnly)),
      markerBarCompartment.of(lineNumberMarkers.of(RangeSet.empty as RangeSet<GutterMarker>)),
      EditorView.updateListener.of((u) => {
        if (!u.docChanged) return
        const body = u.state.doc.toString()
        autosaver.schedule(body, props.file.inProject)
        props.onBodyChange?.(body)
      }),
    ]

    const state = EditorState.create({ doc: props.file.body, extensions })

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

  createEffect(() => {
    const bar = props.markerBar?.() ?? null
    if (!view) return
    const rangeSet = bar !== null
      ? buildBarMarkerSet(view.state.doc, bar)
      : RangeSet.empty as RangeSet<GutterMarker>
    view.dispatch({ effects: markerBarCompartment.reconfigure(lineNumberMarkers.of(rangeSet)) })
  })

  createEffect(() => {
    const body = props.restoreBody?.()
    if (body == null || !view) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: body },
      selection: { anchor: 0 },
      scrollIntoView: true,
    })
    props.onBodyRestored?.()
  })

  onCleanup(() => {
    props.onFlushReady?.(null)
    autosaver.flush()
    view?.destroy()
  })

  return <div class="editor" ref={(el) => (host = el)} />
}
