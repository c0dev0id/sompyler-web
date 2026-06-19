/**
 * S47000 multimeasure pre-expansion pass.
 *
 * A measure is a multi-measure if `_meta._loop` is set or any string value
 * in the measure (voice note strings or meta field values) contains ` |` as
 * a cycling separator.
 *
 * Reference: `Sompyler/score/measure.py:MultiMeasure` + `cycler._flatten()`.
 * Forward-doors: `||` nested cycling depth, voice-level `_meta`, `_articles`
 * sub-blocks, motif tables (non-numeric offset keys).
 */

/**
 * Flatten a ` |`-separated cycling string into an ordered list of alternatives.
 * Returns the original single-item array when no `|` is present.
 *
 * Special syntax within the flat (depth-1) model:
 *   `*N`   — repeat the previous item N additional times.
 *   `%N`   — substitute the Nth literal value seen so far (1-indexed).
 *   `+`    — boolean true (for meta flags).
 *   `-`    — boolean false.
 *   (empty) — null / skip this slot.
 */
export function flattenCycleString(s: string): Array<string | boolean | null> {
  if (!s.includes('|')) return [s]
  const segments = s.split(/\s+\|/)
  const literals: string[] = []
  const out: Array<string | boolean | null> = []

  for (let raw of segments) {
    const seg = raw.replace(/^\s+/, '')

    // *N — repeat last item N additional times
    const repeatM = /^\*(\d+)$/.exec(seg)
    if (repeatM) {
      const n = parseInt(repeatM[1]!, 10)
      if (out.length > 0) {
        const last = out[out.length - 1]!
        for (let i = 0; i < n; i++) out.push(last)
      }
      continue
    }

    // %N — back-reference to the Nth literal
    const refM = /^%(\d+)$/.exec(seg)
    if (refM) {
      const idx = parseInt(refM[1]!, 10) - 1
      if (idx >= 0 && idx < literals.length) out.push(literals[idx]!)
      continue
    }

    // Special values
    if (seg === '+') { out.push(true); continue }
    if (seg === '-') { out.push(false); continue }
    if (seg === '') { out.push(null); continue }

    literals.push(seg)
    out.push(seg)
  }

  return out.length > 0 ? out : [s]
}

function hasPipeValue(val: unknown): boolean {
  if (typeof val === 'string') return val.includes(' |')
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    for (const v of Object.values(val as Record<string, unknown>)) {
      if (hasPipeValue(v)) return true
    }
  }
  return false
}

function detectMultiMeasure(m: Record<string, unknown>): boolean {
  const meta = m._meta
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    if ('_loop' in (meta as Record<string, unknown>)) return true
  }
  return hasPipeValue(m)
}

type CycleValues = Array<string | boolean | null>

interface MetaCycler {
  key: string
  values: CycleValues
  pos: number
}

interface VoiceCycler {
  voice: string
  offsetKey: string
  values: CycleValues
  pos: number
}

function nextVal(vals: CycleValues, pos: number): { value: string | boolean | null; nextPos: number } {
  return { value: vals[pos % vals.length]!, nextPos: pos + 1 }
}

function* generateSubMeasures(m: Record<string, unknown>): Generator<Record<string, unknown>> {
  const rawMeta = m._meta
  const meta: Record<string, unknown> =
    rawMeta && typeof rawMeta === 'object' && !Array.isArray(rawMeta)
      ? (rawMeta as Record<string, unknown>)
      : {}

  const loopN = typeof meta._loop === 'number' ? (meta._loop as number) : undefined

  const metaCyclers: MetaCycler[] = []
  const voiceCyclers: VoiceCycler[] = []

  // Collect meta cyclers
  for (const [k, v] of Object.entries(meta)) {
    if (k === '_loop') continue
    if (typeof v === 'string' && v.includes(' |')) {
      metaCyclers.push({ key: k, values: flattenCycleString(v), pos: 0 })
    }
  }

  // Collect voice cyclers
  for (const [voice, body] of Object.entries(m)) {
    if (voice.startsWith('_')) continue
    if (!body || typeof body !== 'object' || Array.isArray(body)) continue
    for (const [offsetKey, note] of Object.entries(body as Record<string, unknown>)) {
      if (typeof note === 'string' && note.includes(' |')) {
        voiceCyclers.push({ voice, offsetKey, values: flattenCycleString(note), pos: 0 })
      }
    }
  }

  // Determine iteration count
  let maxLen = 1
  for (const c of metaCyclers) maxLen = Math.max(maxLen, c.values.length)
  for (const c of voiceCyclers) maxLen = Math.max(maxLen, c.values.length)
  const n = loopN ?? maxLen

  const baseName = typeof m._id === 'string' ? m._id : undefined

  for (let i = 0; i < n; i++) {
    const flat: Record<string, unknown> = {}

    // Build flat _meta (static fields + this iteration's cycled values)
    const flatMeta: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(meta)) {
      if (k === '_loop') continue
      flatMeta[k] = v  // will be overwritten below if cycled
    }
    for (const c of metaCyclers) {
      const { value, nextPos } = nextVal(c.values, c.pos)
      c.pos = nextPos
      if (value === null) {
        delete flatMeta[c.key]
      } else {
        flatMeta[c.key] = value
      }
    }
    flat._meta = flatMeta

    // Build flat voice bodies
    for (const [voice, body] of Object.entries(m)) {
      if (voice.startsWith('_')) continue
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        flat[voice] = body
        continue
      }
      const flatVoice: Record<string, unknown> = { ...(body as Record<string, unknown>) }
      flat[voice] = flatVoice
    }

    // Apply voice cyclers
    for (const c of voiceCyclers) {
      const { value, nextPos } = nextVal(c.values, c.pos)
      c.pos = nextPos
      const flatVoice = flat[c.voice] as Record<string, unknown>
      if (value === null) {
        delete flatVoice[c.offsetKey]
      } else {
        flatVoice[c.offsetKey] = value
      }
    }

    if (baseName !== undefined) {
      flat._id = `${baseName}[${i}]`
    } else {
      flat._id = `[${i}]`
    }

    yield flat
  }
}

/**
 * Pre-expansion pass: convert any multi-measure blocks in `measures` into
 * flat sequences of simple measure objects. Plain measures pass through
 * unchanged.
 */
export function expandMultiMeasures(measures: unknown[]): unknown[] {
  const out: unknown[] = []
  for (const m of measures) {
    if (!m || typeof m !== 'object' || Array.isArray(m)) {
      out.push(m)
      continue
    }
    const rec = m as Record<string, unknown>
    if (detectMultiMeasure(rec)) {
      for (const sub of generateSubMeasures(rec)) out.push(sub)
    } else {
      out.push(rec)
    }
  }
  return out
}
