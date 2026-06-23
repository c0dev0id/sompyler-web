import { yaml } from '@codemirror/lang-yaml'
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { lintKeymap, lintGutter } from '@codemirror/lint'
import { EditorState, Prec, type Extension } from '@codemirror/state'
import { keymap, lineNumbers, highlightActiveLine, highlightSpecialChars } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import type { FileExtension } from '../storage/files'
import { makeLinter, type SemanticLintContext } from './lint'
import { sompylerHighlight } from './highlight'

// Dark-theme YAML highlight. Replaces the bundled defaultHighlightStyle which
// is designed for light backgrounds and produces unreadable colors on #1a1a1a.
// Strings are intentionally muted so domain-specific marks (shape strings,
// pitches, waveforms) can override them via Prec.highest below.
const darkYamlStyle = HighlightStyle.define([
  { tag: [tags.propertyName, tags.definition(tags.propertyName)], color: '#88b4e7' },
  { tag: [tags.string, tags.literal, tags.atom],                  color: '#888888' },
  { tag: tags.comment,                                             color: '#555555' },
  { tag: tags.bool,                                                color: '#b5cea8' },
  { tag: tags.number,                                              color: '#d7ba7d' },
  { tag: tags.punctuation,                                         color: '#555555' },
])

export function baseExtensions(onLineNumberClick?: (barIndex: number) => void): Extension[] {
  const lineNumExt = onLineNumberClick
    ? lineNumbers({
        domEventHandlers: {
          click(view, block, _event) {
            const line = view.state.doc.lineAt(block.from)
            const text = view.state.doc.sliceString(0, line.to)
            const barIndex = (text.match(/^---\s*$/gm) ?? []).length
            onLineNumberClick(barIndex)
            return true
          },
        },
      })
    : lineNumbers()
  return [
    lineNumExt,
    lintGutter(),
    history(),
    highlightActiveLine(),
    highlightSpecialChars(),
    keymap.of([...defaultKeymap, ...historyKeymap, ...lintKeymap]),
    yaml(),
    syntaxHighlighting(darkYamlStyle),
  ]
}

export function extensionsFor(ext: FileExtension, ctx: SemanticLintContext, onBarClick?: (barIndex: number) => void): Extension[] {
  // Prec.highest makes sompylerHighlight decorations the innermost spans, so
  // their CSS color wins over the YAML highlight on the enclosing span.
  const clickHandler = ext === 'spls' ? onBarClick : undefined
  return [...baseExtensions(clickHandler), makeLinter(ext, ctx), Prec.highest(sompylerHighlight(ext))]
}

export function readOnlyExtension(readOnly: boolean): Extension {
  return EditorState.readOnly.of(readOnly)
}
