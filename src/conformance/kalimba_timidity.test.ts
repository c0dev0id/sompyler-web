/// <reference types="node" />
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { resetForTests } from '../storage/db'
import { loadInstrument } from '../parse/instrument'
import { compileInstrument } from '../synth/compile'
import { renderNote } from '../synth/sound_generator'
import { OXYGENE_KALIMBA } from '../defaults'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Parse a 16-bit PCM RIFF/WAVE file and return float32 samples + sample rate. */
function parseWavMono(buf: Buffer): { samples: Float32Array; sampleRate: number } {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const numChannels   = view.getUint16(22, true)
  const sampleRate    = view.getUint32(24, true)
  const bitsPerSample = view.getUint16(34, true)
  if (bitsPerSample !== 16) throw new Error(`Unsupported bits/sample: ${bitsPerSample}`)

  let offset = 12, dataOffset = -1, dataSize = 0
  while (offset < buf.length - 8) {
    const id = String.fromCharCode(buf[offset]!, buf[offset+1]!, buf[offset+2]!, buf[offset+3]!)
    const sz = view.getUint32(offset + 4, true)
    if (id === 'data') { dataOffset = offset + 8; dataSize = sz; break }
    offset += 8 + sz
  }
  if (dataOffset < 0) throw new Error('WAV: no data chunk found')

  const bytesPerFrame = numChannels * 2
  const numFrames     = Math.floor(dataSize / bytesPerFrame)
  const samples       = new Float32Array(numFrames)
  for (let i = 0; i < numFrames; i++) {
    samples[i] = view.getInt16(dataOffset + i * bytesPerFrame, true) / 32768
  }
  return { samples, sampleRate }
}

/**
 * Goertzel algorithm: amplitude at a single target frequency.
 * Avoids full FFT bin-snapping issues for known harmonic targets.
 */
function goertzelAmp(samples: Float32Array, sampleRate: number, hz: number): number {
  const N = samples.length
  const k = Math.round(N * hz / sampleRate)
  const omega = (2 * Math.PI * k) / N
  const coeff = 2 * Math.cos(omega)
  let s1 = 0, s2 = 0
  for (let i = 0; i < N; i++) {
    const s0 = samples[i]! + coeff * s1 - s2
    s2 = s1; s1 = s0
  }
  return Math.sqrt(s1 * s1 + s2 * s2 - coeff * s1 * s2) / N
}

/** Steady-state window: middle half of the note, avoiding attack and release. */
function steadyState(samples: Float32Array): Float32Array {
  const a = Math.floor(samples.length * 0.25)
  const b = Math.floor(samples.length * 0.75)
  return samples.slice(a, b)
}

// C4 fundamental: A4=440, C4 = 440 * 2^(-9/12).
const C4_HZ    = 440 * 2 ** (-9 / 12)   // ≈ 261.63 Hz
const DURATION = 2.0
const SR       = 44100

/**
 * Threshold for "spectral purity": any harmonic above H1 must be
 * below this fraction of H1 amplitude for the signal to be considered
 * a pure sine. TiMidity's rendered Kalimba shows < 1% at all harmonics;
 * we give sompyler a bit more room since additive synthesis is exact.
 */
const HARMONIC_PURITY_THRESHOLD = 0.05  // 5% of H1 = -26 dB

beforeEach(async () => {
  await resetForTests()
})

describe('conformance: kalimba vs TiMidity TimGM6mb', () => {
  /**
   * TiMidity's Kalimba.pat sustain loop sits at the decayed tail of the
   * sample (3.8ms at 96.5ms). By that point H2–H11 have all decayed to
   * < 1% of H1. This test verifies that:
   *   (a) the TiMidity fixture itself confirms the pure-sine character, and
   *   (b) sompyler's OXYGENE_KALIMBA matches that character.
   *
   * Refresh the fixture with:
   *   python3 scripts/gen_timidity_ref.py 108 60 2.0 \
   *     src/conformance/fixtures/kalimba_c4_timidity.wav
   */
  it('TiMidity fixture is a pure sine (H2–H11 < 5% of H1)', () => {
    const wavBuf = readFileSync(join(__dirname, 'fixtures/kalimba_c4_timidity.wav'))
    const { samples, sampleRate } = parseWavMono(wavBuf)
    expect(sampleRate).toBe(SR)

    const steady = steadyState(samples)
    const h1 = goertzelAmp(steady, SR, C4_HZ)
    expect(h1).toBeGreaterThan(0.001)  // signal is audible

    for (let h = 2; h <= 11; h++) {
      const amp   = goertzelAmp(steady, SR, C4_HZ * h)
      const ratio = amp / h1
      expect(ratio, `TiMidity H${h} = ${ratio.toFixed(4)} (should be < ${HARMONIC_PURITY_THRESHOLD})`
      ).toBeLessThan(HARMONIC_PURITY_THRESHOLD)
    }
  })

  it('sompyler OXYGENE_KALIMBA is a pure sine (H2–H11 < 5% of H1)', async () => {
    const instr  = await loadInstrument('kalimba', OXYGENE_KALIMBA)
    const spec   = compileInstrument(instr)
    const pcm    = renderNote({ instrument: spec, freqHz: C4_HZ, stress: 1, lengthSeconds: DURATION, sampleRate: SR })
    const steady = steadyState(pcm)
    const h1     = goertzelAmp(steady, SR, C4_HZ)
    expect(h1).toBeGreaterThan(0.001)

    for (let h = 2; h <= 11; h++) {
      const amp   = goertzelAmp(steady, SR, C4_HZ * h)
      const ratio = amp / h1
      expect(ratio, `sompyler H${h} = ${ratio.toFixed(4)} (should be < ${HARMONIC_PURITY_THRESHOLD})`
      ).toBeLessThan(HARMONIC_PURITY_THRESHOLD)
    }
  })

  it('sompyler sustain is flat (amplitude stable from 0.5 s to 1.5 s)', async () => {
    const instr  = await loadInstrument('kalimba', OXYGENE_KALIMBA)
    const spec   = compileInstrument(instr)
    const pcm    = renderNote({ instrument: spec, freqHz: C4_HZ, stress: 1, lengthSeconds: DURATION, sampleRate: SR })

    // RMS in 100ms windows
    function rmsWindow(start: number, end: number): number {
      const a = Math.round(start * SR), b = Math.round(end * SR)
      const chunk = pcm.slice(a, b)
      let sum = 0
      for (const s of chunk) sum += s * s
      return Math.sqrt(sum / chunk.length)
    }

    const rms05 = rmsWindow(0.5, 0.6)
    const rms15 = rmsWindow(1.5, 1.6)

    // Sustain should be within 2 dB over the held note.
    const ratio = Math.max(rms05, rms15) / Math.min(rms05, rms15)
    expect(ratio, `sustain amplitude drift ${ratio.toFixed(3)} (should be < 1.26)`).toBeLessThan(1.26)
  })
})
