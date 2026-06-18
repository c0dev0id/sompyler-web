import { linter, type Diagnostic } from '@codemirror/lint'
import type { EditorView } from '@codemirror/view'
import jsyaml, { YAMLException } from 'js-yaml'
import { parseScore } from '../parse/score'
import type { FileExtension } from '../storage/files'

export interface SemanticLintContext {
  /** Map of in-project instrument file basenames → instrument name. */
  instrumentNames: () => Set<string>
}

/**
 * Best-effort offset locator for js-yaml errors. `js-yaml` exposes
 * `mark.position` for thrown `YAMLException`s, but caps it at the byte
 * offset of the failing token; we map that back to a CodeMirror range.
 */
function diagnosticFromYamlError(view: EditorView, err: YAMLException): Diagnostic {
  const pos = (err.mark?.position ?? 0) as number
  const safe = Math.min(Math.max(0, pos), view.state.doc.length)
  return {
    from: safe,
    to: Math.min(safe + 1, view.state.doc.length),
    severity: 'error',
    message: err.reason ?? err.message,
  }
}

function yamlSyntaxDiagnostics(view: EditorView): Diagnostic[] {
  const text = view.state.doc.toString()
  try {
    jsyaml.loadAll(text)
    return []
  } catch (e) {
    if (e instanceof YAMLException) return [diagnosticFromYamlError(view, e)]
    return [
      {
        from: 0,
        to: 0,
        severity: 'error',
        message: (e as Error).message,
      },
    ]
  }
}

function scoreSemanticDiagnostics(view: EditorView, ctx: SemanticLintContext): Diagnostic[] {
  const text = view.state.doc.toString()
  const diagnostics: Diagnostic[] = []
  try {
    const { head } = parseScore(text)
    const known = ctx.instrumentNames()
    for (const [voice, voiceSpec] of Object.entries(head.stage)) {
      if (!known.has(voiceSpec.instrument)) {
        diagnostics.push({
          from: 0,
          to: 0,
          severity: 'warning',
          message: `Voice '${voice}' references unknown instrument '${voiceSpec.instrument}'`,
        })
      }
    }
  } catch {
    // Syntax errors are already reported by `yamlSyntaxDiagnostics`.
  }
  return diagnostics
}

export function makeLinter(ext: FileExtension, ctx: SemanticLintContext) {
  return linter((view) => {
    const syntax = yamlSyntaxDiagnostics(view)
    if (syntax.length) return syntax
    if (ext === 'spls') return scoreSemanticDiagnostics(view, ctx)
    return []
  })
}
