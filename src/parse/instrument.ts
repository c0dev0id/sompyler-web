import jsyaml from 'js-yaml'
import { InstrumentError } from '../errors'
import { sha256 } from '../storage/hash'

/**
 * Phase 1: an instrument is an opaque YAML/JSON body. Its identity is
 * the SHA-256 of the raw text. Compilation (variation graph, cycle detection,
 * sympartial unification) lands in Phase 3 alongside the synthesiser.
 */
export interface Instrument {
  name: string
  body: string
  hash: string
  parsed: unknown
}

export async function loadInstrument(name: string, body: string): Promise<Instrument> {
  let parsed: unknown
  try {
    parsed = jsyaml.load(body)
  } catch (cause) {
    throw new InstrumentError(`Cannot parse instrument '${name}': ${(cause as Error).message}`, cause)
  }
  return { name, body, hash: await sha256(body), parsed }
}
