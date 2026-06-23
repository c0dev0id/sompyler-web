/**
 * render_spli.ts — Render a .spli instrument file to a WAV via vite-node.
 *
 * Usage:
 *   node_modules/.bin/vite-node render_spli.ts SPLI_FILE FREQ_HZ DURATION_S OUT_WAV [DAMP_S]
 *
 * SPLI_FILE  — path to .spli YAML file
 * FREQ_HZ    — note frequency in Hz (e.g. 261.63 for C4)
 * DURATION_S — note-on duration in seconds (release tail added via DAMP_S)
 * OUT_WAV    — output .wav file path
 * DAMP_S     — optional release tail in seconds (default 2.0)
 */

import jsyaml from 'js-yaml'
import { readFileSync, writeFileSync } from 'node:fs'
import { compileInstrument } from './src/synth/compile.ts'
import { renderNote } from './src/synth/sound_generator.ts'

const [spliFile, freqArg, durArg, outFile, dampArg] = process.argv.slice(2)

if (!spliFile || !freqArg || !durArg || !outFile) {
  console.error('Usage: render_spli.ts SPLI_FILE FREQ_HZ DURATION_S OUT_WAV [DAMP_S]')
  process.exit(1)
}

const body = readFileSync(spliFile, 'utf-8')
const parsed = jsyaml.load(body)
const spec = compileInstrument({ name: 'test', body, hash: '', parsed })

const freqHz      = parseFloat(freqArg)
const durationS   = parseFloat(durArg)
const dampSeconds = parseFloat(dampArg ?? '2.0')
const sampleRate  = 44100

const samples = renderNote({
  instrument: spec,
  freqHz,
  stress: 1.0,
  lengthSeconds: durationS,
  dampSeconds,
  sampleRate,
})

// Write 16-bit mono PCM WAV
const n   = samples.length
const buf = Buffer.alloc(44 + n * 2)
buf.write('RIFF', 0, 'ascii')
buf.writeUInt32LE(36 + n * 2, 4)
buf.write('WAVE', 8, 'ascii')
buf.write('fmt ', 12, 'ascii')
buf.writeUInt32LE(16, 16)
buf.writeUInt16LE(1,  20)            // PCM
buf.writeUInt16LE(1,  22)            // mono
buf.writeUInt32LE(sampleRate, 24)
buf.writeUInt32LE(sampleRate * 2, 28)
buf.writeUInt16LE(2,  32)            // block align
buf.writeUInt16LE(16, 34)            // bits per sample
buf.write('data', 36, 'ascii')
buf.writeUInt32LE(n * 2, 40)
for (let i = 0; i < n; i++) {
  const v = Math.max(-1, Math.min(1, samples[i]!))
  buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2)
}
writeFileSync(outFile, buf)
console.error(`Wrote ${n} samples (${(n / sampleRate).toFixed(2)}s) → ${outFile}`)
