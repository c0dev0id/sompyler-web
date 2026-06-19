import { ScoreError } from '../errors'

/**
 * Chain syntax (RFC §S53000) — compact note-sequence notation where offsets
 * are implied by cumulative clause lengths instead of explicit tick keys.
 *
 * A chain string consists of space-separated clauses inside a subchain.
 * Parallel subchains (same starting offset) are separated by `"; "` (the
 * semicolon must be followed by a space to distinguish it from the single-
 * letter co-pitch form, which is deferred). Within a subchain:
 *
 *   - Each token is a pitch string (e.g. `A4`, `C#4`, `Bb3?`)
 *   - Optional `_`, `__`, `_N` suffix extends the length (each `_` = +1 tick,
 *     `_N` = +N ticks above the 1-tick base).
 *   - An immediately following `*N` token repeats the preceding clause N times.
 *
 * Deferred (S53000 remainder): pitch-shift operators (`+`/`-`/`=`), stress
 * adjustment (`^`), article extension stacks (`:ext`), pause (`.`),
 * comma-tail (`,N`) / semicolon-overlength (`;N`), paren clusters.
 */

export interface ChainNote {
  pitch: string
  offScale: '?' | '!' | null
  offsetTicks: number
  lengthTicks: number
}

function parseToken(token: string): { pitch: string; offScale: '?' | '!' | null; lengthTicks: number } | null {
  if (!token || token.startsWith('*')) return null
  // Split on the first `_`
  const underscoreIdx = token.indexOf('_')
  let pitchPart: string
  let lenPart: string
  if (underscoreIdx === -1) {
    pitchPart = token
    lenPart = ''
  } else {
    pitchPart = token.slice(0, underscoreIdx)
    lenPart = token.slice(underscoreIdx)
  }

  let offScale: '?' | '!' | null = null
  if (pitchPart.endsWith('?')) {
    offScale = '?'
    pitchPart = pitchPart.slice(0, -1)
  } else if (pitchPart.endsWith('!')) {
    offScale = '!'
    pitchPart = pitchPart.slice(0, -1)
  }
  if (!pitchPart) return null

  let extraTicks = 0
  if (lenPart) {
    const allUnderscores = /^_+$/.test(lenPart)
    if (allUnderscores) {
      extraTicks = lenPart.length
    } else {
      const numMatch = lenPart.match(/^_(\d+)$/)
      if (!numMatch) throw new ScoreError(`Malformed chain length '${lenPart}' in token '${token}'`)
      extraTicks = parseInt(numMatch[1]!, 10)
    }
  }

  return { pitch: pitchPart, offScale, lengthTicks: 1 + extraTicks }
}

/**
 * Expand a chain string into a flat list of (pitch, offsetTicks, lengthTicks)
 * tuples. Parallel subchains (separated by `"; "`) are merged — their notes
 * all start at offset 0 and advance independently.
 */
export function expandChainString(raw: string): ChainNote[] {
  const result: ChainNote[] = []
  const subchainStrings = raw.split('; ')

  for (const subStr of subchainStrings) {
    const tokens = subStr.trim().split(/\s+/).filter(Boolean)

    interface Clause {
      pitch: string
      offScale: '?' | '!' | null
      lengthTicks: number
      repeat: number
    }
    const clauses: Clause[] = []

    for (const token of tokens) {
      const repeatMatch = token.match(/^\*(\d+)$/)
      if (repeatMatch) {
        if (clauses.length === 0) {
          throw new ScoreError(`Repeat quantifier '${token}' has no preceding note in chain`)
        }
        clauses[clauses.length - 1]!.repeat = parseInt(repeatMatch[1]!, 10)
        continue
      }
      const parsed = parseToken(token)
      if (!parsed) throw new ScoreError(`Unrecognised chain token '${token}'`)
      clauses.push({ ...parsed, repeat: 1 })
    }

    let offsetTicks = 0
    for (const clause of clauses) {
      for (let r = 0; r < clause.repeat; r++) {
        result.push({ pitch: clause.pitch, offScale: clause.offScale, offsetTicks, lengthTicks: clause.lengthTicks })
        offsetTicks += clause.lengthTicks
      }
    }
  }

  return result
}
