import { describe, it, expect, vi } from 'vitest'
import { Player } from './Player'
import type { MixResult } from '../render/mix'

class FakeBufferSource {
  buffer: AudioBuffer | null = null
  loop = false
  onended: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn()
  connect = vi.fn()
  disconnect = vi.fn()
}

class FakeAudioBuffer {
  private channels: Float32Array[]
  duration: number
  constructor(numChannels: number, length: number, public sampleRate: number) {
    this.channels = Array.from({ length: numChannels }, () => new Float32Array(length))
    this.duration = length / sampleRate
  }
  getChannelData(i: number): Float32Array {
    return this.channels[i]!
  }
}

class FakeAudioContext {
  destination = {} as AudioDestinationNode
  state: 'suspended' | 'running' = 'running'
  currentTime = 0
  lastSource: FakeBufferSource | null = null
  resume = vi.fn(async () => {
    this.state = 'running'
  })
  createBuffer(numChannels: number, length: number, sampleRate: number): AudioBuffer {
    return new FakeAudioBuffer(numChannels, length, sampleRate) as unknown as AudioBuffer
  }
  createBufferSource(): AudioBufferSourceNode {
    const node = new FakeBufferSource()
    this.lastSource = node
    return node as unknown as AudioBufferSourceNode
  }
}

function makeMix(lengthSamples = 100): MixResult {
  return {
    sampleRate: 44100,
    lengthSamples,
    left: new Float32Array(lengthSamples),
    right: new Float32Array(lengthSamples),
  }
}

describe('Player', () => {
  it('starts in the empty state', () => {
    const p = new Player(() => new FakeAudioContext() as unknown as AudioContext)
    expect(p.getState()).toBe('empty')
  })

  it('transitions to stopped when a buffer is loaded', () => {
    const p = new Player(() => new FakeAudioContext() as unknown as AudioContext)
    p.loadBuffer(makeMix())
    expect(p.getState()).toBe('stopped')
  })

  it('plays then pauses then resumes', () => {
    const ctx = new FakeAudioContext()
    const p = new Player(() => ctx as unknown as AudioContext)
    p.loadBuffer(makeMix())
    p.play()
    expect(p.getState()).toBe('playing')
    expect(ctx.lastSource?.start).toHaveBeenCalled()
    ctx.currentTime = 0.5
    p.pause()
    expect(p.getState()).toBe('paused')
    expect(ctx.lastSource?.stop).toHaveBeenCalled()
    p.play()
    expect(p.getState()).toBe('playing')
  })

  it('stops resets pausedAt and creates no source until play', () => {
    const ctx = new FakeAudioContext()
    const p = new Player(() => ctx as unknown as AudioContext)
    p.loadBuffer(makeMix())
    p.play()
    p.stop()
    expect(p.getState()).toBe('stopped')
  })

  it('notifies state listeners', () => {
    const ctx = new FakeAudioContext()
    const p = new Player(() => ctx as unknown as AudioContext)
    const fn = vi.fn()
    p.onStateChange(fn)
    p.loadBuffer(makeMix())
    p.play()
    expect(fn).toHaveBeenCalledWith('stopped')
    expect(fn).toHaveBeenCalledWith('playing')
  })

  it('loop toggle defaults to on and propagates to the next source', () => {
    const ctx = new FakeAudioContext()
    const p = new Player(() => ctx as unknown as AudioContext)
    expect(p.isLoopEnabled()).toBe(true)
    p.loadBuffer(makeMix())
    p.play()
    expect(ctx.lastSource?.loop).toBe(true)
    p.setLoop(false)
    expect(ctx.lastSource?.loop).toBe(false)
  })

  it('swapping the buffer while playing restarts from the top', () => {
    const ctx = new FakeAudioContext()
    const p = new Player(() => ctx as unknown as AudioContext)
    p.loadBuffer(makeMix())
    p.play()
    const firstSource = ctx.lastSource
    p.loadBuffer(makeMix(200))
    expect(firstSource?.stop).toHaveBeenCalled()
    expect(p.getState()).toBe('playing')
    expect(ctx.lastSource?.start).toHaveBeenCalledWith(0, 0)
  })

  it('clearBuffer returns to empty', () => {
    const ctx = new FakeAudioContext()
    const p = new Player(() => ctx as unknown as AudioContext)
    p.loadBuffer(makeMix())
    p.clearBuffer()
    expect(p.getState()).toBe('empty')
  })
})
