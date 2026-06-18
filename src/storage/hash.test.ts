import { describe, it, expect } from 'vitest'
import { sha256, canonicalJSON, noteCacheKey } from './hash'

describe('sha256', () => {
  it('produces stable hex output for the empty string', async () => {
    expect(await sha256('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
  })

  it('is deterministic', async () => {
    const a = await sha256('foo')
    const b = await sha256('foo')
    expect(a).toBe(b)
  })

  it('separates distinct inputs', async () => {
    const a = await sha256('foo')
    const b = await sha256('bar')
    expect(a).not.toBe(b)
  })
})

describe('canonicalJSON', () => {
  it('sorts object keys', () => {
    expect(canonicalJSON({ b: 1, a: 2 })).toBe('{"a":2,"b":1}')
  })

  it('handles nested objects', () => {
    const out = canonicalJSON({ a: { y: 1, x: 2 }, b: [3, { d: 4, c: 5 }] })
    expect(out).toBe('{"a":{"x":2,"y":1},"b":[3,{"c":5,"d":4}]}')
  })

  it('is stable across key order permutations', () => {
    const a = canonicalJSON({ a: 1, b: 2, c: 3 })
    const b = canonicalJSON({ c: 3, a: 1, b: 2 })
    expect(a).toBe(b)
  })
})

describe('noteCacheKey', () => {
  const base = {
    instrumentHash: 'abc123',
    frequencyHz: 440,
    stress: 1,
    lengthSeconds: 0.5,
    properties: {},
  }

  it('is identical for identical inputs', async () => {
    expect(await noteCacheKey(base)).toBe(await noteCacheKey(base))
  })

  it('differs when frequency changes', async () => {
    const other = await noteCacheKey({ ...base, frequencyHz: 220 })
    expect(other).not.toBe(await noteCacheKey(base))
  })

  it('differs when instrumentHash changes', async () => {
    const other = await noteCacheKey({ ...base, instrumentHash: 'def456' })
    expect(other).not.toBe(await noteCacheKey(base))
  })

  it('canonicalises properties', async () => {
    const a = await noteCacheKey({ ...base, properties: { p: 1, q: 2 } })
    const b = await noteCacheKey({ ...base, properties: { q: 2, p: 1 } })
    expect(a).toBe(b)
  })
})
