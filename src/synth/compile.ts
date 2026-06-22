import { InstrumentError } from '../errors'
import type { Instrument } from '../parse/instrument'
import type { FMSpec, InstrumentSpec, LFOSpec, MorphEntry, PartialDef, RailsbackCurve, VCFSpec } from './sound_generator'
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

// RFC waveform names → internal Waveform identifiers (S32110).
const RFC_WAVEFORM: Record<string, Waveform> = { sine: 'sin', sawtooth: 'saw' }

function asObj(x: unknown): Record<string, unknown> | null {
  return x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : null
}

function compileOscillator(raw: unknown): OscillatorSpec | undefined {
  if (raw == null) return undefined
  if (typeof raw === 'string') {
    const wf = (RFC_WAVEFORM[raw] ?? raw) as Waveform
    if (!WAVEFORMS.has(wf)) {
      throw new InstrumentError(`Unknown oscillator waveform '${raw}'`)
    }
    return { waveform: wf }
  }
  const obj = asObj(raw)
  if (!obj) throw new InstrumentError(`oscillator must be a string or mapping`)
  const rawWf = String(obj.waveform)
  const wf = (RFC_WAVEFORM[rawWf] ?? rawWf) as Waveform
  if (!WAVEFORMS.has(wf)) {
    throw new InstrumentError(`Unknown oscillator waveform '${String(obj.waveform)}'`)
  }
  return { waveform: wf }
}

function compileEnvelope(raw: unknown): EnvelopeSpec | undefined {
  if (raw == null) return undefined
  const obj = asObj(raw)
  if (!obj) throw new InstrumentError(`envelope must be a mapping`)
  return {
    attack:       'attack'       in obj ? Number(obj.attack)       : DEFAULT_ENVELOPE.attack,
    decay:        'decay'        in obj ? Number(obj.decay)        : undefined,
    release:      'release'      in obj ? Number(obj.release)      : DEFAULT_ENVELOPE.release,
    sustainLevel: 'sustainLevel' in obj ? Number(obj.sustainLevel) : DEFAULT_ENVELOPE.sustainLevel,
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
    const partial: PartialDef = {
      freqMult: 'freqMult' in obj ? Number(obj.freqMult) : 1,
      amp: 'amp' in obj ? Number(obj.amp) : 1,
      oscillator: compileOscillator(obj.oscillator),
      envelope: compileEnvelope(obj.envelope),
    }
    const fm = compileFM(obj.fm)
    if (fm) partial.fm = fm
    return partial
  })
}

/**
 * S32130: PROFILE list → PartialDef[].
 * Simple form: [100, 72, 52, …] — REVERSED_DBFS amps (100=full, 0=silent).
 * Complex form: [{ V: 100, A: "shape" }, …] — V is REVERSED_DBFS; A (per-partial
 * attack shape) is accepted but currently ignored (future work).
 */
function compileProfile(raw: unknown): PartialDef[] | undefined {
  if (raw == null) return undefined
  if (!Array.isArray(raw)) throw new InstrumentError(`PROFILE must be a list`)
  return raw.map((item, i) => {
    if (typeof item === 'number') return { freqMult: i + 1, amp: item / 100 }
    const obj = asObj(item)
    if (!obj || !('V' in obj)) throw new InstrumentError(`PROFILE[${i}] must be a number or {V:…}`)
    return { freqMult: i + 1, amp: Number(obj.V) / 100 }
  })
}

/** Extract the leading seconds value from an RFC shape string "DURATION:…". */
function parseRfcDuration(s: string): number {
  const i = s.indexOf(':')
  return i === -1 ? 0 : Math.abs(parseFloat(s.slice(0, i)))
}

/**
 * Extract end-of-sustain level from S format "DUR:START;x,y;…".
 * The last ";x,y" segment's y is the terminal REVERSED_DBFS level (0–100).
 */
function parseRfcSustainLevel(s: string): number {
  const i = s.indexOf(':')
  if (i === -1) return 1
  const segs = s.slice(i + 1).split(';')
  const last = segs[segs.length - 1]!
  const comma = last.indexOf(',')
  if (comma === -1) return 1
  return Math.min(1, Math.max(0, Number(last.slice(comma + 1)) / 100))
}

/**
 * Build an EnvelopeSpec from RFC character-block A/S/R shape strings.
 * Returns undefined when none are present (flat format falls through instead).
 */
function compileRfcEnvelope(A: unknown, S: unknown, R: unknown): EnvelopeSpec | undefined {
  if (A == null && S == null && R == null) return undefined
  return {
    attack:       A != null ? parseRfcDuration(String(A)) : DEFAULT_ENVELOPE.attack,
    decay:        S != null ? parseRfcDuration(String(S)) : 0,
    sustainLevel: S != null ? parseRfcSustainLevel(String(S)) : DEFAULT_ENVELOPE.sustainLevel,
    release:      R != null ? parseRfcDuration(String(R)) : DEFAULT_ENVELOPE.release,
  }
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

/**
 * Compile fm: { freq_hz, depth, waveform?, dynamic?, init_phase?, depth_env? }
 * into FMSpec. Snake_case keys match the YAML convention used in .spli files.
 */
function compileFM(raw: unknown): FMSpec | undefined {
  if (raw == null) return undefined
  const obj = asObj(raw)
  if (!obj) throw new InstrumentError(`fm must be a mapping`)
  const freqHz = Number(obj.freq_hz)
  if (!Number.isFinite(freqHz) || freqHz <= 0) {
    throw new InstrumentError(`fm.freq_hz must be a positive number`)
  }
  const depth = Number(obj.depth)
  if (!Number.isFinite(depth) || depth < 0) {
    throw new InstrumentError(`fm.depth must be a non-negative number`)
  }
  const spec: FMSpec = { freqHz, depth }
  if (obj.waveform != null) {
    const wf = String(obj.waveform)
    if (!WAVEFORMS.has(wf as Waveform)) throw new InstrumentError(`fm.waveform '${wf}' is unknown`)
    spec.waveform = wf as Waveform
  }
  if (obj.dynamic != null) spec.dynamic = Boolean(obj.dynamic)
  if (obj.init_phase != null) {
    const ip = Number(obj.init_phase)
    if (!Number.isFinite(ip)) throw new InstrumentError(`fm.init_phase must be a number`)
    spec.initPhase = ip
  }
  if (obj.depth_env != null) {
    if (typeof obj.depth_env !== 'string') throw new InstrumentError(`fm.depth_env must be a Shape string`)
    spec.depthEnv = obj.depth_env
  }
  return spec
}

function compileVCF(raw: unknown): VCFSpec | undefined {
  if (raw == null) return undefined
  const obj = asObj(raw)
  if (!obj) throw new InstrumentError(`vcf must be a mapping`)
  const cutoffHz = Number(obj.cutoff_hz)
  if (!Number.isFinite(cutoffHz) || cutoffHz <= 0) {
    throw new InstrumentError(`vcf.cutoff_hz must be a positive number`)
  }
  const resonance = Number(obj.resonance)
  if (!Number.isFinite(resonance) || resonance < 0 || resonance > 1) {
    throw new InstrumentError(`vcf.resonance must be a number in [0, 1]`)
  }
  const spec: VCFSpec = { cutoffHz, resonance }
  if (obj.env_amount != null) {
    const v = Number(obj.env_amount)
    if (!Number.isFinite(v)) throw new InstrumentError(`vcf.env_amount must be a number`)
    spec.envAmount = v
  }
  if (obj.env_attack != null) {
    const v = Number(obj.env_attack)
    if (!Number.isFinite(v) || v < 0) throw new InstrumentError(`vcf.env_attack must be a non-negative number`)
    spec.envAttack = v
  }
  if (obj.env_release != null) {
    const v = Number(obj.env_release)
    if (!Number.isFinite(v) || v < 0) throw new InstrumentError(`vcf.env_release must be a non-negative number`)
    spec.envRelease = v
  }
  return spec
}

function compileLFOEntry(raw: unknown): LFOSpec {
  const obj = asObj(raw)
  if (!obj) throw new InstrumentError(`lfo entry must be a mapping`)
  const rateHz = Number(obj.rate_hz)
  if (!Number.isFinite(rateHz) || rateHz <= 0) {
    throw new InstrumentError(`lfo.rate_hz must be a positive number`)
  }
  const depth = Number(obj.depth)
  if (!Number.isFinite(depth)) throw new InstrumentError(`lfo.depth must be a number`)
  const targetRaw = String(obj.target ?? 'vcf')
  if (targetRaw !== 'vcf' && targetRaw !== 'amp') {
    throw new InstrumentError(`lfo.target must be 'vcf' or 'amp'`)
  }
  const spec: LFOSpec = { rateHz, depth, target: targetRaw }
  if (obj.waveform != null) {
    const wf = String(obj.waveform)
    if (!WAVEFORMS.has(wf as Waveform)) throw new InstrumentError(`lfo.waveform '${wf}' is unknown`)
    spec.waveform = wf as Waveform
  }
  if (obj.phase != null) {
    const p = Number(obj.phase)
    if (!Number.isFinite(p)) throw new InstrumentError(`lfo.phase must be a number`)
    spec.phase = p
  }
  if (obj.delay_seconds != null) {
    const d = Number(obj.delay_seconds)
    if (!Number.isFinite(d) || d < 0) throw new InstrumentError(`lfo.delay_seconds must be non-negative`)
    spec.delaySeconds = d
  }
  return spec
}

function compileLFO(raw: unknown): LFOSpec | LFOSpec[] | undefined {
  if (raw == null) return undefined
  if (Array.isArray(raw)) {
    const entries = raw.map(compileLFOEntry)
    return entries.length === 1 ? entries[0]! : entries
  }
  return compileLFOEntry(raw)
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

  // S32110/S32130–S32135: all character-block root keys (uppercase) take
  // precedence over their flat-format equivalents (lowercase top-level keys).
  const root = character.root

  const spec: InstrumentSpec = {}
  if ('amp' in obj) spec.amp = Number(obj.amp)
  const osc = compileOscillator(root.O ?? obj.oscillator)
  if (osc) spec.oscillator = osc
  const env = compileRfcEnvelope(root.A, root.S, root.R) ?? compileEnvelope(obj.envelope)
  if (env) spec.envelope = env
  const partials = compileProfile(root.PROFILE) ?? compilePartials(obj.partials)
  if (partials) spec.partials = partials
  const railsback = compileRailsback(obj.railsback)
  if (railsback) spec.railsback = railsback

  const spread = compileSpread(root.SPREAD ?? obj.spread)
  if (spread) spec.spread = spread
  const timbre = compileTimbre(root.TIMBRE ?? obj.timbre)
  if (timbre) spec.timbre = timbre
  const morph = compileMorph(root.MORPH ?? obj.morph)
  if (morph) spec.morph = morph
  const fm = compileFM(obj.fm)
  if (fm) spec.fm = fm
  const vcf = compileVCF(obj.vcf)
  if (vcf) spec.vcf = vcf
  const lfo = compileLFO(obj.lfo)
  if (lfo) spec.lfo = lfo

  return spec
}
