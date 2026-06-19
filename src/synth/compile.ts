import { InstrumentError } from '../errors'
import type { Instrument } from '../parse/instrument'
import type { InstrumentSpec, MorphEntry, PartialDef, RailsbackCurve } from './sound_generator'
import { DEFAULT_ENVELOPE, type EnvelopeSpec } from './envelope'
import type { OscillatorSpec, Waveform } from './oscillator'
import { parseShape, renderShapeString } from './shape'
import { parseCharacterBlock, validateVariationGraph } from './variation'

const RAILSBACK_KEYS = 88

/**
 * Forgiving YAML → `InstrumentSpec` compiler used by `renderAll()`.
 * As of Phase 10 the rich Sompyler `character:` block is accepted and
 * its variation graph is validated (cycle detection, S32122). The full
 * per-attribute sound differentiation (S32200) lands in Phase 12.
 *
 * Supported v1 shape:
 *
 *     amp: 0.5
 *     oscillator: sin                # or a richer object
 *     envelope: { attack: 0.01, release: 0.3, sustainLevel: 0.7 }
 *     partials:
 *       - { freqMult: 1, amp: 1.0 }
 *       - { freqMult: 2, amp: 0.5 }
 *
 * Sympyler-rich shape (Phase 10+):
 *
 *     character:
 *       - ATTR: pitch
 *         O: sine
 *         labelName: { ... }      # label spec (referenced via @labelName)
 *         27: { PROFILE: [...] }  # numeric-keyed variation
 *
 * Anything off these shapes is ignored (lenient pass-through).
 */

const WAVEFORMS: ReadonlySet<Waveform> = new Set(['sin', 'square', 'saw', 'triangle', 'noise'])

function asObj(x: unknown): Record<string, unknown> | null {
  return x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : null
}

function compileOscillator(raw: unknown): OscillatorSpec | undefined {
  if (raw == null) return undefined
  if (typeof raw === 'string') {
    if (!WAVEFORMS.has(raw as Waveform)) {
      throw new InstrumentError(`Unknown oscillator waveform '${raw}'`)
    }
    return { waveform: raw as Waveform }
  }
  const obj = asObj(raw)
  if (!obj) throw new InstrumentError(`oscillator must be a string or mapping`)
  const wf = obj.waveform
  if (typeof wf !== 'string' || !WAVEFORMS.has(wf as Waveform)) {
    throw new InstrumentError(`Unknown oscillator waveform '${String(wf)}'`)
  }
  return { waveform: wf as Waveform }
}

function compileEnvelope(raw: unknown): EnvelopeSpec | undefined {
  if (raw == null) return undefined
  const obj = asObj(raw)
  if (!obj) throw new InstrumentError(`envelope must be a mapping`)
  return {
    attack: 'attack' in obj ? Number(obj.attack) : DEFAULT_ENVELOPE.attack,
    release: 'release' in obj ? Number(obj.release) : DEFAULT_ENVELOPE.release,
    sustainLevel:
      'sustainLevel' in obj ? Number(obj.sustainLevel) : DEFAULT_ENVELOPE.sustainLevel,
  }
}

function compileRailsback(raw: unknown): RailsbackCurve | undefined {
  if (raw == null) return undefined
  if (!Array.isArray(raw) || raw.length !== 3) {
    throw new InstrumentError(`railsback must be [lowHz, highHz, curveString]`)
  }
  const [lowRaw, highRaw, curveRaw] = raw
  const lowHz = Number(lowRaw)
  const highHz = Number(highRaw)
  if (!Number.isFinite(lowHz) || !Number.isFinite(highHz) || lowHz >= highHz) {
    throw new InstrumentError(`railsback bounds invalid: [${lowHz}, ${highHz}]`)
  }
  if (typeof curveRaw !== 'string') {
    throw new InstrumentError(`railsback curve must be a Shape string`)
  }
  // Sompyler prefixes "1:" to force a unit x-span; mirror that.
  const curve = renderShapeString(`1:${curveRaw}`, RAILSBACK_KEYS)
  return { lowHz, highHz, curve }
}

function compilePartials(raw: unknown): PartialDef[] | undefined {
  if (raw == null) return undefined
  if (!Array.isArray(raw)) throw new InstrumentError(`partials must be a list`)
  return raw.map((p, i) => {
    const obj = asObj(p)
    if (!obj) throw new InstrumentError(`partials[${i}] must be a mapping`)
    return {
      freqMult: 'freqMult' in obj ? Number(obj.freqMult) : 1,
      amp: 'amp' in obj ? Number(obj.amp) : 1,
      oscillator: compileOscillator(obj.oscillator),
      envelope: compileEnvelope(obj.envelope),
    } satisfies PartialDef
  })
}

/** S32132: list of incremental cent deviations, or RESOLUTION:SHAPE string. */
function compileSpread(raw: unknown): number[] | undefined {
  if (raw == null) return undefined
  if (typeof raw === 'string') {
    const colon = raw.indexOf(':')
    if (colon === -1) throw new InstrumentError(`spread string must be "RESOLUTION:SHAPE"`)
    const resolution = parseInt(raw.slice(0, colon), 10)
    if (!Number.isFinite(resolution) || resolution <= 0) {
      throw new InstrumentError(`spread resolution must be a positive integer`)
    }
    return Array.from(renderShapeString(raw, resolution))
  }
  if (!Array.isArray(raw)) throw new InstrumentError(`spread must be a list or "RESOLUTION:SHAPE" string`)
  return raw.map((item, i) => {
    const n = Number(item)
    if (!Number.isFinite(n)) throw new InstrumentError(`spread[${i}] must be a number`)
    return n
  })
}

/** S32134: "SPECTRUM_WIDTH:SHAPE" — stored as-is; rendered per-note. */
function compileTimbre(raw: unknown): string | undefined {
  if (raw == null) return undefined
  if (typeof raw === 'string') return raw
  throw new InstrumentError(`timbre must be a "SPECTRUM_WIDTH:SHAPE" string`)
}

const SEQNUM_RX = /^(\d+)(n(?:\+(\d+))?)?$/

function parseMorphEntry(s: string): MorphEntry {
  const spaceIdx = s.indexOf(' ')
  if (spaceIdx === -1) throw new InstrumentError(`morph entry must be "SEQNUM SHAPE"`)
  const seqStr = s.slice(0, spaceIdx).trim()
  const shapeStr = s.slice(spaceIdx + 1).trim()
  const m = SEQNUM_RX.exec(seqStr)
  if (!m) throw new InstrumentError(`Invalid morph partial seqnum '${seqStr}'`)
  const n = parseInt(m[1]!, 10)
  const weight = parseShape(shapeStr).length
  if (m[2]) {
    // "Nn" or "Nn+M" — modular pattern
    return { divisor: n, remainder: m[3] ? parseInt(m[3], 10) : 0, weight, shape: shapeStr }
  }
  // Plain integer — exact partial index (1-indexed)
  return { divisor: 0, remainder: n, weight, shape: shapeStr }
}

/** S32135: list of "SEQNUM SHAPE" strings. */
function compileMorph(raw: unknown): MorphEntry[] | undefined {
  if (raw == null) return undefined
  if (!Array.isArray(raw)) throw new InstrumentError(`morph must be a list`)
  return raw.map((item, i) => {
    if (typeof item !== 'string') throw new InstrumentError(`morph[${i}] must be a string`)
    return parseMorphEntry(item)
  })
}

export function compileInstrument(instr: Instrument): InstrumentSpec {
  const obj = asObj(instr.parsed)
  if (!obj) {
    throw new InstrumentError(`Instrument '${instr.name}' is not a YAML mapping`)
  }
  // S32122 — validate variation graph (cycle detection) before anything else.
  // Throws InstrumentError with a "Circular dependencies …" message that
  // the editor lint surfaces inline (R6).
  let character = parseCharacterBlock(instr.parsed)
  try {
    validateVariationGraph(character)
  } catch (cause) {
    if (cause instanceof InstrumentError) {
      throw new InstrumentError(
        `Instrument '${instr.name}': ${cause.message}`,
        cause,
      )
    }
    throw cause
  }

  // S32132/S32134/S32135: SPREAD/TIMBRE/MORPH live in character.root when
  // expressed as character-block keys (uppercase), or at the top level in
  // the flat instrument format (lowercase). Character block takes precedence.
  const root = character.root

  const spec: InstrumentSpec = {}
  if ('amp' in obj) spec.amp = Number(obj.amp)
  const osc = compileOscillator(obj.oscillator)
  if (osc) spec.oscillator = osc
  const env = compileEnvelope(obj.envelope)
  if (env) spec.envelope = env
  const partials = compilePartials(obj.partials)
  if (partials) spec.partials = partials
  const railsback = compileRailsback(obj.railsback)
  if (railsback) spec.railsback = railsback

  const spread = compileSpread(root.SPREAD ?? obj.spread)
  if (spread) spec.spread = spread
  const timbre = compileTimbre(root.TIMBRE ?? obj.timbre)
  if (timbre) spec.timbre = timbre
  const morph = compileMorph(root.MORPH ?? obj.morph)
  if (morph) spec.morph = morph

  return spec
}
