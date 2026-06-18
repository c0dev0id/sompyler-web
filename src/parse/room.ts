import jsyaml from 'js-yaml'
import { SompylerError } from '../errors'
import { parseShape, renderShape, type ShapeSpec } from '../synth/shape'

/**
 * `.splr` (room) parser. Reference: `Sompyler/shapereverb.py:Room.__init__`.
 *
 * The Sompyler room YAML carries:
 *   levels       — echo amplitude curve (per-echo, x = echo index).
 *   delays       — delay shape over echoes.
 *   border       — distance falloff curve applied at the IR head/tail.
 *   freq_lanes   — per-band EQ shapes (deferred — Phase 11 scope).
 *   deldiffs     — per-echo jitter (deferred).
 *   jitter       — amplitude jitter (deferred).
 *   diffusion    — convolution diffusor (deferred).
 *
 * Phase 11 ships levels + delays + border only — enough for a position-
 * dependent IR. The deferred fields parse cleanly but produce no audio
 * effect; mixing them in is a forward door once a fixture demonstrates
 * the difference is desired.
 */

export class RoomError extends SompylerError {}

export interface RoomBody {
  levels: ShapeSpec
  delays: ShapeSpec
  border: ShapeSpec | null
}

function shapeFromUnknown(raw: unknown, field: string): ShapeSpec {
  if (typeof raw !== 'string') {
    throw new RoomError(`Room field '${field}' must be a string`)
  }
  try {
    return parseShape(raw)
  } catch (cause) {
    throw new RoomError(`Room field '${field}': ${(cause as Error).message}`)
  }
}

/**
 * Parse a `.splr` YAML body into a `RoomBody`. Free-field (no levels)
 * returns `null` so callers can pick the FreeField fast-path.
 */
export function parseRoom(body: string): RoomBody | null {
  let parsed: unknown
  try {
    parsed = jsyaml.load(body)
  } catch (cause) {
    throw new RoomError(`Room YAML: ${(cause as Error).message}`)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null
  }
  const obj = parsed as Record<string, unknown>
  if (obj.levels == null) return null

  const levels = shapeFromUnknown(obj.levels, 'levels')
  const delays = shapeFromUnknown(obj.delays ?? '1:0;1,1', 'delays')
  const border = obj.border != null ? shapeFromUnknown(obj.border, 'border') : null
  return { levels, delays, border }
}

/**
 * Render a Room body's *amplitude envelope* (level per echo) into an
 * `numEchoes`-long Float32Array. Used by `Room.position()`.
 */
export function renderLevels(room: RoomBody, numEchoes: number): Float32Array {
  return renderShape(room.levels, numEchoes)
}

export function renderDelays(room: RoomBody, numEchoes: number): Float32Array {
  return renderShape(room.delays, numEchoes)
}
