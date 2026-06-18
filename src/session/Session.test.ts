import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRoot } from 'solid-js'
import { resetForTests } from '../storage/db'
import { putFile } from '../storage/files'
import { Session } from './Session'

const SCORE = `title: t
stage:
  piano: 1|1 0 dev/piano
---
_meta:
  ticks_per_minute: 60
  stress_pattern: "1"
  lower_stress_bound: 100
  upper_stress_bound: 100
piano:
  0: A4 1
`

const PIANO = `oscillator: sin
partials:
  - { freqMult: 1, amp: 0.5 }
`

class FakeAudioContext {
  destination = {}
  state = 'running'
  currentTime = 0
  resume = vi.fn(async () => undefined)
  createBuffer(channels: number, length: number, rate: number) {
    const data = Array.from({ length: channels }, () => new Float32Array(length))
    return {
      duration: length / rate,
      sampleRate: rate,
      getChannelData: (i: number) => data[i]!,
    } as unknown as AudioBuffer
  }
  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      onended: null,
      start: vi.fn(),
      stop: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as AudioBufferSourceNode
  }
}

beforeEach(async () => {
  await resetForTests()
  await putFile({ name: 'starter', ext: 'spls', body: SCORE, inProject: true })
  await putFile({ name: 'dev/piano', ext: 'spli', body: PIANO, inProject: true })
})

describe('Session', () => {
  it('starts in idle status with no buffer', () => {
    createRoot(() => {
      const s = new Session(() => new FakeAudioContext() as unknown as AudioContext)
      expect(s.editLock()).toBe(false)
      expect(s.renderStatus().state).toBe('idle')
      expect(s.currentBuffer()).toBeNull()
    })
  })

  it('surfaces errors via renderStatus', async () => {
    await new Promise<void>((done) =>
      createRoot(async (dispose) => {
        const s = new Session(() => new FakeAudioContext() as unknown as AudioContext)
        // Force an error: remove the score so loadProject() fails.
        await resetForTests()
        await s.startRender()
        expect(s.renderStatus().state).toBe('error')
        expect(s.renderStatus().errorMessage).toMatch(/score/i)
        expect(s.editLock()).toBe(false)
        dispose()
        done()
      }),
    )
  })

  it('clearError resets to idle', async () => {
    await new Promise<void>((done) =>
      createRoot(async (dispose) => {
        const s = new Session(() => new FakeAudioContext() as unknown as AudioContext)
        await resetForTests()
        await s.startRender()
        expect(s.renderStatus().state).toBe('error')
        s.clearError()
        expect(s.renderStatus().state).toBe('idle')
        dispose()
        done()
      }),
    )
  })
})
