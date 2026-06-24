/**
 * Starter content seeded on first run.
 *
 * In-project (loads automatically):
 *   - `oxygene.spls` — Jean-Michel Jarre "Oxygène Pt. IV" (1976), full 117-bar transcription.
 *   - `filtered-bass/oxygene-kick/kalimba/synbrass/synstrings2/synstrings1/string-ensemble/bowed-pad/oxygene-melody/tambourine/seashore/hi-hat/guiro/castanet/reverse-cymbal/applause.spli`
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
  OXYGENE_HIHAT as OXYGENE_HIHAT,
  OXYGENE_GUIRO as OXYGENE_GUIRO,
  OXYGENE_CASTANET as OXYGENE_CASTANET,
  OXYGENE_REVERSE_CYMBAL as OXYGENE_REVERSE_CYMBAL,
  OXYGENE_APPLAUSE as OXYGENE_APPLAUSE,
}

// =====================================================================
//
const PACHELBEL = `title: Pachelbel — Canon in D
composer: Johann Pachelbel (arr. for Sompyler)
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
  beats_per_minute: 15
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
composer: Johann Pachelbel (arr. for Sompyler)
stage:
  piano: 1|1 0.4 piano
tuning_config: tones_euro
room: pachelbel-hall
---
# Bass + melody combined for a single instrument. Damp emulates sustain pedal.
_meta:
  beats_per_minute: 15
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
character:
  O: sine
  AMP: 0.35
  A: "0.05:1,100"
  S: "0.001:100;1,85"
  R: "0.25:100;1,0"
  PROFILE: [100, 55, 40, 28, 18, 10]
`

const CELLO = `# Cello: deeper, slower attack; favours lower partials, gentler decay.
character:
  O: sine
  AMP: 0.45
  A: "0.08:1,100"
  S: "0.001:100;1,80"
  R: "0.5:100;1,0"
  PROFILE: [100, 65, 30, 18, 9]
`

// Piano with S32136 railsback: high keys stretch sharper than 12-TET,
// low keys flatten — the curve goes from -0.01 octaves at A0 (≈-12 cents)
// up to +0.02 octaves at C8 (≈+24 cents). Mild but audible.
const PIANO = `# Piano: hammered-string approximation. Decaying sustain with rich
# upper partials, mild S32136 railsback inharmonicity.
character:
  O: sine
  AMP: 0.5
  A: "0.005:1,100"
  S: "0.001:100;1,55"
  R: "0.6:100;1,0"
  PROFILE: [100, 50, 30, 18, 10, 6]
  RAILSBACK_CURVE:
    - 27.5
    - 4186
    - "0;100,0.02"
`

// Hall reverb: two-level echo train, gentle border falloff.
const PACHELBEL_HALL = `# pachelbel-hall.splr — modest hall with a two-tap echo.
name: pachelbel hall
levels: "120:80;60,40;120,5"
delays: "120:0;30,40;120,80"
border: "120:0;120,100"
`

const STARTER_PIANO = `character:
  O: sine
  AMP: 0.5
  A: "0.005:1,100"
  S: "0.001:100;1,70"
  R: "0.4:100;1,0"
  PROFILE: [100, 50, 25, 12]
`

const STARTER_FLUTE = `character:
  O: triangle
  AMP: 0.4
  A: "0.05:1,100"
  S: "0.001:100;1,90"
  R: "0.2:100;1,0"
  PROFILE: [100, 15, 5]
`

// FM kick drum: near-DC modulator (1 Hz) starts at peak (initPhase=0.25) so
// the carrier begins at 4× its base frequency and sweeps to base in the first
// 10% of the note. Score notes at a low pitch (C1 = 32.7 Hz) for best thump.
// Shape "100:1;0.1,0;1,0": depth decays 1→0 over the first 10% then stays 0.
export const STARTER_KICK = `# dev/kick.spli — FM kick drum with pitch sweep (RFC §S32117).
# Score at C1 (32.7 Hz). FM 15:1 +90 sweeps carrier from ~62 Hz to C1 in first ~50 ms.
character:
  O: sine
  AMP: 0.90
  A: "0.002:1,100"
  S: "0.001:100;1,100"
  R: "0.3:100;1,0"
  FM: "1[100:1;0.1,0;1,0];15:1+90"
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
composer: trad.
stage:
  piano: 1|1 0 dev/piano
---
_meta:
  stress_pattern: "2,0,1,0;1,0"
  beats_per_minute: 70
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
wet: 0.4
pre_delay_ms: 10
`

const OXYGENE_KICK = `# oxygene-kick.spli — FM kick drum with pitch sweep (RFC §S32117).
# Score at C1 (32.7 Hz). FM 15:1 +90 starts modulator at positive peak,
# sweeping carrier from ~1.88× base (~62 Hz) down to base in first ~50 ms.
character:
  O: sine
  AMP: 1
  A: "0.002:1,100"
  S: "0.001:100;1,100"
  R: "0.28:100;1,0"
  FM: "1[100:1;0.1,0;1,0];15:1+90"
`

const OXYGENE_BASS = `# bass: Fretless Bass (GM36 / FluidR3_GM2.sf2). PROFILE from loop FFT.
# Sample: 'Fretless A3'  root=69  rate=48000 Hz  loop=815fr (17.0ms)
# PROFILE from TiMidity at C2 (note=36) t=0.23s. S: models 13 dB string decay.
# R: fast drop + 0.6s tail. AMP tuned to match TiMidity onset level.
character:
  O: sine
  AMP: 0.7
  A: "0.001:1,100"
  S: "2.999:100;0.10,68;0.20,50;0.50,32;1,13"
  R: "0.001:100;0.03,1.8*6;0.6,2.5;1,0"
  PROFILE:
    - 100.0  # H1
    - 90.1   # H2
    - 89.5   # H3
    - 87.4   # H4
    - 87.2   # H5
    - 83.1   # H6
    - 78.0   # H7
    - 82.1   # H8
    - 77.4   # H9
    - 70.1   # H10
    - 69.5   # H11
    - 67.0   # H12
    - 59.0   # H13
    - 59.1   # H14
    - 51.7   # H15
    - 44.7   # H16
    - 42.0   # H17
    - 38.0   # H18
    - 34.0   # H19
    - 30.0   # H20
    - 26.0   # H21
    - 22.0   # H22
    - 19.0   # H23
    - 16.0   # H24
`

const OXYGENE_KALIMBA = `# kalimba: Koto (GM108 / FluidR3_GM2.sf2). PROFILE from loop FFT.
# Sample: 'Koto C 5(R)'  root=60  rate=44100 Hz  loop=338fr (7.7ms)
# PROFILE from TiMidity at C4 (note=60) t=0.23s. S: models plucked decay to silence.
# R: three-stage release shape for natural note-off.
character:
  O: sine
  AMP: 0.05
  A: "0.001:1,100"
  S: "2.5:100;0.03,55*2;0.08,12*2;0.2,2.2;0.5,0.4;1,0.25"
  R: "0.3:100;0.22,65;0.65,55;1,40"
  PROFILE:
    - 100.0  # H1
    - 100.0  # H2
    - 100.0  # H3
    - 83.2   # H4
    - 100.0  # H5
    - 89.6   # H6
    - 85.1   # H7
    - 91.3   # H8
    - 91.9   # H9
    - 86.9   # H10
    - 80.2   # H11
    - 81.1   # H12
    - 91.8   # H13
    - 81.5   # H14
    - 81.7   # H15
    - 65.4   # H16
    - 62.4   # H17
    - 60.4   # H18
    - 54.3   # H19
    - 46.7   # H20
    - 37.0   # H21
    - 44.1   # H22
    - 48.1   # H23
    - 25.7   # H24
`

const OXYGENE_SYNBRASS = `character:
  O: sine
  AMP: 0.09
  A: "0.12:0.1,250;0.5,220;0.8,140;1,100"
  S: "3.0:100;0.32,60;0.33,155;0.4,120;0.5,2*2;0.65,50;1,100"
  T: "0.3:150;0.5,130;1,100"
  R: "0.01:100;0.05,0.7*8;1,0"
  VCF: "500;0.5;4539;0.001;1.029"
  LFO: "1.0@sin[1.5];0.8:amp"
  UNISON: "2;4"
  PROFILE:
    - 100.0  # H1
    - 92.4   # H2
    - 98.6   # H3
    - 87.5   # H4
    - 81.8   # H5
    - 83.1   # H6
    - 65.6   # H7
    - 65.5   # H8
    - 64.2   # H9
    - 58.4   # H10
    - 61.2   # H11
    - 53.2   # H12
    - 65.2   # H13
    - 57.8   # H14
    - 67.5   # H15
    - 62.0   # H16
    - 55.2   # H17
    - 43.8   # H18
    - 56.1   # H19
    - 49.5   # H20
    - 54.6   # H21
    - 53.3   # H22
    - 48.1   # H23
    - 42.4   # H24
`

const OXYGENE_STRINGS = `# synstrings2: Synth Strings 2 (GM52 / FluidR3_GM2.sf2).
# Sample: 'saw-fb-110'  root=60  rate=44100 Hz  loop=401fr (9.1ms)
# PROFILE updated L2: replaced O:sawtooth with O:sine + PROFILE from TiMidity at Eb3.
# VCF removed — baked into PROFILE. Vibrato LFO retained.
# initialAttn=0 → AMP=0.5. Loop 1 set AMP=0.05; L2 keeps it (power similar).
character:
  O: sine
  AMP: 0.4
  A: "0.001:1,100"
  S: "0.001:100;1,100.0"
  R: "0.5:100;0.04,90;0.2,15;0.4,2;0.6,0.1;1,0"
  LFO:
    - "8.18@sin[0.37];15.000:pitch"
    - "1.0@sin[0];0.15:amp"
  UNISON: "2;3"
  PROFILE:
    - 100.0  # H1
    - 91.4   # H2
    - 86.4   # H3
    - 85.4   # H4
    - 81.1   # H5
    - 63.5   # H6
    - 76.4   # H7
    - 68.3   # H8
    - 68.1   # H9
    - 68.0   # H10
    - 67.5   # H11
    - 70.5   # H12
    - 68.2   # H13
    - 63.6   # H14
    - 65.5   # H15
    - 60.4   # H16
`

const OXYGENE_STRINGS1 = `# strings: Synth Strings 1 (GM51 / FluidR3_GM2.sf2).
# PROFILE calibrated at A4 against TiMidity FluidR3_GM2 reference.
character:
  O: sine
  AMP: 0.017
  A: "0.001:1,100"
  S: "0.001:100;1,100.0"
  R: "0.5:100;0.04,90;0.2,15;0.4,2;0.6,0.1;1,0"
  LFO:
    - "8.18@sin[0.37];15.000:pitch"
    - "1.0@sin[0];0.15:amp"
  UNISON: "2;3"
  PROFILE:
    - 100.0  # H1
    - 96.0   # H2
    - 88.4   # H3
    - 82.2   # H4
    - 83.2   # H5
    - 76.2   # H6
    - 71.6   # H7
    - 72.1   # H8
    - 69.4   # H9
    - 61.1   # H10
    - 66.9   # H11
    - 68.3   # H12
    - 60.2   # H13
    - 64.4   # H14
    - 65.2   # H15
    - 59.7   # H16
`

const OXYGENE_ENSEMBLE = `# ensemble: String Ensemble 1 (GM49 / FluidR3_GM2.sf2). PROFILE from loop FFT.
# Sample: 'Strings C#5L'  root=60  rate=32000 Hz  loop=30844fr (963.9ms)
# PROFILE updated L10: from TiMidity at G4 (note=67) t=1.5s.
# L10: AMP raised 0.020→0.035 (sample builds up 7 dB; 0.035 is a compromise).
character:
  O: sine
  AMP: 0.13
  A: "2.0:1;0.05,40;0.15,70;0.5,90;1,100"
  S: "0.001:100;1,85"
  R: "0.001:100;0.05,50;0.1,15;0.2,2;0.3,0.5;0.5,0.05;1,0"
  LFO: "0.5@sin[0];0.1:amp"
  UNISON: "3;6"
  PROFILE:
    - 100.0  # H1
    - 97.6   # H2
    - 94.0   # H3
    - 100.0  # H4
    - 85.6   # H5
    - 84.7   # H6
    - 78.8   # H7
    - 74.7   # H8
    - 77.6   # H9
    - 69.4   # H10
    - 63.6   # H11
    - 63.8   # H12
    - 63.0   # H13
    - 59.0   # H14
    - 59.1   # H15
    - 52.6   # H16
`

const OXYGENE_BOWEDPAD = `# bowedpad: Bowed Glass (GM93 / FluidR3_GM2.sf2).
# Sample: 'Bowed Glass'  root=60  rate=44100 Hz  loop=252fr (5.7ms)
# PROFILE updated L1+: TiMidity C4 spectrum; H2/H5 trimmed. QUALITY L1=6.3.
# VCF removed — already baked into PROFILE from TiMidity measurement.
# LFO 0.9Hz amp tremolo (phase+108°, delay=0.5s) models bow ripple. S: steepened.
character:
  O: sine
  AMP: 0.3
  A: "0.175:12;1,100"
  S: "0.3:100;0.08,68;1,40"
  R: "0.01:100;0.18,1;0.48,4;1,0"
  LFO: "0.9@sin[0.5];0.16:amp+108"
  PROFILE:
    - 100.0  # H1
    - 100.4  # H2  (was 86.4, +14 correction; +0.4 spectrum trim)
    - 94.2   # H3  (was 83.0, +11.2 correction)
    - 86.8   # H4  (was 94.8, -8.0 correction)
    - 100.9  # H5  (was 82.9, +18.0 correction; +0.9 spectrum trim)
    - 71.0   # H6  (was 78.8, -7.8 correction)
    - 67.9   # H7  (was 78.7, -10.8 correction)
    - 66.0   # H8  (was 76.8, -10.8 correction)
    - 56.8   # H9  (was 74.0, -17.2 correction)
    - 53.0   # H10 (was 75.9, -22.9 correction)
    - 46.2   # H11 (was 76.5, -30.3 correction)
    - 49.2   # H12 (was 72.1, -22.9 correction)
    - 57.2   # H13 (was 68.0, -10.8 correction)
    - 47.6   # H14 (was 70.3, -22.7 correction)
    - 76.5   # H15 (was 70.6, +5.9 correction)
    - 52.4   # H16 (was 69.0, -16.6 correction)
    - 64.0   # H17
    - 60.0   # H18
    - 56.0   # H19
    - 52.0   # H20
    - 48.0   # H21
    - 44.0   # H22
    - 40.0   # H23
    - 36.0   # H24
`

const OXYGENE_MELODY = `# melody: Nylon String Guitar (GM25 / FluidR3_GM2.sf2). PROFILE from loop FFT.
# Sample: 'Nylon B4'  root=60  rate=44100 Hz  loop=357fr (8.1ms)
# PROFILE updated L10: from TiMidity at G3 (note=55) t=1.5s during flat sustain.
# L10: changed S to flat sustain (sample loops — flat amplitude throughout note).
# initialAttn=0 → AMP=0.5; tuned AMP=0.042 (close match at t=0.05).
character:
  O: sine
  AMP: 0.15
  A: "0.001:1,100"
  S: "3.0:100;0.5,30;1,5"
  R: "0.001:100;0.1,15*5;1,10"
  PROFILE:
    - 100.0  # H1
    - 91.7   # H2  (L10: TiMidity t=1.5 note=55 G3)
    - 95.9   # H3
    - 95.1   # H4
    - 81.8   # H5
    - 85.1   # H6
    - 82.2   # H7
    - 66.8   # H8
    - 87.1   # H9
    - 83.5   # H10
    - 78.4   # H11
    - 79.0   # H12
    - 66.6   # H13
    - 61.1   # H14
    - 67.7   # H15
    - 74.6   # H16
    - 45.0   # H17
    - 38.0   # H18
    - 32.0   # H19
    - 27.0   # H20
    - 22.0   # H21
    - 18.0   # H22
    - 14.0   # H23
    - 11.0   # H24
`

const OXYGENE_TAMBOURINE = `# tambourine: Tambourine (bank=128 note=54 / FluidR3_GM2.sf2). Noise instrument.
# Sample: 'Tambourine(L)'  root=60  rate=44100 Hz  loop=22640fr (513.4ms)
# The SF2 envelope is pass-through (all phases ≈0.001s, sustain=0): the sample
# carries the timbre and transient. O:noise approximates the broadband percussive
# hit. initialAttn=0 → AMP=0.5.
character:
  O: noise
  AMP: 0.5
  A: "0.001:1,100"
  S: "0.4:100;0.07,19;0.24,4;0.63,0.4;1,0.03"
  R: "0.01:100;1,0"
`

const OXYGENE_SEASHORE = `# seashore: Sea Shore (GM123 / FluidR3_GM2.sf2). Noise instrument.
# Sample: 'Sea Shore'  root=60  rate=44100 Hz  loop=71159fr (1613.6ms)
# Pre-recorded ocean wash — O:noise approximates the broadband source.
# SF2 envelope: 1.96s rise, hold 2.67s, decay 1.79s to silence, instant release.
# Total natural duration ≈ 6.4s. initialAttn≈25cB → AMP=0.375.
character:
  O: noise
  AMP: 0.25
  A: "0.5:0;0.1,3*3;0.3,25;0.6,65;1,100"
  S: "2.5:100;0.2,25;0.4,45*5;0.8,65;1,65"
  R: "0.001:100;0.1,15*2;0.3,4;0.75,5*3;1,0"
  LFO: "0.8@sin[0];0.15:amp"
  VCF: "1200;0.2;0;0;0"
`


const OXYGENE_HIHAT = `# hi-hat: Open Hi-Hat (bank=128 note=46 / FluidR3_GM2.sf2). Noise instrument.
# Sample: 'Hi-Hat Half-Open(L)'  root=60  rate=44100 Hz  loop=2205fr (50ms)
# SF2 envelope: fast attack, medium-fast decay to near silence. Metallic click+wash.
# initialAttn=0 -> AMP=0.3.
character:
  O: noise
  AMP: 0.3
  A: "0.001:1,100"
  S: "0.3:100;0.08,55;0.20,20;0.50,5;1,0.5"
  R: "0.05:100;1,0"
`

const OXYGENE_GUIRO = `# guiro: Guiro (bank=128 note=74 / FluidR3_GM2.sf2). Noise instrument.
# Sample: 'Guiro Up(L)'  root=60  rate=44100 Hz
# SF2 envelope: medium-fast decay, scraping texture. initialAttn=0 -> AMP=0.5.
character:
  O: noise
  AMP: 0.5
  A: "0.001:1,100"
  S: "0.4:100;0.10,60;0.30,20;0.70,3;1,0"
  R: "0.05:100;1,0"
`

const OXYGENE_CASTANET = `# castanet: Castanet (bank=128 note=85 / FluidR3_GM2.sf2). Noise instrument.
# Sample: 'Castanet'  root=60  rate=44100 Hz
# SF2 envelope: very short, sharp click. initialAttn=0 -> AMP=0.6.
character:
  O: noise
  AMP: 0.6
  A: "0.001:1,100"
  S: "0.15:100;0.05,50;0.12,8;1,0"
  R: "0.01:100;1,0"
`


const OXYGENE_REVERSE_CYMBAL = `# reverse-cymbal: Reverse Cymbal (GM119 / FluidR3_GM2.sf2). Noise instrument.
# Sample: 'Rev.Cymbal'  root=60  rate=44100 Hz
# A reverse cymbal: amplitude builds during note-on, then cuts at note-off.
# initialAttn=0 -> AMP=0.5.
character:
  O: noise
  AMP: 0.155
  A: "0.001:1,100"
  S: "0.7:100;0.286,91;0.43,0.8;0.57,0.3;0.714,0.05;1,0"
  R: "0.05:100;1,0"
`

const OXYGENE_APPLAUSE = `# applause: Applause (GM126 / FluidR3_GM2.sf2). Noise instrument.
# Sample: 'Applause'  root=60  rate=44100 Hz
# Crowd clapping: builds up with slow attack, sustained noise.
# initialAttn=0 -> AMP=0.4.
character:
  O: noise
  AMP: 0.088
  A: "3.0:0;0.017,0.1;0.067,0.45;0.167,1.5;0.5,60;0.833,95;1,100"
  S: "0.001:100;1,100"
  R: "0.7:100;0.14,2;0.43,0.1;0.7,0.03;1,0"
`

const OXYGENE = `title: Oxygène Pt. IV
composer: Jean-Michel Jarre (1976)
stage:
  seashore:  1|1 1.8 seashore
  kalimba:   1|1 0.2 kalimba
  bass:      1|1 0.0 filtered-bass
  kick:      1|1 0.0 oxygene-kick
  tambourine: 1|1 0.1 tambourine
  synbrass:  1|1 0.8 synbrass
  strings:   2|1 1.0 synstrings2
  strings1:  2|1 1.0 synstrings1
  strings2:  2|1 1.0 synstrings2
  ensemble:  1|2 1.2 string-ensemble
  bowedpad:  1|1 1.6 bowed-pad
  melody:    1|1 0.4 oxygene-melody
  hi-hat:    1|1 0.1 hi-hat
  guiro:     1|1 0.1 guiro
  castanet:  1|1 0.1 castanet
  revcymbal: 1|1 1.0 reverse-cymbal
  applause:  1|1 1.5 applause
tuning_config: tones_euro
room: oxygene-plate
---
# bar 1 — intro: seashore fade-in, kalimba silent
_meta:
  beats_per_minute: 369
  ticks_per_measure: 12
  stress_pattern: "2,0,0,1,0,0,1,0,0,1,0,0"
  lower_stress_bound: 70
  upper_stress_bound: 90
seashore:
  0: C4 12 damp=24
strings1: false
strings2: false
revcymbal: false
applause: false
---
# bar 2 — kalimba fade-in begins (very quiet)
_meta:
  repeat_unmentioned_voices: true
kalimba: ".4 C4_0,2 . C4_0,2 . C4_0,2 . C4_0,2"
---
# bar 3 — kalimba fading in
_meta:
  repeat_unmentioned_voices: true
kalimba: "C4_0,2 . C4_0,2 . C4_0,2"
---
# bar 4 — bass pickup note (G1 at t=11)
_meta:
  repeat_unmentioned_voices: true
kalimba: false
bass: ".11 G1"
revcymbal:
  9: C4 21
applause:
  9: C4 21
---
# bar 5 — drums + bass + kalimba enter; Cm pattern A
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
tambourine: "C4 *9 . C4 *2"
hi-hat: ".2 C4"
guiro: ".9 C4"
castanet: ".3 C4 .5 C4"
revcymbal: false
applause: false
kick: "C1_ .4 C1_"
---
# bar 6 — Cm pattern B
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
---
# bar 7 — Cm pattern A
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
---
# bar 8 — Cm pattern B
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
---
# bar 9 — Cm pattern A
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
---
# bar 10 — SynBrass + Strings enter; Cm pattern B
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
synbrass: "C5_2 .2 G4 Eb4_ G4_ . C4_6"
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
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
synbrass: false
strings: false
ensemble: false
---
# bar 12 — Cm B; SynBrass repeats
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
synbrass: "C5_2 .2 G4 Eb4_ G4_ . C4_6"
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
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
synbrass: false
strings: false
ensemble: false
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
---
# bar 14 — Gm pattern; SynBrass Gm
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_2 D2 C2_ A1"
kalimba: ".2 D4_0,2 . D4_0,2 . D4_0,2 .2 D4_0,2 . D4_0,2"
synbrass: "Bb4_2 .2 A4 G4_ A4_ . D4_6"
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
bass: "D2_2 C2_ D2_2 D2 C2_ A1_"
synbrass: false
strings: false
ensemble: false
---
# bar 16 — Fm transition; SynBrass Fm run + SYNSTRING1 enters
_meta:
  repeat_unmentioned_voices: true
bass: "F2_2 Eb2_ C2_2 F2 Eb2_ C2_"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
synbrass: "A4 . G4 F4 . C4_5"
strings: "F3_23; A3_23"
ensemble:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
strings1:
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
synbrass: ".2 G4 F4 . C4_4"
strings: false
ensemble:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
strings1:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
---
# bar 18 — Cm A; 8-bar cycle starts
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
synbrass: "C5_2 .2 G4 Eb4_ G4_ . C4_6"
strings: "Eb3_23; G3_23; C3_23"
ensemble:
  0: C5 5
  5: G4 1
  6: Eb4 3
  8: G4 4
  11: C4 12
strings1:
  0: C5 5
  5: G4 1
  6: Eb4 3
  8: G4 4
  11: C4 12
revcymbal:
  9: C4 21
applause:
  9: C4 21
---
# bar 19 — Cm B variant
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1 G1 Bb1"
synbrass: false
strings: false
ensemble: false
strings1: false
revcymbal: false
applause: false
---
# bar 20 — Cm A
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
synbrass: "C5_2 .2 G4 Eb4_ G4_ . C4_6"
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 5
  5: G4 2
  6: Eb4 2
  8: G4 4
  11: C4 12
strings1:
  0: C5 5
  5: G4 2
  6: Eb4 2
  8: G4 4
  11: C4 12
revcymbal:
  9: C4 21
applause:
  9: C4 21
---
# bar 21 — Cm B
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
synbrass: false
strings: false
ensemble: false
strings1: false
revcymbal: false
applause: false
---
# bar 22 — Gm
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_2 D2 C2_ A1"
kalimba: ".2 D4_0,2 . D4_0,2 . D4_0,2 .2 D4_0,2 . D4_0,2"
synbrass: "Bb4_2 .2 A4 G4_ A4_ . D4_6"
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: Bb4 5
  5: A4 2
  6: G4 2
  8: A4 4
  11: D4 12
strings1:
  0: Bb4 5
  5: A4 2
  6: G4 2
  8: A4 4
  11: D4 12
revcymbal:
  9: C4 21
applause:
  9: C4 21
---
# bar 23 — Gm
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_2 D2 C2_ A1"
synbrass: false
strings: false
ensemble: false
strings1: false
revcymbal: false
applause: false
---
# bar 24 — Fm; SynBrass Fm run
_meta:
  repeat_unmentioned_voices: true
bass: "F2_2 Eb2_ C2_2 F2 Eb2_ C2_"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
synbrass: "A4 . G4 F4 . C4_5"
strings: "F3_23; A3_23"
ensemble:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
strings1:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
revcymbal:
  9: C4 21
applause:
  9: C4 21
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
synbrass: ".2 G4 F4 . C4_4"
strings: false
ensemble:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
strings1:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
revcymbal: false
applause: false
---
# bar 26 — Cm A
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
synbrass: "C5_2 .2 G4 Eb4_ G4_ . C4_6"
strings: "Eb3_23; G3_23; C3_23"
ensemble:
  0: C5 5
  5: G4 1
  6: Eb4 3
  8: G4 4
  11: C4 12
strings1:
  0: C5 5
  5: G4 1
  6: Eb4 3
  8: G4 4
  11: C4 12
revcymbal:
  9: C4 21
applause:
  9: C4 21
---
# bar 27 — Cm B
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
synbrass: false
strings: false
ensemble: false
strings1: false
revcymbal: false
applause: false
---
# bar 28 — Cm A
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
synbrass: "C5_2 .2 G4 Eb4_ G4_ . C4_6"
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 5
  5: G4 2
  6: Eb4 2
  8: G4 4
  11: C4 12
strings1:
  0: C5 5
  5: G4 2
  6: Eb4 2
  8: G4 4
  11: C4 12
revcymbal:
  9: C4 21
applause:
  9: C4 21
---
# bar 29 — Cm B
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
synbrass: false
strings: false
ensemble: false
strings1: false
revcymbal: false
applause: false
---
# bar 30 — Gm
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_2 D2 C2_ A1"
kalimba: ".2 D4_0,2 . D4_0,2 . D4_0,2 .2 D4_0,2 . D4_0,2"
synbrass: "Bb4_2 .2 A4 G4_ A4_ . D4_6"
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: Bb4 5
  5: A4 2
  6: G4 2
  8: A4 4
  11: D4 12
strings1:
  0: Bb4 5
  5: A4 2
  6: G4 2
  8: A4 4
  11: D4 12
revcymbal:
  9: C4 21
applause:
  9: C4 21
---
# bar 31 — Gm
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_2 D2 C2_ A1"
synbrass: false
strings: false
ensemble: false
strings1: false
revcymbal: false
applause: false
---
# bar 32 — Fm; SynBrass Fm
_meta:
  repeat_unmentioned_voices: true
bass: "F2_2 Eb2_ C2_2 F2 Eb2_"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
synbrass: "A4 . G4 F4 . C4_5"
strings: "F3_23; A3_23"
ensemble:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
strings1:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
revcymbal:
  9: C4 21
applause:
  9: C4 21
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
synbrass: ".2 G4 F4 . C4_4"
strings: false
ensemble:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 7
strings1:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 7
revcymbal: false
applause: false
---
# bar 34 — BowedPad + SynString2-B enter; Cm; Kalimba silent
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
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
strings1: false
strings2:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 8
bowedpad:
  3: C4 21
  6: Eb4 18
---
# bar 35 — Cm; repeat high strings
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
strings: false
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
strings2:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 8
bowedpad: false
---
# bar 36 — Gm; BowedPad Gm
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_ . D2 C2_ A1"
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
strings2:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 8
bowedpad:
  0: G3 1
  3: Bb3 21
  6: D4 18
---
# bar 37 — Gm
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_2 D2 C2_ A1"
strings: false
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
strings2:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 8
bowedpad: false
---
# bar 38 — Fm; BowedPad Fm
_meta:
  repeat_unmentioned_voices: true
bass: "F2_2 Eb2_ C2_2 F2 Eb2_ C2_"
strings: "F3_23; A3_23; F4_23"
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
strings2:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 8
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
strings2:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 8
bowedpad: false
---
# bar 40 — Melody enters; Cm A; Kalimba resumes
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
strings2:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad:
  3: C4 21
  6: Eb4 18
melody: "Eb4;6 D4 Eb4 C4_ G3_6"
---
# bar 41 — Cm B; melody repeats
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
strings: false
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
strings2:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad: false
melody: "Eb4;6 D4 Eb4 C4_ G3_6"
---
# bar 42 — Gm; melody Gm phrase
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_ . D2 C2_ A1"
kalimba: ".2 D4_0,2 . D4_0,2 . D4_0,2 .2 D4_0,2 . D4_0,2"
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
strings2:
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
melody: "Bb3;6 A3 Bb3 G3_ D3_6"
---
# bar 43 — Gm; melody repeats
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_2 D2 C2_ A1"
strings: false
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
strings2:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad: false
melody: "Bb3;6 A3 Bb3 G3_ D3_6"
---
# bar 44 — Fm; melody Fm phrase
_meta:
  repeat_unmentioned_voices: true
bass: "F2_2 Eb2_ C2_2 F2 Eb2_"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "F3_23; A3_23; F4_23"
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
strings2:
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
melody: "A3;6 G3 F3 F3_ C4_6"
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
strings2:
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
revcymbal:
  9: C4 21
applause:
  9: C4 21
---
# bar 46 — Cm A; 6-bar cycle repeats
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
strings2:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad:
  3: C4 21
  6: Eb4 18
melody: "Eb4;6 D4 Eb4 C4_ G3_6"
revcymbal: false
applause: false
---
# bar 47 — Cm B; melody repeats
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
strings: false
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
strings2:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad: false
melody: "Eb4;6 D4 Eb4 C4_ G3_6"
---
# bar 48 — Gm; melody Gm
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_ . D2 C2_ A1"
kalimba: ".2 D4_0,2 . D4_0,2 . D4_0,2 .2 D4_0,2 . D4_0,2"
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
strings2:
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
melody: "Bb3;6 A3 Bb3 G3_ D3_6"
---
# bar 49 — Gm; melody repeats
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_2 D2 C2_ A1"
strings: false
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
strings2:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad: false
melody: "Bb3;6 A3 Bb3 G3_ D3_6"
---
# bar 50 — Fm; melody Fm
_meta:
  repeat_unmentioned_voices: true
bass: "F2_2 Eb2_ C2_2 F2 Eb2_"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "F3_23; A3_23; F4_23"
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
strings2:
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
melody: "A3;6 G3 F3 F3_ C4_6"
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
strings2:
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
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "Eb3_23; G3_23; C3_23"
ensemble:
  0: C5 5
  5: G4 1
  6: Eb4 3
  8: G4 4
  11: C4 12
strings2: false
bowedpad: false
melody: false
---
# bar 53 — Cm A
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
strings: false
ensemble: false
---
# bar 54 — Cm B; ensemble plays
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
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
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
strings: false
ensemble: false
---
# bar 56 — Gm
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_2 D2 C2_ A1"
kalimba: ".2 D4_0,2 . D4_0,2 . D4_0,2 .2 D4_0,2 . D4_0,2"
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
bass: "D2_2 C2_ D2_2 D2 C2_ A1_"
strings: false
ensemble: false
---
# bar 58 — Fm; SynString1 enters (same as SynString2-A Fm)
_meta:
  repeat_unmentioned_voices: true
bass: "F2_2 Eb2_ C2_2 F2 Eb2_ C2_"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "F3_23; A3_23"
ensemble:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
strings1:
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
strings1:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
---
# bar 60 — Cm A
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "Eb3_23; G3_23; C3_23"
ensemble:
  0: C5 5
  5: G4 1
  6: Eb4 3
  8: G4 4
  11: C4 12
strings1:
  0: C5 5
  5: G4 1
  6: Eb4 3
  8: G4 4
  11: C4 12
revcymbal:
  9: C4 21
applause:
  9: C4 21
---
# bar 61 — Cm B variant
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1 G1 Bb1"
strings: false
ensemble: false
strings1: false
revcymbal: false
applause: false
---
# bar 62 — Cm A
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 5
  5: G4 2
  6: Eb4 2
  8: G4 4
  11: C4 12
strings1:
  0: C5 5
  5: G4 2
  6: Eb4 2
  8: G4 4
  11: C4 12
revcymbal:
  9: C4 21
applause:
  9: C4 21
---
# bar 63 — Cm B
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
strings: false
ensemble: false
strings1: false
revcymbal: false
applause: false
---
# bar 64 — Gm
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_2 D2 C2_ A1"
kalimba: ".2 D4_0,2 . D4_0,2 . D4_0,2 .2 D4_0,2 . D4_0,2"
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: Bb4 5
  5: A4 2
  6: G4 2
  8: A4 4
  11: D4 12
strings1:
  0: Bb4 5
  5: A4 2
  6: G4 2
  8: A4 4
  11: D4 12
revcymbal:
  9: C4 21
applause:
  9: C4 21
---
# bar 65 — Gm
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_2 D2 C2_ A1"
strings: false
ensemble: false
strings1: false
revcymbal: false
applause: false
---
# bar 66 — Fm
_meta:
  repeat_unmentioned_voices: true
bass: "F2_2 Eb2_ C2_2 F2 Eb2_ C2_"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "F3_23; A3_23"
ensemble:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
strings1:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
revcymbal:
  9: C4 21
applause:
  9: C4 21
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
strings1:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
revcymbal: false
applause: false
---
# bar 68 — Cm A
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "Eb3_23; G3_23; C3_23"
ensemble:
  0: C5 5
  5: G4 1
  6: Eb4 3
  8: G4 4
  11: C4 12
strings1:
  0: C5 5
  5: G4 1
  6: Eb4 3
  8: G4 4
  11: C4 12
revcymbal:
  9: C4 21
applause:
  9: C4 21
---
# bar 69 — Cm B
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
strings: false
ensemble: false
strings1: false
revcymbal: false
applause: false
---
# bar 70 — Cm B variant
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1 G1 Bb1"
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 5
  5: G4 2
  6: Eb4 2
  8: G4 4
  11: C4 12
strings1:
  0: C5 5
  5: G4 2
  6: Eb4 2
  8: G4 4
  11: C4 12
revcymbal:
  9: C4 21
applause:
  9: C4 21
---
# bar 71 — Cm B
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
strings: false
ensemble: false
strings1: false
revcymbal: false
applause: false
---
# bar 72 — Gm
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_2 D2 C2_ A1"
kalimba: ".2 D4_0,2 . D4_0,2 . D4_0,2 .2 D4_0,2 . D4_0,2"
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: Bb4 5
  5: A4 2
  6: G4 2
  8: A4 4
  11: D4 12
strings1:
  0: Bb4 5
  5: A4 2
  6: G4 2
  8: A4 4
  11: D4 12
revcymbal:
  9: C4 21
applause:
  9: C4 21
---
# bar 73 — Gm
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_2 D2 C2_ A1"
strings: false
ensemble: false
strings1: false
revcymbal: false
applause: false
---
# bar 74 — Fm
_meta:
  repeat_unmentioned_voices: true
bass: "F2_2 Eb2_ C2_2 F2 Eb2_"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "F3_23; A3_23"
ensemble:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
strings1:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 8
revcymbal:
  9: C4 21
applause:
  9: C4 21
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
strings1:
  0: A4 2
  2: G4 2
  3: F4 2
  5: C4 7
revcymbal: false
applause: false
---
# bar 76 — SynString2-B high arpeggios resume; BowedPad resumes; Cm
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
strings2:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 8
bowedpad:
  3: C4 21
  6: Eb4 18
---
# bar 77 — Cm
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
strings: false
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
strings2:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 8
bowedpad: false
---
# bar 78 — Gm; BowedPad Gm
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_ . D2 C2_ A1"
kalimba: ".2 D4_0,2 . D4_0,2 . D4_0,2 .2 D4_0,2 . D4_0,2"
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
strings2:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 8
bowedpad:
  0: G3 1
  3: Bb3 21
  6: D4 18
---
# bar 79 — Gm
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_2 D2 C2_ A1"
strings: false
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
strings2:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 8
bowedpad: false
---
# bar 80 — Fm; BowedPad Fm
_meta:
  repeat_unmentioned_voices: true
bass: "F2_2 Eb2_ C2_2 F2 Eb2_ C2_"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "F3_23; A3_23; F4_23"
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
strings2:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 8
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
strings2:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 8
bowedpad: false
---
# bar 82 — Melody returns with elaborate variations; Cm A
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
strings2:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad:
  3: C4 21
  6: Eb4 18
melody: "Eb4;6 D4 Eb4 C4_ G3_6"
---
# bar 83 — Cm B; melody repeats
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
strings: false
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
strings2:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad: false
melody: "Eb4;6 D4 Eb4 C4_ G3_6"
---
# bar 84 — Gm; melody Gm
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_ . D2 C2_ A1"
kalimba: ".2 D4_0,2 . D4_0,2 . D4_0,2 .2 D4_0,2 . D4_0,2"
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
strings2:
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
melody: "Bb3;6 A3 Bb3 G3_ D3_6"
---
# bar 85 — Gm; melody repeats
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_2 D2 C2_ A1"
strings: false
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
strings2:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad: false
melody: "Bb3;6 A3 Bb3 G3_ D3_6"
---
# bar 86 — Fm; melody Fm
_meta:
  repeat_unmentioned_voices: true
bass: "F2_2 Eb2_ C2_2 F2 Eb2_"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "F3_23; A3_23; F4_23"
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
strings2:
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
melody: "A3;6 G3 F3 F3_ C4_6"
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
strings2:
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
revcymbal:
  9: C4 21
applause:
  9: C4 21
---
# bar 88 — Cm A; melody with fill at t=8
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
strings2:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad:
  3: C4 21
  6: Eb4 18
melody: "Eb4;6 D4 Eb4 C4_ G3_2 Eb4_2 G3"
revcymbal: false
applause: false
---
# bar 89 — Cm B; melody with ornaments
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
strings: false
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
strings2:
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
bass: "D2_2 C2_ D2_ . D2 C2_ A1"
kalimba: ".2 D4_0,2 . D4_0,2 . D4_0,2 .2 D4_0,2 . D4_0,2"
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
strings2:
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
bass: "D2_2 C2_ D2_2 D2 C2_ A1"
strings: false
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
strings2:
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
bass: "F2_2 Eb2_ C2_2 F2 Eb2_ C2_"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "F3_23; A3_23; F4_23"
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
strings2:
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
melody: "A3_;6 F3_ A3_ C4_ A3_ C4_"
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
strings2:
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
revcymbal:
  9: C4 21
applause:
  9: C4 21
---
# bar 94 — Cm; melody high Cm phrase
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
strings2:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad:
  3: C4 21
  6: Eb4 18
melody: "Eb5;6 D5 Eb5 C5_ G4_2 Eb5_2 G4"
revcymbal: false
applause: false
---
# bar 95 — Cm; melody ornament
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
strings: false
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
strings2:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad: false
melody: "Eb5_;6 G4 D5_ C5_2 G4_3"
---
# bar 96 — Gm; melody high Gm phrase
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_ . D2 C2_ A1"
kalimba: ".2 D4_0,2 . D4_0,2 . D4_0,2 .2 D4_0,2 . D4_0,2"
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
strings2:
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
bass: "D2_2 C2_ D2_2 D2 C2_ A1"
strings: false
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
strings2:
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
bass: "F2_2 Eb2_ C2_2 F2 Eb2_"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "F3_23; A3_23; F4_23"
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
strings2:
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
melody: "A4;6 G4 F4 F4_ C5_2 F4_2 F4"
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
strings2:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad: false
melody: "A4_;6 G4 F4_ C5_2 F4_3"
revcymbal:
  9: C4 21
applause:
  9: C4 21
---
# bar 100 — Cm; melody high Cm
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
strings2:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad:
  3: C4 21
  6: Eb4 18
melody: "Eb5;6 D5 Eb5 C5_ G4_2 Eb5_2 G4"
revcymbal: false
applause: false
---
# bar 101 — Cm; melody ornament
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
strings: false
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
strings2:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad: false
melody: "Eb5_;6 G4 D5_ C5_2 G4_2 G4"
---
# bar 102 — Gm; melody elaborate Gm variation
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_ . D2 C2_ A1"
kalimba: ".2 D4_0,2 . D4_0,2 . D4_0,2 .2 D4_0,2 . D4_0,2"
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
strings2:
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
melody: "D5;6 C5 Bb4 D5 C5 Bb4 D5_ G4_2 G4"
---
# bar 103 — Gm; melody variation
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_2 D2 C2_ A1"
strings: false
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
strings2:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad: false
melody: "D5;6 C5 D5 Bb4_ G4_2 D5 C5_ Bb4"
---
# bar 104 — Fm; melody Fm
_meta:
  repeat_unmentioned_voices: true
bass: "F2_2 Eb2_ C2_2 F2 Eb2_ C2_"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "F3_23; A3_23; F4_23"
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
strings2:
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
melody: "A4_;6 G4 F4_ C5_2 F4_2 F4"
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
strings2:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad: false
melody: "A4;6 G4 A4 F4_ C5_2 F4_3"
revcymbal:
  9: C4 21
applause:
  9: C4 21
---
# bar 106 — Cm; melody Cm with fill
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
strings2:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad:
  3: C4 21
  6: Eb4 18
melody: "Eb4;6 D4 Eb4 C4_ G3_2 Eb4_2 G3"
revcymbal: false
applause: false
---
# bar 107 — Cm; melody ornament run
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
strings: false
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
strings2:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad: false
melody: "Eb4;6 D4 C4 Eb4 D4 C4 Eb4_ G3_2 G3"
---
# bar 108 — Gm; melody Gm with fill
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_ . D2 C2_ A1"
kalimba: ".2 D4_0,2 . D4_0,2 . D4_0,2 .2 D4_0,2 . D4_0,2"
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
strings2:
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
bass: "D2_2 C2_ D2_2 D2 C2_ A1"
strings: false
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
strings2:
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
bass: "F2_2 Eb2_ C2_2 F2 Eb2_"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "F3_23; A3_23; F4_23"
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
strings2:
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
melody: "A3;6 G3 F3 F3_ C4_2 F3_2 F3"
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
strings2:
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
revcymbal:
  9: C4 21
applause:
  9: C4 21
---
# bar 112 — Cm; melody high Cm phrase (last cycle)
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 G1 Bb1_ G1"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "Eb3_23; C3_23"
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
strings2:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad:
  3: C4 21
  6: Eb4 18
melody: "Eb5;6 D5 Eb5 C5_ G4_2 Eb5_2 G4"
revcymbal: false
applause: false
---
# bar 113 — Cm; melody ornament
_meta:
  repeat_unmentioned_voices: true
bass: "C2_2 Bb1_ C2_2 C2 Bb1_ G1"
strings: false
ensemble:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
strings2:
  0: C5 1
  1: G5 1
  2: C5 1
  3: G5 1
  4: C5 1
  5: G5 7
bowedpad: false
melody: "Eb5_;6 G4 D5_ C5_2 G4_2 G4"
---
# bar 114 — Gm; melody Gm
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_ . D2 C2_ A1"
kalimba: ".2 D4_0,2 . D4_0,2 . D4_0,2 .2 D4_0,2 . D4_0,2"
strings: "D3_23; Bb3_23; D4_23"
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
strings2:
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
melody: "D5;6 C5 Bb4 D5 C5 Bb4 D5_ G4_2 G4"
---
# bar 115 — Gm; melody variation
_meta:
  repeat_unmentioned_voices: true
bass: "D2_2 C2_ D2_2 D2 C2_ A1"
strings: false
ensemble:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
strings2:
  0: D5 1
  1: Bb5 1
  2: D5 1
  3: Bb5 1
  4: D5 1
  5: Bb5 7
bowedpad: false
melody: "D5;6 C5 D5 Bb4_ G4_2 D5 C5_ Bb4"
---
# bar 116 — Fm; fade out begins; melody Fm final
_meta:
  repeat_unmentioned_voices: true
bass: "F2_2 Eb2_ C2_2 F2 Eb2_"
kalimba: ".2 C4_0,2 . C4_0,2 . C4_0,2 .2 C4_0,2 . C4_0,2"
strings: "F3_11; A3_11; F4_11"
ensemble:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
strings2:
  0: F5 1
  1: C6 1
  2: F5 1
  3: C6 1
  4: F5 1
  5: C6 7
bowedpad:
  3: C4 9
  6: F4 6
melody: "A4_;6 G4 F4_ C5_2 F4_2 F4"
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
strings2:
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
kick: false
melody: "A4;6 G4 A4 F4_ C5_2 F4_3"`

// =====================================================================
// oxygene4old — original Python Sompyler source files (RFC character: format)
//
const OXYGENE4OLD_KICK = `name: Bass Drum (Minipops 7 BD)
# The Minipops 7 kick is a soft, rounded thump — noticeably gentler than the
# DMX kick. There is minimal pitch-drop content; the fundamental sustains for
# ~150ms before fading. The upper partials cut very quickly, leaving only the
# low body. Jarre filtered the drum sounds for "life" — here that is
# approximated by the longer tail on the fundamental compared to upper partials.
character:
    O: sine
    R: ".10:100;1,0"
    SPREAD: [0, 0, 168, -120, 85]
    PROFILE:
        - { V: 100, A: ".18:1,100!;2,65;4,28;8,10" }
        - { V: 80,  A: ".10:1,100!;2,45;3,12" }
        - { V: 55,  A: ".07:1,100!;2,28;3,6" }
        - { V: 32,  A: ".05:1,100!;2,14" }
        - { V: 16,  A: ".04:1,100!;2,6" }`

const OXYGENE4OLD_CLAVES = `name: Claves (Minipops 7 CL)
# The Minipops CL (claves/snare) channel produces a sharp wooden click.
# High register, very short — a transient without sustain. Played at A5 or
# similar in the score. The near-harmonic SPREAD gives a slightly wooden
# rather than purely metallic character.
character:
    O: sine
    A: ".003:1,100"
    S: ".07:100;1,42;2,12;3,0"
    R: ".02:100;1,0"
    SPREAD: [0, 180, -120, 260, -210, 140]
    PROFILE:
        - { V: 100 }
        - { V: 58 }
        - { V: 30 }
        - { V: 14 }
        - { V: 5 }`

const OXYGENE4OLD_CYMBAL = `name: Cymbal / Hi-hat (Minipops 7 CY)
# The Minipops 7 cymbal is a short metallic tick — lighter and drier than the
# DMX hi-hat. Its character comes from the same inharmonic partial cluster that
# gives metallic instruments their shimmer, but the decay is extremely tight
# (50ms) to match the Minipops' characteristic "ticky" rather than "splashy" feel.
character:
    O: sine
    A: ".003:1,100"
    S: ".05:100;1,28;2,0"
    R: ".015:100;1,0"
    SPREAD: [0, -1138, -644, -423, 565, -51, -113, 106, -81]
    PROFILE:
        - { V: 100 }
        - 84
        - 68
        - 52
        - { V: 40, O: noise }
        - { V: 72, S: ".05:100;1,0" }
        - { V: 44, O: sine }
        - { V: 80, O: noise }
        - { V: 36, O: sine }`

const OXYGENE4OLD_BASS = `name: Bass (RMI Harmonic Synthesizer style)
# The RMI Harmonic Synthesizer was an additive synthesis instrument — it built
# tones by mixing individual organ-pipe-like harmonics. Its bass character is
# described as having a "growl in the upper mid range": harmonics 4-6 are
# boosted relative to the fundamental, creating a slightly nasal, buzzy quality
# unlike a standard sawtooth or square. Long sustain holds the pedal tones.
character:
    O: sawtooth
    A: ".015:1,100"
    S: "6:100;4,98;8,95;12,88;16,75"
    R: ".28:100;1,0"
    SPREAD: [0, 5, -4, 8, -6, 4, -3]
    PROFILE: [95, 88, 94, 100, 96, 90, 76, 62, 48, 36, 26, 18, 12, 7, 4]`

const OXYGENE4OLD_ARPEGGIO = `name: Arpeggio Pluck (RMI Harmonic Synthesizer style)
# The iconic Oxygène Part IV arpeggio was produced by the RMI Harmonic
# Synthesizer in one-key arpeggio mode, triggered by the Minipops. The sound
# is a clean, bell-like pluck — additive synthesis at its most literal:
# individual harmonics mixed at precise levels, decaying together.
# The 200ms sustain gives a clean staccato at 120 BPM 16th notes (125ms grid).
# Slight SPREAD adds a very faint metallic shimmer without disturbing the pitch.
character:
    O: sine
    A: ".005:1,100"
    S: ".20:100;1,60;2,25;3,8;4,0"
    R: ".07:100;1,0"
    SPREAD: [0, 4, -3, 7, -5, 3, -2]
    PROFILE: [100, 72, 52, 38, 26, 17, 10, 6, 3]`

const OXYGENE4OLD_PAD = `name: String Pad (Eminent 310 Unique style)
# The Eminent 310 Unique electronic organ/string ensemble is the defining pad
# texture of Oxygène. Its string sound has a slow, organic swell — not as cold
# as the Kraftwerk/robots pad — with a subtle reedy formant around partials 3-4.
# The 700ms attack bloom gives the characteristic "breathing in" entrance.
# Very gentle SPREAD simulates the ensemble-like slight detuning of the Eminent's
# multiple oscillator ranks.
character:
    O: sawtooth
    A: ".7:1,35;2,68;4,100"
    S: "10:100;8,99;16,97"
    R: ".6:100;1,0"
    SPREAD: [0, 6, -4, 10, -7, 4, -3, 6, -4]
    PROFILE: [88, 78, 100, 94, 72, 56, 40, 28, 18, 11, 6, 3]`

const OXYGENE4OLD_LEAD = `name: Lead Synth (ARP 2600 + Small Stone phaser style)
# The ARP 2600 lead in Oxygène Part IV runs through an Electro-Harmonix Small
# Stone phaser, giving it a sweeping, slightly hollow spectral quality. In
# additive synthesis the phaser sweep cannot be dynamically replicated, but
# the SPREAD values are tuned so adjacent partials beat against each other at
# slow rates — approximating the mild hollowness of a phased sawtooth.
# The 60ms attack is slightly slower than the arpeggio, giving it a legato
# "breath" entry that contrasts with the percussive arpeggio beneath it.
character:
    O: sawtooth
    A: ".09:1,35;2,100"
    S: "4:100;4,98;8,95"
    R: "1.8:100;1,0"
    SPREAD: [0, -12, 8, -18, 14, -8, 5, -10, 6]
    PROFILE: [100, 88, 76, 62, 50, 38, 28, 20, 13, 8, 4, 2]`

const OXYGENE4OLD = `title: 'oxygene-part-iv'
# From oxygene-part-iv.mid
# Time: 12/8  BPM: 115.0  Ticks/measure: 12
stage:
    kick:     1|1  0.3  oxygene4old/kick
    claves:   2|1  0.2  oxygene4old/claves
    cymbal:   1|2  0.4  oxygene4old/cymbal
    bass:     1|1  0.3  oxygene4old/bass
    arpeggio: 2|1  0.8  oxygene4old/arpeggio
    pad_l:    5|1  2.0  oxygene4old/pad
    pad_r:    1|5  2.0  oxygene4old/pad
    lead:     2|1  0    oxygene4old/lead
---
# ── Measure 1 ─────────────────────────────────────────────────────────────
_meta:
    beats_per_minute: 94
    stress_pattern: "2,1,0;4"
    upper_stress_bound: 100
    lower_stress_bound: 96
lead:     {}
pad_l:
    0:  C4 72
pad_r:
    0:  C4 72
arpeggio:
    4:  C4 2
    6:  C4 2
    8:  C4 2
    10:  C4 2
bass:
    11:  G1 1
cymbal:     {}
claves:     {}
kick:     {}
---
# ── Measure 2 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
pad_l:     {}
pad_r:     {}
arpeggio:
    0:  C4 1
    1:  C4 1
    2:  C4 1
    3:  C4 1
    4:  C4 1
    5:  C4 1
    6:  C4 1
    7:  Bb3 1
    8:  C4 1
    9:  C4 1
    10:  Bb3 1
    11:  C4 1
bass:
    0:  C2 2
    2:  C2 1
    3:  Bb1 2
    5:  C2 3
    8:  G1 1
    9:  Bb1 2
    11:  G1 1
cymbal:
    0:  A5 1
    1:  A5 1
    2:  A5 1
    3:  A5 1
    4:  A5 1
    5:  A5 1
    6:  A5 1
    7:  A5 1
    8:  A5 1
    9:  A5 1
    10:  A5 1
    11:  A5 1
claves:
    9:  A4 1
kick:
    3:  A2 1
---
# ── Measure 3 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
---
# ── Measure 4 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
---
# ── Measure 5 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
---
# ── Measure 6 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
---
# ── Measure 7 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  C5 5
    5:  G4 1
    6:  Eb4 2
    8:  G4 3
    11:  C4 13
---
# ── Measure 8 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:     {}
---
# ── Measure 9 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  C5 5
    5:  G4 1
    6:  Eb4 2
    8:  G4 3
    11:  C4 13
---
# ── Measure 10 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:     {}
---
# ── Measure 11 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  Bb4 5
    5:  A4 1
    6:  G4 2
    8:  A4 3
    11:  D4 13
pad_l:
    0:  D4 24
pad_r:
    0:  D4 24
arpeggio:
    0:  D4 1
    1:  D4 1
    2:  D4 1
    3:  D4 1
    4:  D4 1
    5:  D4 1
    6:  D4 1
    7:  C4 1
    8:  D4 1
    9:  D4 1
    10:  C4 1
    11:  D4 1
bass:
    0:  D2 2
    2:  D2 1
    3:  C2 2
    5:  D2 3
    8:  Bb1 1
    9:  C2 2
    11:  Bb1 1
---
# ── Measure 12 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:     {}
pad_l:     {}
pad_r:     {}
---
# ── Measure 13 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  C5 5
    5:  G4 1
    6:  Eb4 2
    8:  G4 3
    11:  C4 13
pad_l:
    0:  C4 48
pad_r:
    0:  C4 48
arpeggio:
    0:  C4 1
    1:  C4 1
    2:  C4 1
    3:  C4 1
    4:  C4 1
    5:  C4 1
    6:  C4 1
    7:  Bb3 1
    8:  C4 1
    9:  C4 1
    10:  Bb3 1
    11:  C4 1
bass:
    0:  C2 2
    2:  C2 1
    3:  Bb1 2
    5:  C2 3
    8:  G1 1
    9:  Bb1 2
    11:  G1 1
---
# ── Measure 14 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:     {}
pad_l:     {}
pad_r:     {}
---
# ── Measure 15 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  C5 5
    5:  G4 1
    6:  Eb4 2
    8:  G4 3
    11:  C4 13
---
# ── Measure 16 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:     {}
---
# ── Measure 17 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  Bb4 5
    5:  A4 1
    6:  G4 2
    8:  A4 3
    11:  D4 13
pad_l:
    0:  D4 24
pad_r:
    0:  D4 24
arpeggio:
    0:  D4 1
    1:  D4 1
    2:  D4 1
    3:  D4 1
    4:  D4 1
    5:  D4 1
    6:  D4 1
    7:  C4 1
    8:  D4 1
    9:  D4 1
    10:  C4 1
    11:  D4 1
bass:
    0:  D2 2
    2:  D2 1
    3:  C2 2
    5:  D2 3
    8:  Bb1 1
    9:  C2 2
    11:  Bb1 1
---
# ── Measure 18 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:     {}
pad_l:     {}
pad_r:     {}
---
# ── Measure 19 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  A4 2
    2:  G4 1
    3:  F4 2
    5:  C4 7
pad_l:
    0:  F4 24
pad_r:
    0:  F4 24
arpeggio:
    0:  C4 1
    1:  C4 1
    2:  C4 1
    3:  C4 1
    4:  C4 1
    5:  C4 1
    6:  C4 1
    7:  Bb3 1
    8:  C4 1
    9:  C4 1
    10:  Bb3 1
    11:  C4 1
bass:
    0:  F2 2
    2:  F2 1
    3:  Eb2 2
    5:  C2 3
    8:  F2 1
    9:  Eb2 2
    11:  C2 1
---
# ── Measure 20 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
pad_l:     {}
pad_r:     {}
bass:
    0:  F2 1
    1:  Eb2 1
    2:  F2 1
    3:  Eb2 1
    4:  C2 1
    5:  Eb2 1
    6:  C2 1
    7:  Bb1 1
    8:  C2 1
    9:  Bb1 1
    10:  G1 1
    11:  Bb1 1
---
# ── Measure 21 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  C5 5
    5:  G4 1
    6:  Eb4 2
    8:  G4 3
    11:  C4 13
pad_l:
    0:  C4 48
pad_r:
    0:  C4 48
bass:
    0:  C2 2
    2:  C2 1
    3:  Bb1 2
    5:  C2 3
    8:  G1 1
    9:  Bb1 2
    11:  G1 1
---
# ── Measure 22 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:     {}
pad_l:     {}
pad_r:     {}
---
# ── Measure 23 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  C5 5
    5:  G4 1
    6:  Eb4 2
    8:  G4 3
    11:  C4 13
---
# ── Measure 24 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:     {}
---
# ── Measure 25 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  Bb4 5
    5:  A4 1
    6:  G4 2
    8:  A4 3
    11:  D4 13
pad_l:
    0:  D4 24
pad_r:
    0:  D4 24
arpeggio:
    0:  D4 1
    1:  D4 1
    2:  D4 1
    3:  D4 1
    4:  D4 1
    5:  D4 1
    6:  D4 1
    7:  C4 1
    8:  D4 1
    9:  D4 1
    10:  C4 1
    11:  D4 1
bass:
    0:  D2 2
    2:  D2 1
    3:  C2 2
    5:  D2 3
    8:  Bb1 1
    9:  C2 2
    11:  Bb1 1
---
# ── Measure 26 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:     {}
pad_l:     {}
pad_r:     {}
---
# ── Measure 27 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  A4 2
    2:  G4 1
    3:  F4 2
    5:  C4 7
pad_l:
    0:  F4 24
pad_r:
    0:  F4 24
arpeggio:
    0:  C4 1
    1:  C4 1
    2:  C4 1
    3:  C4 1
    4:  C4 1
    5:  C4 1
    6:  C4 1
    7:  Bb3 1
    8:  C4 1
    9:  C4 1
    10:  Bb3 1
    11:  C4 1
bass:
    0:  F2 2
    2:  F2 1
    3:  Eb2 2
    5:  C2 3
    8:  F2 1
    9:  Eb2 2
    11:  C2 1
---
# ── Measure 28 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
pad_l:     {}
pad_r:     {}
bass:
    0:  F2 1
    1:  Eb2 1
    2:  F2 1
    3:  Eb2 1
    4:  C2 1
    5:  Eb2 1
    6:  C2 1
    7:  Bb1 1
    8:  C2 1
    9:  Bb1 1
    10:  G1 1
    11:  Bb1 1
---
# ── Measure 29 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  C5 5
    5:  G4 1
    6:  Eb4 2
    8:  G4 3
    11:  C4 13
pad_l:
    0:  C4 48
pad_r:
    0:  C4 48
bass:
    0:  C2 2
    2:  C2 1
    3:  Bb1 2
    5:  C2 3
    8:  G1 1
    9:  Bb1 2
    11:  G1 1
---
# ── Measure 30 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:     {}
pad_l:     {}
pad_r:     {}
---
# ── Measure 31 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  C5 5
    5:  G4 1
    6:  Eb4 2
    8:  G4 3
    11:  C4 13
---
# ── Measure 32 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:     {}
---
# ── Measure 33 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  Bb4 5
    5:  A4 1
    6:  G4 2
    8:  A4 3
    11:  D4 13
pad_l:
    0:  D4 24
pad_r:
    0:  D4 24
arpeggio:
    0:  D4 1
    1:  D4 1
    2:  D4 1
    3:  D4 1
    4:  D4 1
    5:  D4 1
    6:  D4 1
    7:  C4 1
    8:  D4 1
    9:  D4 1
    10:  C4 1
    11:  D4 1
bass:
    0:  D2 2
    2:  D2 1
    3:  C2 2
    5:  D2 3
    8:  Bb1 1
    9:  C2 2
    11:  Bb1 1
---
# ── Measure 34 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:     {}
pad_l:     {}
pad_r:     {}
---
# ── Measure 35 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  A4 2
    2:  G4 1
    3:  F4 2
    5:  C4 7
pad_l:
    0:  F4 24
pad_r:
    0:  F4 24
arpeggio:
    0:  C4 1
    1:  C4 1
    2:  C4 1
    3:  C4 1
    4:  C4 1
    5:  C4 1
    6:  C4 1
    7:  Bb3 1
    8:  C4 1
    9:  C4 1
    10:  Bb3 1
    11:  C4 1
bass:
    0:  F2 2
    2:  F2 1
    3:  Eb2 2
    5:  C2 3
    8:  F2 1
    9:  Eb2 2
    11:  C2 1
---
# ── Measure 36 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
pad_l:     {}
pad_r:     {}
bass:
    0:  F2 1
    1:  Eb2 1
    2:  F2 1
    3:  Eb2 1
    4:  C2 1
    5:  Eb2 1
    6:  C2 1
    7:  Bb1 1
    8:  C2 1
    9:  Bb1 1
    10:  G1 1
    11:  Bb1 1
---
# ── Measure 37 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  C5 1
    1:  G5 1
    2:  C5 1
    3:  G5 2
    5:  C5 1
pad_l:
    0:  C4 24
pad_r:
    0:  C4 24
arpeggio:     {}
bass:
    0:  C2 2
    2:  C2 1
    3:  Bb1 2
    5:  C2 3
    8:  G1 1
    9:  Bb1 2
    11:  G1 1
---
# ── Measure 38 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
pad_l:     {}
pad_r:     {}
---
# ── Measure 39 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  D5 1
    1:  Bb5 1
    2:  D5 1
    3:  Bb5 2
    5:  D5 1
pad_l:
    0:  D4 24
pad_r:
    0:  D4 24
bass:
    0:  D2 2
    2:  D2 1
    3:  C2 2
    5:  D2 3
    8:  Bb1 1
    9:  C2 2
    11:  Bb1 1
---
# ── Measure 40 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
pad_l:     {}
pad_r:     {}
---
# ── Measure 41 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  F5 1
    1:  C6 1
    2:  F5 1
    3:  C6 2
    5:  F5 1
pad_l:
    0:  F4 24
pad_r:
    0:  F4 24
bass:
    0:  F2 2
    2:  F2 1
    3:  Eb2 2
    5:  C2 3
    8:  F2 1
    9:  Eb2 2
    11:  C2 1
---
# ── Measure 42 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
pad_l:     {}
pad_r:     {}
bass:
    0:  F2 1
    1:  Eb2 1
    2:  F2 1
    3:  Eb2 1
    4:  C2 1
    5:  Eb2 1
    6:  C2 1
    7:  Bb1 1
    8:  C2 1
    9:  Bb1 1
    10:  G1 1
    11:  Bb1 1
---
# ── Measure 43 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  Eb5 1
    1:  D5 1
    2:  Eb5 1
    3:  C5 2
    5:  G4 1
pad_l:
    0:  C4 24
pad_r:
    0:  C4 24
arpeggio:
    0:  C3 1
    1:  G3 1
    2:  C3 1
    3:  G3 1
    4:  C3 1
    5:  G3 1
bass:
    0:  C2 2
    2:  C2 1
    3:  Bb1 2
    5:  C2 3
    8:  G1 1
    9:  Bb1 2
    11:  G1 1
---
# ── Measure 44 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
pad_l:     {}
pad_r:     {}
---
# ── Measure 45 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  Bb4 1
    1:  A4 1
    2:  Bb4 1
    3:  G4 2
    5:  D4 1
pad_l:
    0:  D4 24
pad_r:
    0:  D4 24
arpeggio:
    0:  D3 1
    1:  Bb3 1
    2:  D3 1
    3:  Bb3 1
    4:  D3 1
    5:  Bb3 1
bass:
    0:  D2 2
    2:  D2 1
    3:  C2 2
    5:  D2 3
    8:  Bb1 1
    9:  C2 2
    11:  Bb1 1
---
# ── Measure 46 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
pad_l:     {}
pad_r:     {}
---
# ── Measure 47 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  A4 1
    1:  G4 1
    2:  A4 1
    3:  F4 2
    5:  C5 1
pad_l:
    0:  F4 24
pad_r:
    0:  F4 24
arpeggio:
    0:  F3 1
    1:  C4 1
    2:  F3 1
    3:  C4 1
    4:  F3 1
    5:  C4 1
bass:
    0:  F2 2
    2:  F2 1
    3:  Eb2 2
    5:  C2 3
    8:  F2 1
    9:  Eb2 2
    11:  C2 1
---
# ── Measure 48 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  A4 1
    1:  G4 1
    2:  A4 1
    3:  F4 1
    4:  A4 1
    5:  C5 1
pad_l:     {}
pad_r:     {}
bass:
    0:  F2 1
    1:  Eb2 1
    2:  F2 1
    3:  Eb2 1
    4:  C2 1
    5:  Eb2 1
    6:  C2 1
    7:  Bb1 1
    8:  C2 1
    9:  Bb1 1
    10:  G1 1
    11:  Bb1 1
---
# ── Measure 49 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  Eb5 1
    1:  D5 1
    2:  Eb5 1
    3:  C5 2
    5:  G4 1
pad_l:
    0:  C4 24
pad_r:
    0:  C4 24
arpeggio:
    0:  C3 1
    1:  G3 1
    2:  C3 1
    3:  G3 1
    4:  C3 1
    5:  G3 1
bass:
    0:  C2 2
    2:  C2 1
    3:  Bb1 2
    5:  C2 3
    8:  G1 1
    9:  Bb1 2
    11:  G1 1
---
# ── Measure 50 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
pad_l:     {}
pad_r:     {}
---
# ── Measure 51 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  Bb4 1
    1:  A4 1
    2:  Bb4 1
    3:  G4 2
    5:  D4 1
pad_l:
    0:  D4 24
pad_r:
    0:  D4 24
arpeggio:
    0:  D3 1
    1:  Bb3 1
    2:  D3 1
    3:  Bb3 1
    4:  D3 1
    5:  Bb3 1
bass:
    0:  D2 2
    2:  D2 1
    3:  C2 2
    5:  D2 3
    8:  Bb1 1
    9:  C2 2
    11:  Bb1 1
---
# ── Measure 52 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
pad_l:     {}
pad_r:     {}
---
# ── Measure 53 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  A4 1
    1:  G4 1
    2:  A4 1
    3:  F4 2
    5:  C5 1
arpeggio:
    0:  F3 1
    1:  C4 1
    2:  F3 1
    3:  C4 1
    4:  F3 1
    5:  C4 1
bass:
    0:  F2 2
    2:  F2 1
    3:  Eb2 2
    5:  C2 3
    8:  F2 1
    9:  Eb2 2
    11:  C2 1
---
# ── Measure 54 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  A4 2
    2:  G4 2
    4:  F4 2
    6:  C5 2
pad_l:
    0:  F4 12
pad_r:
    0:  F4 12
bass:
    0:  F2 1
    1:  Eb2 1
    2:  F2 1
    3:  Eb2 1
    4:  C2 1
    5:  Eb2 1
    6:  C2 1
    7:  Bb1 1
    8:  C2 1
    9:  Bb1 1
    10:  G1 1
    11:  Bb1 1
---
# ── Measure 55 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  C5 5
    5:  G4 1
    6:  Eb4 2
    8:  G4 3
    11:  C4 13
pad_l:
    0:  C4 48
pad_r:
    0:  C4 48
arpeggio:
    0:  C4 1
    1:  C4 1
    2:  C4 1
    3:  C4 1
    4:  C4 1
    5:  C4 1
    6:  C4 1
    7:  Bb3 1
    8:  C4 1
    9:  C4 1
    10:  Bb3 1
    11:  C4 1
bass:
    0:  C2 2
    2:  C2 1
    3:  Bb1 2
    5:  C2 3
    8:  G1 1
    9:  Bb1 2
    11:  G1 1
---
# ── Measure 56 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:     {}
pad_l:     {}
pad_r:     {}
---
# ── Measure 57 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  C5 5
    5:  G4 1
    6:  Eb4 2
    8:  G4 3
    11:  C4 13
---
# ── Measure 58 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:     {}
---
# ── Measure 59 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  Bb4 5
    5:  A4 1
    6:  G4 2
    8:  A4 3
    11:  D4 13
pad_l:
    0:  D4 24
pad_r:
    0:  D4 24
arpeggio:
    0:  D4 1
    1:  D4 1
    2:  D4 1
    3:  D4 1
    4:  D4 1
    5:  D4 1
    6:  D4 1
    7:  C4 1
    8:  D4 1
    9:  D4 1
    10:  C4 1
    11:  D4 1
bass:
    0:  D2 2
    2:  D2 1
    3:  C2 2
    5:  D2 3
    8:  Bb1 1
    9:  C2 2
    11:  Bb1 1
---
# ── Measure 60 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:     {}
pad_l:     {}
pad_r:     {}
---
# ── Measure 61 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  A4 2
    2:  G4 1
    3:  F4 2
    5:  C4 7
pad_l:
    0:  F4 24
pad_r:
    0:  F4 24
arpeggio:
    0:  C4 1
    1:  C4 1
    2:  C4 1
    3:  C4 1
    4:  C4 1
    5:  C4 1
    6:  C4 1
    7:  Bb3 1
    8:  C4 1
    9:  C4 1
    10:  Bb3 1
    11:  C4 1
bass:
    0:  F2 2
    2:  F2 1
    3:  Eb2 2
    5:  C2 3
    8:  F2 1
    9:  Eb2 2
    11:  C2 1
---
# ── Measure 62 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
pad_l:     {}
pad_r:     {}
bass:
    0:  F2 1
    1:  Eb2 1
    2:  F2 1
    3:  Eb2 1
    4:  C2 1
    5:  Eb2 1
    6:  C2 1
    7:  Bb1 1
    8:  C2 1
    9:  Bb1 1
    10:  G1 1
    11:  Bb1 1
---
# ── Measure 63 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  C5 5
    5:  G4 1
    6:  Eb4 2
    8:  G4 3
    11:  C4 13
pad_l:
    0:  C4 48
pad_r:
    0:  C4 48
bass:
    0:  C2 2
    2:  C2 1
    3:  Bb1 2
    5:  C2 3
    8:  G1 1
    9:  Bb1 2
    11:  G1 1
---
# ── Measure 64 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:     {}
pad_l:     {}
pad_r:     {}
---
# ── Measure 65 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  C5 5
    5:  G4 1
    6:  Eb4 2
    8:  G4 3
    11:  C4 13
---
# ── Measure 66 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:     {}
---
# ── Measure 67 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  Bb4 5
    5:  A4 1
    6:  G4 2
    8:  A4 3
    11:  D4 13
pad_l:
    0:  D4 24
pad_r:
    0:  D4 24
arpeggio:
    0:  D4 1
    1:  D4 1
    2:  D4 1
    3:  D4 1
    4:  D4 1
    5:  D4 1
    6:  D4 1
    7:  C4 1
    8:  D4 1
    9:  D4 1
    10:  C4 1
    11:  D4 1
bass:
    0:  D2 2
    2:  D2 1
    3:  C2 2
    5:  D2 3
    8:  Bb1 1
    9:  C2 2
    11:  Bb1 1
---
# ── Measure 68 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:     {}
pad_l:     {}
pad_r:     {}
---
# ── Measure 69 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  A4 2
    2:  G4 1
    3:  F4 2
    5:  C4 7
pad_l:
    0:  F4 24
pad_r:
    0:  F4 24
arpeggio:
    0:  C4 1
    1:  C4 1
    2:  C4 1
    3:  C4 1
    4:  C4 1
    5:  C4 1
    6:  C4 1
    7:  Bb3 1
    8:  C4 1
    9:  C4 1
    10:  Bb3 1
    11:  C4 1
bass:
    0:  F2 2
    2:  F2 1
    3:  Eb2 2
    5:  C2 3
    8:  F2 1
    9:  Eb2 2
    11:  C2 1
---
# ── Measure 70 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
pad_l:     {}
pad_r:     {}
bass:
    0:  F2 1
    1:  Eb2 1
    2:  F2 1
    3:  Eb2 1
    4:  C2 1
    5:  Eb2 1
    6:  C2 1
    7:  Bb1 1
    8:  C2 1
    9:  Bb1 1
    10:  G1 1
    11:  Bb1 1
---
# ── Measure 71 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  C5 5
    5:  G4 1
    6:  Eb4 2
    8:  G4 3
    11:  C4 13
pad_l:
    0:  C4 48
pad_r:
    0:  C4 48
bass:
    0:  C2 2
    2:  C2 1
    3:  Bb1 2
    5:  C2 3
    8:  G1 1
    9:  Bb1 2
    11:  G1 1
---
# ── Measure 72 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:     {}
pad_l:     {}
pad_r:     {}
---
# ── Measure 73 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  C5 5
    5:  G4 1
    6:  Eb4 2
    8:  G4 3
    11:  C4 13
---
# ── Measure 74 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:     {}
---
# ── Measure 75 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  Bb4 5
    5:  A4 1
    6:  G4 2
    8:  A4 3
    11:  D4 13
pad_l:
    0:  D4 24
pad_r:
    0:  D4 24
arpeggio:
    0:  D4 1
    1:  D4 1
    2:  D4 1
    3:  D4 1
    4:  D4 1
    5:  D4 1
    6:  D4 1
    7:  C4 1
    8:  D4 1
    9:  D4 1
    10:  C4 1
    11:  D4 1
bass:
    0:  D2 2
    2:  D2 1
    3:  C2 2
    5:  D2 3
    8:  Bb1 1
    9:  C2 2
    11:  Bb1 1
---
# ── Measure 76 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:     {}
pad_l:     {}
pad_r:     {}
---
# ── Measure 77 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  A4 2
    2:  G4 1
    3:  F4 2
    5:  C4 7
pad_l:
    0:  F4 24
pad_r:
    0:  F4 24
arpeggio:
    0:  C4 1
    1:  C4 1
    2:  C4 1
    3:  C4 1
    4:  C4 1
    5:  C4 1
    6:  C4 1
    7:  Bb3 1
    8:  C4 1
    9:  C4 1
    10:  Bb3 1
    11:  C4 1
bass:
    0:  F2 2
    2:  F2 1
    3:  Eb2 2
    5:  C2 3
    8:  F2 1
    9:  Eb2 2
    11:  C2 1
---
# ── Measure 78 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
pad_l:     {}
pad_r:     {}
bass:
    0:  F2 1
    1:  Eb2 1
    2:  F2 1
    3:  Eb2 1
    4:  C2 1
    5:  Eb2 1
    6:  C2 1
    7:  Bb1 1
    8:  C2 1
    9:  Bb1 1
    10:  G1 1
    11:  Bb1 1
---
# ── Measure 79 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  C5 1
    1:  G5 1
    2:  C5 1
    3:  G5 2
    5:  C5 1
pad_l:
    0:  C4 24
pad_r:
    0:  C4 24
arpeggio:     {}
bass:
    0:  C2 2
    2:  C2 1
    3:  Bb1 2
    5:  C2 3
    8:  G1 1
    9:  Bb1 2
    11:  G1 1
---
# ── Measure 80 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
pad_l:     {}
pad_r:     {}
---
# ── Measure 81 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  D5 1
    1:  Bb5 1
    2:  D5 1
    3:  Bb5 2
    5:  D5 1
pad_l:
    0:  D4 24
pad_r:
    0:  D4 24
bass:
    0:  D2 2
    2:  D2 1
    3:  C2 2
    5:  D2 3
    8:  Bb1 1
    9:  C2 2
    11:  Bb1 1
---
# ── Measure 82 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
pad_l:     {}
pad_r:     {}
---
# ── Measure 83 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  F5 1
    1:  C6 1
    2:  F5 1
    3:  C6 2
    5:  F5 1
pad_l:
    0:  F4 24
pad_r:
    0:  F4 24
bass:
    0:  F2 2
    2:  F2 1
    3:  Eb2 2
    5:  C2 3
    8:  F2 1
    9:  Eb2 2
    11:  C2 1
---
# ── Measure 84 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
pad_l:     {}
pad_r:     {}
bass:
    0:  F2 1
    1:  Eb2 1
    2:  F2 1
    3:  Eb2 1
    4:  C2 1
    5:  Eb2 1
    6:  C2 1
    7:  Bb1 1
    8:  C2 1
    9:  Bb1 1
    10:  G1 1
    11:  Bb1 1
---
# ── Measure 85 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  Eb5 1
    1:  D5 1
    2:  Eb5 1
    3:  C5 2
    5:  G4 1
pad_l:
    0:  C4 24
pad_r:
    0:  C4 24
arpeggio:
    0:  C3 1
    1:  G3 1
    2:  C3 1
    3:  G3 1
    4:  C3 1
    5:  G3 1
bass:
    0:  C2 2
    2:  C2 1
    3:  Bb1 2
    5:  C2 3
    8:  G1 1
    9:  Bb1 2
    11:  G1 1
---
# ── Measure 86 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
pad_l:     {}
pad_r:     {}
---
# ── Measure 87 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  Bb4 1
    1:  A4 1
    2:  Bb4 1
    3:  G4 2
    5:  D4 1
pad_l:
    0:  D4 24
pad_r:
    0:  D4 24
arpeggio:
    0:  D3 1
    1:  Bb3 1
    2:  D3 1
    3:  Bb3 1
    4:  D3 1
    5:  Bb3 1
bass:
    0:  D2 2
    2:  D2 1
    3:  C2 2
    5:  D2 3
    8:  Bb1 1
    9:  C2 2
    11:  Bb1 1
---
# ── Measure 88 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
pad_l:     {}
pad_r:     {}
---
# ── Measure 89 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  A4 1
    1:  G4 1
    2:  A4 1
    3:  F4 2
    5:  C5 1
pad_l:
    0:  F4 24
pad_r:
    0:  F4 24
arpeggio:
    0:  F3 1
    1:  C4 1
    2:  F3 1
    3:  C4 1
    4:  F3 1
    5:  C4 1
bass:
    0:  F2 2
    2:  F2 1
    3:  Eb2 2
    5:  C2 3
    8:  F2 1
    9:  Eb2 2
    11:  C2 1
---
# ── Measure 90 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  A4 1
    1:  G4 1
    2:  A4 1
    3:  G4 1
    4:  A4 1
    5:  G4 1
    6:  C5 2
    8:  A4 1
pad_l:     {}
pad_r:     {}
bass:
    0:  F2 1
    1:  Eb2 1
    2:  F2 1
    3:  Eb2 1
    4:  C2 1
    5:  Eb2 1
    6:  C2 1
    7:  Bb1 1
    8:  C2 1
    9:  Bb1 1
    10:  G1 1
    11:  Bb1 1
---
# ── Measure 91 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  Eb5 1
    1:  D5 1
    2:  Eb5 1
    3:  C5 2
    5:  G4 1
    11:  G4 1
pad_l:
    0:  C4 24
pad_r:
    0:  C4 24
arpeggio:
    0:  C3 1
    1:  G3 1
    2:  C3 1
    3:  G3 1
    4:  C3 1
    5:  G3 1
bass:
    0:  C2 2
    2:  C2 1
    3:  Bb1 2
    5:  C2 3
    8:  G1 1
    9:  Bb1 2
    11:  G1 1
---
# ── Measure 92 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  Eb5 3
    3:  D5 2
    5:  C5 2
    8:  Eb5 1
    9:  D5 2
    11:  C5 1
pad_l:     {}
pad_r:     {}
---
# ── Measure 93 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  D5 1
    1:  C5 1
    2:  D5 1
    3:  Bb4 2
    5:  G5 1
    8:  D5 1
    11:  C5 1
pad_l:
    0:  D4 24
pad_r:
    0:  D4 24
arpeggio:
    0:  D3 1
    1:  Bb3 1
    2:  D3 1
    3:  Bb3 1
    4:  D3 1
    5:  Bb3 1
bass:
    0:  D2 2
    2:  D2 1
    3:  C2 2
    5:  D2 3
    8:  Bb1 1
    9:  C2 2
    11:  Bb1 1
---
# ── Measure 94 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  D5 2
    2:  C5 1
    3:  Bb4 2
    5:  G4 1
pad_l:     {}
pad_r:     {}
---
# ── Measure 95 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  A4 1
    1:  G4 1
    2:  A4 1
    3:  C5 2
    6:  G4 2
    8:  F4 2
    10:  G4 2
pad_l:
    0:  F4 24
pad_r:
    0:  F4 24
arpeggio:
    0:  F3 1
    1:  C4 1
    2:  F3 1
    3:  C4 1
    4:  F3 1
    5:  C4 1
bass:
    0:  F2 2
    2:  F2 1
    3:  Eb2 2
    5:  C2 3
    8:  F2 1
    9:  Eb2 2
    11:  C2 1
---
# ── Measure 96 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  A4 2
    2:  G4 2
    4:  A4 2
    6:  C5 2
    8:  A4 2
    10:  C5 2
pad_l:     {}
pad_r:     {}
bass:
    0:  F2 1
    1:  Eb2 1
    2:  F2 1
    3:  Eb2 1
    4:  C2 1
    5:  Eb2 1
    6:  C2 1
    7:  Bb1 1
    8:  C2 1
    9:  Bb1 1
    10:  G1 1
    11:  Bb1 1
---
# ── Measure 97 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  Eb5 1
    1:  D5 1
    2:  Eb5 1
    3:  C5 2
    5:  G4 1
    11:  G4 1
pad_l:
    0:  C4 24
pad_r:
    0:  C4 24
arpeggio:
    0:  C3 1
    1:  G3 1
    2:  C3 1
    3:  G3 1
    4:  C3 1
    5:  G3 1
bass:
    0:  C2 2
    2:  C2 1
    3:  Bb1 2
    5:  C2 3
    8:  G1 1
    9:  Bb1 2
    11:  G1 1
---
# ── Measure 98 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  Eb5 3
    3:  D5 2
    5:  C5 2
    8:  Eb5 1
    9:  D5 2
    11:  C5 1
pad_l:     {}
pad_r:     {}
---
# ── Measure 99 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  D5 1
    1:  C5 1
    2:  D5 1
    3:  Bb4 2
    5:  G5 1
    8:  D5 1
    11:  C5 1
pad_l:
    0:  D4 24
pad_r:
    0:  D4 24
arpeggio:
    0:  D3 1
    1:  Bb3 1
    2:  D3 1
    3:  Bb3 1
    4:  D3 1
    5:  Bb3 1
bass:
    0:  D2 2
    2:  D2 1
    3:  C2 2
    5:  D2 3
    8:  Bb1 1
    9:  C2 2
    11:  Bb1 1
---
# ── Measure 100 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  D5 2
    2:  C5 1
    3:  Bb4 2
    5:  G4 1
pad_l:     {}
pad_r:     {}
---
# ── Measure 101 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  A4 1
    1:  G4 1
    2:  A4 1
    3:  C5 2
    6:  G4 2
    8:  F4 2
    10:  G4 2
pad_l:
    0:  F4 24
pad_r:
    0:  F4 24
arpeggio:
    0:  F3 1
    1:  C4 1
    2:  F3 1
    3:  C4 1
    4:  F3 1
    5:  C4 1
bass:
    0:  F2 2
    2:  F2 1
    3:  Eb2 2
    5:  C2 3
    8:  F2 1
    9:  Eb2 2
    11:  C2 1
---
# ── Measure 102 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  A4 2
    2:  G4 2
    4:  A4 2
    6:  C5 2
    8:  A4 2
    10:  C5 2
pad_l:     {}
pad_r:     {}
bass:
    0:  F2 1
    1:  Eb2 1
    2:  F2 1
    3:  Eb2 1
    4:  C2 1
    5:  Eb2 1
    6:  C2 1
    7:  Bb1 1
    8:  C2 1
    9:  Bb1 1
    10:  G1 1
    11:  Bb1 1
---
# ── Measure 103 ─────────────────────────────────────────────────────────────
_meta:
    repeat_unmentioned_voices: true
lead:
    0:  C6 4
pad_l:
    0:  C4 12
pad_r:
    0:  C4 12
arpeggio:     {}
bass:
    0:  C2 4
cymbal:     {}
claves:     {}
kick:     {}`

const SEEDS: Seed[] = [
  // Oxygène Pt. IV — Jarre (1976): default project on first run.
  { name: 'oxygene',         ext: 'spls', body: OXYGENE,            inProject: true },
  { name: 'filtered-bass',   ext: 'spli', body: OXYGENE_BASS,       inProject: true },
  { name: 'oxygene-kick',    ext: 'spli', body: OXYGENE_KICK,       inProject: true },
  { name: 'kalimba',         ext: 'spli', body: OXYGENE_KALIMBA,    inProject: true },
  { name: 'synbrass',        ext: 'spli', body: OXYGENE_SYNBRASS,   inProject: true },
  { name: 'synstrings2',     ext: 'spli', body: OXYGENE_STRINGS,    inProject: true },
  { name: 'synstrings1',     ext: 'spli', body: OXYGENE_STRINGS1,   inProject: true },
  { name: 'string-ensemble', ext: 'spli', body: OXYGENE_ENSEMBLE,   inProject: true },
  { name: 'bowed-pad',       ext: 'spli', body: OXYGENE_BOWEDPAD,   inProject: true },
  { name: 'oxygene-melody',  ext: 'spli', body: OXYGENE_MELODY,     inProject: true },
  { name: 'tambourine',       ext: 'spli', body: OXYGENE_TAMBOURINE,     inProject: true },
  { name: 'seashore',         ext: 'spli', body: OXYGENE_SEASHORE,       inProject: true },
  { name: 'hi-hat',           ext: 'spli', body: OXYGENE_HIHAT,          inProject: true },
  { name: 'guiro',            ext: 'spli', body: OXYGENE_GUIRO,          inProject: true },
  { name: 'castanet',         ext: 'spli', body: OXYGENE_CASTANET,       inProject: true },
  { name: 'reverse-cymbal',   ext: 'spli', body: OXYGENE_REVERSE_CYMBAL, inProject: true },
  { name: 'applause',         ext: 'spli', body: OXYGENE_APPLAUSE,       inProject: true },
  { name: 'tones_euro',       ext: 'splt', body: STARTER_TUNING,         inProject: true },
  { name: 'oxygene-plate',  ext: 'splr', body: OXYGENE_PLATE_ROOM, inProject: true },

  // oxygene4old — original Python Sompyler source (RFC character: format).
  { name: 'oxygene4old',          ext: 'spls', body: OXYGENE4OLD,          inProject: false },
  { name: 'oxygene4old/kick',     ext: 'spli', body: OXYGENE4OLD_KICK,     inProject: false },
  { name: 'oxygene4old/claves',   ext: 'spli', body: OXYGENE4OLD_CLAVES,   inProject: false },
  { name: 'oxygene4old/cymbal',   ext: 'spli', body: OXYGENE4OLD_CYMBAL,   inProject: false },
  { name: 'oxygene4old/bass',     ext: 'spli', body: OXYGENE4OLD_BASS,     inProject: false },
  { name: 'oxygene4old/arpeggio', ext: 'spli', body: OXYGENE4OLD_ARPEGGIO, inProject: false },
  { name: 'oxygene4old/pad',      ext: 'spli', body: OXYGENE4OLD_PAD,      inProject: false },
  { name: 'oxygene4old/lead',     ext: 'spli', body: OXYGENE4OLD_LEAD,     inProject: false },

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
