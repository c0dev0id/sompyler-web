import { log } from '../debug'
import type { MixResult } from '../render/mix'

/**
 * Phase 5 / R7: the Player domain. Owns a single `AudioContext` and the
 * currently-loaded stereo `AudioBuffer`. Transport = play / pause / stop +
 * loop toggle.
 *
 * Source nodes are single-use: each `start()` constructs a fresh
 * `AudioBufferSourceNode` from the current buffer.
 *
 * The `AudioContext` is supplied by a factory (constructed lazily on first
 * user gesture to satisfy autoplay policy). In tests the factory returns a
 * mock — we never touch a real audio context outside the browser.
 */

export type TransportState = 'empty' | 'stopped' | 'playing' | 'paused'

export interface AudioContextFactory {
  (): AudioContext
}

export class Player {
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private buffer: AudioBuffer | null = null
  private source: AudioBufferSourceNode | null = null
  private pausedAt = 0
  private startedAt = 0
  private loopEnabled = true
  private loopStart = 0   // seconds; 0 = beginning of buffer
  private loopEnd = 0     // seconds; 0 = end of buffer (Web Audio API default)
  private state: TransportState = 'empty'
  private listeners = new Set<(s: TransportState) => void>()

  constructor(private readonly factory: AudioContextFactory) {}

  /** Used by the visualizer. Null until an AudioContext has been built. */
  getAnalyser(): AnalyserNode | null {
    return this.analyser
  }

  onStateChange(fn: (s: TransportState) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getState(): TransportState {
    return this.state
  }

  setLoop(enabled: boolean): void {
    this.loopEnabled = enabled
    if (this.source) {
      this.source.loop = enabled
      if (enabled) {
        this.source.loopStart = this.loopStart
        this.source.loopEnd = this.loopEnd
      }
    }
  }

  isLoopEnabled(): boolean {
    return this.loopEnabled
  }

  setLoopPoints(start: number, end: number): void {
    const dur = this.buffer?.duration ?? Infinity
    this.loopStart = Math.max(0, Math.min(start, dur))
    this.loopEnd = end <= 0 ? 0 : Math.min(end, dur)
    if (this.source) {
      this.source.loopStart = this.loopStart
      this.source.loopEnd = this.loopEnd
    }
  }

  getLoopPoints(): { start: number; end: number } {
    return { start: this.loopStart, end: this.loopEnd }
  }

  getDuration(): number {
    return this.buffer?.duration ?? 0
  }

  getPosition(): number {
    if (!this.buffer) return 0
    if (this.state !== 'playing' || !this.ctx) return this.pausedAt
    const elapsed = this.ctx.currentTime - this.startedAt
    if (elapsed === 0) return this.pausedAt
    if (this.loopEnabled) {
      const end = this.loopEnd > 0 ? this.loopEnd : this.buffer.duration
      const len = end - this.loopStart
      if (len <= 0) return this.loopStart
      return this.loopStart + ((this.pausedAt - this.loopStart + elapsed) % len)
    }
    return Math.min(this.pausedAt + elapsed, this.buffer.duration)
  }

  seek(t: number): void {
    if (!this.buffer) return
    const clamped = Math.max(0, Math.min(t, this.buffer.duration))
    const wasPlaying = this.state === 'playing'
    if (wasPlaying) this.stopSource()
    this.pausedAt = clamped
    if (wasPlaying) this.startSource(this.pausedAt)
  }

  /** Lazily build the AudioContext on first use (gesture-driven). */
  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = this.factory()
      if (typeof this.ctx.createAnalyser === 'function') {
        this.analyser = this.ctx.createAnalyser()
        this.analyser.fftSize = 2048
        this.analyser.connect(this.ctx.destination)
      }
    }
    return this.ctx
  }

  /**
   * Swap the loaded audio. Called by Session when a render completes (R3).
   * Restarts from the top if currently playing (per R7).
   */
  loadBuffer(mix: MixResult): void {
    const ctx = this.ensureCtx()
    const buf = ctx.createBuffer(2, mix.lengthSamples, mix.sampleRate)
    buf.getChannelData(0).set(mix.left)
    buf.getChannelData(1).set(mix.right)
    // Clamp loop points to the new duration; preserve them across renders.
    const dur = buf.duration
    if (this.loopEnd > 0) this.loopEnd = Math.min(this.loopEnd, dur)
    this.loopStart = Math.max(0, Math.min(this.loopStart, (this.loopEnd > 0 ? this.loopEnd : dur) - 0.01))
    const wasPlaying = this.state === 'playing'
    this.stopSource()
    this.buffer = buf
    this.pausedAt = 0
    // Land in 'stopped' first so the subsequent play() doesn't short-circuit
    // on the `state === 'playing'` guard. R7: swap-while-playing restarts
    // from offset 0 with a brand-new source.
    this.transition('stopped')
    log('player', 'info', `Buffer loaded`, {
      sampleRate: mix.sampleRate,
      lengthSamples: mix.lengthSamples,
    })
    if (wasPlaying) this.play()
  }

  /** Clear the buffer entirely; transitions to 'empty'. */
  clearBuffer(): void {
    this.stopSource()
    this.buffer = null
    this.pausedAt = 0
    this.transition('empty')
  }

  play(): void {
    if (!this.buffer) return
    if (this.state === 'playing') return
    const ctx = this.ensureCtx()
    if (ctx.state === 'suspended') void ctx.resume()
    this.startSource(this.pausedAt)
    this.transition('playing')
  }

  pause(): void {
    if (this.state !== 'playing' || !this.ctx) return
    const elapsed = this.ctx.currentTime - this.startedAt
    if (this.loopEnabled && this.buffer) {
      const end = this.loopEnd > 0 ? this.loopEnd : this.buffer.duration
      const len = end - this.loopStart
      this.pausedAt = len > 0
        ? this.loopStart + ((this.pausedAt - this.loopStart + elapsed) % len)
        : this.loopStart
    } else {
      this.pausedAt = Math.min(this.pausedAt + elapsed, this.buffer?.duration ?? 0)
    }
    this.stopSource()
    this.transition('paused')
  }

  stop(): void {
    this.stopSource()
    this.pausedAt = 0
    if (this.buffer) this.transition('stopped')
  }

  private startSource(offset: number): void {
    if (!this.buffer || !this.ctx) return
    const node = this.ctx.createBufferSource()
    node.buffer = this.buffer
    node.loop = this.loopEnabled
    node.loopStart = this.loopStart
    node.loopEnd = this.loopEnd
    node.connect(this.analyser ?? this.ctx.destination)
    node.start(0, offset)
    node.onended = () => {
      if (this.source === node && !this.loopEnabled) {
        this.pausedAt = 0
        this.transition('stopped')
      }
    }
    this.source = node
    this.startedAt = this.ctx.currentTime
  }

  private stopSource(): void {
    if (this.source) {
      try {
        this.source.stop()
      } catch {
        // double-stop is harmless
      }
      this.source.disconnect()
      this.source = null
    }
  }

  private transition(next: TransportState): void {
    if (this.state === next) return
    this.state = next
    for (const fn of this.listeners) fn(next)
  }
}
