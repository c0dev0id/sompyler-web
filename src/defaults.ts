/**
 * R8: starter content seeded on first run.
 *
 * The showcase is Darude — Sandstorm (1999), an electronic piece that
 * exercises FM synthesis (kick drum), noise-based percussion, sawtooth
 * and square-wave synth voices, repeat_unmentioned_voices inheritance,
 * and the chain voice syntax. All five instruments are seeded in-project.
 *
 * Pachelbel Canon in D is preserved in staging (inProject: false) because
 * the conformance suite uses it as a regression fixture. It is NOT loaded
 * into the user's project on first run.
 *
 * In-project (starter song works out of the box):
 *   - `sandstorm.spls` — five-voice electronic showcase.
 *   - `sandstorm-lead/bass/kick/snare/hihat.spli` — synth + FM instruments.
 *   - `tones_euro.splt` — equal-temperament tuning with chr/mj/mn scales.
 *
 * In staging (conformance, dev tools, examples):
 *   - `pachelbel.spls`, `violin.spli`, `cello.spli`, `pachelbel-hall.splr`
 *   - `pachelbel-piano.spls`, `piano.spli`
 *   - `dev/piano.spli`, `dev/flute.spli`, `dev/kick.spli`
 *   - `free-field.splr`, `alle_meine_entchen.spls`
 */

import { getFile, putFile, type FileExtension } from './storage/files'

interface Seed {
  name: string
  ext: FileExtension
  body: string
  inProject: boolean
}

// Showcase content is exported by name so the conformance suite can pin
// it directly (the seeded `.spls`/`.spli` text *is* the authoritative
// source, unlike third-party fixtures we mirror from Sompyler).
export {
  // Sandstorm — active UI showcase
  SANDSTORM as STARTER_SANDSTORM,
  SANDSTORM_LEAD as STARTER_SANDSTORM_LEAD,
  SANDSTORM_BASS as STARTER_SANDSTORM_BASS,
  SANDSTORM_SNARE as STARTER_SANDSTORM_SNARE,
  SANDSTORM_HIHAT as STARTER_SANDSTORM_HIHAT,
  SANDSTORM_PAD as STARTER_SANDSTORM_PAD,
  // Pachelbel — kept in staging for the conformance suite
  PACHELBEL as STARTER_PACHELBEL,
  PACHELBEL_PIANO as STARTER_PACHELBEL_PIANO,
  VIOLIN as STARTER_VIOLIN,
  CELLO as STARTER_CELLO,
  PIANO as STARTER_PIANO_RAILSBACK,
}

// =====================================================================
// Pachelbel's Canon in D — four-voice strings showcase.
// =====================================================================
//
// 12 measures at 8 ticks/measure, ticks_per_minute=120 ⇒ 4 s / measure,
// 48 s total. Bass ostinato (cello) plays the 8-chord progression in
// half-notes (2 ticks each). Violins play the canon melody in eighth-
// note ticks. Each violin enters two measures after the previous one;
// once all are in (m7), the 3-phrase melody cycles every three measures.
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
amp: 0.85
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

// =====================================================================
// Darude — Sandstorm (1999): five-voice electronic showcase.
// =====================================================================
//
// Key: E minor. Tempo: 136 BPM. Tick grid: 16th note (ticks_per_minute=544).
// 1 measure = 16 ticks. 12 measures ≈ 21 s total.
//
// Voices:
//   lead  — sawtooth synth, 16th-note arpeggio (the iconic trance sound)
//   bass  — square-wave synth bass, quarter-note root pumping
//   kick  — FM kick (sandstorm-kick = same body as dev/kick)
//   snare — noise burst on beats 2 & 4
//   hihat — noise on every 16th note
//
// Chord progression (from the MIDI): Em Em Em D | Em Em Em D (4-bar loop × 3)
// Em arpeggio (down then mid): B5 G5 E5 G5 × 4 per bar
// D  arpeggio (down then mid): A5 F#5 D5 F#5 × 4 per bar
const SANDSTORM = `title: Sandstorm
author: Darude (1999)
stage:
  lead:  1|1 0.0 sandstorm-lead
  bass:  1|1 0.0 sandstorm-bass
  pad:   1|1 0.0 sandstorm-pad
  kick:  1|1 0.0 sandstorm-kick
  snare: 1|1 0.0 sandstorm-snare
  hihat: 1|1 0.0 sandstorm-hihat
tuning_config: tones_euro
---
# m0 — intro: kick + hi-hat only
_meta:
  ticks_per_minute: 544
  stress_pattern: "4,1,2,1,2,1,2,1,3,1,2,1,2,1,2,1"
  lower_stress_bound: 70
  upper_stress_bound: 100
kick:
  0,4,8,12: C1 1 damp=3
hihat:
  0+1*16: A6 1
---
# m1 — snare enters on beats 2 and 4
_meta:
  repeat_unmentioned_voices: true
snare:
  4: D4 1
  12: D4 1
---
# m2 — bass + pad enter: Em
_meta:
  repeat_unmentioned_voices: true
snare: true
bass:
  0,4,8,12: E2 4
pad: "E4_15; G4_15; B4_15"
---
# m3 — Em continues
_meta:
  repeat_unmentioned_voices: true
snare: true
bass: true
pad: true
---
# m4 — MAIN DROP: lead arpeggio enters (Em: B5 G5 E5 G5 × 4)
_meta:
  repeat_unmentioned_voices: true
snare: true
bass: true
pad: true
lead: "B5 G5 E5 G5 B5 G5 E5 G5 B5 G5 E5 G5 B5 G5 E5 G5"
---
# m5 — Em continues
_meta:
  repeat_unmentioned_voices: true
snare: true
bass: true
pad: true
lead: true
---
# m6 — Em continues
_meta:
  repeat_unmentioned_voices: true
snare: true
bass: true
pad: true
lead: true
---
# m7 — D bar: arpeggio + pad shift to D major
_meta:
  repeat_unmentioned_voices: true
snare: true
bass:
  0,4,8,12: D2 4
pad: "D4_15; F#4_15; A4_15"
lead: "A5 F#5 D5 F#5 A5 F#5 D5 F#5 A5 F#5 D5 F#5 A5 F#5 D5 F#5"
---
# m8 — Em returns (second loop)
_meta:
  repeat_unmentioned_voices: true
snare: true
bass:
  0,4,8,12: E2 4
pad: "E4_15; G4_15; B4_15"
lead: "B5 G5 E5 G5 B5 G5 E5 G5 B5 G5 E5 G5 B5 G5 E5 G5"
---
# m9 — Em
_meta:
  repeat_unmentioned_voices: true
snare: true
bass: true
pad: true
lead: true
---
# m10 — Em
_meta:
  repeat_unmentioned_voices: true
snare: true
bass: true
pad: true
lead: true
---
# m11 — D close
_meta:
  repeat_unmentioned_voices: true
snare: true
bass:
  0,4,8,12: D2 4
pad: "D4_15; F#4_15; A4_15"
lead: "A5 F#5 D5 F#5 A5 F#5 D5 F#5 A5 F#5 D5 F#5 A5 F#5 D5 F#5"
`

// =====================================================================
// Sandstorm instruments.
// =====================================================================

const SANDSTORM_LEAD = `# sandstorm-lead: bright sawtooth synth, short staccato release.
amp: 0.35
oscillator: saw
envelope:
  attack: 0.005
  release: 0.06
  sustainLevel: 0.92
`

const SANDSTORM_BASS = `# sandstorm-bass: punchy square-wave synth bass.
amp: 0.5
oscillator: square
envelope:
  attack: 0.008
  release: 0.12
  sustainLevel: 0.85
`

const SANDSTORM_SNARE = `# sandstorm-snare: noise burst, sharp transient.
amp: 0.7
oscillator: noise
envelope:
  attack: 0.001
  release: 0.12
  sustainLevel: 0.6
`

const SANDSTORM_HIHAT = `# sandstorm-hihat: very short noise burst hi-hat.
amp: 0.25
oscillator: noise
envelope:
  attack: 0.001
  release: 0.03
  sustainLevel: 0.3
`

// Pad 3 (polysynth) approximation — GM program 91.
// Three saw copies near freqMult 1.0 beat at ~2 Hz (at E4: 329.6 Hz × 0.006),
// producing the characteristic slowly-wavering ensemble/chorus pad sound.
// Octave copies reinforce the low-mid body.
const SANDSTORM_PAD = `# sandstorm-pad: Pad 3 (polysynth) — stacked detuned saw oscillators.
amp: 0.28
oscillator: saw
envelope:
  attack: 0.35
  release: 1.8
  sustainLevel: 0.88
partials:
  - { freqMult: 1.000, amp: 1.0 }
  - { freqMult: 1.006, amp: 0.75 }
  - { freqMult: 0.994, amp: 0.75 }
  - { freqMult: 2.000, amp: 0.45 }
  - { freqMult: 2.005, amp: 0.30 }
`

const SEEDS: Seed[] = [
  // Sandstorm — the active UI showcase (in-project on first run).
  { name: 'sandstorm', ext: 'spls', body: SANDSTORM, inProject: true },
  { name: 'sandstorm-lead', ext: 'spli', body: SANDSTORM_LEAD, inProject: true },
  { name: 'sandstorm-bass', ext: 'spli', body: SANDSTORM_BASS, inProject: true },
  { name: 'sandstorm-kick', ext: 'spli', body: STARTER_KICK, inProject: true },
  { name: 'sandstorm-snare', ext: 'spli', body: SANDSTORM_SNARE, inProject: true },
  { name: 'sandstorm-hihat', ext: 'spli', body: SANDSTORM_HIHAT, inProject: true },
  { name: 'sandstorm-pad',   ext: 'spli', body: SANDSTORM_PAD,   inProject: true },
  { name: 'tones_euro', ext: 'splt', body: STARTER_TUNING, inProject: true },

  // Pachelbel — moved to staging; used by conformance suite, not loaded in UI.
  { name: 'pachelbel', ext: 'spls', body: PACHELBEL, inProject: false },
  { name: 'violin', ext: 'spli', body: VIOLIN, inProject: false },
  { name: 'cello', ext: 'spli', body: CELLO, inProject: false },
  { name: 'pachelbel-hall', ext: 'splr', body: PACHELBEL_HALL, inProject: false },
  { name: 'pachelbel-piano', ext: 'spls', body: PACHELBEL_PIANO, inProject: false },
  { name: 'piano', ext: 'spli', body: PIANO, inProject: false },

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
