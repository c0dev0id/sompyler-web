import { createEffect, onCleanup, type Component } from 'solid-js'
import { loadInstrument } from '../parse/instrument'
import { compileInstrument } from '../synth/compile'
import { renderNote } from '../synth/sound_generator'
import { DEFAULT_ENVELOPE } from '../synth/envelope'

interface InstrumentPreviewProps {
  name: () => string | null
  body: () => string | null
}

export const InstrumentPreview: Component<InstrumentPreviewProps> = (props) => {
  let canvas: HTMLCanvasElement | undefined
  let labelEl: HTMLSpanElement | undefined
  let currentRun = 0

  function sizeCanvas(c: HTMLCanvasElement): [number, number] {
    const dpr = window.devicePixelRatio || 1
    const w = Math.max(1, Math.floor(c.clientWidth * dpr))
    const h = Math.max(1, Math.floor(c.clientHeight * dpr))
    if (c.width !== w) c.width = w
    if (c.height !== h) c.height = h
    return [w, h]
  }

  function drawWaveform(samples: Float32Array): void {
    const c = canvas
    if (!c) return
    const [w, h] = sizeCanvas(c)
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#4a8df0'
    const n = samples.length
    const halfH = (h / 2) * 0.9
    for (let px = 0; px < w; px++) {
      const start = Math.floor((px * n) / w)
      const end = Math.max(start + 1, Math.floor(((px + 1) * n) / w))
      let peak = 0
      for (let i = start; i < end; i++) {
        const abs = Math.abs(samples[i]!)
        if (abs > peak) peak = abs
      }
      const barH = Math.max(1, peak * halfH * 2)
      ctx.fillRect(px, h / 2 - barH / 2, 1, barH)
    }
  }

  function clearCanvas(): void {
    const c = canvas
    if (!c) return
    const [w, h] = sizeCanvas(c)
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, w, h)
  }

  createEffect(() => {
    const name = props.name()
    const body = props.body()
    const run = ++currentRun

    if (!name || !body) {
      clearCanvas()
      if (labelEl) labelEl.textContent = ''
      return
    }

    void (async () => {
      try {
        const instr = await loadInstrument(name, body)
        if (run !== currentRun) return
        const spec = compileInstrument(instr)
        const env = spec.envelope ?? DEFAULT_ENVELOPE
        const sustainHold = Math.max(0.05, env.attack * 0.5)
        const totalSeconds = env.attack + sustainHold + env.release
        const samples = renderNote({
          instrument: spec,
          freqHz: 440,
          stress: 1,
          lengthSeconds: totalSeconds,
          dampSeconds: 0,
        })
        if (run !== currentRun) return
        drawWaveform(samples)
        if (labelEl) labelEl.textContent = name
      } catch {
        if (run !== currentRun) return
        clearCanvas()
        if (labelEl) labelEl.textContent = 'No preview'
      }
    })()
  })

  onCleanup(() => { currentRun++ })

  return (
    <div class="instrument-preview">
      <span class="preview-label" ref={labelEl} />
      <canvas ref={canvas} />
    </div>
  )
}
