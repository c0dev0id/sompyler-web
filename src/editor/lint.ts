import { linter, type Diagnostic } from '@codemirror/lint'
import type { EditorView } from '@codemirror/view'
import jsyaml, { YAMLException } from 'js-yaml'
import { parseScore } from '../parse/score'
import type { FileExtension } from '../storage/files'
import type { RenderDiagnostic } from '../render/renderAll'

export interface SemanticLintContext {
  /** Map of in-project instrument file basenames → instrument name. */
  instrumentNames: () => Set<string>
  /**
   * R6: per-note errors collected by the most recent render run. Surfaced
   * as CodeMirror inline diagnostics on the score editor.
   */
  renderDiagnostics?: () => RenderDiagnostic[]
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

/**
 * Best-effort source mapper. Given a (voice, offset) tuple, scan the doc for
 * a line like `  <offset>: ...` underneath the matching `<voice>:` heading.
 * No measure tracking — the first match wins, which is enough to drop a
 * marker on the right line in the simple single-measure case and degrades
 * to "line 0" otherwise.
 */
function locateNoteOffset(text: string, voice: string, offsetKey: string): number {
  const voiceRe = new RegExp(`^${escapeRegex(voice)}\\s*:`, 'm')
  const voiceMatch = voiceRe.exec(text)
  if (!voiceMatch) return 0
  const after = text.slice(voiceMatch.index + voiceMatch[0].length)
  const offsetRe = new RegExp(`^\\s+${escapeRegex(offsetKey)}\\s*:`, 'm')
  const offsetMatch = offsetRe.exec(after)
  if (!offsetMatch) return voiceMatch.index
  return voiceMatch.index + voiceMatch[0].length + offsetMatch.index
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function renderDiagnosticsFor(view: EditorView, ctx: SemanticLintContext): Diagnostic[] {
  const items = ctx.renderDiagnostics?.() ?? []
  if (items.length === 0) return []
  const text = view.state.doc.toString()
  const out: Diagnostic[] = []
  for (const d of items) {
    const occ = d.occurrence
    const from = locateNoteOffset(text, occ.voice, String(occ.offsetTicks))
    const to = Math.min(from + 1, view.state.doc.length)
    const where = `voice '${occ.voice}', measure ${occ.measureName}, offset ${occ.offsetTicks} (${d.frequencyHz.toFixed(2)} Hz)`
    out.push({
      from,
      to,
      severity: 'error',
      message: `${where}: ${d.message}`,
    })
  }
  return out
}

export function makeLinter(ext: FileExtension, ctx: SemanticLintContext) {
  return linter((view) => {
    const syntax = yamlSyntaxDiagnostics(view)
    if (syntax.length) return syntax
    if (ext !== 'spls') return []
    return [
      ...scoreSemanticDiagnostics(view, ctx),
      ...renderDiagnosticsFor(view, ctx),
    ]
  })
}
