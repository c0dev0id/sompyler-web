/**
 * Bezier shape kernel. Port of
 * `Sompyler/synthesizer/shape/bezier_gradient.py` (S33000-3.3 / RFC §S33000).
 *
 * The Python `plot_bezier_gradient(length, *coords)` samples a Bezier curve
 * in x-order at adaptive `t` values: it bisects the parameter range and
 * places each (x, y) sample into `results[x]`, where x is the integer
 * screen-x coordinate. That guarantees one y-value per integer x position
 * even for non-uniform Beziers (where uniform-t sampling would clump or
 * gap the x axis).
 *
 * Function-shaped API (`evaluate(coords, t) → {x, y}`, `plot(length, coords)
 * → Float32Array`) preserves the TS-7 WASM forward door — a future kernel
 * can drop in behind these two signatures without touching callers.
 */

export interface ShapePoint {
  /** Control-point x in shape-local units (caller normalises to [0,1]). */
  x: number
  /** Control-point y. Caller is responsible for any pre-scaling. */
  y: number
  /**
   * Multiplicity (≥1). Sompyler's `z` field — repeating a control point
   * raises the Bernstein-polynomial weight at that x position.
   */
  z?: number
}

/** Bernstein coefficient cache: C(n,k). Built lazily via the (n+1-k)/k recursion. */
const _bCache = new Map<number, number>()

function binomial(n: number, k: number): number {
  if (k === 0 || k === n) return 1
  if (2 * k > n) return binomial(n, n - k)
  const key = n * 65536 + k
  const cached = _bCache.get(key)
  if (cached !== undefined) return cached
  const v = ((n + 1 - k) / k) * binomial(n, k - 1)
  _bCache.set(key, v)
  return v
}

function sumPolynom(cb: number[], t: number): number {
  let res = 0
  const n = cb.length - 1
  let tk = 1
  const u = 1 - t
  const uPows = new Float64Array(n + 1)
  uPows[n] = 1
  for (let k = n - 1; k >= 0; k--) uPows[k] = uPows[k + 1]! * u
  for (let k = 0; k <= n; k++) {
    res += cb[k]! * tk * uPows[k]!
    tk *= t
  }
  return res
}

/**
 * Build the Bezier evaluator for a list of control points. Returns a
 * `(t) → {x, y}` function where `x` is in [0,1] (normalised to the input
 * span) and `y` is the raw Bernstein-weighted y value.
 */
export function getBezierFunc(
  coords: ShapePoint[],
): (t: number) => { x: number; y: number } {
  if (coords.length === 0) {
    throw new Error('getBezierFunc requires at least one control point')
  }
  const x0 = coords[0]!.x
  const span = coords[coords.length - 1]!.x - x0
  if (span === 0) {
    return () => ({ x: 0, y: coords[0]!.y })
  }

  // Expand by multiplicity (z) — repeating a point increases its weight.
  const expanded: ShapePoint[] = []
  for (const c of coords) {
    const z = Math.max(1, Math.round(c.z ?? 1))
    for (let i = 0; i < z; i++) expanded.push(c)
  }

  const n = expanded.length - 1
  const xb = new Array<number>(expanded.length)
  const yb = new Array<number>(expanded.length)
  for (let i = 0; i <= n; i++) {
    const c = expanded[i]!
    const w = binomial(n, i)
    xb[i] = ((c.x - x0) / span) * w
    yb[i] = c.y * w
  }
  return (t: number) => ({ x: sumPolynom(xb, t), y: sumPolynom(yb, t) })
}

/**
 * Single-shot evaluation: returns the y value at parameter t ∈ [0,1] for
 * the given control points. Use `plotBezierGradient()` to sample uniformly
 * over the x-axis (the use-case the synthesiser needs).
 */
export function evaluate(coords: ShapePoint[], t: number): { x: number; y: number } {
  return getBezierFunc(coords)(t)
}

function scanBezier(
  approx: (t: number) => { x: number; y: number },
  length: number,
  results: Float32Array,
  filled: Uint8Array,
  start: number,
  pos: number,
  max: number,
): void {
  const t = start + pos
  const { x: xRaw, y } = approx(t)
  // Match Python's `int(xRaw * length)` (truncation toward zero).
  // Floor here keeps the recursion from overwriting the pre-filled
  // endpoint at index `length`.
  let x = Math.floor(xRaw * length)
  if (x < 0) x = 0
  if (x > length) x = length
  results[x] = y
  filled[x] = 1
  const halfPos = pos / 2

  if (x > 0 && !filled[x - 1]) {
    scanBezier(approx, length, results, filled, start, halfPos, x - 1)
  } else if (length && x + 1 <= max && filled[x + 1]) {
    // upper neighbour already painted — left branch done.
  }

  if (x < max) {
    scanBezier(approx, length, results, filled, start + pos, halfPos, max)
  }
}

/**
 * Plot the Bezier curve over `length` samples. Mirrors Sompyler's
 * `plot_bezier_gradient(length, *coords)`. Returns a `Float32Array` so it
 * can be summed straight into a partial's amplitude/frequency envelope.
 *
 * Any unfilled samples between adaptive hits are linearly interpolated
 * from the nearest filled neighbours — Python relies on the recursion
 * touching every integer index, but recursion bisection can skip indices
 * when a segment's x-span is small. Linear fill keeps the curve continuous.
 */
export function plotBezierGradient(length: number, coords: ShapePoint[]): Float32Array {
  if (length <= 0) return new Float32Array(0)
  const results = new Float32Array(length)
  const filled = new Uint8Array(length)
  results[0] = coords[0]!.y
  results[length - 1] = coords[coords.length - 1]!.y
  filled[0] = 1
  filled[length - 1] = 1

  if (length > 2) {
    // A degenerate (zero-span) Bezier maps every t to x=0, causing
    // scanBezier's right-recursion guard (`x < max`) to never clear →
    // infinite recursion. Pre-filled endpoints are already equal; skip
    // the bisection and let the linear-fill pass below handle the interior.
    const coordSpan = coords[coords.length - 1]!.x - coords[0]!.x
    if (coordSpan > 0) {
      const approx = getBezierFunc(coords)
      scanBezier(approx, length - 1, results, filled, 0, 0.5, length - 1)
    }
    // Linear fill across any gaps left by the bisection.
    let i = 0
    while (i < length) {
      if (filled[i]) {
        i++
        continue
      }
      let j = i
      while (j < length && !filled[j]) j++
      const left = i - 1
      const right = j < length ? j : length - 1
      const yL = results[left]!
      const yR = results[right]!
      const span = right - left
      for (let k = i; k < j; k++) {
        const t = (k - left) / span
        results[k] = yL + (yR - yL) * t
      }
      i = j
    }
  }
  return results
}
