import { describe, it, expect, beforeEach } from 'vitest'
import { log, snapshot, setThreshold } from './debug'

describe('debug logger', () => {
  beforeEach(() => {
    setThreshold('*', 'trace')
  })

  it('records entries in the ring buffer', () => {
    log('parse', 'info', 'hello')
    const entries = snapshot()
    expect(entries.length).toBeGreaterThan(0)
    const last = entries[entries.length - 1]
    expect(last?.category).toBe('parse')
    expect(last?.message).toBe('hello')
  })

  it('filters by threshold', () => {
    setThreshold('render', 'warn')
    const before = snapshot().length
    log('render', 'debug', 'should be dropped')
    expect(snapshot().length).toBe(before)
    log('render', 'warn', 'should be kept')
    expect(snapshot().length).toBe(before + 1)
  })
})
