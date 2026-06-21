/**
 * Starter content seeded on first run.
 *
 * In-project (loads automatically):
 *   - `oxygene.spls` — Jean-Michel Jarre "Oxygène Pt. IV" (1976), full 117-bar transcription.
 *   - `filtered-bass/kalimba/synbrass/synstrings/string-ensemble/bowed-pad/oxygene-melody/tambourine/seashore.spli`
 *   - `tones_euro.splt` — equal-temperament tuning.
 *   - `oxygene-plate.splr` — Freeverb plate reverb.
 *
 * In staging (examples and dev tools):
 *   - `alle_meine_entchen.spls` with `dev/piano.spli`
 *   - `dev/flute.spli`, `dev/kick.spli`, `free-field.splr`
 *
 * Pachelbel constants are retained (not seeded) for the conformance suite.
 */

import { getFile, putFile, type FileExtension } from './storage/files'

interface Seed {
  name: string
  ext: FileExtension
  body: string
  inProject: boolean
}

export {
  // Pachelbel — kept in staging for the conformance suite
  PACHELBEL as STARTER_PACHELBEL,
  PACHELBEL_PIANO as STARTER_PACHELBEL_PIANO,
  VIOLIN as STARTER_VIOLIN,
  CELLO as STARTER_CELLO,
  PIANO as STARTER_PIANO_RAILSBACK,
  // Oxygène instruments — exported for conformance tests and dev tooling
  OXYGENE_BASS as OXYGENE_BASS,
  OXYGENE_KALIMBA as OXYGENE_KALIMBA,
  OXYGENE_SYNBRASS as OXYGENE_SYNBRASS,
  OXYGENE_STRINGS as OXYGENE_STRINGS,
  OXYGENE_ENSEMBLE as OXYGENE_ENSEMBLE,
  OXYGENE_BOWEDPAD as OXYGENE_BOWEDPAD,
  OXYGENE_MELODY as OXYGENE_MELODY,
  OXYGENE_TAMBOURINE as OXYGENE_TAMBOURINE,
  OXYGENE_SEASHORE as OXYGENE_SEASHORE,
}

// =====================================================================
//
const PACHELBEL = `title: Pachelbel — Canon in D
author: Johann Pachelbel (arr. for Sompyler)
stage:
  cello:   1|1 1.2 cello
  violin1: 2|1 0.6 violin
  violin2: 1|2 0.6 violin
  violin3: 1|1 0.4 violin
tuning_config: tones_euro
room: pachelbel-hall
---
# m1 — cello phrase A: D A B F#
_meta:
  ticks_per_minute: 120
  stress_pattern: "2,0,1,0;1,0;1,0;1,0"
  lower_stress_bound: 72
  upper_stress_bound: 96
cello:
  0: D3 2 damp=1
  2: A2 2 damp=1
  4: B2 2 damp=1
  6: F#2 2 damp=1
---
# m2 — cello phrase B: G D G A
cello:
  0: G2 2 damp=1
  2: D2 2 damp=1
  4: G2 2 damp=1
  6: A2 2 damp=1
---
# m3 — violin1 enters with melody M1 over cello A
cello: true
violin1:
  0: F#5 1
  1: E5 1
  2: D5 1
  3: C#5 1
  4: B4 1
  5: A4 1
  6: B4 1
  7: C#5 1
---
# m4 — violin1 phrase M2 over cello B
cello:
  0: G2 2 damp=1
  2: D2 2 damp=1
  4: G2 2 damp=1
  6: A2 2 damp=1
violin1:
  0: D5 1
  1: C#5 1
  2: B4 1
  3: A4 1
  4: G4 1
  5: F#4 1
  6: G4 1
  7: A4 1
---
# m5 — violin1 climax M3, violin2 enters with M1 (canon stagger = 2 bars)
cello:
  0: D3 2 damp=1
  2: A2 2 damp=1
  4: B2 2 damp=1
  6: F#2 2 damp=1
violin1:
  0: F#5 1 vibrato=1:0,0;1,1
  1: D5 1
  2: A4 1
  3: D5 1
  4: F#5 1 vibrato=1:0,0;1,1
  5: A4 1
  6: D5 1
  7: F#5 1 vibrato=1:0,0;1,1
violin2:
  0: F#5 1
  1: E5 1
  2: D5 1
  3: C#5 1
  4: B4 1
  5: A4 1
  6: B4 1
  7: C#5 1
---
# m6 — violin1 back to M1, violin2 M2 (canon)
cello:
  0: G2 2 damp=1
  2: D2 2 damp=1
  4: G2 2 damp=1
  6: A2 2 damp=1
violin1:
  0: F#5 1
  1: E5 1
  2: D5 1
  3: C#5 1
  4: B4 1
  5: A4 1
  6: B4 1
  7: C#5 1
violin2:
  0: D5 1
  1: C#5 1
  2: B4 1
  3: A4 1
  4: G4 1
  5: F#4 1
  6: G4 1
  7: A4 1
---
# m7 — violin3 enters; full canonic texture
cello:
  0: D3 2 damp=1
  2: A2 2 damp=1
  4: B2 2 damp=1
  6: F#2 2 damp=1
violin1:
  0: D5 1
  1: C#5 1
  2: B4 1
  3: A4 1
  4: G4 1
  5: F#4 1
  6: G4 1
  7: A4 1
violin2:
  0: F#5 1 vibrato=1:0,0;1,1
  1: D5 1
  2: A4 1
  3: D5 1
  4: F#5 1 vibrato=1:0,0;1,1
  5: A4 1
  6: D5 1
  7: F#5 1 vibrato=1:0,0;1,1
violin3:
  0: F#5 1
  1: E5 1
  2: D5 1
  3: C#5 1
  4: B4 1
  5: A4 1
  6: B4 1
  7: C#5 1
---
# m8 — full canon, rotation continues
cello:
  0: G2 2 damp=1
  2: D2 2 damp=1
  4: G2 2 damp=1
  6: A2 2 damp=1
violin1:
  0: F#5 1 vibrato=1:0,0;1,1
  1: D5 1
  2: A4 1
  3: D5 1
  4: F#5 1 vibrato=1:0,0;1,1
  5: A4 1
  6: D5 1
  7: F#5 1 vibrato=1:0,0;1,1
violin2:
  0: F#5 1
  1: E5 1
  2: D5 1
  3: C#5 1
  4: B4 1
  5: A4 1
  6: B4 1
  7: C#5 1
violin3:
  0: D5 1
  1: C#5 1
  2: B4 1
  3: A4 1
  4: G4 1
  5: F#4 1
  6: G4 1
  7: A4 1
---
# m9 — same cello A, rotated violins; D#? passing tone shows the ?-flag snap
cello:
  0: D3 2 damp=1
  2: A2 2 damp=1
  4: B2 2 damp=1
  6: F#2 2 damp=1
violin1:
  0: F#5 1
  1: E5 1
  2: D#5? 1
  3: C#5 1
  4: B4 1
  5: A4 1
  6: B4 1
  7: C#5 1
violin2:
  0: D5 1
  1: C#5 1
  2: B4 1
  3: A4 1
  4: G4 1
  5: F#4 1
  6: G4 1
  7: A4 1
violin3:
  0: F#5 1 vibrato=1:0,0;1,1
  1: D5 1
  2: A4 1
  3: D5 1
  4: F#5 1 vibrato=1:0,0;1,1
  5: A4 1
  6: D5 1
  7: F#5 1 vibrato=1:0,0;1,1
---
# m10 — last full-tempo measure
cello:
  0: G2 2 damp=1
  2: D2 2 damp=1
  4: G2 2 damp=1
  6: A2 2 damp=1
violin1:
  0: D5 1
  1: C#5 1
  2: B4 1
  3: A4 1
  4: G4 1
  5: F#4 1
  6: G4 1
  7: A4 1
violin2:
  0: F#5 1 vibrato=1:0,0;1,1
  1: D5 1
  2: A4 1
  3: D5 1
  4: F#5 1 vibrato=1:0,0;1,1
  5: A4 1
  6: D5 1
  7: F#5 1 vibrato=1:0,0;1,1
violin3:
  0: F#5 1
  1: E5 1
  2: D5 1
  3: C#5 1
  4: B4 1
  5: A4 1
  6: B4 1
  7: C#5 1
---
# m11 — ritardando: tempo Shape decelerates from 120 to 70 tpm
_meta:
  tempo: "8:120;8,70"
cello:
  0: D3 2 damp=1
  2: A2 2 damp=1
  4: B2 2 damp=1
  6: F#2 2 damp=1
violin1:
  0: F#5 1 vibrato=1:0,0;1,1
  1: D5 1
  2: A4 1
  3: D5 1
  4: F#5 1 vibrato=1:0,0;1,1
  5: A4 1
  6: D5 1
  7: F#5 1 vibrato=1:0,0;1,1
violin2:
  0: F#5 1
  1: E5 1
  2: D5 1
  3: C#5 1
  4: B4 1
  5: A4 1
  6: B4 1
  7: C#5 1
violin3:
  0: D5 1
  1: C#5 1
  2: B4 1
  3: A4 1
  4: G4 1
  5: F#4 1
  6: G4 1
  7: A4 1
---
# m12 — final D-major cadence; held whole notes (length=8)
_meta:
  tempo: "8:70;8,55"
cello:
  0: D3 8 damp=2
violin1:
  0: A4 8 vibrato=1:0,0;1,1
violin2:
  0: D5 8 vibrato=1:0,0;1,1
violin3:
  0: F#5 8 vibrato=1:0,0;1,1
`

// =====================================================================
// Solo-piano variant — railsback + damp demo, same melodic material.
// =====================================================================
const PACHELBEL_PIANO = `title: Pachelbel — solo piano variant
author: Johann Pachelbel (arr. for Sompyler)
stage:
  piano: 1|1 0.4 piano
tuning_config: tones_euro
room: pachelbel-hall
---
# Bass + melody combined for a single instrument. Damp emulates sustain pedal.
_meta:
  ticks_per_minute: 120
  stress_pattern: "2,0,1,0;1,0;1,0;1,0"
  lower_stress_bound: 70
  upper_stress_bound: 96
piano:
  0: D3 8 damp=2
  0: F#5 1
  1: E5 1
  2: D5 1
  3: C#5 1
  4: B4 1
  5: A4 1
  6: B4 1
  7: C#5 1
---
piano:
  0: G2 8 damp=2
  0: D5 1
  1: C#5 1
  2: B4 1
  3: A4 1
  4: G4 1
  5: F#4 1
  6: G4 1
  7: A4 1
---
piano:
  0: D3 8 damp=2
  0: F#5 1 vibrato=1:0,0;1,1
  1: D5 1
  2: A4 1
  3: D5 1
  4: F#5 1 vibrato=1:0,0;1,1
  5: A4 1
  6: D5 1
  7: F#5 1 vibrato=1:0,0;1,1
---
_meta:
  tempo: "8:120;8,60"
piano:
  0: D2 8 damp=3
  0: D5 4
  4: A4 4
`

// =====================================================================
// Rich string instruments — violin and cello sympartial stacks.
// =====================================================================
const VIOLIN = `# Violin: bright sawtooth-like timbre with strong odd harmonics.
amp: 0.35
oscillator: sin
envelope:
  attack: 0.05
  release: 0.25
  sustainLevel: 0.85
partials:
  - { freqMult: 1, amp: 1.0 }
  - { freqMult: 2, amp: 0.55 }
  - { freqMult: 3, amp: 0.40 }
  - { freqMult: 4, amp: 0.28 }
  - { freqMult: 5, amp: 0.18 }
  - { freqMult: 6, amp: 0.10 }
`

const CELLO = `# Cello: deeper, slower attack; favours lower partials, gentler decay.
amp: 0.45
oscillator: sin
envelope:
  attack: 0.08
  release: 0.5
  sustainLevel: 0.8
partials:
  - { freqMult: 1, amp: 1.0 }
  - { freqMult: 2, amp: 0.65 }
  - { freqMult: 3, amp: 0.30 }
  - { freqMult: 4, amp: 0.18 }
  - { freqMult: 5, amp: 0.09 }
`

// Piano with S32136 railsback: high keys stretch sharper than 12-TET,
// low keys flatten — the curve goes from -0.01 octaves at A0 (≈-12 cents)
// up to +0.02 octaves at C8 (≈+24 cents). Mild but audible.
const PIANO = `# Piano: hammered-string approximation. Decaying sustain with rich
# upper partials, mild S32136 railsback inharmonicity.
amp: 0.5
oscillator: sin
envelope:
  attack: 0.005
  release: 0.6
  sustainLevel: 0.55
partials:
  - { freqMult: 1, amp: 1.0 }
  - { freqMult: 2, amp: 0.5 }
  - { freqMult: 3, amp: 0.3 }
  - { freqMult: 4, amp: 0.18 }
  - { freqMult: 5, amp: 0.1 }
  - { freqMult: 6, amp: 0.06 }
railsback: [27.5, 4186, "0;100,0.02"]
`

// Hall reverb: two-level echo train, gentle border falloff.
const PACHELBEL_HALL = `# pachelbel-hall.splr — modest hall with a two-tap echo.
name: pachelbel hall
levels: "120:80;60,40;120,5"
delays: "120:0;30,40;120,80"
border: "120:0;120,100"
`

const STARTER_PIANO = `amp: 0.5
oscillator: sin
envelope:
  attack: 0.005
  release: 0.4
  sustainLevel: 0.7
partials:
  - { freqMult: 1, amp: 1.0 }
  - { freqMult: 2, amp: 0.5 }
  - { freqMult: 3, amp: 0.25 }
  - { freqMult: 4, amp: 0.12 }
`

const STARTER_FLUTE = `amp: 0.4
oscillator: triangle
envelope:
  attack: 0.05
  release: 0.2
  sustainLevel: 0.9
partials:
  - { freqMult: 1, amp: 1.0 }
  - { freqMult: 2, amp: 0.15 }
  - { freqMult: 3, amp: 0.05 }
`

// FM kick drum: near-DC modulator (1 Hz) starts at peak (initPhase=0.25) so
// the carrier begins at 4× its base frequency and sweeps to base in the first
// 10% of the note. Score notes at a low pitch (C1 = 32.7 Hz) for best thump.
// Shape "100:1;0.1,0;1,0": depth decays 1→0 over the first 10% then stays 0.
export const STARTER_KICK = `# dev/kick.spli — FM kick drum with pitch sweep.
# Score at C1 (32.7 Hz). Carrier sweeps C3 → C1 in first ~50 ms of a 500 ms note.
amp: 0.90
oscillator: sin
envelope:
  attack: 0.002
  release: 0.3
  sustainLevel: 1.0
fm:
  freq_hz: 1
  depth: 3
  init_phase: 0.25
  depth_env: "100:1;0.1,0;1,0"
`

// Subset port of lib/tones_euro_de+en.splt — basics block (Tuner.config) plus
// the [scales] block (mj=major, mn=minor, chr=chromatic). RFC §S45000.
// Additional Sompyler scale modes (hmj, mm*, ph, ly, etc.) load fine via
// parseTuning but aren't seeded by default to keep the starter tidy.
const STARTER_TUNING = `# tones_euro: equal temperament, 12 tones per octave, A4 = 440 Hz.
basics:
  ref_frequency: 440
  ref_octave_number: 4
  ref_octave_offset: 9
  tones_per_octave: 12
scales:
  chr: "1 1 1 1 1 1 1 1 1 1 1 1"
  mj:  "2 2 1 2 2 2 1"
  mn:  "2 1 2 2 1 2 2"
default_scale: chr
`

const STARTER_FREE_FIELD = `# free-field.splr — no reverb. Just a panorama+intensity placeholder.
name: free field
type: free-field
`

const ALLE_MEINE_ENTCHEN = `title: Alle meine Entchen
author: trad.
stage:
  piano: 1|1 0 dev/piano
---
_meta:
  stress_pattern: "2,0,1,0;1,0"
  ticks_per_minute: 140
  lower_stress_bound: 85
  upper_stress_bound: 100
piano:
  0: C4 1
  1: D4 1
  2: E4 1
  3: F4 1
  4: G4 2
  6: G4 2
---
piano:
  0: A4 1
  1: A4 1
  2: A4 1
  3: A4 1
  4: G4 4
`

const OXYGENE_PLATE_ROOM = `# oxygene-plate.splr — Freeverb plate reverb for Oxygène Pt. IV.
type: freeverb
room_size: 0.76
damping: 0.45
wet: 0.22
pre_delay_ms: 10
`

const OXYGENE_BASS = `# bass: Fretless Bass (GM36 / TimGM6mb), C2. Partials from TiMidity sustain FFT.
# H2 strong (-3.5 dB), H4 > H3, H5 strong (classic bass string characteristic).
amp: 0.70
oscillator: sin
envelope:
  attack: 0.008
  decay: 0.04
  release: 0.15
  sustainLevel: 0.80
partials:
  - { freqMult: 1,  amp: 1.000 }
  - { freqMult: 2,  amp: 0.671 }
  - { freqMult: 3,  amp: 0.179 }
  - { freqMult: 4,  amp: 0.240 }
  - { freqMult: 5,  amp: 0.326 }
  - { freqMult: 6,  amp: 0.171 }
  - { freqMult: 7,  amp: 0.160 }
  - { freqMult: 8,  amp: 0.166 }
  - { freqMult: 9,  amp: 0.096 }
  - { freqMult: 10, amp: 0.036 }
  - { freqMult: 11, amp: 0.039 }
  - { freqMult: 12, amp: 0.020 }
  - { freqMult: 13, amp: 0.0088 }
  - { freqMult: 14, amp: 0.0041 }
  - { freqMult: 15, amp: 0.0037 }
  - { freqMult: 16, amp: 0.0024 }
  - { freqMult: 17, amp: 0.0018 }
  - { freqMult: 18, amp: 0.0014 }
  - { freqMult: 19, amp: 0.0011 }
  - { freqMult: 20, amp: 0.0012 }
  - { freqMult: 21, amp: 0.00054 }
  - { freqMult: 22, amp: 0.00066 }
  - { freqMult: 23, amp: 0.00007 }
  - { freqMult: 24, amp: 0.00020 }
`

const OXYGENE_KALIMBA = `# kalimba: Kalimba (GM108 / TimGM6mb). Pure sine sustain.
#
# TiMidity's Kalimba.pat sustain loop sits at the decayed tail of the sample
# (3.8ms at 96.5ms), where only H1 remains — <1% of H1 at H3 through H11.
# The rendered output is a pure sine throughout the note, confirmed by FFT
# of the pre-committed src/conformance/fixtures/kalimba_c4_timidity.wav.
#
# release must be near-zero: sompyler's ASR puts the release WITHIN the note
# window, so any release > note_length eats the sustain. With release=0.50 and
# 1-tick notes (163ms) the sustain phase is 2ms — effectively no sustain.
# The ring tail comes from damp=2 in the score (326ms at 369 ticks/min).
amp: 0.45
oscillator: sin
envelope:
  attack: 0.004
  decay: 0.40
  release: 0.01
  sustainLevel: 0.10
partials:
  - { freqMult: 1,  amp: 1.000 }
  - { freqMult: 2,  amp: 0.002 }
  - { freqMult: 3,  amp: 0.001 }
  - { freqMult: 4,  amp: 0.0003 }
  - { freqMult: 5,  amp: 0.0004 }
  - { freqMult: 7,  amp: 0.0002 }
`

const OXYGENE_SYNBRASS = `# synbrass: SynBrass 2 (GM64 / TimGM6mb), C4. Partials from TiMidity sustain FFT.
# Very slow TiMidity attack (peak at 1.95s / 3s note). Rich upper harmonics; H7 spike.
amp: 0.20
oscillator: sin
envelope:
  attack: 0.12
  release: 0.40
  sustainLevel: 0.75
partials:
  - { freqMult: 1,  amp: 1.000 }
  - { freqMult: 2,  amp: 0.723 }
  - { freqMult: 3,  amp: 0.530 }
  - { freqMult: 4,  amp: 0.284 }
  - { freqMult: 5,  amp: 0.232 }
  - { freqMult: 6,  amp: 0.122 }
  - { freqMult: 7,  amp: 0.238 }
  - { freqMult: 8,  amp: 0.101 }
  - { freqMult: 9,  amp: 0.076 }
  - { freqMult: 10, amp: 0.115 }
  - { freqMult: 11, amp: 0.111 }
  - { freqMult: 12, amp: 0.085 }
  - { freqMult: 13, amp: 0.069 }
  - { freqMult: 14, amp: 0.038 }
  - { freqMult: 15, amp: 0.078 }
  - { freqMult: 16, amp: 0.073 }
  - { freqMult: 17, amp: 0.065 }
  - { freqMult: 18, amp: 0.033 }
  - { freqMult: 19, amp: 0.023 }
  - { freqMult: 20, amp: 0.025 }
  - { freqMult: 21, amp: 0.043 }
  - { freqMult: 22, amp: 0.043 }
  - { freqMult: 23, amp: 0.020 }
  - { freqMult: 24, amp: 0.013 }
`

const OXYGENE_STRINGS = `# strings: SynString 2 (GM52 / TimGM6mb), C3. Partials from TiMidity sustain FFT.
# TiMidity peak at 1.45s (slow attack). H4 stronger than H2 or H3 (body resonance).
amp: 0.12
oscillator: sin
envelope:
  attack: 0.35
  release: 1.20
  sustainLevel: 0.88
partials:
  - { freqMult: 1,  amp: 1.000 }
  - { freqMult: 2,  amp: 0.188 }
  - { freqMult: 3,  amp: 0.181 }
  - { freqMult: 4,  amp: 0.254 }
  - { freqMult: 5,  amp: 0.136 }
  - { freqMult: 6,  amp: 0.065 }
  - { freqMult: 7,  amp: 0.072 }
  - { freqMult: 8,  amp: 0.090 }
  - { freqMult: 9,  amp: 0.049 }
  - { freqMult: 10, amp: 0.051 }
  - { freqMult: 11, amp: 0.041 }
  - { freqMult: 12, amp: 0.027 }
  - { freqMult: 13, amp: 0.046 }
  - { freqMult: 14, amp: 0.035 }
  - { freqMult: 15, amp: 0.029 }
  - { freqMult: 16, amp: 0.025 }
  - { freqMult: 17, amp: 0.027 }
  - { freqMult: 18, amp: 0.024 }
  - { freqMult: 19, amp: 0.019 }
  - { freqMult: 20, amp: 0.020 }
  - { freqMult: 21, amp: 0.019 }
  - { freqMult: 22, amp: 0.026 }
  - { freqMult: 23, amp: 0.012 }
  - { freqMult: 24, amp: 0.012 }
`

const OXYGENE_ENSEMBLE = `# ensemble: String Ensemble 1 (GM49 / TimGM6mb), C4. Partials from TiMidity sustain FFT.
# H8/H9/H11 show a late-harmonic hump (choir/ensemble roughness character).
amp: 0.10
oscillator: sin
envelope:
  attack: 0.30
  release: 1.50
  sustainLevel: 0.85
partials:
  - { freqMult: 1,  amp: 1.000 }
  - { freqMult: 2,  amp: 0.258 }
  - { freqMult: 3,  amp: 0.118 }
  - { freqMult: 4,  amp: 0.077 }
  - { freqMult: 5,  amp: 0.056 }
  - { freqMult: 6,  amp: 0.029 }
  - { freqMult: 7,  amp: 0.020 }
  - { freqMult: 8,  amp: 0.047 }
  - { freqMult: 9,  amp: 0.045 }
  - { freqMult: 10, amp: 0.033 }
  - { freqMult: 11, amp: 0.038 }
  - { freqMult: 12, amp: 0.013 }
  - { freqMult: 13, amp: 0.0061 }
  - { freqMult: 14, amp: 0.016 }
  - { freqMult: 15, amp: 0.0072 }
  - { freqMult: 16, amp: 0.0025 }
  - { freqMult: 17, amp: 0.0047 }
  - { freqMult: 18, amp: 0.0037 }
  - { freqMult: 19, amp: 0.0026 }
  - { freqMult: 20, amp: 0.0014 }
  - { freqMult: 21, amp: 0.00061 }
  - { freqMult: 22, amp: 0.00068 }
  - { freqMult: 23, amp: 0.00027 }
  - { freqMult: 24, amp: 0.00024 }
`

const OXYGENE_BOWEDPAD = `# bowedpad: Pad 5 Bowed (GM93 / TimGM6mb), C4. Partials from TiMidity sustain FFT.
# H4 ≈ H1 in amplitude (0.990) — defining feature of this pad. H11 hump at 0.116.
amp: 0.08
oscillator: sin
envelope:
  attack: 0.80
  release: 2.00
  sustainLevel: 0.90
partials:
  - { freqMult: 1,  amp: 1.000 }
  - { freqMult: 2,  amp: 0.270 }
  - { freqMult: 3,  amp: 0.222 }
  - { freqMult: 4,  amp: 0.990 }
  - { freqMult: 5,  amp: 0.146 }
  - { freqMult: 6,  amp: 0.063 }
  - { freqMult: 7,  amp: 0.075 }
  - { freqMult: 8,  amp: 0.069 }
  - { freqMult: 9,  amp: 0.057 }
  - { freqMult: 10, amp: 0.060 }
  - { freqMult: 11, amp: 0.116 }
  - { freqMult: 12, amp: 0.030 }
  - { freqMult: 13, amp: 0.032 }
  - { freqMult: 14, amp: 0.028 }
  - { freqMult: 15, amp: 0.032 }
  - { freqMult: 16, amp: 0.022 }
  - { freqMult: 17, amp: 0.023 }
  - { freqMult: 18, amp: 0.036 }
  - { freqMult: 19, amp: 0.023 }
  - { freqMult: 20, amp: 0.019 }
  - { freqMult: 21, amp: 0.015 }
  - { freqMult: 22, amp: 0.013 }
  - { freqMult: 23, amp: 0.011 }
  - { freqMult: 24, amp: 0.010 }
lfo:
  rate_hz: 0.18
  depth: 0.08
  target: amp
  waveform: sin
`

const OXYGENE_MELODY = `# melody: Nylon Guitar (GM25 / TimGM6mb), G3. Partials from TiMidity sustain FFT.
# Irregular guitar-like spectrum: H2/H3 strong, H4 nearly absent, H6/H7 re-emerge.
amp: 0.55
oscillator: sin
envelope:
  attack: 0.004
  decay: 0.15
  release: 0.70
  sustainLevel: 0.55
partials:
  - { freqMult: 1,  amp: 1.000 }
  - { freqMult: 2,  amp: 0.640 }
  - { freqMult: 3,  amp: 0.498 }
  - { freqMult: 4,  amp: 0.0062 }
  - { freqMult: 5,  amp: 0.042 }
  - { freqMult: 6,  amp: 0.196 }
  - { freqMult: 7,  amp: 0.273 }
  - { freqMult: 8,  amp: 0.029 }
  - { freqMult: 9,  amp: 0.0073 }
  - { freqMult: 10, amp: 0.189 }
  - { freqMult: 11, amp: 0.054 }
  - { freqMult: 12, amp: 0.035 }
  - { freqMult: 13, amp: 0.0032 }
  - { freqMult: 14, amp: 0.0053 }
  - { freqMult: 15, amp: 0.040 }
  - { freqMult: 16, amp: 0.011 }
  - { freqMult: 17, amp: 0.0043 }
  - { freqMult: 18, amp: 0.0030 }
  - { freqMult: 19, amp: 0.00057 }
  - { freqMult: 20, amp: 0.027 }
  - { freqMult: 21, amp: 0.0067 }
  - { freqMult: 22, amp: 0.0016 }
  - { freqMult: 23, amp: 0.0051 }
  - { freqMult: 24, amp: 0.0027 }
`

const OXYGENE_TAMBOURINE = `# tambourine: Tambourine (GM54 / TimGM6mb), note 54. Noise instrument.
# TiMidity: centroid=10973 Hz, rolloff95=12971 Hz. Very bright, instant onset.
# Envelope: peak at 0s, -40 dB at 0.15s. Total duration 1.19s.
amp: 0.35
oscillator: noise
envelope:
  attack: 0.001
  decay: 0.06
  release: 0.08
  sustainLevel: 0.20
`

const OXYGENE_SEASHORE = `# seashore: Sea Shore (GM123 / TimGM6mb), C4. Noise instrument.
# TiMidity: centroid=1271 Hz, rolloff95=2600 Hz. Low-frequency filtered noise.
# Envelope: peak at 0.75s, -40 dB at 9.95s (11s total).
amp: 0.06
oscillator: noise
envelope:
  attack: 2.00
  release: 3.00
  sustainLevel: 0.70
`

const OXYGENE = `title: Oxygène Pt. IV
author: Jean-Michel Jarre (1976)
stage:
  seashore:  1|1 1.8 seashore
  kalimba:   1|1 0.2 kalimba
  bass:      1|1 0.0 filtered-bass
  tambourine: 1|1 0.1 tambourine
  synbrass:  1|1 0.8 synbrass
  strings:   2|1 1.0 synstrings
  ensemble:  1|2 1.2 string-ensemble
  bowedpad:  1|1 1.6 bowed-pad
  melody:    1|1 0.4 oxygene-melody
tuning_config: tones_euro
room: oxygene-plate
---
# bar 1 — intro: seashore fade-in, kalimba silent
_meta:
  ticks_per_minute: 369
  stress_pattern: "2,0,0,1,0,0,1,0,0,1,0,0"
  lower_stress_bound: 70
  upper_stress_bound: 90
seashore:
  0: C4 12
---
# bar 2 — kalimba fade-in begins (very quiet)
_meta:
  repeat_unmentioned_voices: true
kalimba:
  4: C4 1 damp=2
  6: C4 1 damp=2
  8: C4 1 damp=2
  10: C4 1 damp=2
---
# bar 3 — kalimba fading in
_meta:
  repeat_unmentioned_voices: true
kalimba:
  0: C4 1 damp=2
  2: C4 1 damp=2
  4: C4 1 damp=2
---
# bar 4 — bass pickup note (G1 at t=11)
_meta:
  repeat_unmentioned_voices: true
kalimba: false
bass:
  11: G1 1
---
# bar 5 — drums + bass + kalimba enter; Cm pattern A
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
tambourine:
  0: C4 1
  1: C4 1
  2: C4 1
  3: C4 1
  4: C4 1
  5: C4 1
  6: C4 1
  7: C4 1
  8: C4 1
  10: C4 1
  11: C4 1
---
# bar 6 — Cm pattern B
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
---
# bar 7 — Cm pattern A
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
---
# bar 8 — Cm pattern B
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
---
# bar 9 — Cm pattern A
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
---
# bar 10 — SynBrass + Strings enter; Cm pattern B
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
synbrass:
  0: C5 3
  5: G4 1
  6: Eb4 2
  8: G4 2
  11: C4 7
strings: "Eb3_23; G3_23; C3_23"
ensemble:
  0: C5 5
  5: G4 1
  6: Eb4 3
  8: G4 4
  11: C4 12
---
# bar 11 — Cm A; SynBrass silent this bar; strings hold
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
synbrass: false
strings: false
ensemble: false
---
# bar 12 — Cm B; SynBrass repeats
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
synbrass:
  0: C5 3
  5: G4 1
  6: Eb4 2
  8: G4 2
  11: C4 7
strings: "Eb3_23; G3_23; C3_23"
ensemble:
  0: C5 5
  5: G4 2
  6: Eb4 2
  8: G4 4
  11: C4 12
---
# bar 13 — Cm A; SynBrass off
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
synbrass: false
strings: false
ensemble: false
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
---
# bar 14 — Gm pattern; SynBrass Gm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 1
kalimba:
  2: D4 1 damp=2
  4: D4 1 damp=2
  6: D4 1 damp=2
  9: D4 1 damp=2
  11: D4 1 damp=2
synbrass:
  0: Bb4 3
  5: A4 1
  6: G4 2
  8: A4 2
  11: D4 7
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: Bb4 5
  5: A4 2
  6: G4 2
  8: A4 4
  11: D4 12
---
# bar 15 — Gm A; SynBrass off
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 2
synbrass: false
strings: false
ensemble: false
---
# bar 16 — Fm transition; SynBrass Fm run + SYNSTRING1 enters
_meta:
  repeat_unmentioned_voices: true
bass:
  0: F2 3
  3: Eb2 2
  5: C2 3
  8: F2 1
  9: Eb2 2
  11: C2 2
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
synbrass:
  0: A4 1
  2: G4 1
  3: F4 1
  5: C4 6
strings: "F3_23; A3_23"
ensemble:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
---
# bar 17 — Fm descending run bass; pad continues
_meta:
  repeat_unmentioned_voices: true
bass:
  2: F2 2
  3: Eb2 2
  5: C2 3
  8: C2 1
  9: Eb2 2
  11: C2 1
synbrass:
  2: G4 1
  3: F4 1
  5: C4 5
strings: false
ensemble:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
---
# bar 18 — Cm A; 8-bar cycle starts
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
synbrass:
  0: C5 3
  5: G4 1
  6: Eb4 2
  8: G4 2
  11: C4 7
strings: "Eb3_23; G3_23; C3_23"
ensemble:
  0: C5 5
  5: G4 1
  6: Eb4 3
  8: G4 4
  11: C4 12
---
# bar 19 — Cm B variant
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 1
  10: G1 1
  11: Bb1 1
synbrass: false
strings: false
ensemble: false
---
# bar 20 — Cm A
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
synbrass:
  0: C5 3
  5: G4 1
  6: Eb4 2
  8: G4 2
  11: C4 7
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 5
  5: G4 2
  6: Eb4 2
  8: G4 4
  11: C4 12
---
# bar 21 — Cm B
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
synbrass: false
strings: false
ensemble: false
---
# bar 22 — Gm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 1
kalimba:
  2: D4 1 damp=2
  4: D4 1 damp=2
  6: D4 1 damp=2
  9: D4 1 damp=2
  11: D4 1 damp=2
synbrass:
  0: Bb4 3
  5: A4 1
  6: G4 2
  8: A4 2
  11: D4 7
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: Bb4 5
  5: A4 2
  6: G4 2
  8: A4 4
  11: D4 12
---
# bar 23 — Gm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 1
synbrass: false
strings: false
ensemble: false
---
# bar 24 — Fm; SynBrass Fm run
_meta:
  repeat_unmentioned_voices: true
bass:
  0: F2 3
  3: Eb2 2
  5: C2 3
  8: F2 1
  9: Eb2 2
  11: C2 2
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
synbrass:
  0: A4 1
  2: G4 1
  3: F4 1
  5: C4 6
strings: "F3_23; A3_23"
ensemble:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
---
# bar 25 — Fm descending run
_meta:
  repeat_unmentioned_voices: true
bass:
  2: F2 2
  3: Eb2 1
  4: C2 1
  5: Eb2 2
  6: C2 1
  7: Bb1 1
  8: G1 1
  9: Bb1 1
  10: G1 1
  11: Bb1 1
synbrass:
  2: G4 1
  3: F4 1
  5: C4 5
strings: false
ensemble:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
---
# bar 26 — Cm A
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
synbrass:
  0: C5 3
  5: G4 1
  6: Eb4 2
  8: G4 2
  11: C4 7
strings: "Eb3_23; G3_23; C3_23"
ensemble:
  0: C5 5
  5: G4 1
  6: Eb4 3
  8: G4 4
  11: C4 12
---
# bar 27 — Cm B
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
synbrass: false
strings: false
ensemble: false
---
# bar 28 — Cm A
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
synbrass:
  0: C5 3
  5: G4 1
  6: Eb4 2
  8: G4 2
  11: C4 7
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 5
  5: G4 2
  6: Eb4 2
  8: G4 4
  11: C4 12
---
# bar 29 — Cm B
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
synbrass: false
strings: false
ensemble: false
---
# bar 30 — Gm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 1
kalimba:
  2: D4 1 damp=2
  4: D4 1 damp=2
  6: D4 1 damp=2
  9: D4 1 damp=2
  11: D4 1 damp=2
synbrass:
  0: Bb4 3
  5: A4 1
  6: G4 2
  8: A4 2
  11: D4 7
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: Bb4 5
  5: A4 2
  6: G4 2
  8: A4 4
  11: D4 12
---
# bar 31 — Gm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 1
synbrass: false
strings: false
ensemble: false
---
# bar 32 — Fm; SynBrass Fm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: F2 3
  3: Eb2 2
  5: C2 3
  8: F2 1
  9: Eb2 2
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
synbrass:
  0: A4 1
  2: G4 1
  3: F4 1
  5: C4 6
strings: "F3_23; A3_23"
ensemble:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
---
# bar 33 — Fm descending run
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 1
  2: F2 2
  3: Eb2 1
  4: C2 1
  5: Eb2 2
  6: C2 1
  7: Bb1 1
  8: G1 1
  9: Bb1 1
  10: G1 1
  11: Bb1 1
synbrass:
  2: G4 1
  3: F4 1
  5: C4 5
strings: false
ensemble:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 7
---
# bar 34 — BowedPad + SynString2-B enter; Cm; Kalimba silent
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
kalimba: false
synbrass: false
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad:
  3: C4 21
  6: Eb4 18
---
# bar 35 — Cm; repeat high strings
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
strings: false
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad: false
---
# bar 36 — Gm; BowedPad Gm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 2
  8: D2 1
  9: C2 2
  11: A1 1
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad:
  0: G3 1
  3: Bb3 21
  6: D4 18
---
# bar 37 — Gm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 1
strings: false
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad: false
---
# bar 38 — Fm; BowedPad Fm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: F2 3
  3: Eb2 2
  5: C2 3
  8: F2 1
  9: Eb2 2
  11: C2 2
strings: "F3_23; A3_23; F4_23"
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad:
  0: A3 24
  3: C4 21
  6: F4 18
---
# bar 39 — Fm descending run; bowedpad holds
_meta:
  repeat_unmentioned_voices: true
bass:
  2: F2 2
  3: Eb2 2
  5: C2 3
  8: C2 1
  9: Eb2 2
  11: C2 1
strings: false
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad: false
---
# bar 40 — Melody enters; Cm A; Kalimba resumes
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad:
  3: C4 21
  6: Eb4 18
melody:
  0: Eb4 1
  1: D4 1
  2: Eb4 1
  3: C4 2
  5: G3 7
---
# bar 41 — Cm B; melody repeats
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
strings: false
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad: false
melody:
  0: Eb4 1
  1: D4 1
  2: Eb4 1
  3: C4 2
  5: G3 7
---
# bar 42 — Gm; melody Gm phrase
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 2
  8: D2 1
  9: C2 2
  11: A1 1
kalimba:
  2: D4 1 damp=2
  4: D4 1 damp=2
  6: D4 1 damp=2
  9: D4 1 damp=2
  11: D4 1 damp=2
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad:
  0: G3 1
  3: Bb3 21
  6: D4 18
melody:
  0: Bb3 1
  1: A3 1
  2: Bb3 1
  3: G3 2
  5: D3 7
---
# bar 43 — Gm; melody repeats
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 1
strings: false
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad: false
melody:
  0: Bb3 1
  1: A3 1
  2: Bb3 1
  3: G3 2
  5: D3 7
---
# bar 44 — Fm; melody Fm phrase
_meta:
  repeat_unmentioned_voices: true
bass:
  0: F2 3
  3: Eb2 2
  5: C2 3
  8: F2 1
  9: Eb2 2
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "F3_23; A3_23; F4_23"
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad:
  0: A3 24
  3: C4 21
  6: F4 18
melody:
  0: A3 1
  1: G3 1
  2: F3 1
  3: F3 2
  5: C4 7
---
# bar 45 — Fm descending run; melody variant
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 1
  2: F2 2
  3: Eb2 1
  4: C2 1
  5: Eb2 2
  6: C2 1
  7: Bb1 1
  8: G1 1
  9: Bb1 1
  10: G1 1
  11: Bb1 1
strings: false
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad: false
melody:
  0: A3 1
  1: G3 1
  2: F3 1
  3: A3 2
  4: G3 2
  5: F3 2
  6: C4 6
---
# bar 46 — Cm A; 6-bar cycle repeats
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad:
  3: C4 21
  6: Eb4 18
melody:
  0: Eb4 1
  1: D4 1
  2: Eb4 1
  3: C4 2
  5: G3 7
---
# bar 47 — Cm B; melody repeats
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
strings: false
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad: false
melody:
  0: Eb4 1
  1: D4 1
  2: Eb4 1
  3: C4 2
  5: G3 7
---
# bar 48 — Gm; melody Gm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 2
  8: D2 1
  9: C2 2
  11: A1 1
kalimba:
  2: D4 1 damp=2
  4: D4 1 damp=2
  6: D4 1 damp=2
  9: D4 1 damp=2
  11: D4 1 damp=2
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad:
  0: G3 1
  3: Bb3 21
  6: D4 18
melody:
  0: Bb3 1
  1: A3 1
  2: Bb3 1
  3: G3 2
  5: D3 7
---
# bar 49 — Gm; melody repeats
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 1
strings: false
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad: false
melody:
  0: Bb3 1
  1: A3 1
  2: Bb3 1
  3: G3 2
  5: D3 7
---
# bar 50 — Fm; melody Fm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: F2 3
  3: Eb2 2
  5: C2 3
  8: F2 1
  9: Eb2 2
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "F3_23; A3_23; F4_23"
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad:
  0: A3 24
  3: C4 24
  6: F4 24
melody:
  0: A3 1
  1: G3 1
  2: F3 1
  3: F3 2
  5: C4 7
---
# bar 51 — Fm descending; melody variant
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 1
  2: F2 2
  3: Eb2 1
  4: C2 1
  5: Eb2 2
  6: C2 1
  7: Bb1 1
  8: G1 1
  9: Bb1 1
  10: G1 1
  11: Bb1 1
strings: false
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad: false
melody:
  0: A3 2
  2: G3 3
  4: F3 2
  6: C4 6
---
# bar 52 — Cm A; melody silent bars 52-81; Kalimba continues; SynString2-B silent
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "Eb3_23; G3_23; C3_23"
ensemble:
  0: C5 5
  5: G4 1
  6: Eb4 3
  8: G4 4
  11: C4 12
bowedpad: false
melody: false
---
# bar 53 — Cm A
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
strings: false
ensemble: false
---
# bar 54 — Cm B; ensemble plays
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 5
  5: G4 2
  6: Eb4 2
  8: G4 4
  11: C4 12
---
# bar 55 — Cm A
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
strings: false
ensemble: false
---
# bar 56 — Gm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 1
kalimba:
  2: D4 1 damp=2
  4: D4 1 damp=2
  6: D4 1 damp=2
  9: D4 1 damp=2
  11: D4 1 damp=2
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: Bb4 5
  5: A4 2
  6: G4 2
  8: A4 4
  11: D4 12
---
# bar 57 — Gm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 2
strings: false
ensemble: false
---
# bar 58 — Fm; SynString1 enters (same as SynString2-A Fm)
_meta:
  repeat_unmentioned_voices: true
bass:
  0: F2 3
  3: Eb2 2
  5: C2 3
  8: F2 1
  9: Eb2 2
  11: C2 2
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "F3_23; A3_23"
ensemble:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
---
# bar 59 — Fm descending
_meta:
  repeat_unmentioned_voices: true
bass:
  2: F2 2
  3: Eb2 2
  5: C2 3
  8: C2 1
  9: Eb2 2
  11: C2 1
strings: false
ensemble:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
---
# bar 60 — Cm A
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "Eb3_23; G3_23; C3_23"
ensemble:
  0: C5 5
  5: G4 1
  6: Eb4 3
  8: G4 4
  11: C4 12
---
# bar 61 — Cm B variant
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 1
  10: G1 1
  11: Bb1 1
strings: false
ensemble: false
---
# bar 62 — Cm A
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 5
  5: G4 2
  6: Eb4 2
  8: G4 4
  11: C4 12
---
# bar 63 — Cm B
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
strings: false
ensemble: false
---
# bar 64 — Gm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 1
kalimba:
  2: D4 1 damp=2
  4: D4 1 damp=2
  6: D4 1 damp=2
  9: D4 1 damp=2
  11: D4 1 damp=2
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: Bb4 5
  5: A4 2
  6: G4 2
  8: A4 4
  11: D4 12
---
# bar 65 — Gm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 1
strings: false
ensemble: false
---
# bar 66 — Fm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: F2 3
  3: Eb2 2
  5: C2 3
  8: F2 1
  9: Eb2 2
  11: C2 2
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "F3_23; A3_23"
ensemble:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
---
# bar 67 — Fm descending
_meta:
  repeat_unmentioned_voices: true
bass:
  2: F2 2
  3: Eb2 1
  4: C2 1
  5: Eb2 2
  6: C2 1
  7: Bb1 1
  8: G1 1
  9: Bb1 1
  10: G1 1
  11: Bb1 1
strings: false
ensemble:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
---
# bar 68 — Cm A
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "Eb3_23; G3_23; C3_23"
ensemble:
  0: C5 5
  5: G4 1
  6: Eb4 3
  8: G4 4
  11: C4 12
---
# bar 69 — Cm B
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
strings: false
ensemble: false
---
# bar 70 — Cm B variant
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 1
  10: G1 1
  11: Bb1 1
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 5
  5: G4 2
  6: Eb4 2
  8: G4 4
  11: C4 12
---
# bar 71 — Cm B
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
strings: false
ensemble: false
---
# bar 72 — Gm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 1
kalimba:
  2: D4 1 damp=2
  4: D4 1 damp=2
  6: D4 1 damp=2
  9: D4 1 damp=2
  11: D4 1 damp=2
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: Bb4 5
  5: A4 2
  6: G4 2
  8: A4 4
  11: D4 12
---
# bar 73 — Gm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 1
strings: false
ensemble: false
---
# bar 74 — Fm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: F2 3
  3: Eb2 2
  5: C2 3
  8: F2 1
  9: Eb2 2
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "F3_23; A3_23"
ensemble:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
---
# bar 75 — Fm descending
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 1
  2: F2 2
  3: Eb2 1
  4: C2 1
  5: Eb2 2
  6: C2 1
  7: Bb1 1
  8: G1 1
  9: Bb1 1
  10: G1 1
  11: Bb1 1
strings: false
ensemble:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 7
---
# bar 76 — SynString2-B high arpeggios resume; BowedPad resumes; Cm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad:
  3: C4 21
  6: Eb4 18
---
# bar 77 — Cm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
strings: false
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad: false
---
# bar 78 — Gm; BowedPad Gm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 2
  8: D2 1
  9: C2 2
  11: A1 1
kalimba:
  2: D4 1 damp=2
  4: D4 1 damp=2
  6: D4 1 damp=2
  9: D4 1 damp=2
  11: D4 1 damp=2
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad:
  0: G3 1
  3: Bb3 21
  6: D4 18
---
# bar 79 — Gm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 1
strings: false
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad: false
---
# bar 80 — Fm; BowedPad Fm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: F2 3
  3: Eb2 2
  5: C2 3
  8: F2 1
  9: Eb2 2
  11: C2 2
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "F3_23; A3_23; F4_23"
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad:
  0: A3 24
  3: C4 21
  6: F4 18
---
# bar 81 — Fm descending; bowedpad holds
_meta:
  repeat_unmentioned_voices: true
bass:
  2: F2 2
  3: Eb2 2
  5: C2 3
  8: C2 1
  9: Eb2 2
  11: C2 1
strings: false
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad: false
---
# bar 82 — Melody returns with elaborate variations; Cm A
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad:
  3: C4 21
  6: Eb4 18
melody:
  0: Eb4 1
  1: D4 1
  2: Eb4 1
  3: C4 2
  5: G3 7
---
# bar 83 — Cm B; melody repeats
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
strings: false
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad: false
melody:
  0: Eb4 1
  1: D4 1
  2: Eb4 1
  3: C4 2
  5: G3 7
---
# bar 84 — Gm; melody Gm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 2
  8: D2 1
  9: C2 2
  11: A1 1
kalimba:
  2: D4 1 damp=2
  4: D4 1 damp=2
  6: D4 1 damp=2
  9: D4 1 damp=2
  11: D4 1 damp=2
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad:
  0: G3 1
  3: Bb3 21
  6: D4 18
melody:
  0: Bb3 1
  1: A3 1
  2: Bb3 1
  3: G3 2
  5: D3 7
---
# bar 85 — Gm; melody repeats
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 1
strings: false
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad: false
melody:
  0: Bb3 1
  1: A3 1
  2: Bb3 1
  3: G3 2
  5: D3 7
---
# bar 86 — Fm; melody Fm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: F2 3
  3: Eb2 2
  5: C2 3
  8: F2 1
  9: Eb2 2
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "F3_23; A3_23; F4_23"
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad:
  0: A3 24
  3: C4 21
  6: F4 18
melody:
  0: A3 1
  1: G3 1
  2: F3 1
  3: F3 2
  5: C4 7
---
# bar 87 — Fm descending; melody extended variant
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 1
  2: F2 2
  3: Eb2 1
  4: C2 1
  5: Eb2 2
  6: C2 1
  7: Bb1 1
  8: G1 1
  9: Bb1 1
  10: G1 1
  11: Bb1 1
strings: false
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad: false
melody:
  0: A3 1
  1: G3 1
  2: F3 1
  3: A3 2
  4: G3 2
  5: F3 2
  6: C4 6
---
# bar 88 — Cm A; melody with fill at t=8
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad:
  3: C4 21
  6: Eb4 18
melody:
  0: Eb4 1
  1: D4 1
  2: Eb4 1
  3: C4 2
  5: G3 3
  8: Eb4 3
  11: G3 1
---
# bar 89 — Cm B; melody with ornaments
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
strings: false
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad: false
melody:
  0: Eb4 1
  1: D4 1
  2: Eb4 1
  3: C4 2
  5: G3 3
  8: Eb4 2
  9: D4 2
  11: C4 1
---
# bar 90 — Gm; melody elaborate Gm variation
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 2
  8: D2 1
  9: C2 2
  11: A1 1
kalimba:
  2: D4 1 damp=2
  4: D4 1 damp=2
  6: D4 1 damp=2
  9: D4 1 damp=2
  11: D4 1 damp=2
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad:
  0: G3 1
  3: Bb3 21
  6: D4 18
melody:
  0: Bb3 1
  1: A3 1
  2: G3 1
  3: Bb3 1
  4: A3 1
  5: G3 2
  6: D4 2
  8: G3 3
  11: G3 1
---
# bar 91 — Gm; melody variant
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 1
strings: false
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad: false
melody:
  0: Bb3 1
  1: A3 1
  2: G3 1
  3: Bb3 2
  5: D3 3
  8: Bb3 2
  9: A3 2
  11: G3 1
---
# bar 92 — Fm; melody ascending run
_meta:
  repeat_unmentioned_voices: true
bass:
  0: F2 3
  3: Eb2 2
  5: C2 3
  8: F2 1
  9: Eb2 2
  11: C2 2
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "F3_23; A3_23; F4_23"
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad:
  0: A3 24
  3: C4 21
  6: F4 18
melody:
  0: A3 2
  2: F3 2
  4: A3 2
  6: C4 2
  8: A3 2
  10: C4 2
---
# bar 93 — Fm; melody high run
_meta:
  repeat_unmentioned_voices: true
bass:
  2: F2 2
  3: Eb2 2
  5: C2 3
  8: C2 1
  9: Eb2 2
  11: C2 1
strings: false
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad: false
melody:
  0: F4 2
  2: C4 3
  4: F4 2
  6: A4 2
  8: F4 4
---
# bar 94 — Cm; melody high Cm phrase
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad:
  3: C4 21
  6: Eb4 18
melody:
  0: Eb5 1
  1: D5 1
  2: Eb5 1
  3: C5 2
  5: G4 3
  8: Eb5 3
  11: G4 1
---
# bar 95 — Cm; melody ornament
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
strings: false
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad: false
melody:
  0: Eb5 2
  2: G4 1
  3: D5 2
  5: C5 3
  8: G4 4
---
# bar 96 — Gm; melody high Gm phrase
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 2
  8: D2 1
  9: C2 2
  11: A1 1
kalimba:
  2: D4 1 damp=2
  4: D4 1 damp=2
  6: D4 1 damp=2
  9: D4 1 damp=2
  11: D4 1 damp=2
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad:
  0: G3 1
  3: Bb3 21
  6: D4 18
melody:
  0: Bb4 1
  1: A4 1
  2: Bb4 2
  3: G4 2
  5: D4 4
  8: Bb4 3
  11: D4 1
---
# bar 97 — Gm; melody elaborate
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 1
strings: false
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad: false
melody:
  0: Bb4 1
  1: A4 1
  2: G4 1
  3: Bb4 1
  4: A4 1
  5: G4 2
  6: D5 2
  8: G4 4
---
# bar 98 — Fm; melody Fm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: F2 3
  3: Eb2 2
  5: C2 3
  8: F2 1
  9: Eb2 2
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "F3_23; A3_23; F4_23"
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad:
  0: A3 24
  3: C4 21
  6: F4 18
melody:
  0: A4 1
  1: G4 1
  2: F4 1
  3: F4 2
  5: C5 3
  8: F4 3
  11: F4 1
---
# bar 99 — Fm descending; melody
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 1
  2: F2 2
  3: Eb2 1
  4: C2 1
  5: Eb2 2
  6: C2 1
  7: Bb1 1
  8: G1 1
  9: Bb1 1
  10: G1 1
  11: Bb1 1
strings: false
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad: false
melody:
  0: A4 2
  2: G4 1
  3: F4 2
  5: C5 3
  8: F4 4
---
# bar 100 — Cm; melody high Cm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad:
  3: C4 21
  6: Eb4 18
melody:
  0: Eb5 1
  1: D5 1
  2: Eb5 1
  3: C5 2
  5: G4 3
  8: Eb5 3
  11: G4 1
---
# bar 101 — Cm; melody ornament
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
strings: false
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad: false
melody:
  0: Eb5 2
  2: G4 1
  3: D5 2
  5: C5 3
  8: G4 3
  11: G4 1
---
# bar 102 — Gm; melody elaborate Gm variation
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 2
  8: D2 1
  9: C2 2
  11: A1 1
kalimba:
  2: D4 1 damp=2
  4: D4 1 damp=2
  6: D4 1 damp=2
  9: D4 1 damp=2
  11: D4 1 damp=2
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad:
  0: G3 1
  3: Bb3 21
  6: D4 18
melody:
  0: D5 1
  1: C5 1
  2: Bb4 1
  3: D5 1
  4: C5 1
  5: Bb4 1
  6: D5 2
  8: G4 3
  11: G4 1
---
# bar 103 — Gm; melody variation
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 1
strings: false
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad: false
melody:
  0: D5 1
  1: C5 1
  2: D5 1
  3: Bb4 2
  5: G4 3
  8: D5 1
  9: C5 2
  11: Bb4 1
---
# bar 104 — Fm; melody Fm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: F2 3
  3: Eb2 2
  5: C2 3
  8: F2 1
  9: Eb2 2
  11: C2 2
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "F3_23; A3_23; F4_23"
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad:
  0: A3 24
  3: C4 21
  6: F4 18
melody:
  0: A4 2
  2: G4 1
  3: F4 2
  5: C5 3
  8: F4 3
  11: F4 1
---
# bar 105 — Fm; melody ornament
_meta:
  repeat_unmentioned_voices: true
bass:
  2: F2 2
  3: Eb2 2
  5: C2 3
  8: C2 1
  9: Eb2 2
  11: C2 1
strings: false
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad: false
melody:
  0: A4 1
  1: G4 1
  2: A4 1
  3: F4 2
  5: C5 3
  8: F4 4
---
# bar 106 — Cm; melody Cm with fill
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad:
  3: C4 21
  6: Eb4 18
melody:
  0: Eb4 1
  1: D4 1
  2: Eb4 1
  3: C4 2
  5: G3 3
  8: Eb4 3
  11: G3 1
---
# bar 107 — Cm; melody ornament run
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
strings: false
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad: false
melody:
  0: Eb4 1
  1: D4 1
  2: C4 1
  3: Eb4 1
  4: D4 1
  5: C4 1
  6: Eb4 2
  8: G3 3
  11: G3 1
---
# bar 108 — Gm; melody Gm with fill
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 2
  8: D2 1
  9: C2 2
  11: A1 1
kalimba:
  2: D4 1 damp=2
  4: D4 1 damp=2
  6: D4 1 damp=2
  9: D4 1 damp=2
  11: D4 1 damp=2
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad:
  0: G3 1
  3: Bb3 21
  6: D4 18
melody:
  0: Bb3 1
  1: A3 1
  2: Bb3 2
  3: G3 2
  5: D3 4
  8: Bb3 3
  11: D3 1
---
# bar 109 — Gm; melody variation
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 1
strings: false
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad: false
melody:
  0: D4 1
  1: C4 1
  2: Bb3 1
  3: D4 1
  4: C4 1
  5: Bb3 2
  6: D4 2
  8: G3 4
---
# bar 110 — Fm; melody Fm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: F2 3
  3: Eb2 2
  5: C2 3
  8: F2 1
  9: Eb2 2
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "F3_23; A3_23; F4_23"
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad:
  0: A3 24
  3: C4 21
  6: F4 18
melody:
  0: A3 1
  1: G3 1
  2: F3 1
  3: F3 2
  5: C4 3
  8: F3 3
  11: F3 1
---
# bar 111 — Fm; melody extended run
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 1
  2: F2 2
  3: Eb2 1
  4: C2 1
  5: Eb2 2
  6: C2 1
  7: Bb1 1
  8: G1 1
  9: Bb1 1
  10: G1 1
  11: Bb1 1
strings: false
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad: false
melody:
  0: A3 1
  1: G3 1
  2: F3 1
  3: A3 1
  4: G3 1
  5: F3 1
  6: C4 3
  8: F3 4
---
# bar 112 — Cm; melody high Cm phrase (last cycle)
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: G1 1
  9: Bb1 2
  11: G1 1
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad:
  3: C4 21
  6: Eb4 18
melody:
  0: Eb5 1
  1: D5 1
  2: Eb5 1
  3: C5 2
  5: G4 3
  8: Eb5 3
  11: G4 1
---
# bar 113 — Cm; melody ornament
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 3
  3: Bb1 2
  5: C2 3
  8: C2 1
  9: Bb1 2
  11: G1 1
strings: false
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad: false
melody:
  0: Eb5 2
  2: G4 1
  3: D5 2
  5: C5 3
  8: G4 3
  11: G4 1
---
# bar 114 — Gm; melody Gm
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 2
  8: D2 1
  9: C2 2
  11: A1 1
kalimba:
  2: D4 1 damp=2
  4: D4 1 damp=2
  6: D4 1 damp=2
  9: D4 1 damp=2
  11: D4 1 damp=2
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad:
  0: G3 1
  3: Bb3 21
  6: D4 18
melody:
  0: D5 1
  1: C5 1
  2: Bb4 1
  3: D5 1
  4: C5 1
  5: Bb4 1
  6: D5 2
  8: G4 3
  11: G4 1
---
# bar 115 — Gm; melody variation
_meta:
  repeat_unmentioned_voices: true
bass:
  0: D2 3
  3: C2 2
  5: D2 3
  8: D2 1
  9: C2 2
  11: A1 1
strings: false
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad: false
melody:
  0: D5 1
  1: C5 1
  2: D5 1
  3: Bb4 2
  5: G4 3
  8: D5 1
  9: C5 2
  11: Bb4 1
---
# bar 116 — Fm; fade out begins; melody Fm final
_meta:
  repeat_unmentioned_voices: true
bass:
  0: F2 3
  3: Eb2 2
  5: C2 3
  8: F2 1
  9: Eb2 2
kalimba:
  2: C4 1 damp=2
  4: C4 1 damp=2
  6: C4 1 damp=2
  9: C4 1 damp=2
  11: C4 1 damp=2
strings: "F3_11; A3_11; F4_11"
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad:
  3: C4 9
  6: F4 6
melody:
  0: A4 2
  2: G4 1
  3: F4 2
  5: C5 3
  8: F4 3
  11: F4 1
---
# bar 117 — fade to silence
_meta:
  repeat_unmentioned_voices: true
bass:
  0: C2 1
  2: F2 2
  3: Eb2 1
  4: C2 1
  5: Eb2 2
  6: C2 1
  7: Bb1 1
  8: G1 1
  9: Bb1 1
  10: G1 1
  11: Bb1 1
kalimba: false
strings: false
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad:
  0: A3 1
  3: C4 8
  6: F4 4
tambourine: false
melody:
  0: A4 1
  1: G4 1
  2: A4 1
  3: F4 2
  5: C5 3
  8: F4 4`

const SEEDS: Seed[] = [
  // Oxygène Pt. IV — Jarre (1976): default project on first run.
  { name: 'oxygene',         ext: 'spls', body: OXYGENE,            inProject: true },
  { name: 'filtered-bass',   ext: 'spli', body: OXYGENE_BASS,       inProject: true },
  { name: 'kalimba',         ext: 'spli', body: OXYGENE_KALIMBA,    inProject: true },
  { name: 'synbrass',        ext: 'spli', body: OXYGENE_SYNBRASS,   inProject: true },
  { name: 'synstrings',      ext: 'spli', body: OXYGENE_STRINGS,    inProject: true },
  { name: 'string-ensemble', ext: 'spli', body: OXYGENE_ENSEMBLE,   inProject: true },
  { name: 'bowed-pad',       ext: 'spli', body: OXYGENE_BOWEDPAD,   inProject: true },
  { name: 'oxygene-melody',  ext: 'spli', body: OXYGENE_MELODY,     inProject: true },
  { name: 'tambourine',      ext: 'spli', body: OXYGENE_TAMBOURINE, inProject: true },
  { name: 'seashore',        ext: 'spli', body: OXYGENE_SEASHORE,   inProject: true },
  { name: 'tones_euro',      ext: 'splt', body: STARTER_TUNING,     inProject: true },
  { name: 'oxygene-plate',  ext: 'splr', body: OXYGENE_PLATE_ROOM, inProject: true },

  // Dev instruments and legacy examples.
  { name: 'dev/piano', ext: 'spli', body: STARTER_PIANO, inProject: false },
  { name: 'dev/flute', ext: 'spli', body: STARTER_FLUTE, inProject: false },
  { name: 'dev/kick', ext: 'spli', body: STARTER_KICK, inProject: false },
  { name: 'free-field', ext: 'splr', body: STARTER_FREE_FIELD, inProject: false },
  { name: 'alle_meine_entchen', ext: 'spls', body: ALLE_MEINE_ENTCHEN, inProject: false },
]

export async function seedDefaults(): Promise<void> {
  for (const seed of SEEDS) {
    if (await getFile(seed.name, seed.ext)) continue
    await putFile(seed)
  }
}
