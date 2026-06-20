import { describe, it, expect } from 'vitest'
import { parseShape, renderShape, renderShapeString } from './index'

describe('parseShape', () => {
  it('parses a leading length and y0', () => {
    const s = parseShape('100:50;1,30;2,10')
    expect(s.length).toBe(100)
    expect(s.points[0]).toMatchObject({ x: 0, y: 50 })
    expect(s.points.at(-1)).toMatchObject({ x: 2, y: 10 })
  })

  it('treats a missing y-head as implicit (0,0)', () => {
    const s = parseShape('1:0,0;1,1')
    expect(s.points[0]).toMatchObject({ x: 0, y: 0 })
    expect(s.points[1]).toMatchObject({ x: 0, y: 0 })
  })

  it('honours `!` as a non-fatal hint (sharp segment break)', () => {
    const s = parseShape('5:100;1,92;4,60!;5,87')
    expect(s.points).toHaveLength(4)
    expect(s.points[2]).toMatchObject({ x: 4, y: 60 })
  })

  it('honours `*N` multiplicity', () => {
    const s = parseShape('1:0;1,1*3')
    expect(s.points[1]).toMatchObject({ y: 1, z: 3 })
  })

  it('defaults length to 1 if no colon is given', () => {
    const s = parseShape('0,0;1,1')
    expect(s.length).toBe(1)
  })

  it('accepts a decimal y0 head value', () => {
    const s = parseShape('1:0.12')
    expect(s.points[0]).toMatchObject({ x: 0, y: 0.12 })
  })

  it('accepts a decimal y0 with integer length', () => {
    const s = parseShape('4:0.5;4,0')
    expect(s.length).toBe(4)
    expect(s.points[0]).toMatchObject({ x: 0, y: 0.5 })
  })
})

describe('renderShape', () => {
  it('returns an empty buffer for zero samples', () => {
    expect(renderShape(parseShape('1:0;1,1'), 0)).toHaveLength(0)
  })

  it('passes through endpoints', () => {
    const buf = renderShapeString('1:0;1,1', 64)
    expect(buf[0]).toBeCloseTo(0, 6)
    expect(buf[63]).toBeCloseTo(1, 6)
  })

  it('renders a single-point (zero-span) shape as a constant without infinite recursion', () => {
    // "1:0.12" has only y0=0.12 with no control points, so coordSpan=0.
    // scanBezier must be skipped or it recurses forever on x < max.
    const buf = renderShapeString('1:0.12', 8)
    expect(buf).toHaveLength(8)
    for (let i = 0; i < 8; i++) expect(buf[i]).toBeCloseTo(0.12, 6)
  })
})
