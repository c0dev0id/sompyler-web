/**
 * balance-mix.ts — measure per-voice effective RMS in the Sandstorm mix and
 * suggest amp multipliers to reach target balance.
 *
 * Renders 2 bars (32 ticks at 136 BPM) of each voice's actual repeating
 * pattern, with all notes overlapping exactly as they would in the final mix.
 * This captures the compounding of long releases (e.g. a 1 s sine lead with
 * 16 notes/bar has ~10 notes ringing simultaneously → +10 dB vs single note).
 *
 * Usage:  npx vite-node scripts/balance-mix.ts
 */

import {
  STARTER_SANDSTORM_LEAD,
  STARTER_SANDSTORM_BASS,
  STARTER_SANDSTORM_PAD,
  STARTER_SANDSTORM_HARMONY,
  STARTER_SANDSTORM_SNARE,
  STARTER_SANDSTORM_HIHAT,
  STARTER_KICK,
} from '../src/defaults'
import { loadInstrument } from '../src/parse/instrument'
import { compileInstrument } from '../src/synth/compile'
import { renderNote, type InstrumentSpec } from '../src/synth/sound_generator'

const SAMPLE_RATE = 44100
const BPM = 136
const TICKS_PER_BEAT = 4          // 16th note grid
const TICK_SECONDS = 60 / (BPM * TICKS_PER_BEAT)  // ≈ 0.1103 s
const BARS = 2
const TICKS_PER_BAR = 16
const TOTAL_TICKS = BARS * TICKS_PER_BAR

// Target pattern-RMS by mix role (linear).
// Derived from 2-bar measurement + desired mix balance for trance:
//   lead    -15 dBFS  melodic focal point
//   bass    -16 dBFS  solid low foundation (slightly behind lead)
//   kick    -17 dBFS  punchy transient (peaks will be much higher than RMS)
//   snare   -22 dBFS  sparse accent (only 2 hits/bar)
//   hihat   -25 dBFS  texture layer
//   pad     -18 dBFS  background chord wash
//   harmony -20 dBFS  mid-register drone support (below pad)
const TARGET: Record<string, number> = {
  lead:    0.178,   // -15 dBFS
  bass:    0.158,   // -16 dBFS
  kick:    0.141,   // -17 dBFS
  snare:   0.079,   // -22 dBFS
  hihat:   0.056,   // -25 dBFS
  pad:     0.126,   // -18 dBFS
  harmony: 0.100,   // -20 dBFS
}

interface VoicePattern {
  name: string
  yaml: string
  /** Notes to render: [offsetTick, midiNote, durationTicks]. */
  notes: [number, number, number][]
}

// 2-bar repeating patterns as they appear in the Sandstorm score.
// Lead: 16th-note arpeggio B5-G5-E5-G5 × 8 (2 bars)
const LEAD_PITCHES = [83, 79, 76, 79]  // B5, G5, E5, G5
const leadNotes: [number, number, number][] = Array.from({ length: TOTAL_TICKS }, (_, i) => [
  i, LEAD_PITCHES[i % 4]!, 1,
])

const VOICES: VoicePattern[] = [
  {
    name: 'lead',
    yaml: STARTER_SANDSTORM_LEAD,
    notes: leadNotes,
  },
  {
    name: 'bass',
    yaml: STARTER_SANDSTORM_BASS,
    // Quarter-note E2 pumping (tick 0, 4, 8, 12 per bar)
    notes: [0,4,8,12,16,20,24,28].map(t => [t, 40, 4]),
  },
  {
    name: 'pad',
    yaml: STARTER_SANDSTORM_PAD,
    // Whole-bar Em chord: E4 + G4 + B4 simultaneously, 2 bars
    notes: [
      [0, 64, 16], [0, 67, 16], [0, 71, 16],
      [16, 64, 16], [16, 67, 16], [16, 71, 16],
    ],
  },
  {
    name: 'harmony',
    yaml: STARTER_SANDSTORM_HARMONY,
    // Whole-bar Em chord drone: E3 + G3 simultaneously, 2 bars
    notes: [
      [0, 52, 16], [0, 55, 16],
      [16, 52, 16], [16, 55, 16],
    ],
  },
  {
    name: 'kick',
    yaml: STARTER_KICK,
    // 4-on-the-floor: ticks 0,4,8,12 per bar
    notes: [0,4,8,12,16,20,24,28].map(t => [t, 36, 1]),
  },
  {
    name: 'snare',
    yaml: STARTER_SANDSTORM_SNARE,
    // Beats 2 and 4: ticks 4, 12 per bar
    notes: [4,12,20,28].map(t => [t, 62, 1]),
  },
  {
    name: 'hihat',
    yaml: STARTER_SANDSTORM_HIHAT,
    // Every 16th note
    notes: Array.from({ length: TOTAL_TICKS }, (_, i) => [i, 93, 1]),
  },
]

function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

function renderPattern(spec: InstrumentSpec, notes: [number, number, number][]): Float32Array {
  // Total samples: 2 bars + max release tail (2 s extra)
  const tailSamples = Math.round(2.0 * SAMPLE_RATE)
  const barSamples  = Math.round(TOTAL_TICKS * TICK_SECONDS * SAMPLE_RATE)
  const total = barSamples + tailSamples
  const mix = new Float32Array(total)

  for (const [offsetTick, midi, durationTicks] of notes) {
    const noteSec = durationTicks * TICK_SECONDS
    const rendered = renderNote({
      instrument: spec,
      freqHz: midiToHz(midi),
      stress: 1.0,
      lengthSeconds: noteSec,
      sampleRate: SAMPLE_RATE,
    })
    const startSample = Math.round(offsetTick * TICK_SECONDS * SAMPLE_RATE)
    for (let i = 0; i < rendered.length && startSample + i < total; i++) {
      mix[startSample + i]! += rendered[i]!
    }
  }
  return mix
}

function rms(samples: Float32Array, startS = 0.1, durationS = 1.5): number {
  const lo = Math.floor(startS * SAMPLE_RATE)
  const hi = Math.min(samples.length, Math.floor((startS + durationS) * SAMPLE_RATE))
  let sum = 0
  for (let i = lo; i < hi; i++) sum += (samples[i]! ** 2)
  return Math.sqrt(sum / (hi - lo))
}

function toDB(v: number): string {
  return v > 0 ? (20 * Math.log10(v)).toFixed(1) : '-∞'
}

async function main() {
  console.log(`Rendering ${BARS}-bar patterns at ${BPM} BPM (${TICK_SECONDS * 1000 | 0} ms/tick)…\n`)

  const results: { name: string; rms: number; currentAmp: number }[] = []

  for (const v of VOICES) {
    const instrument = await loadInstrument(v.name, v.yaml)
    const spec = compileInstrument(instrument)
    const currentAmp = spec.amp ?? 1.0

    const mix = renderPattern(spec, v.notes)
    const r   = rms(mix)
    results.push({ name: v.name, rms: r, currentAmp })

    const peak = mix.reduce((m, s) => Math.max(m, Math.abs(s)), 0)
    console.log(`  ${v.name.padEnd(6)}  RMS ${toDB(r).padStart(8)} dBFS   peak ${toDB(peak).padStart(8)} dBFS   (amp=${currentAmp})`)
  }

  console.log('\n── Suggested amp adjustments ────────────────────────────────────')
  console.log(`${'Voice'.padEnd(6)}  ${'Current amp'.padEnd(12)}  ${'Eff. RMS'.padEnd(12)}  ${'Target RMS'.padEnd(12)}  New amp`)
  console.log('─'.repeat(65))

  for (const r of results) {
    const target = TARGET[r.name]!
    const multiplier = r.rms > 0 ? target / r.rms : 1
    const newAmp = +(r.currentAmp * multiplier).toFixed(3)
    const flag = Math.abs(multiplier - 1) > 0.1 ? ' ◄' : ''
    console.log(
      `${r.name.padEnd(6)}  ${r.currentAmp.toFixed(3).padEnd(12)}  ` +
      `${(toDB(r.rms) + ' dB').padEnd(12)}  ` +
      `${(toDB(target) + ' dB').padEnd(12)}  ${newAmp}${flag}`,
    )
  }

  console.log('\nPad measured with full Em chord (E4+G4+B4) as rendered in the score.')
}

main().catch((e) => { console.error(e); process.exit(1) })
