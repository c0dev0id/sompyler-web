import { yaml } from '@codemirror/lang-yaml'
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands'
import { lintKeymap, lintGutter } from '@codemirror/lint'
import { EditorState, type Extension } from '@codemirror/state'
import { keymap, lineNumbers, highlightActiveLine, highlightSpecialChars } from '@codemirror/view'
import type { FileExtension } from '../storage/files'
import { makeLinter, type SemanticLintContext } from './lint'

export function baseExtensions(): Extension[] {
  return [
    lineNumbers(),
    lintGutter(),
    history(),
    highlightActiveLine(),
    highlightSpecialChars(),
    keymap.of([...defaultKeymap, ...historyKeymap, ...lintKeymap]),
    yaml(),
  ]
}

export function extensionsFor(ext: FileExtension, ctx: SemanticLintContext): Extension[] {
  return [...baseExtensions(), makeLinter(ext, ctx)]
}

export function readOnlyExtension(readOnly: boolean): Extension {
  return EditorState.readOnly.of(readOnly)
}
