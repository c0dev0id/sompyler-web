import { DEFAULT_SAMPLE_RATE } from './constants'
import { DEFAULT_ENVELOPE, applyEnvelope, type EnvelopeSpec } from './envelope'
import { applyBiquadLPF, type VCFSpec } from './filter'
import { renderLFO, type LFOSpec } from './lfo'
import { renderOscillator, renderOscillatorFM, renderOscillatorPitchMod, type FMSpec, type OscillatorSpec } from './oscillator'
import { evaluateShape } from './shape'
import { renderSympartial, type SympartialSpec } from './sympartial'

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Top-level instrument → PCM rendering. Reference:
 * `Sompyler/synthesizer/sound_generator.py:SoundGenerator`.
 *
 * Renders the sum-of-partials path. Variation selection
 * (`Instrument.render_tone()` → `variation.sound_generator_for(note)`)
 * is not yet implemented.
 */

/**
 * S32135: one entry in a MORPH list. The divisor/remainder pair addresses
 * which partials this entry applies to (1-indexed):
 *   divisor = 0  → exact match: only the partial at position `remainder`
 *   divisor > 0  → modular: partials where (position % divisor) === remainder
 *
 * weight is pre-computed from the shape string's length field (Python:
 * `shape.length` is the weight in `SoundMorpher.get_according_shapes()`).
 */
export interface MorphEntry {
  divisor: number
  remainder: number
  weight: number
  shape: string
}

export interface VariationEntry {
  /** Boundary value (Hz / stress / seconds) at which this spec applies. */
  value: number
  spec: InstrumentSpec
}

export type VariationAttr = 'pitch' | 'stress' | 'length'

export interface VariationSet {
  attr: VariationAttr
  /** Boundary specs, sorted ascending by value. */
  entries: VariationEntry[]
}

export interface InstrumentSpec {
  /** Linear amplitude scaling applied after summing partials. */
  amp?: number
  /** Default envelope used by partials that don't specify their own. */
  envelope?: EnvelopeSpec
  /** Default oscillator used by partials that don't specify their own. */
  oscillator?: OscillatorSpec
  /** Harmonic partials. If empty, a single 1× sine partial is implied. */
  partials?: PartialDef[]
  /** S32136 railsback per-key frequency deviation curve. */
  railsback?: RailsbackCurve
  /**
   * S32132: incremental cent deviations per partial, applied cumulatively.
   * spread[0] shifts partial 1 by spread[0] cents, partial 2 by
   * spread[0]+spread[1] cents, etc. Shifts the harmonic series away from
   * the pure integer multiples (inharmonicity).
   */
  spread?: number[]
  /**
   * S32134: "SPECTRUM_WIDTH:SHAPE" string. The shape is sampled per
   * partial (index = harmonic position) to produce a frequency-dependent
   * amplitude multiplier. Neutral = 1.0.
   */
  timbre?: string
  /**
   * S32135: post-render per-partial amplitude envelopes. Applied after
   * oscillator + envelope but before partial accumulation.
   */
  morph?: MorphEntry[]
  /**
   * Top-level FM default, inherited by partials that don't specify their own.
   * If any partial has FM, the per-partial rendering path is always used.
   */
  fm?: FMSpec
  /** Resonant low-pass filter applied to the summed output. */
  vcf?: VCFSpec
  /** One or more LFOs routed to 'vcf' cutoff or 'amp' output. */
  lfo?: LFOSpec | LFOSpec[]
  /**
   * Stacked-voice chorus (sompyler-web extension). Renders the entire
   * partial bank `count` times with each voice pitch-shifted by a fixed
   * cent offset, then sums. Voices are linearly distributed in
   * [-detuneCents, +detuneCents]: odd counts include a 0¢ centre voice,
   * even counts straddle 0. Models SF2 "stacked sample" patches such as
   * Synth Brass 2 where the chorus character comes from N fixed-pitch
   * voices, not a chorus DSP.
   */
  unison?: UnisonSpec
  /** RFC §S32300–S32330: per-attribute interpolation across variation boundaries. */
  variations?: VariationSet
}

export interface UnisonSpec {
  /** Number of stacked voices (>= 1; 1 is a no-op pass-through). */
  count: number
  /** Maximum cent offset from centre — outermost voices land here. */
  detuneCents: number
}

export type { FMSpec, LFOSpec, VCFSpec }

/**
 * Pre-rendered railsback curve. `curve[i]` is the octave shift applied
 * to a note whose base frequency sits at the i-th of 88 piano-key slots
 * between `lowHz` and `highHz`. Mirrors
 * `Sompyler/synthesizer/sound_generator.py:165-173`.
 */
export interface RailsbackCurve {
  lowHz: number
  highHz: number
  /** 88 octave-fraction offsets; the rendered Shape over the keyboard span. */
  curve: Float32Array
}

/**
 * Apply the railsback shift to a base frequency. Out-of-range pitches
 * pass through unchanged — Sompyler raises here, but in v1 we treat
 * railsback as advisory rather than a hard constraint (single-song
 * workspace; the user is the only listener).
 */
export function applyRailsback(baseFreq: number, rb: RailsbackCurve | undefined): number {
  if (!rb) return baseFreq
  const { lowHz, highHz, curve } = rb
  if (baseFreq < lowHz || baseFreq > highHz) return baseFreq
  const idx = Math.floor(
    (Math.log(baseFreq) / Math.log(lowHz)) /
      (Math.log(highHz) / Math.log(lowHz)) *
      (curve.length - 1),
  )
  const offset = curve[Math.max(0, Math.min(curve.length - 1, idx))] ?? 0
  return baseFreq * Math.pow(2, offset)
}

export interface PartialDef {
  freqMult?: number
  amp?: number
  oscillator?: OscillatorSpec
  envelope?: EnvelopeSpec
  /** Per-partial FM; overrides InstrumentSpec.fm if set. */
  fm?: FMSpec
  /** D: frequency deviance in cents from the harmonic series (S32130). */
  devianceCents?: number
}

// ---------------------------------------------------------------------------
// RFC §S32300–S32330: variation interpolation
// ---------------------------------------------------------------------------

function interpolateEnvelope(a: EnvelopeSpec | undefined, b: EnvelopeSpec | undefined, t: number): EnvelopeSpec | undefined {
  if (!a && !b) return undefined
  const la = a ?? DEFAULT_ENVELOPE
  const lb = b ?? DEFAULT_ENVELOPE
  const env: EnvelopeSpec = {
    attack: lerp(la.attack, lb.attack, t),
    sustainLevel: lerp(la.sustainLevel, lb.sustainLevel, t),
    release: lerp(la.release, lb.release, t),
  }
  const decay = lerp(la.decay ?? 0, lb.decay ?? 0, t)
  if (decay > 0) env.decay = decay
  const tail = lerp(la.tail ?? 0, lb.tail ?? 0, t)
  if (tail > 0) env.tail = tail
  // Shape strings drive bezier curves; full curve interpolation is not implemented — take left's.
  if (la.attackShape) env.attackShape = la.attackShape
  if (la.decayShape) env.decayShape = la.decayShape
  if (la.releaseShape) env.releaseShape = la.releaseShape
  if (la.tailShape) env.tailShape = la.tailShape
  return env
}

function interpolatePartials(a: PartialDef[] | undefined, b: PartialDef[] | undefined, t: number): PartialDef[] | undefined {
  if (!a && !b) return undefined
  const la = a ?? []
  const lb = b ?? []
  const count = Math.max(la.length, lb.length)
  if (count === 0) return undefined
  return Array.from({ length: count }, (_, i) => {
    const pa = la[i]
    const pb = lb[i]
    const def: PartialDef = {
      freqMult: pa?.freqMult ?? pb?.freqMult ?? (i + 1),
      amp: lerp(pa?.amp ?? 0, pb?.amp ?? 0, t),
    }
    if (pa?.devianceCents != null || pb?.devianceCents != null) {
      def.devianceCents = lerp(pa?.devianceCents ?? 0, pb?.devianceCents ?? 0, t)
    }
    if (pa?.envelope || pb?.envelope) {
      def.envelope = interpolateEnvelope(pa?.envelope, pb?.envelope, t)
    }
    // Non-interpolatable per-partial fields: take left's.
    if (pa?.oscillator) def.oscillator = pa.oscillator
    if (pa?.fm) def.fm = pa.fm
    return def
  })
}

function interpolateNumberArrays(a: number[] | undefined, b: number[] | undefined, t: number): number[] | undefined {
  if (!a && !b) return undefined
  const la = a ?? []
  const lb = b ?? []
  const count = Math.max(la.length, lb.length)
  if (count === 0) return undefined
  return Array.from({ length: count }, (_, i) => lerp(la[i] ?? 0, lb[i] ?? 0, t))
}

function interpolateRailsback(a: RailsbackCurve | undefined, b: RailsbackCurve | undefined, t: number): RailsbackCurve | undefined {
  if (!a && !b) return undefined
  if (!b) return a
  if (!a) return b
  const curve = new Float32Array(a.curve.length)
  for (let i = 0; i < a.curve.length; i++) curve[i] = lerp(a.curve[i] ?? 0, b.curve[i] ?? 0, t)
  return { lowHz: lerp(a.lowHz, b.lowHz, t), highHz: lerp(a.highHz, b.highHz, t), curve }
}

function interpolateSpecs(a: InstrumentSpec, b: InstrumentSpec, t: number): InstrumentSpec {
  const result: InstrumentSpec = {
    // Non-interpolatable: take left's (fall back to right if left absent).
    oscillator: a.oscillator ?? b.oscillator,
    timbre: a.timbre ?? b.timbre,
    morph: a.morph ?? b.morph,
    fm: a.fm ?? b.fm,
    vcf: a.vcf ?? b.vcf,
    lfo: a.lfo ?? b.lfo,
    unison: a.unison ?? b.unison,
  }
  if (a.amp != null || b.amp != null) result.amp = lerp(a.amp ?? 1, b.amp ?? 1, t)
  const env = interpolateEnvelope(a.envelope, b.envelope, t)
  if (env) result.envelope = env
  const partials = interpolatePartials(a.partials, b.partials, t)
  if (partials) result.partials = partials
  const spread = interpolateNumberArrays(a.spread, b.spread, t)
  if (spread) result.spread = spread
  const railsback = interpolateRailsback(a.railsback, b.railsback, t)
  if (railsback) result.railsback = railsback
  return result
}

/**
 * RFC §S32300–S32330: resolve the effective InstrumentSpec for a note by
 * interpolating between the two bracketing variation boundaries.
 *
 * - Before the first boundary → first boundary spec (no interpolation).
 * - After the last boundary → last boundary spec (no interpolation).
 * - Between two boundaries → linear blend weighted by position in that range.
 */
export function resolveVariation(
  instrument: InstrumentSpec,
  note: Pick<RenderNoteInput, 'freqHz' | 'stress' | 'lengthSeconds'>,
): InstrumentSpec {
  const { variations } = instrument
  if (!variations || variations.entries.length === 0) return instrument

  const attrVal =
    variations.attr === 'stress' ? note.stress :
    variations.attr === 'length' ? note.lengthSeconds :
    note.freqHz  // 'pitch' and default

  const { entries } = variations
  if (attrVal <= entries[0]!.value) return entries[0]!.spec
  if (attrVal >= entries[entries.length - 1]!.value) return entries[entries.length - 1]!.spec

  let li = 0
  for (let i = 0; i < entries.length - 1; i++) {
    if (attrVal <= entries[i + 1]!.value) { li = i; break }
  }
  const left = entries[li]!
  const right = entries[li + 1]!
  return interpolateSpecs(left.spec, right.spec, (attrVal - left.value) / (right.value - left.value))
}

function resolveSympartials(spec: InstrumentSpec): SympartialSpec[] {
  const defaultOsc: OscillatorSpec = spec.oscillator ?? { waveform: 'sin' }
  const defaultEnv: EnvelopeSpec = spec.envelope ?? DEFAULT_ENVELOPE
  const partials = spec.partials?.length
    ? spec.partials
    : [{ freqMult: 1, amp: 1 } satisfies PartialDef]
  return partials.map((p) => ({
    oscillator: p.oscillator ?? defaultOsc,
    envelope: p.envelope ?? defaultEnv,
    freqMult: p.freqMult ?? 1,
    amp: p.amp ?? 1,
    fm: p.fm ?? spec.fm,
    devianceMult: p.devianceCents ? Math.pow(2, p.devianceCents / 1200) : undefined,
  }))
}

export interface RenderNoteInput {
  instrument: InstrumentSpec
  freqHz: number
  stress: number
  lengthSeconds: number
  sampleRate?: number
  /** S51a10 damp: per-note release extension in seconds. */
  dampSeconds?: number
  /**
   * S32200 shape-typed article values, preserved verbatim from the score.
   * Each shape is evaluated to `lengthTicks` samples and applied as a
   * multiplicative amplitude envelope (intensity over time). Real
   * frequency-domain vibrato is a forward door — the Shape kernel and
   * worker plumbing are in place, only the FM oscillator hook is missing.
   */
  shapeArticles?: Record<string, string>
  /** Tick count under the active tempo profile (for shape evaluation). */
  lengthTicks?: number
}

/**
 * Render one note into a fresh Float32Array of `length * sampleRate`
 * samples. Stress acts as a master amplitude multiplier; per-partial
 * sensitivity to stress lands later when the instrument compiler
 * grows shape-driven curves.
 */
export function renderNote(input: RenderNoteInput): Float32Array {
  const sampleRate = input.sampleRate ?? DEFAULT_SAMPLE_RATE
  const damp = Math.max(0, input.dampSeconds ?? 0)
  const totalSamples = Math.max(
    1,
    Math.round((input.lengthSeconds + damp) * sampleRate),
  )
  const out = new Float32Array(totalSamples)
  const instrument = resolveVariation(input.instrument, input)
  const sympartials = resolveSympartials(instrument)
  const baseFreq = applyRailsback(input.freqHz, instrument.railsback)

  const { spread, timbre, morph } = instrument

  // Collect LFO signals before partial summation so pitchLFO can be routed
  // per-oscillator (pitch modulation must be applied pre-summation).
  let vcfLFO: Float32Array | null = null
  let ampLFO: Float32Array | null = null
  let pitchLFO: Float32Array | null = null
  let pitchLFODepthCents = 0
  if (instrument.lfo) {
    const specs = Array.isArray(instrument.lfo)
      ? instrument.lfo
      : [instrument.lfo]
    for (const lfoSpec of specs) {
      const signal = renderLFO(lfoSpec, totalSamples, sampleRate)
      const depth = lfoSpec.depth
      if (lfoSpec.target === 'vcf') {
        if (!vcfLFO) vcfLFO = new Float32Array(totalSamples)
        for (let i = 0; i < totalSamples; i++) vcfLFO[i] = vcfLFO[i]! + signal[i]! * depth
      } else if (lfoSpec.target === 'pitch') {
        // Multiple pitch LFOs are uncommon but additive. We accumulate
        // the signal with the first LFO's depthCents as the scale.
        if (!pitchLFO) {
          pitchLFO = signal
          pitchLFODepthCents = depth
        } else {
          // blend subsequent pitch LFOs (scaled to first's depth range)
          for (let i = 0; i < totalSamples; i++) pitchLFO[i] = pitchLFO[i]! + signal[i]! * (depth / Math.max(1, pitchLFODepthCents))
        }
      } else {
        if (!ampLFO) ampLFO = new Float32Array(totalSamples)
        for (let i = 0; i < totalSamples; i++) ampLFO[i] = ampLFO[i]! + signal[i]! * depth
      }
    }
  }

  const hasFM = sympartials.some((sp) => !!sp.fm)
  const hasPerPartialMods =
    hasFM ||
    !!pitchLFO ||
    (spread && spread.length > 0) ||
    !!timbre ||
    (morph && morph.length > 0 && !!input.lengthTicks) ||
    sympartials.some((sp) => sp.devianceMult != null)

  const voiceOffsets = expandUnisonOffsets(instrument.unison)
  for (const detuneCents of voiceOffsets) {
    const voiceBaseFreq = detuneCents === 0
      ? baseFreq
      : baseFreq * Math.pow(2, detuneCents / 1200)
    if (hasPerPartialMods) {
      const spreadMults = computeSpreadMults(spread, sympartials)
      const timbreAmps = computeTimbreAmps(timbre, sympartials)
      for (let pi = 0; pi < sympartials.length; pi++) {
        const sp = sympartials[pi]!
        const partialFreqHz = voiceBaseFreq * sp.freqMult * (spreadMults[pi] ?? 1) * (sp.devianceMult ?? 1)
        const buf = new Float32Array(totalSamples)
        if (sp.fm) {
          const depthEnv = sp.fm.depthEnv
            ? evaluateShape(sp.fm.depthEnv, totalSamples)
            : null
          renderOscillatorFM(buf, sp.oscillator, partialFreqHz, sp.fm, sampleRate, depthEnv)
        } else if (pitchLFO) {
          renderOscillatorPitchMod(buf, sp.oscillator, partialFreqHz, sampleRate, pitchLFO, pitchLFODepthCents)
        } else {
          renderOscillator(buf, sp.oscillator, partialFreqHz, sampleRate)
        }
        applyEnvelope(buf, sp.envelope, sampleRate, damp)
        if (morph && morph.length > 0 && input.lengthTicks) {
          applyMorphToPartial(buf, pi + 1, morph, totalSamples, input.lengthTicks)
        }
        const amp = Math.max(0, sp.amp) * (timbreAmps[pi] ?? 1)
        for (let i = 0; i < totalSamples; i++) out[i] = out[i]! + buf[i]! * amp
      }
    } else {
      for (const sp of sympartials) {
        renderSympartial(out, sp, voiceBaseFreq, sampleRate, damp)
      }
    }
  }

  const masterAmp = (instrument.amp ?? 1) * input.stress
  if (masterAmp !== 1) {
    for (let i = 0; i < out.length; i++) out[i] = out[i]! * masterAmp
  }
  if (instrument.vcf) {
    applyBiquadLPF(out, instrument.vcf, input.lengthSeconds, damp, sampleRate, vcfLFO)
  }
  if (ampLFO) {
    for (let i = 0; i < totalSamples; i++) out[i] = out[i]! * (1 + ampLFO[i]!)
  }
  applyShapeArticles(out, input.shapeArticles, input.lengthTicks)
  // Soft clipping to keep partials sums in [-1,1].
  for (let i = 0; i < out.length; i++) {
    const x = out[i]!
    out[i] = x > 1 ? 1 : x < -1 ? -1 : x
  }
  return out
}

/**
 * Expand a UnisonSpec into a list of detune-cent offsets, one per voice.
 * Linear distribution across [-detuneCents, +detuneCents]: odd counts
 * include a 0¢ centre, even counts straddle 0. Falsy/single-voice
 * specs collapse to [0] so the render loop runs unchanged once.
 */
function expandUnisonOffsets(spec: UnisonSpec | undefined): number[] {
  if (!spec || spec.count <= 1 || spec.detuneCents === 0) return [0]
  const offsets = new Array<number>(spec.count)
  for (let k = 0; k < spec.count; k++) {
    offsets[k] = spec.detuneCents * ((2 * k) / (spec.count - 1) - 1)
  }
  return offsets
}

/**
 * S32132: compute per-partial frequency multipliers from the spread list.
 *
 * Python's model (variation.py spreaditer): walk a running position counter
 * one step per harmonic slot (1 … maxFreqMult), where each step adds
 * 2^(cumCents/1200) to the position. Partial k's actual frequency factor
 * is that running position at slot k. The returned multiplier is
 * position(k)/freqMult(k) so that `baseFreq * freqMult * mult = baseFreq * position`.
 */
function computeSpreadMults(spread: number[] | undefined, sympartials: SympartialSpec[]): Float32Array {
  const mults = new Float32Array(sympartials.length).fill(1)
  if (!spread || spread.length === 0) return mults
  const maxFreqMult = sympartials.reduce((m, sp) => Math.max(m, sp.freqMult), 0)
  let cumCents = 0
  let position = 0
  const positions = new Float32Array(maxFreqMult)
  for (let k = 1; k <= maxFreqMult; k++) {
    cumCents += spread[k - 1] ?? 0
    position += Math.pow(2, cumCents / 1200)
    positions[k - 1] = position
  }
  for (let pi = 0; pi < sympartials.length; pi++) {
    const fm = sympartials[pi]!.freqMult
    mults[pi] = positions[fm - 1]! / fm
  }
  return mults
}

/**
 * S32134: sample the TIMBRE shape once per partial. The shape is indexed
 * by harmonic position (partial 1 = index 0, partial N = index N-1).
 * Values of 1.0 are neutral; <1.0 attenuates, >1.0 boosts.
 * Out-of-range partials (beyond spectrumWidth) receive the last value.
 */
function computeTimbreAmps(timbre: string | undefined, sympartials: SympartialSpec[]): Float32Array {
  const count = sympartials.length
  const amps = new Float32Array(count).fill(1)
  if (!timbre) return amps
  const colon = timbre.indexOf(':')
  if (colon === -1) return amps
  const width = parseInt(timbre.slice(0, colon), 10)
  if (!Number.isFinite(width) || width <= 0) return amps
  const shape = evaluateShape(timbre, width)
  for (let i = 0; i < count; i++) {
    amps[i] = shape[Math.min(i, width - 1)] ?? 1
  }
  return amps
}

/**
 * S32135: apply matching MORPH entries to a single partial buffer as a
 * multiplicative amplitude envelope. Multiple matching entries are
 * weight-averaged (weight = parsed shape length, per Python convention).
 */
function applyMorphToPartial(
  buf: Float32Array,
  partialIndex: number,
  morph: MorphEntry[],
  totalSamples: number,
  lengthTicks: number,
): void {
  const matching = morph.filter((m) =>
    m.divisor === 0 ? m.remainder === partialIndex : partialIndex % m.divisor === m.remainder,
  )
  if (matching.length === 0) return

  const totalWeight = matching.reduce((s, m) => s + m.weight, 0)
  if (totalWeight === 0) return

  const precomputed = matching.map((m) => ({
    w: m.weight / totalWeight,
    ticks: evaluateShape(m.shape, lengthTicks),
  }))

  for (let i = 0; i < totalSamples; i++) {
    const tickIdx = Math.min(lengthTicks - 1, Math.floor((i * lengthTicks) / totalSamples))
    let env = 0
    for (const { w, ticks } of precomputed) {
      env += (ticks[tickIdx] ?? 1) * w
    }
    buf[i] = buf[i]! * env
  }
}

/**
 * Apply S32200 shape articles as multiplicative amplitude envelopes.
 * Each shape evaluates to `lengthTicks` per-tick samples; samples within
 * each tick share the tick's value (nearest-neighbour stretch — cheap,
 * deterministic, and visually faithful to the Shape's segment structure).
 * Multiple articles compose multiplicatively. Empty maps and missing
 * `lengthTicks` short-circuit so the common case stays free.
 */
function applyShapeArticles(
  out: Float32Array,
  articles: Record<string, string> | undefined,
  lengthTicks: number | undefined,
): void {
  if (!articles || !lengthTicks || lengthTicks <= 0) return
  const names = Object.keys(articles)
  if (names.length === 0) return
  const samples = out.length
  for (const name of names) {
    const shape = articles[name]
    if (!shape) continue
    const perTick = evaluateShape(shape, lengthTicks)
    for (let i = 0; i < samples; i++) {
      const tickIdx = Math.min(lengthTicks - 1, Math.floor((i * lengthTicks) / samples))
      out[i] = out[i]! * (perTick[tickIdx] ?? 1)
    }
  }
}
