import { createEffect, onCleanup, type Component } from 'solid-js'

/**
 * Oscilloscope-style time-domain visualizer. Reads from the Player's
 * AnalyserNode each animation frame and draws the waveform to a canvas.
 * Falls back to a flat baseline whenever no audio is playing.
 */

export interface PlayerVisualizerProps {
  getAnalyser: () => AnalyserNode | null
  isPlaying: () => boolean
}

export const PlayerVisualizer: Component<PlayerVisualizerProps> = (props) => {
  let canvas: HTMLCanvasElement | undefined
  let rafId = 0
  let sampleBuf: Uint8Array<ArrayBuffer> | null = null

  function sizeCanvas(c: HTMLCanvasElement): [number, number] {
    const dpr = window.devicePixelRatio || 1
    const w = Math.max(1, Math.floor(c.clientWidth * dpr))
    const h = Math.max(1, Math.floor(c.clientHeight * dpr))
    if (c.width !== w) c.width = w
    if (c.height !== h) c.height = h
    return [w, h]
  }

  function drawFlat(): void {
    const c = canvas
    if (!c) return
    const [w, h] = sizeCanvas(c)
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = '#2a2a2a'
    ctx.lineWidth = Math.max(1, (window.devicePixelRatio || 1))
    ctx.beginPath()
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w, h / 2)
    ctx.stroke()
  }

  function drawFrame(): void {
    rafId = requestAnimationFrame(drawFrame)
    const a = props.getAnalyser()
    const c = canvas
    if (!a || !c) return
    const [w, h] = sizeCanvas(c)
    const ctx = c.getContext('2d')
    if (!ctx) return
    if (!sampleBuf || sampleBuf.length !== a.fftSize) {
      sampleBuf = new Uint8Array(new ArrayBuffer(a.fftSize))
    }
    a.getByteTimeDomainData(sampleBuf)
    ctx.clearRect(0, 0, w, h)
    ctx.lineWidth = Math.max(1, 2 * (window.devicePixelRatio || 1))
    ctx.strokeStyle = '#4a8df0'
    ctx.beginPath()
    const step = w / sampleBuf.length
    for (let i = 0; i < sampleBuf.length; i++) {
      const v = (sampleBuf[i]! - 128) / 128
      const x = i * step
      const y = h / 2 + v * (h / 2) * 0.9
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  createEffect(() => {
    if (props.isPlaying()) {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(drawFrame)
    } else {
      cancelAnimationFrame(rafId)
      drawFlat()
    }
  })

  onCleanup(() => cancelAnimationFrame(rafId))

  return <canvas ref={canvas} class="player-visualizer" />
}
