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
 * levels, delays, border, jitter, and deldiffs are all implemented in
 * render/room.ts. freq_lanes and diffusion parse cleanly but produce no
 * audio effect — those remain deferred.
 */

export class RoomError extends SompylerError {}

export interface RoomBody {
  levels: ShapeSpec
  delays: ShapeSpec
  border: ShapeSpec | null
  /**
   * S33500 per-tap amplitude jitter. Shape string or `L|R` pair;
   * rendered to `numEchoes` samples → per-tap amplitude deviation.
   */
  jitter: { left: ShapeSpec; right: ShapeSpec } | null
  /**
   * S33600 per-channel delay offsets in seconds per tap (`L|R` stressor
   * pair or a single stressor for both channels). Values are plain
   * comma-separated numbers; `;` groups cycle across taps (same format
   * as stress_pattern).
   */
  deldiffs: { left: number[]; right: number[] } | null
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
 * Parse a `L|R`-split string into a pair of shapes for jitter, or a
 * single shape shared by both channels. Returns `null` for missing values.
 */
function parseLRShape(
  raw: unknown,
  field: string,
): { left: ShapeSpec; right: ShapeSpec } | null {
  if (raw == null) return null
  if (typeof raw !== 'string') throw new RoomError(`Room field '${field}' must be a string`)
  const pipeIdx = raw.indexOf('|')
  if (pipeIdx !== -1) {
    const leftRaw = raw.slice(0, pipeIdx).trim()
    const rightRaw = raw.slice(pipeIdx + 1).trim()
    return {
      left: shapeFromUnknown(leftRaw, `${field}.left`),
      right: shapeFromUnknown(rightRaw, `${field}.right`),
    }
  }
  const both = shapeFromUnknown(raw, field)
  return { left: both, right: both }
}

/**
 * Parse deldiffs: `L|R` or single stressor-format string (groups of
 * comma-separated second values; `;` separates groups, same format as
 * stress_pattern). Returns a flat array per channel.
 */
function parseDeldiffs(raw: unknown, field: string): { left: number[]; right: number[] } | null {
  if (raw == null) return null
  if (typeof raw !== 'string') throw new RoomError(`Room field '${field}' must be a string`)
  const parseNums = (s: string): number[] => {
    const groups = s.split(';')
    const out: number[] = []
    for (const g of groups) for (const v of g.split(',')) { const n = parseFloat(v.trim()); if (isFinite(n)) out.push(n) }
    return out
  }
  const pipeIdx = raw.indexOf('|')
  if (pipeIdx !== -1) {
    return { left: parseNums(raw.slice(0, pipeIdx)), right: parseNums(raw.slice(pipeIdx + 1)) }
  }
  const both = parseNums(raw)
  return { left: both, right: both }
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
  const jitter = parseLRShape(obj.jitter, 'jitter')
  const deldiffs = parseDeldiffs(obj.deldiffs, 'deldiffs')
  return { levels, delays, border, jitter, deldiffs }
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
