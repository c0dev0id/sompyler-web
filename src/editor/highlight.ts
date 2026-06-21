import { ViewPlugin, EditorView, Decoration, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { RangeSetBuilder, type Extension } from '@codemirror/state'
import type { FileExtension } from '../storage/files'

// ── Decoration marks ────────────────────────────────────────────────────────

const pitchMark    = Decoration.mark({ class: 'cm-pitch' })
const waveformMark = Decoration.mark({ class: 'cm-waveform' })
const tickMark     = Decoration.mark({ class: 'cm-tick' })

// ── Patterns ────────────────────────────────────────────────────────────────

const PITCH_RX    = /\b([A-Ga-g][#b]?-?\d+)\b/g
const WAVEFORM_RX = /\b(sin|saw|square|triangle|noise)\b/g
const TICK_RX     = /^(\s+)([\d,+*]+)(\s*:)/

// ── Decoration builder ───────────────────────────────────────────────────────

type Match = { pos: number; end: number; mark: Decoration }

// ── Decoration builder ───────────────────────────────────────────────────────

function buildDecorations(view: EditorView, ext: FileExtension): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()

  for (const { from, to } of view.visibleRanges) {
    let pos = from
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos)
      const text = line.text
      const base = line.from
      const matches: Match[] = []

      if (ext === 'spls') {
        const tm = TICK_RX.exec(text)
        if (tm?.[2]) {
          const start = base + (tm[1]?.length ?? 0)
          matches.push({ pos: start, end: start + tm[2].length, mark: tickMark })
        }
        PITCH_RX.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = PITCH_RX.exec(text)) !== null)
          matches.push({ pos: base + m.index, end: base + m.index + m[0].length, mark: pitchMark })
      }

      if (ext === 'spli' || ext === 'splr') {
        WAVEFORM_RX.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = WAVEFORM_RX.exec(text)) !== null)
          matches.push({ pos: base + m.index, end: base + m.index + m[0].length, mark: waveformMark })
      }

      // RangeSetBuilder requires strictly ascending, non-overlapping ranges.
      matches.sort((a, b) => a.pos - b.pos)
      let lastEnd = -1
      for (const { pos: p, end, mark } of matches) {
        if (p >= lastEnd) {
          builder.add(p, end, mark)
          lastEnd = end
        }
      }

      pos = line.to + 1
    }
  }

  return builder.finish()
}

// ── Public factory ───────────────────────────────────────────────────────────

export function sompylerHighlight(ext: FileExtension): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = buildDecorations(view, ext)
      }
      update(u: ViewUpdate) {
        if (u.docChanged || u.viewportChanged)
          this.decorations = buildDecorations(u.view, ext)
      }
    },
    { decorations: (v) => v.decorations },
  )
}
