import { yaml } from '@codemirror/lang-yaml'
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { lintKeymap, lintGutter } from '@codemirror/lint'
import { search, searchKeymap } from '@codemirror/search'
import { EditorState, Prec, RangeSet, RangeSetBuilder, type Extension } from '@codemirror/state'
import { GutterMarker, keymap, lineNumbers, lineNumberMarkers, highlightActiveLine, highlightSpecialChars } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import type { Text } from '@codemirror/state'
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

export function baseExtensions(onLineNumberClick?: (barIndex: number, metaLine?: number) => void): Extension[] {
  const lineNumExt = onLineNumberClick
    ? lineNumbers({
        domEventHandlers: {
          click(view, block, _event) {
            const line = view.state.doc.lineAt(block.from)
            const text = view.state.doc.sliceString(0, line.to)
            // Count `---` separators above the click. Zero = click in the head
            // block above the first bar; pass the line number so the caller can
            // log a "no bar found" message.
            const sepCount = (text.match(/^---\s*$/gm) ?? []).length
            const barIndex = sepCount || 1
            onLineNumberClick(barIndex, sepCount === 0 ? line.number : undefined)
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
    search({ top: true }),
    keymap.of([
      ...searchKeymap,
      ...defaultKeymap,
      ...historyKeymap,
      ...lintKeymap,
    ]),
    yaml(),
    syntaxHighlighting(darkYamlStyle),
  ]
}

export function extensionsFor(ext: FileExtension, ctx: SemanticLintContext, onBarClick?: (barIndex: number, metaLine?: number) => void): Extension[] {
  // Prec.highest makes sompylerHighlight decorations the innermost spans, so
  // their CSS color wins over the YAML highlight on the enclosing span.
  const clickHandler = ext === 'spls' ? onBarClick : undefined
  return [...baseExtensions(clickHandler), makeLinter(ext, ctx), Prec.highest(sompylerHighlight(ext))]
}

class BarHighlightMarker extends GutterMarker {
  override elementClass = 'cm-bar-highlighted'
}
const barHighlightMarker = new BarHighlightMarker()

export function buildBarMarkerSet(doc: Text, bar: number): RangeSet<GutterMarker> {
  // Find all `---` separator line numbers (1-based).
  const seps: number[] = []
  for (let i = 1; i <= doc.lines; i++) {
    if (/^---\s*$/.test(doc.line(i).text)) seps.push(i)
  }
  // Bar N starts at: sep[N-1] line (the `---` itself), or line 1 for bar 0.
  // The 2-bar window covers bars N and N+1, ending just before sep[N+1].
  const startLine = bar === 0 ? 1 : (seps[bar - 1] ?? doc.lines)
  const endLine = seps[bar + 1] !== undefined ? seps[bar + 1]! - 1 : doc.lines
  const builder = new RangeSetBuilder<GutterMarker>()
  for (let i = Math.max(1, startLine); i <= Math.min(endLine, doc.lines); i++) {
    const from = doc.line(i).from
    builder.add(from, from, barHighlightMarker)
  }
  return builder.finish()
}

export function readOnlyExtension(readOnly: boolean): Extension {
  return EditorState.readOnly.of(readOnly)
}
