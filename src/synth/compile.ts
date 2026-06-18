import { InstrumentError } from '../errors'
import type { Instrument } from '../parse/instrument'
import type { InstrumentSpec, PartialDef } from './sound_generator'
import { DEFAULT_ENVELOPE, type EnvelopeSpec } from './envelope'
import type { OscillatorSpec, Waveform } from './oscillator'

/**
 * Phase 5 minimum: a forgiving YAML → `InstrumentSpec` compiler used by
 * `renderAll()`. The full variation graph + cycle detection (S32122,
 * `Sompyler/orchestra/instrument/variation.py`) lands in a later phase.
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
 * Anything off the v1 shape is ignored (lenient pass-through).
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

export function compileInstrument(instr: Instrument): InstrumentSpec {
  const obj = asObj(instr.parsed)
  if (!obj) {
    throw new InstrumentError(`Instrument '${instr.name}' is not a YAML mapping`)
  }
  const spec: InstrumentSpec = {}
  if ('amp' in obj) spec.amp = Number(obj.amp)
  const osc = compileOscillator(obj.oscillator)
  if (osc) spec.oscillator = osc
  const env = compileEnvelope(obj.envelope)
  if (env) spec.envelope = env
  const partials = compilePartials(obj.partials)
  if (partials) spec.partials = partials
  return spec
}
