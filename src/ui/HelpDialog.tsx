import { For, Show, type Component } from 'solid-js'
import type { FileExtension } from '../storage/files'

// ── Content blocks ────────────────────────────────────────────────────────────

const SCORE_REF = `# ── Head (first YAML document) ──────────────────────────
title: "Song Title"
author: "Author"
tuning_config: tones_euro   # .splt filename (no extension)
room: hall                   # .splr filename (no extension)
stage:
  voice: "1|1 0.0 instrument"
  # channels  distance  instrument-name
  # 1|1 = center  2|1 = left  1|2 = right
  # distance 0.0 = dry, higher = more reverb

# ── Measure ───────────────────────────────────────────────
_meta:
  ticks_per_minute: 363
  stress_pattern: "2,0,1,0"     # cycles; higher = louder
  lower_stress_bound: 70         # 0–100
  upper_stress_bound: 95
  repeat_unmentioned_voices: true

# ── Notes ─────────────────────────────────────────────────
voice:
  0: C4 3                        # tick: pitch length
  3,5: Bb2 2                     # multiple ticks
  0+1*12: A6 1                   # range: 0,1,2,…11
  0: C4 3 damp=2                 # extend release by 2 ticks
  voice: false                   # silence this voice

# ── Chain strings (chords / sequences) ───────────────────
voice: "G3_11; C4_11; D#4_11"
# _N = hold: note length is 1+N ticks
# ;  = parallel (same tick offset)
# no ; = sequential (notes placed end-to-end)`

const INSTRUMENT_REF = `amp: 0.8
oscillator: sin                  # sin|saw|square|triangle|noise

envelope:
  attack: 0.01                   # seconds
  release: 0.3
  sustainLevel: 0.85             # 0–1

partials:
  - { freqMult: 1, amp: 1.0 }
  - { freqMult: 2, amp: 0.5, oscillator: saw }

# Inharmonicity: cumulative cent deviation per partial
spread: [0, 5, -3, 4]

# Frequency-dependent amplitude: SPECTRUM_WIDTH:SHAPE
timbre: "4:100;1,80;4,20"

# ── VCF: resonant low-pass filter ─────────────────────────
vcf:
  cutoff_hz: 2000
  resonance: 0.5                 # 0–1 (1 = near self-oscillation)
  env_amount: 1000               # Hz added at envelope peak
  env_attack: 0.05               # seconds
  env_release: 0.3

# ── LFO: slow modulation (list for multiple) ──────────────
lfo:
  rate_hz: 0.5
  depth: 200                     # Hz if target vcf; 0–1 if amp
  target: vcf                    # vcf | amp
  waveform: sin                  # sin|saw|square|triangle
  phase: 0                       # 0–1 (initial phase in turns)
  delay_seconds: 0.5             # fade-in time

# ── FM synthesis ──────────────────────────────────────────
fm:
  freq_hz: 2.01                  # modulator frequency
  dynamic: true                  # if true, freq_hz is ratio of carrier
  depth: 0.4                     # peak deviation as fraction of carrier
  init_phase: 0                  # 0–1 modulator start phase
  depth_env: "1:1;0.5,0"        # Shape — depth envelope over note`

const TUNING_REF = `basics:
  ref_frequency: 440             # Hz for reference tone (A4)
  ref_octave_number: 4           # octave number of reference
  ref_octave_offset: 9           # semitones above C in that octave
  tones_per_octave: 12           # equal divisions of the octave

scales:
  chr: "1 1 1 1 1 1 1 1 1 1 1 1"   # chromatic (all semitones)
  mj:  "2 2 1 2 2 2 1"              # major
  mn:  "2 1 2 2 1 2 2"              # natural minor
  # Values are step sizes in semitones; sum must equal tones_per_octave

default_scale: chr`

const ROOM_REF = `name: my room

# Shape format: N:v0;t,v1;t,v2  — N samples, value at time t
# N also sets the tail length in seconds.

levels: "6:90;1,60;4,20;6,5"    # amplitude per echo (decay curve)
delays: "6:0;6,100"              # delay distribution across echoes
border: "6:0;6,100"             # distance falloff (optional)

# Per-tap amplitude jitter (randomises each echo slightly)
jitter: "1:0.12"                 # or "1:0.12|1:0.18" for separate L|R

# Per-tap delay offsets in seconds, cycling across taps
deldiffs: "0.008|0.014"          # L offset | R offset`

// ── Component ─────────────────────────────────────────────────────────────────

interface Section {
  title: string
  code: string
}

function sectionsFor(exts: FileExtension[]): Section[] {
  const out: Section[] = []
  if (exts.includes('spls')) out.push({ title: 'Score  (.spls)', code: SCORE_REF })
  if (exts.includes('spli')) out.push({ title: 'Instrument  (.spli)', code: INSTRUMENT_REF })
  if (exts.includes('splt')) out.push({ title: 'Tuning  (.splt)', code: TUNING_REF })
  if (exts.includes('splr')) out.push({ title: 'Room  (.splr)', code: ROOM_REF })
  return out
}

export interface HelpDialogProps {
  exts: FileExtension[]
  ref: (el: HTMLDialogElement) => void
}

export const HelpDialog: Component<HelpDialogProps> = (props) => {
  const sections = () => sectionsFor(props.exts)

  function close(e: Event) {
    ;(e.currentTarget as HTMLElement).closest('dialog')?.close()
  }

  return (
    <dialog ref={props.ref} class="help-dialog">
      <div class="help-header">
        <span>Syntax Reference</span>
        <button onClick={close} aria-label="Close">✕</button>
      </div>
      <div class="help-body">
        <For each={sections()}>
          {(s) => (
            <section>
              <h4>{s.title}</h4>
              <pre><code>{s.code}</code></pre>
            </section>
          )}
        </For>
        <Show when={sections().length === 0}>
          <p>No reference available for this file type.</p>
        </Show>
      </div>
    </dialog>
  )
}
