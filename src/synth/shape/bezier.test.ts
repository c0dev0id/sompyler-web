import { describe, it, expect } from 'vitest'
import { evaluate, getBezierFunc, plotBezierGradient } from './bezier'

describe('bezier kernel', () => {
  it('passes through the endpoints exactly', () => {
    const coords = [
      { x: 0, y: 0 },
      { x: 5, y: 0.7 },
      { x: 10, y: 1 },
    ]
    const buf = plotBezierGradient(100, coords)
    expect(buf[0]).toBeCloseTo(0, 6)
    expect(buf[99]).toBeCloseTo(1, 6)
  })

  it('is monotone for a monotone control polygon', () => {
    const coords = [
      { x: 0, y: 0 },
      { x: 1, y: 0.25 },
      { x: 2, y: 0.7 },
      { x: 3, y: 1 },
    ]
    const buf = plotBezierGradient(64, coords)
    for (let i = 1; i < buf.length; i++) {
      expect(buf[i]).toBeGreaterThanOrEqual(buf[i - 1]! - 1e-6)
    }
  })

  it('matches the closed-form quadratic Bezier at the midpoint', () => {
    // 3-point Bezier B(t) = (1-t)^2*P0 + 2t(1-t)*P1 + t^2*P2.
    // At t=0.5: B = (P0 + 2*P1 + P2) / 4.
    const P0 = { x: 0, y: 0 }
    const P1 = { x: 0.5, y: 1 }
    const P2 = { x: 1, y: 0 }
    const f = getBezierFunc([P0, P1, P2])
    const mid = f(0.5)
    expect(mid.x).toBeCloseTo((P0.x + 2 * P1.x + P2.x) / 4, 6)
    expect(mid.y).toBeCloseTo((P0.y + 2 * P1.y + P2.y) / 4, 6)
  })

  it('respects control-point multiplicity (z) as Bernstein weight', () => {
    // A triple-weighted middle control point should pull the curve
    // more strongly toward it than a single-weighted one.
    const single = evaluate(
      [
        { x: 0, y: 0 },
        { x: 0.5, y: 1, z: 1 },
        { x: 1, y: 0 },
      ],
      0.5,
    )
    const tripled = evaluate(
      [
        { x: 0, y: 0 },
        { x: 0.5, y: 1, z: 3 },
        { x: 1, y: 0 },
      ],
      0.5,
    )
    expect(tripled.y).toBeGreaterThan(single.y)
  })

  it('returns an empty buffer for zero length', () => {
    const buf = plotBezierGradient(0, [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ])
    expect(buf).toHaveLength(0)
  })

  it('fills every sample even when the bisection skips indices', () => {
    // A short buffer over a wide x-range forces some indices to be skipped
    // by the bisection — linear fill should cover them.
    const coords = [
      { x: 0, y: 0 },
      { x: 50, y: 0.5 },
      { x: 100, y: 1 },
    ]
    const buf = plotBezierGradient(8, coords)
    for (const v of buf) {
      expect(Number.isFinite(v)).toBe(true)
    }
  })
})
