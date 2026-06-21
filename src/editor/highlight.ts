import { ViewPlugin, EditorView, Decoration, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { RangeSetBuilder, type Extension } from '@codemirror/state'
import type { FileExtension } from '../storage/files'

// ── Decoration marks ────────────────────────────────────────────────────────

const pitchMark    = Decoration.mark({ class: 'cm-pitch' })
const shapeMark    = Decoration.mark({ class: 'cm-shape' })
const waveformMark = Decoration.mark({ class: 'cm-waveform' })
const tickMark     = Decoration.mark({ class: 'cm-tick' })

// ── Patterns ────────────────────────────────────────────────────────────────

// Note name: letter + optional accidental + octave, e.g. C4, Bb2, G#3, D-1
const PITCH_RX = /\b([A-Ga-g][#b]?-?\d+)\b/g

// Shape string: N: or N.M: followed by a digit sequence with ; and ,
// Matches "4:100;1,55;4,2" or "1:0.12" but not "C4:" or "attack:"
const SHAPE_RX = /\b(\d+(?:\.\d+)?:[0-9;,.]+)/g

// Waveform literals as bare values
const WAVEFORM_RX = /\b(sin|saw|square|triangle|noise)\b/g

// Tick-offset key in score note lines: leading whitespace + digit sequence + colon
// Matches "  0:" "  3,5,8:" "  0+1*12:" but not "  attack:" or "  vcf:"
const TICK_RX = /^(\s+)([\d,+*]+)(\s*:)/

// ── Decoration builder ───────────────────────────────────────────────────────

type Match = { pos: number; end: number; mark: Decoration }

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
        while ((m = PITCH_RX.exec(text)) !== null) {
          matches.push({ pos: base + m.index, end: base + m.index + m[0].length, mark: pitchMark })
        }
      }

      if (ext === 'spli' || ext === 'splr') {
        WAVEFORM_RX.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = WAVEFORM_RX.exec(text)) !== null) {
          matches.push({ pos: base + m.index, end: base + m.index + m[0].length, mark: waveformMark })
        }
        SHAPE_RX.lastIndex = 0
        while ((m = SHAPE_RX.exec(text)) !== null) {
          matches.push({ pos: base + m.index, end: base + m.index + m[0].length, mark: shapeMark })
        }
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
        if (u.docChanged || u.viewportChanged) {
          this.decorations = buildDecorations(u.view, ext)
        }
      }
    },
    { decorations: (v) => v.decorations },
  )
}

