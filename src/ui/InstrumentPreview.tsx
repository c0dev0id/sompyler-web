import { createEffect, createSignal, onCleanup, type Component } from 'solid-js'
import { loadInstrument } from '../parse/instrument'
import { compileInstrument } from '../synth/compile'
import { renderNote } from '../synth/sound_generator'
import { DEFAULT_ENVELOPE, type EnvelopeSpec } from '../synth/envelope'
import { parseShape } from '../synth/shape'
import { DEFAULT_SAMPLE_RATE } from '../synth/constants'

const PREVIEW_DAMP_SECONDS = 2

function previewTiming(env: EnvelopeSpec): { lengthSeconds: number; dampSeconds: number } {
  // Plucked instruments encode their character in the S: decay shape; preview
  // must hold note-on long enough to traverse it, or you only hear the attack.
  let decayLen = 0
  if (env.decayShape) {
    try { decayLen = parseShape(env.decayShape).length } catch { /* ignore malformed */ }
  }
  const sustainHold = Math.max(0.05, env.attack * 0.5, decayLen)
  return {
    lengthSeconds: env.attack + sustainHold + env.release,
    dampSeconds: PREVIEW_DAMP_SECONDS,
  }
}

interface InstrumentPreviewProps {
  name: () => string | null
  body: () => string | null
  /** Called at play-time to get the current pitch from the score. */
  resolveHz: () => Promise<number>
}

export const InstrumentPreview: Component<InstrumentPreviewProps> = (props) => {
  let canvas: HTMLCanvasElement | undefined
  let labelEl: HTMLSpanElement | undefined
  let currentRun = 0
  let lastSamples: Float32Array | null = null
  let lastHz = 440
  let lastSpec: ReturnType<typeof compileInstrument> | null = null
  let audioCtx: AudioContext | null = null
  let currentSource: AudioBufferSourceNode | null = null

  const [isPlaying, setIsPlaying] = createSignal(false)
  const [hasSamples, setHasSamples] = createSignal(false)

  function stop(): void {
    if (currentSource) {
      currentSource.onended = null
      try { currentSource.stop() } catch { /* already ended */ }
      currentSource = null
    }
    setIsPlaying(false)
  }

  function playBuffer(samples: Float32Array): void {
    stop()
    if (!audioCtx || audioCtx.state === 'closed') audioCtx = new AudioContext()
    const ctx = audioCtx
    const buf = ctx.createBuffer(1, samples.length, DEFAULT_SAMPLE_RATE)
    buf.copyToChannel(new Float32Array(samples), 0)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.onended = () => setIsPlaying(false)
    src.start()
    currentSource = src
    setIsPlaying(true)
  }

  async function play(): Promise<void> {
    const name = props.name()
    if (!name || !lastSpec) return

    const hz = await props.resolveHz()

    // Re-render if the pitch changed since the last render.
    if (Math.abs(hz - lastHz) > 0.5 || !lastSamples) {
      lastHz = hz
      const spec = lastSpec
      const env = spec.envelope ?? DEFAULT_ENVELOPE
      const { lengthSeconds, dampSeconds } = previewTiming(env)
      const samples = renderNote({ instrument: spec, freqHz: hz, stress: 1, lengthSeconds, dampSeconds })
      lastSamples = samples
      drawWaveform(samples)
    }

    if (lastSamples) playBuffer(lastSamples)
  }

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

    stop()
    lastSamples = null
    lastSpec = null
    setHasSamples(false)

    if (!name || !body) {
      clearCanvas()
      if (labelEl) labelEl.textContent = ''
      return
    }

    void (async () => {
      try {
        const [instr, hz] = await Promise.all([loadInstrument(name, body), props.resolveHz()])
        if (run !== currentRun) return
        lastHz = hz
        const spec = compileInstrument(instr)
        lastSpec = spec
        const env = spec.envelope ?? DEFAULT_ENVELOPE
        const { lengthSeconds, dampSeconds } = previewTiming(env)
        const samples = renderNote({ instrument: spec, freqHz: lastHz, stress: 1, lengthSeconds, dampSeconds })
        if (run !== currentRun) return
        lastSamples = samples
        setHasSamples(true)
        drawWaveform(samples)
        if (labelEl) labelEl.textContent = name
      } catch {
        if (run !== currentRun) return
        clearCanvas()
        if (labelEl) labelEl.textContent = 'No preview'
      }
    })()
  })

  onCleanup(() => {
    currentRun++
    stop()
    void audioCtx?.close()
  })

  return (
    <div class="instrument-preview">
      <div class="preview-header">
        <span class="preview-label" ref={labelEl} />
        <button
          class="preview-play"
          onClick={() => (isPlaying() ? stop() : void play())}
          disabled={!hasSamples()}
        >
          {isPlaying() ? '■' : '▶'}
        </button>
      </div>
      <canvas ref={canvas} />
    </div>
  )
}
