import { ViewPlugin, EditorView, Decoration, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { RangeSetBuilder, type Extension } from '@codemirror/state'
import type { FileExtension } from '../storage/files'

// ── Decoration marks ────────────────────────────────────────────────────────

const pitchMark    = Decoration.mark({ class: 'cm-pitch' })
const waveformMark = Decoration.mark({ class: 'cm-waveform' })
const tickMark     = Decoration.mark({ class: 'cm-tick' })
// Shape string roles: N : startVal ; pos , val ; pos , val …
const shapeLenMark = Decoration.mark({ class: 'cm-shape-len' })  // N (resolution)
const shapePosMark = Decoration.mark({ class: 'cm-shape-pos' })  // x-axis positions
const shapeValMark = Decoration.mark({ class: 'cm-shape-val' })  // y-axis values
const shapeSepMark = Decoration.mark({ class: 'cm-shape-sep' })  // : ; ,

// ── Patterns ────────────────────────────────────────────────────────────────

const PITCH_RX    = /\b([A-Ga-g][#b]?-?\d+)\b/g
const SHAPE_RX    = /\b(\d+(?:\.\d+)?:[0-9;,.]+)/g
const WAVEFORM_RX = /\b(sin|saw|square|triangle|noise)\b/g
const TICK_RX     = /^(\s+)([\d,+*]+)(\s*:)/

// ── Shape string parser ──────────────────────────────────────────────────────

type Match = { pos: number; end: number; mark: Decoration }

// Parses "N:v0;pos1,val1;pos2,val2;…" and emits a decoration per token role.
function decorateShape(src: string, base: number, matches: Match[]): void {
  let i = 0

  const tryNum = (): string | null => {
    const m = /^\d+(?:\.\d+)?/.exec(src.slice(i))
    return m ? m[0] : null
  }

  const push = (len: number, mark: Decoration) => {
    matches.push({ pos: base + i, end: base + i + len, mark })
    i += len
  }

  // N — the resolution / tail-length field
  const lenStr = tryNum()
  if (!lenStr) return
  push(lenStr.length, shapeLenMark)

  if (src[i] !== ':') return
  push(1, shapeSepMark)

  // Starting value (implicit position 0)
  const startStr = tryNum()
  if (!startStr) return
  push(startStr.length, shapeValMark)

  // Remaining (;pos,val)* pairs
  while (i < src.length && src[i] === ';') {
    push(1, shapeSepMark)

    const posStr = tryNum()
    if (!posStr) break
    push(posStr.length, shapePosMark)

    if (src[i] !== ',') break
    push(1, shapeSepMark)

    const valStr = tryNum()
    if (!valStr) break
    push(valStr.length, shapeValMark)
  }
}

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

        SHAPE_RX.lastIndex = 0
        while ((m = SHAPE_RX.exec(text)) !== null)
          decorateShape(m[0], base + m.index, matches)
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
