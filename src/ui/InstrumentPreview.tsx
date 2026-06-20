import { createEffect, onCleanup, type Component } from 'solid-js'
import { loadInstrument } from '../parse/instrument'
import { compileInstrument } from '../synth/compile'
import { renderNote } from '../synth/sound_generator'

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
    ctx.lineWidth = Math.max(1, window.devicePixelRatio || 1)
    ctx.strokeStyle = '#4a8df0'
    ctx.beginPath()
    const step = w / samples.length
    for (let i = 0; i < samples.length; i++) {
      const v = samples[i]!
      const x = i * step
      const y = h / 2 + v * (h / 2) * 0.9
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
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
        const samples = renderNote({
          instrument: spec,
          freqHz: 440,
          stress: 1,
          lengthSeconds: 2.5,
          dampSeconds: 0.5,
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
