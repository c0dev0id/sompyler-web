import { InstrumentError } from '../errors'
import type { Instrument } from '../parse/instrument'
import type { FMSpec, InstrumentSpec, LFOSpec, MorphEntry, PartialDef, RailsbackCurve, VCFSpec } from './sound_generator'
import { DEFAULT_ENVELOPE, type EnvelopeSpec } from './envelope'
import type { OscillatorSpec, Waveform } from './oscillator'
import { parseShape, renderShapeString } from './shape'
import { parseCharacterBlock, validateVariationGraph } from './variation'

const RAILSBACK_KEYS = 88

/**
 * RFC-compliant YAML → InstrumentSpec compiler.
 * Instruments must use the RFC `character:` block format (rfc.md §3.2).
 *
 * Valid instrument shape:
 *
 *     amp: 0.5                    # optional global scalar (non-RFC extension)
 *     character:
 *       O: sine
 *       A: ".01:1,100"
 *       S: ".2:100;1,70"
 *       R: ".3:100;1,0"
 *       PROFILE: [100, 70, 50]
 *       RAILSBACK_CURVE: [27.5, 4186, "0;100,0.02"]
 *
 * Non-RFC extensions (fm:, vcf:, lfo:) are accepted at top level.
 */

const WAVEFORMS: ReadonlySet<Waveform> = new Set(['sin', 'square', 'saw', 'triangle', 'noise'])

// RFC waveform names → internal Waveform identifiers (S32110).
const RFC_WAVEFORM: Record<string, Waveform> = { sine: 'sin', sawtooth: 'saw' }

function asObj(x: unknown): Record<string, unknown> | null {
  return x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : null
}

function compileOscillator(raw: unknown): OscillatorSpec | undefined {
  if (raw == null) return undefined
  if (typeof raw !== 'string') throw new InstrumentError(`O must be a waveform name string`)
  const wf = (RFC_WAVEFORM[raw] ?? raw) as Waveform
  if (!WAVEFORMS.has(wf)) throw new InstrumentError(`Unknown oscillator waveform '${raw}'`)
  return { waveform: wf }
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


/**
 * RFC "%dB" → linear amplitude. 100%dB = 0dBFS = 1.0, 0%dB = -100dBFS ≈ 0.
 * Matches Python's log_to_linear(v/100) = 10^(-5*(1-v/100)) in sympartial.py.
 */
function percentDbToLinear(v: number): number {
  return Math.pow(10, -5 * (1 - v / 100))
}

/**
 * S32131: VOLUMES list → number[] of REVERSED_DBFS base amplitudes, one per
 * harmonic slot. Same format as SPREAD: list of integers or "RESOLUTION:SHAPE".
 * Values are added to PROFILE V before converting to linear amplitude.
 */
function compileVolumes(raw: unknown): number[] | undefined {
  if (raw == null) return undefined
  if (typeof raw === 'string') {
    const colon = raw.indexOf(':')
    if (colon === -1) throw new InstrumentError(`VOLUMES string must be "RESOLUTION:SHAPE"`)
    const resolution = parseInt(raw.slice(0, colon), 10)
    if (!Number.isFinite(resolution) || resolution <= 0) {
      throw new InstrumentError(`VOLUMES resolution must be a positive integer`)
    }
    return Array.from(renderShapeString(raw, resolution))
  }
  if (!Array.isArray(raw)) throw new InstrumentError(`VOLUMES must be a list or "RESOLUTION:SHAPE" string`)
  return raw.map((item, i) => {
    const n = Number(item)
    if (!Number.isFinite(n)) throw new InstrumentError(`VOLUMES[${i}] must be a number`)
    return n
  })
}

/**
 * S32130/S32131: PROFILE list + optional VOLUMES → PartialDef[].
 *
 * VOLUMES provides a per-partial base amplitude in REVERSED_DBFS.
 * PROFILE V is additive on top: effective = V + VOLUMES[i].
 * If VOLUMES is longer than PROFILE, the excess slots create implicit partials.
 *
 * Simple PROFILE form: [100, 72, 52, …] — V values (added to VOLUMES[i] or absolute).
 * Complex form: [{ V: …, A: "…", S: "…", R: "…", D: cents }, …]
 */
function compileProfile(
  raw: unknown,
  rootEnv: { A: unknown; S: unknown; T: unknown; R: unknown },
  volumes?: number[],
): PartialDef[] | undefined {
  const profileItems: unknown[] = Array.isArray(raw) ? raw : []
  const profileLen = profileItems.length
  const volumesLen = volumes?.length ?? 0
  const count = Math.max(profileLen, volumesLen)
  if (count === 0) return undefined

  return Array.from({ length: count }, (_, i) => {
    const baseVol = volumes?.[i] ?? 0
    const item = profileItems[i]

    if (item == null) {
      // Implicit partial from VOLUMES only
      return { freqMult: i + 1, amp: percentDbToLinear(baseVol) } satisfies PartialDef
    }
    if (typeof item === 'number') {
      return { freqMult: i + 1, amp: percentDbToLinear(item + baseVol) } satisfies PartialDef
    }
    const obj = asObj(item)
    // V is optional when VOLUMES provides a base; required when VOLUMES is absent
    const hasV = obj != null && 'V' in obj
    if (!obj || (!hasV && volumesLen === 0)) {
      throw new InstrumentError(`PROFILE[${i}] must be a number or {V:…}`)
    }
    const profileV = hasV ? Number(obj.V) : 0
    const def: PartialDef = { freqMult: i + 1, amp: percentDbToLinear(profileV + baseVol) }
    const pA = obj.A ?? null
    const pS = obj.S ?? null
    const pT = obj.T ?? null
    const pR = obj.R ?? null
    if (pA != null || pS != null || pT != null || pR != null) {
      const env = compileRfcEnvelope(
        pA ?? rootEnv.A,
        pS ?? rootEnv.S,
        pT ?? rootEnv.T,
        pR ?? rootEnv.R,
      )
      if (env) def.envelope = env
    }
    if ('D' in obj) {
      const d = Number(obj.D)
      if (!Number.isFinite(d)) throw new InstrumentError(`PROFILE[${i}].D must be a number`)
      if (d !== 0) def.devianceCents = d
    }
    return def
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

/** Build an EnvelopeSpec from RFC character-block A/S/T/R shape strings (§3.2.1.1.2–1.5). */
function compileRfcEnvelope(A: unknown, S: unknown, T: unknown, R: unknown): EnvelopeSpec | undefined {
  if (A == null && S == null && T == null && R == null) return undefined
  const env: EnvelopeSpec = {
    attack:       A != null ? parseRfcDuration(String(A)) : DEFAULT_ENVELOPE.attack,
    decay:        S != null ? parseRfcDuration(String(S)) : 0,
    sustainLevel: S != null ? parseRfcSustainLevel(String(S)) : DEFAULT_ENVELOPE.sustainLevel,
    release:      R != null ? parseRfcDuration(String(R)) : DEFAULT_ENVELOPE.release,
  }
  if (A != null) env.attackShape = String(A)
  if (S != null) env.decayShape = String(S)
  if (R != null) env.releaseShape = String(R)
  if (T != null) {
    env.tail = parseRfcDuration(String(T))
    env.tailShape = String(T)
  }
  return env
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
 * FM: "FREQ["f"/"F"]["@"OSC]["["SHAPE"]"]";"DEPTH["+"INIT_DEG]"
 * RFC §S32117. FREQ in Hz (suffix "f"/"F" for dynamic). DEPTH is the peak
 * frequency-deviation ratio. INIT_DEG is modulator start phase in degrees.
 */
const FM_RX = /^([\d.]+)([fF])?(?:@(\w+))?(?:\[([^\]]+)\])?;([\d.]+)(?:\+(\d+))?$/

function compileFM(raw: unknown): FMSpec | undefined {
  if (raw == null) return undefined
  if (typeof raw !== 'string') throw new InstrumentError(`FM must be a string`)
  const m = FM_RX.exec(raw.trim())
  if (!m) throw new InstrumentError(`FM: invalid syntax — expected "FREQ[@OSC][SHAPE];DEPTH[+PHASE_DEG]"`)
  const freqHz = parseFloat(m[1]!)
  if (!Number.isFinite(freqHz) || freqHz <= 0) throw new InstrumentError(`FM: frequency must be positive`)
  const depth = parseFloat(m[5]!)
  if (!Number.isFinite(depth) || depth < 0) throw new InstrumentError(`FM: depth must be non-negative`)
  const spec: FMSpec = { freqHz, depth }
  if (m[2]) spec.dynamic = true
  if (m[3]) {
    const wf = m[3] as Waveform
    if (!WAVEFORMS.has(wf)) throw new InstrumentError(`FM: unknown waveform '${m[3]}'`)
    spec.waveform = wf
  }
  if (m[4]) spec.depthEnv = m[4]
  if (m[6]) spec.initPhase = parseInt(m[6], 10) / 360
  return spec
}

/**
 * VCF: "CUTOFF_HZ;RESONANCE[;ENV_AMOUNT[;ENV_ATTACK_S[;ENV_RELEASE_S]]]"
 */
function compileVCF(raw: unknown): VCFSpec | undefined {
  if (raw == null) return undefined
  if (typeof raw !== 'string') throw new InstrumentError(`VCF must be a string`)
  const parts = raw.trim().split(';')
  const cutoffHz = Number(parts[0])
  if (!Number.isFinite(cutoffHz) || cutoffHz <= 0) throw new InstrumentError(`VCF: cutoff must be a positive Hz value`)
  const resonance = Number(parts[1])
  if (!Number.isFinite(resonance) || resonance < 0 || resonance > 1) throw new InstrumentError(`VCF: resonance must be in [0, 1]`)
  const spec: VCFSpec = { cutoffHz, resonance }
  if (parts[2] != null && parts[2] !== '') {
    const v = Number(parts[2])
    if (!Number.isFinite(v)) throw new InstrumentError(`VCF: env_amount must be a number`)
    spec.envAmount = v
  }
  if (parts[3] != null && parts[3] !== '') {
    const v = Number(parts[3])
    if (!Number.isFinite(v) || v < 0) throw new InstrumentError(`VCF: env_attack must be non-negative`)
    spec.envAttack = v
  }
  if (parts[4] != null && parts[4] !== '') {
    const v = Number(parts[4])
    if (!Number.isFinite(v) || v < 0) throw new InstrumentError(`VCF: env_release must be non-negative`)
    spec.envRelease = v
  }
  return spec
}

/**
 * LFO: "RATE_HZ["@"OSC]["["DELAY_S"]"]";"DEPTH":"TARGET["+"PHASE_DEG]"
 * or a list of such strings for multiple LFOs.
 */
const LFO_RX = /^([\d.]+)(?:@(\w+))?(?:\[([\d.]+)\])?;([\d.]+):(amp|vcf)(?:\+(\d+))?$/

function compileLFOEntry(raw: string): LFOSpec {
  const m = LFO_RX.exec(raw.trim())
  if (!m) throw new InstrumentError(`LFO: invalid syntax — expected "RATE[@OSC][DELAY];DEPTH:TARGET"`)
  const rateHz = parseFloat(m[1]!)
  if (!Number.isFinite(rateHz) || rateHz <= 0) throw new InstrumentError(`LFO: rate must be positive`)
  const depth = parseFloat(m[4]!)
  if (!Number.isFinite(depth)) throw new InstrumentError(`LFO: depth must be a number`)
  const target = m[5] as 'amp' | 'vcf'
  const spec: LFOSpec = { rateHz, depth, target }
  if (m[2]) {
    const wf = m[2] as Waveform
    if (!WAVEFORMS.has(wf)) throw new InstrumentError(`LFO: unknown waveform '${m[2]}'`)
    spec.waveform = wf
  }
  if (m[3]) spec.delaySeconds = parseFloat(m[3])
  if (m[6]) spec.phase = parseInt(m[6], 10) / 360
  return spec
}

function compileLFO(raw: unknown): LFOSpec | LFOSpec[] | undefined {
  if (raw == null) return undefined
  if (Array.isArray(raw)) {
    const entries = (raw as unknown[]).map((e, i) => {
      if (typeof e !== 'string') throw new InstrumentError(`LFO[${i}] must be a string`)
      return compileLFOEntry(e)
    })
    return entries.length === 1 ? entries[0]! : entries
  }
  if (typeof raw !== 'string') throw new InstrumentError(`LFO must be a string or list of strings`)
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
  if (root.AMP != null) spec.amp = Number(root.AMP)
  const osc = compileOscillator(root.O)
  if (osc) spec.oscillator = osc
  const env = compileRfcEnvelope(root.A, root.S, root.T, root.R)
  if (env) spec.envelope = env
  const volumes = compileVolumes(root.VOLUMES)
  const partials = compileProfile(root.PROFILE, { A: root.A, S: root.S, T: root.T, R: root.R }, volumes)
  if (partials) spec.partials = partials
  const railsback = compileRailsback(root.RAILSBACK_CURVE)
  if (railsback) spec.railsback = railsback

  const spread = compileSpread(root.SPREAD)
  if (spread) spec.spread = spread
  const timbre = compileTimbre(root.TIMBRE)
  if (timbre) spec.timbre = timbre
  const morph = compileMorph(root.MORPH)
  if (morph) spec.morph = morph
  const fm = compileFM(root.FM)
  if (fm) spec.fm = fm
  const vcf = compileVCF(root.VCF)
  if (vcf) spec.vcf = vcf
  const lfo = compileLFO(root.LFO)
  if (lfo) spec.lfo = lfo

  return spec
}
