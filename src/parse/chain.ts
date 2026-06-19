import { ScoreError } from '../errors'

/**
 * Chain syntax (RFC §S53000) — compact note-sequence notation where offsets
 * are implied by cumulative clause lengths instead of explicit tick keys.
 *
 * Within a subchain (parallel subchains are separated by `"; "`):
 *
 *   - `A4`, `C#4`, `Bb3?` — absolute pitch; resets the shift counter to 0.
 *   - `+N` / `+`  — shift up N (default 1) semitones from base; emits a note.
 *   - `-N` / `-`  — shift down N semitones; emits a note.
 *   - `=`         — reset shift to 0; emits a note at the base pitch.
 *   - `.N` / `.`  — rest for N (default 1) ticks; no note emitted.
 *   - `_` / `_N` suffix on any pitch/shift token — extend length by N extra ticks.
 *   - `*N` token after a pitch/shift/reset — repeat that clause N times total.
 *
 * Shifts are cumulative within a subchain: `C4 + +` yields C4, C#4, D4.
 * The shift resets whenever an absolute pitch token is encountered.
 *
 * Deferred (S53000 remainder): stress adjustment (`^`), article extension
 * stacks (`:ext`), comma-tail (`,N`), semicolon-overlength (`;N`), paren
 * clusters, repeated-sign notation (`++`, `--`).
 */

export interface ChainNote {
  pitch: string
  offScale: '?' | '!' | null
  offsetTicks: number
  lengthTicks: number
}

// ── Chromatic transposition helpers ──────────────────────────────────────────

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLATS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

function pitchToMidi(pitch: string): number {
  const m = pitch.match(/^([A-Ga-g][#b]?)(\d+)$/)
  if (!m) throw new ScoreError(`Cannot transpose chain pitch '${pitch}'`)
  const name = m[1]!.charAt(0).toUpperCase() + m[1]!.slice(1)
  let idx = SHARPS.indexOf(name)
  if (idx === -1) idx = FLATS.indexOf(name)
  if (idx === -1) throw new ScoreError(`Unknown note '${name}' in chain`)
  return (parseInt(m[2]!, 10) + 1) * 12 + idx
}

function midiToPitch(midi: number): string {
  const idx = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  return SHARPS[idx]! + octave
}

function transposePitch(base: string, semitones: number): string {
  return semitones === 0 ? base : midiToPitch(pitchToMidi(base) + semitones)
}

// ── Token helpers ─────────────────────────────────────────────────────────────

function parseLenSuffix(s: string): number {
  if (!s) return 1
  if (/^_+$/.test(s)) return 1 + s.length
  const m = s.match(/^_(\d+)$/)
  if (m) return 1 + parseInt(m[1]!, 10)
  throw new ScoreError(`Malformed chain length suffix '${s}'`)
}

// Token patterns (checked in order).
const REPEAT_RX  = /^\*(\d+)$/
const REST_RX    = /^\.(\d+)?$/
const RESET_RX   = /^=((?:_+|_\d+)?)$/
const SHIFT_UP_RX   = /^\+(\d+)?((?:_+|_\d+)?)$/
const SHIFT_DOWN_RX = /^-(\d+)?((?:_+|_\d+)?)$/
const PITCH_RX   = /^([A-Ga-g][#b]?\d+)([?!])?((?:_+|_\d+)?)$/

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Expand a chain string into an ordered list of `ChainNote` objects.
 * Rest tokens advance the running offset without emitting a note.
 */
export function expandChainString(raw: string): ChainNote[] {
  const result: ChainNote[] = []

  for (const subStr of raw.split('; ')) {
    const tokens = subStr.trim().split(/\s+/).filter(Boolean)

    // Internal clause: null pitch = rest.
    interface Clause {
      pitch: string | null
      offScale: '?' | '!' | null
      lengthTicks: number
      repeat: number
    }
    const clauses: Clause[] = []

    // Per-subchain pitch-shift state.
    let basePitch: string | null = null
    let semiShift = 0

    for (const token of tokens) {
      // *N — repeat modifier on the preceding clause.
      const repM = token.match(REPEAT_RX)
      if (repM) {
        if (!clauses.length) throw new ScoreError(`Repeat '${token}' has no preceding clause in chain`)
        clauses[clauses.length - 1]!.repeat = parseInt(repM[1]!, 10)
        continue
      }

      // . / .N — rest.
      const restM = token.match(REST_RX)
      if (restM) {
        clauses.push({ pitch: null, offScale: null, lengthTicks: restM[1] ? parseInt(restM[1], 10) : 1, repeat: 1 })
        continue
      }

      // = — reset shift and emit note at base.
      const resetM = token.match(RESET_RX)
      if (resetM) {
        if (!basePitch) throw new ScoreError(`'=' used before any base pitch in chain`)
        semiShift = 0
        clauses.push({ pitch: basePitch, offScale: null, lengthTicks: parseLenSuffix(resetM[1]!), repeat: 1 })
        continue
      }

      // + / +N — shift up and emit.
      const upM = token.match(SHIFT_UP_RX)
      if (upM) {
        if (!basePitch) throw new ScoreError(`'+' used before any base pitch in chain`)
        semiShift += upM[1] ? parseInt(upM[1], 10) : 1
        clauses.push({ pitch: transposePitch(basePitch, semiShift), offScale: null, lengthTicks: parseLenSuffix(upM[2]!), repeat: 1 })
        continue
      }

      // - / -N — shift down and emit.
      const downM = token.match(SHIFT_DOWN_RX)
      if (downM) {
        if (!basePitch) throw new ScoreError(`'-' used before any base pitch in chain`)
        semiShift -= downM[1] ? parseInt(downM[1], 10) : 1
        clauses.push({ pitch: transposePitch(basePitch, semiShift), offScale: null, lengthTicks: parseLenSuffix(downM[2]!), repeat: 1 })
        continue
      }

      // Absolute pitch name — resets base and shift.
      const pitchM = token.match(PITCH_RX)
      if (pitchM) {
        basePitch = pitchM[1]!
        semiShift = 0
        const offScale = (pitchM[2] as '?' | '!' | undefined) ?? null
        clauses.push({ pitch: basePitch, offScale, lengthTicks: parseLenSuffix(pitchM[3]!), repeat: 1 })
        continue
      }

      throw new ScoreError(`Unrecognised chain token '${token}'`)
    }

    // Expand clauses into timed notes.
    let offsetTicks = 0
    for (const clause of clauses) {
      for (let r = 0; r < clause.repeat; r++) {
        if (clause.pitch !== null) {
          result.push({ pitch: clause.pitch, offScale: clause.offScale, offsetTicks, lengthTicks: clause.lengthTicks })
        }
        offsetTicks += clause.lengthTicks
      }
    }
  }

  return result
}
