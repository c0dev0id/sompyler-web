import { yaml } from '@codemirror/lang-yaml'
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { lintKeymap, lintGutter } from '@codemirror/lint'
import { EditorState, type Extension } from '@codemirror/state'
import { keymap, lineNumbers, highlightActiveLine, highlightSpecialChars } from '@codemirror/view'
import type { FileExtension } from '../storage/files'
import { makeLinter, type SemanticLintContext } from './lint'
import { sompylerHighlight } from './highlight'

export function baseExtensions(): Extension[] {
  return [
    lineNumbers(),
    lintGutter(),
    history(),
    highlightActiveLine(),
    highlightSpecialChars(),
    keymap.of([...defaultKeymap, ...historyKeymap, ...lintKeymap]),
    yaml(),
    syntaxHighlighting(defaultHighlightStyle),
  ]
}

export function extensionsFor(ext: FileExtension, ctx: SemanticLintContext): Extension[] {
  return [...baseExtensions(), makeLinter(ext, ctx), sompylerHighlight(ext)]
}

export function readOnlyExtension(readOnly: boolean): Extension {
  return EditorState.readOnly.of(readOnly)
}
