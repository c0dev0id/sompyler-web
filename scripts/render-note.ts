/**
 * render-note.ts — render a single Sompyler instrument note to a WAV file.
 *
 * Usage:
 *   npx vite-node scripts/render-note.ts <instrument-yaml> <midi-note> <duration-s> <out.wav>
 *
 * Example (B4 = MIDI 71, 2 s):
 *   npx vite-node scripts/render-note.ts "oscillator: saw
 *   envelope:
 *     attack: 0.005
 *     release: 0.06
 *     sustainLevel: 0.92" 71 2 /tmp/lead_sompyler.wav
 */

import fs from 'node:fs'
import { loadInstrument } from '../src/parse/instrument'
import { compileInstrument } from '../src/synth/compile'
import { renderNote } from '../src/synth/sound_generator'

const SAMPLE_RATE = 44100

function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

function writeWav(path: string, samples: Float32Array, sampleRate: number): void {
  const numSamples = samples.length
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8
  const blockAlign = (numChannels * bitsPerSample) / 8
  const dataSize = numSamples * blockAlign
  const buf = Buffer.alloc(44 + dataSize)

  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataSize, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)              // PCM
  buf.writeUInt16LE(numChannels, 22)
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(byteRate, 28)
  buf.writeUInt16LE(blockAlign, 32)
  buf.writeUInt16LE(bitsPerSample, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(dataSize, 40)

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]!))
    buf.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2)
  }

  fs.writeFileSync(path, buf)
}

async function main() {
  // Optional 5th arg: dampSeconds (release tail after note-off)
  const [yamlStr, midiNoteStr, durationStr, outPath, dampStr] = process.argv.slice(2)
  if (!yamlStr || !midiNoteStr || !durationStr || !outPath) {
    console.error('Usage: render-note.ts <yaml> <midi-note> <duration-s> <out.wav> [damp-s]')
    process.exit(1)
  }

  const midiNote = parseInt(midiNoteStr, 10)
  const durationSec = parseFloat(durationStr)
  const dampSeconds = dampStr ? parseFloat(dampStr) : 0
  const freqHz = midiToHz(midiNote)

  const instrument = await loadInstrument('render', yamlStr)
  const spec = compileInstrument(instrument)

  const samples = renderNote({
    instrument: spec,
    freqHz,
    stress: 1.0,
    lengthSeconds: durationSec,
    dampSeconds,
    sampleRate: SAMPLE_RATE,
  })

  writeWav(outPath, samples, SAMPLE_RATE)
  console.log(`Wrote ${samples.length} samples (${durationSec}s @ ${SAMPLE_RATE}Hz) → ${outPath}`)
  console.log(`  pitch: MIDI ${midiNote} = ${freqHz.toFixed(2)} Hz`)
}

main().catch((e) => { console.error(e); process.exit(1) })
