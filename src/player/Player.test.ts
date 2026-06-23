import { describe, it, expect, vi } from 'vitest'
import { Player } from './Player'
import type { MixResult } from '../render/mix'

class FakeBufferSource {
  buffer: AudioBuffer | null = null
  loop = false
  loopStart = 0
  loopEnd = 0
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
    // A brand-new source must be created on the second buffer (otherwise
    // the player would simply stop dead after the swap).
    const newSource = ctx.lastSource
    expect(newSource).not.toBe(firstSource)
    expect(newSource?.start).toHaveBeenCalledWith(0, 0)
  })

  it('clearBuffer returns to empty', () => {
    const ctx = new FakeAudioContext()
    const p = new Player(() => ctx as unknown as AudioContext)
    p.loadBuffer(makeMix())
    p.clearBuffer()
    expect(p.getState()).toBe('empty')
  })

  it('getDuration returns 0 when empty and buffer duration when loaded', () => {
    const ctx = new FakeAudioContext()
    const p = new Player(() => ctx as unknown as AudioContext)
    expect(p.getDuration()).toBe(0)
    p.loadBuffer(makeMix(44100))   // 1 s at 44100 Hz
    expect(p.getDuration()).toBeCloseTo(1, 4)
  })

  it('getPosition returns 0 when not playing', () => {
    const ctx = new FakeAudioContext()
    const p = new Player(() => ctx as unknown as AudioContext)
    p.loadBuffer(makeMix(44100))
    expect(p.getPosition()).toBe(0)
  })

  it('seek clamps to buffer bounds and resumes if playing', () => {
    const ctx = new FakeAudioContext()
    const p = new Player(() => ctx as unknown as AudioContext)
    p.loadBuffer(makeMix(44100))
    p.seek(0.5)
    expect(p.getPosition()).toBeCloseTo(0.5, 4)
    p.play()
    p.seek(0.25)
    expect(p.getPosition()).toBeCloseTo(0.25, 4)
    expect(p.getState()).toBe('playing')
    p.seek(999)   // past end — clamps
    expect(p.getPosition()).toBeCloseTo(1, 4)
  })

  it('setLoopPoints applies to source immediately', () => {
    const ctx = new FakeAudioContext()
    const p = new Player(() => ctx as unknown as AudioContext)
    p.loadBuffer(makeMix(44100))
    p.play()
    p.setLoopPoints(0.2, 0.8)
    expect(ctx.lastSource?.loopStart).toBeCloseTo(0.2, 4)
    expect(ctx.lastSource?.loopEnd).toBeCloseTo(0.8, 4)
    expect(p.getLoopPoints()).toEqual({ start: 0.2, end: 0.8 })
  })

  it('loop points survive a buffer swap clamped to new duration', () => {
    const ctx = new FakeAudioContext()
    const p = new Player(() => ctx as unknown as AudioContext)
    p.loadBuffer(makeMix(44100 * 10))   // 10 s
    p.setLoopPoints(3, 8)
    p.loadBuffer(makeMix(44100 * 5))    // new buffer is 5 s
    const pts = p.getLoopPoints()
    expect(pts.start).toBeCloseTo(3, 4)
    expect(pts.end).toBeCloseTo(5, 1)   // clamped to new duration
  })

  it('startSource propagates loopStart/loopEnd to the new source node', () => {
    const ctx = new FakeAudioContext()
    const p = new Player(() => ctx as unknown as AudioContext)
    p.loadBuffer(makeMix(44100))
    p.setLoopPoints(0.1, 0.9)
    p.play()
    expect(ctx.lastSource?.loopStart).toBeCloseTo(0.1, 4)
    expect(ctx.lastSource?.loopEnd).toBeCloseTo(0.9, 4)
  })

  it('resetLoopPoints clears both markers', () => {
    const ctx = new FakeAudioContext()
    const p = new Player(() => ctx as unknown as AudioContext)
    p.loadBuffer(makeMix(44100))
    p.setLoopPoints(0.2, 0.8)
    p.play()
    p.resetLoopPoints()
    expect(p.getLoopPoints()).toEqual({ start: 0, end: 0 })
    expect(ctx.lastSource?.loopStart).toBe(0)
    expect(ctx.lastSource?.loopEnd).toBe(0)
  })

  it('setLoopPoints seeks to new start when position is before it', () => {
    const ctx = new FakeAudioContext()
    const p = new Player(() => ctx as unknown as AudioContext)
    p.loadBuffer(makeMix(44100 * 10))  // 10s
    p.seek(3)
    p.play()
    // position is at 3s (elapsed=0 returns pausedAt); move start to 5s
    p.setLoopPoints(5, 9)
    expect(p.getPosition()).toBeCloseTo(5, 4)
  })

  it('setLoopPoints seeks to loopStart when position is past new end (loop on)', () => {
    const ctx = new FakeAudioContext()
    const p = new Player(() => ctx as unknown as AudioContext)
    p.loadBuffer(makeMix(44100 * 10))
    p.setLoop(true)
    p.seek(7)
    p.play()
    // position at 7s; shrink end to 5s → should loop back to start (2s)
    p.setLoopPoints(2, 5)
    expect(p.getPosition()).toBeCloseTo(2, 4)
  })

  it('setLoopPoints stops when position is past new end (loop off)', () => {
    const ctx = new FakeAudioContext()
    const p = new Player(() => ctx as unknown as AudioContext)
    p.loadBuffer(makeMix(44100 * 10))
    p.setLoop(false)
    p.seek(7)
    p.play()
    // position at 7s; shrink end to 5s → should stop
    p.setLoopPoints(2, 5)
    expect(p.getState()).toBe('stopped')
  })
})
