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
 * stacks (`:ext`), paren clusters, repeated-sign notation (`++`, `--`).
 */

export interface ChainNote {
  pitch: string
  offScale: '?' | '!' | null
  offsetTicks: number
  lengthTicks: number
  /**
   * S53200 overlength: extra ticks the note sounds past its chain offset.
   * Set by `,N` (comma-tail) or `;N` (semidamp). Does not advance the next note.
   * For `;N`, subsequent notes in the subchain also get auto-damp to share the same release tick.
   */
  dampTicks: number
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

interface LenSpec { lengthTicks: number; dampTicks: number; isSemidamp: boolean }

function parseLenSuffix(s: string): LenSpec {
  if (!s) return { lengthTicks: 1, dampTicks: 0, isSemidamp: false }
  const m = s.match(/^(_+|_\d+)(?:([,;])(\d+))?$/)
  if (!m) throw new ScoreError(`Malformed chain length suffix '${s}'`)
  const under = m[1]!
  const lengthTicks = /^_+$/.test(under) ? 1 + under.length : 1 + parseInt(under.slice(1), 10)
  return { lengthTicks, dampTicks: m[3] ? parseInt(m[3], 10) : 0, isSemidamp: m[2] === ';' }
}

// Token patterns (checked in order).
// Length suffix: "_N" or "__" followed by an optional ",M" comma-tail or ";M" semidamp (S53200).
const REPEAT_RX  = /^\*(\d+)$/
const REST_RX    = /^\.(\d+)?$/
const RESET_RX   = /^=((?:_+|_\d+)(?:[,;]\d+)?)?$/
const SHIFT_UP_RX   = /^\+(\d+)?((?:_+|_\d+)(?:[,;]\d+)?)?$/
const SHIFT_DOWN_RX = /^-(\d+)?((?:_+|_\d+)(?:[,;]\d+)?)?$/
const PITCH_RX   = /^([A-Ga-g][#b]?\d+)([?!])?((?:_+|_\d+)(?:[,;]\d+)?)?$/

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
      dampTicks: number
      /** True when the damp came from `;N` — sets targetEndTick for subsequent notes. */
      isSemidamp: boolean
      /** True when any explicit damp was specified (`,N` or `;N`). Prevents auto-damp. */
      hasExplicitDamp: boolean
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

      // . / .N — rest (no dampTicks on rests).
      const restM = token.match(REST_RX)
      if (restM) {
        clauses.push({ pitch: null, offScale: null, lengthTicks: restM[1] ? parseInt(restM[1], 10) : 1, dampTicks: 0, isSemidamp: false, hasExplicitDamp: false, repeat: 1 })
        continue
      }

      // = — reset shift and emit note at base.
      const resetM = token.match(RESET_RX)
      if (resetM) {
        if (!basePitch) throw new ScoreError(`'=' used before any base pitch in chain`)
        semiShift = 0
        const len = parseLenSuffix(resetM[1] ?? '')
        clauses.push({ pitch: basePitch, offScale: null, ...len, hasExplicitDamp: len.dampTicks > 0 || len.isSemidamp, repeat: 1 })
        continue
      }

      // + / +N — shift up and emit.
      const upM = token.match(SHIFT_UP_RX)
      if (upM) {
        if (!basePitch) throw new ScoreError(`'+' used before any base pitch in chain`)
        semiShift += upM[1] ? parseInt(upM[1], 10) : 1
        const len = parseLenSuffix(upM[2] ?? '')
        clauses.push({ pitch: transposePitch(basePitch, semiShift), offScale: null, ...len, hasExplicitDamp: len.dampTicks > 0 || len.isSemidamp, repeat: 1 })
        continue
      }

      // - / -N — shift down and emit.
      const downM = token.match(SHIFT_DOWN_RX)
      if (downM) {
        if (!basePitch) throw new ScoreError(`'-' used before any base pitch in chain`)
        semiShift -= downM[1] ? parseInt(downM[1], 10) : 1
        const len = parseLenSuffix(downM[2] ?? '')
        clauses.push({ pitch: transposePitch(basePitch, semiShift), offScale: null, ...len, hasExplicitDamp: len.dampTicks > 0 || len.isSemidamp, repeat: 1 })
        continue
      }

      // Absolute pitch name — resets base and shift.
      const pitchM = token.match(PITCH_RX)
      if (pitchM) {
        basePitch = pitchM[1]!
        semiShift = 0
        const offScale = (pitchM[2] as '?' | '!' | undefined) ?? null
        const len = parseLenSuffix(pitchM[3] ?? '')
        clauses.push({ pitch: basePitch, offScale, ...len, hasExplicitDamp: len.dampTicks > 0 || len.isSemidamp, repeat: 1 })
        continue
      }

      throw new ScoreError(`Unrecognised chain token '${token}'`)
    }

    // Expand clauses into timed notes.
    // targetEndTick: set by `;N` semidamp; subsequent notes without explicit damp
    // get auto-damp so their release ends at this tick (S53200).
    let offsetTicks = 0
    let targetEndTick: number | null = null
    for (const clause of clauses) {
      for (let r = 0; r < clause.repeat; r++) {
        if (clause.pitch !== null) {
          let dampTicks = clause.dampTicks
          if (!clause.hasExplicitDamp && targetEndTick !== null) {
            dampTicks = Math.max(0, targetEndTick - (offsetTicks + clause.lengthTicks))
          }
          if (clause.isSemidamp) {
            targetEndTick = offsetTicks + clause.lengthTicks + clause.dampTicks
          }
          result.push({ pitch: clause.pitch, offScale: clause.offScale, offsetTicks, lengthTicks: clause.lengthTicks, dampTicks })
        }
        offsetTicks += clause.lengthTicks
      }
    }
  }

  return result
}
