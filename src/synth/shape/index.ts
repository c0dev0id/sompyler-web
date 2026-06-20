import { plotBezierGradient, type ShapePoint } from './bezier'

/**
 * Minimal Shape port. Reference: `Sompyler/synthesizer/shape/__init__.py`.
 *
 * Sompyler's `Shape.from_string` understands a small DSL:
 *
 *     length[:y0[*z0]];x1,y1[!][*z1];x2,y2[!][*z2];...
 *
 * - `length` is a numeric span (the x-axis length in shape units).
 * - `y0`/`z0` declare the starting point (defaults to (0, 0, 1)).
 * - Subsequent triples are control points; `!` marks a *sharp* (segment-
 *   breaking) point, `*N` declares multiplicity used as Bernstein weight.
 *
 * Phase 11 ships the subset needed by `.splr` room definitions and the
 * envelope `A`/`S`/`R` curves used in the rich instrument bodies — the
 * single-segment form `length:y0;x1,y1;x2,y2;...`. Sharp breaks and the
 * multi-segment sample-distribution logic land if/when a fixture trips
 * them.
 */

export interface ShapeSpec {
  /** Numeric x-span (shape-local units). */
  length: number
  /** Control points in increasing x. */
  points: ShapePoint[]
}

const HEAD_RX = /^(-?\d+(?:\.\d+)?)?([+-]?\d+(?:\.\d+)?)?(?:\*(\d+))?$/

export function parseShape(input: string): ShapeSpec {
  const colon = input.indexOf(':')
  let length: number
  let bezier: string
  if (colon === -1) {
    length = 1
    bezier = input
  } else {
    const head = input.slice(0, colon).trim()
    length = head.includes('.') ? parseFloat(head) : parseInt(head, 10)
    bezier = input.slice(colon + 1)
  }
  if (!Number.isFinite(length)) length = 1

  // Header may be e.g. "100;1,50;..." — first ;-token is the y0[*z0]
  // descriptor.
  const tokens = bezier.split(';').map((t) => t.trim()).filter((t) => t.length > 0)
  if (tokens.length === 0) {
    throw new Error(`Shape '${input}' has no control points`)
  }

  const points: ShapePoint[] = []
  // Head token: y0 only (no comma) — implicit x=0.
  const head = tokens.shift()!
  if (head.includes(',')) {
    // No explicit head — treat all tokens as (x,y) pairs.
    tokens.unshift(head)
    points.push({ x: 0, y: 0, z: 1 })
  } else {
    const m = HEAD_RX.exec(head)
    if (!m) throw new Error(`Shape head '${head}' is malformed`)
    const y = parseFloat(m[2] ?? m[1] ?? '0')
    const z = m[3] ? parseInt(m[3], 10) : 1
    points.push({ x: 0, y, z })
  }

  for (const tok of tokens) {
    const t = tok.replace(/!\s*$/, '')
    const starIdx = t.indexOf('*')
    let z = 1
    let xy = t
    if (starIdx !== -1) {
      z = parseInt(t.slice(starIdx + 1), 10) || 1
      xy = t.slice(0, starIdx)
    }
    const [xs, ys] = xy.split(',')
    if (xs == null || ys == null) {
      throw new Error(`Shape segment '${tok}' must have 'x,y' form`)
    }
    const x = parseFloat(xs)
    const y = parseFloat(ys)
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`Shape segment '${tok}' has non-numeric coords`)
    }
    points.push({ x, y, z })
  }

  return { length, points }
}

/**
 * Render the shape into `numSamples` samples. Mirrors
 * `Shape.render(unit_length, is_length_factor=False)` for the common case.
 */
export function renderShape(spec: ShapeSpec, numSamples: number): Float32Array {
  if (numSamples <= 0) return new Float32Array(0)
  return plotBezierGradient(numSamples, spec.points)
}

/** Convenience: parse + render. */
export function renderShapeString(input: string, numSamples: number): Float32Array {
  return renderShape(parseShape(input), numSamples)
}

/**
 * Canonical entry point for Phase 16b's three consumers (tempo profile,
 * S32200 article gradual changes, future scale-snap weighting). Parses
 * the shape string and renders it to `ticks` samples — the per-tick
 * value array all three consumers operate on.
 *
 * Identical to `renderShapeString` today; the alias exists so call sites
 * read in domain vocabulary ("evaluate this shape over N ticks") rather
 * than DSP vocabulary ("render this shape into N samples").
 */
export function evaluateShape(input: string, ticks: number): Float32Array {
  return renderShapeString(input, ticks)
}
