/**
 * Starter content seeded on first run.
 *
 * In-project (loads automatically):
 *   - `oxygene.spls` — Jean-Michel Jarre "Oxygène Pt. IV" (1976), full 117-bar transcription.
 *   - `filtered-bass/oxygene-kick/kalimba/synbrass/synstrings/string-ensemble/bowed-pad/oxygene-melody/tambourine/seashore.spli`
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
author: Johann Pachelbel (arr. for Sompyler)
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
export const STARTER_KICK = `# dev/kick.spli — FM kick drum with pitch sweep.
# Score at C1 (32.7 Hz). Carrier sweeps C3 → C1 in first ~50 ms of a 500 ms note.
character:
  O: sine
  AMP: 0.90
  A: "0.002:1,100"
  S: "0.001:100;1,100"
  R: "0.3:100;1,0"
  FM: "1[100:1;0.1,0;1,0];3+90"
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
wet: 0.22
pre_delay_ms: 10
`

const OXYGENE_KICK = `# oxygene-kick.spli — FM kick drum with pitch sweep.
# Score at C1 (32.7 Hz). FM +90 starts modulator at peak,
# sweeping carrier from ~4× base down to base in first ~50 ms.
character:
  O: sine
  AMP: 0.85
  A: "0.002:1,100"
  S: "0.001:100;1,100"
  R: "0.28:100;1,0"
  FM: "1[100:1;0.1,0;1,0];3+90"
`

const OXYGENE_BASS = `# bass: Fretless Bass (GM36 / FluidR3_GM2.sf2). PROFILE from loop FFT.
# Sample: 'Fretless A3'  root=69  rate=48000 Hz  loop=815fr (17.0ms)
# H3 (63.8) > H2 (58.7) — characteristic fretless growl. H8–H16 plateau
# (~25–33 RDFS) gives sustained upper-harmonic richness. Envelope: instant
# attack, 3s decay to silence (plucked), 1.8s release. initialAttn=0 → AMP=0.5.
character:
  O: sine
  AMP: 0.5
  A: "0.001:1,100"
  S: "3:100;1,0.0"
  R: "1.782:100;1,0"
  PROFILE:
    - 100.0  # H1
    - 58.7   # H2
    - 63.8   # H3
    - 42.0   # H4
    - 32.9   # H5
    - 23.6   # H6
    - 23.2   # H7
    - 30.4   # H8
    - 31.0   # H9
    - 30.5   # H10
    - 25.0   # H11
    - 32.6   # H12
    - 30.0   # H13
    - 29.3   # H14
    - 30.7   # H15
    - 33.0   # H16
    - 26.1   # H17
    - 25.5   # H18
    - 28.0   # H19
    - 23.6   # H20
    - 22.3   # H21
    - 25.7   # H22
    - 26.1   # H23
    - 23.3   # H24
`

const OXYGENE_KALIMBA = `# kalimba: Koto (GM108 / FluidR3_GM2.sf2). PROFILE from loop FFT.
# Sample: 'Koto C 5(R)'  root=60  rate=44100 Hz  loop=338fr (7.7ms)
# Very rich 24-harmonic spectrum — H2/H3/H5 near 100 RDFS, broad high-partial
# content. Instant attack, 0.29s decay to silence, 1.8s release (plucked).
# initialAttn=0 → AMP=0.5.
character:
  O: sine
  AMP: 0.5
  A: "0.001:1,100"
  S: "0.289:100;1,0.0"
  R: "1.782:100;1,0"
  PROFILE:
    - 100.0  # H1
    - 97.5   # H2
    - 100.0  # H3
    - 79.5   # H4
    - 99.8   # H5
    - 93.5   # H6
    - 88.0   # H7
    - 85.4   # H8
    - 85.3   # H9
    - 79.0   # H10
    - 71.5   # H11
    - 77.9   # H12
    - 81.3   # H13
    - 76.4   # H14
    - 76.8   # H15
    - 67.8   # H16
    - 62.4   # H17
    - 60.4   # H18
    - 54.3   # H19
    - 46.7   # H20
    - 37.0   # H21
    - 44.1   # H22
    - 48.1   # H23
    - 25.7   # H24
`

const OXYGENE_SYNBRASS = `# synbrass: Synth Brass 2 (GM64 / FluidR3_GM2.sf2). PROFILE from loop FFT.
# Sample: 'Sbrass C4(L)'  root=60  rate=25000 Hz  loop=29098fr (1163.9ms)
# H2=H1 — fundamental and octave equal, giving brass "gut vibration" presence.
# Filter sweep: 500 Hz → 5039 Hz via mod envelope (instant attack, 1s release).
# PROFILE from open-filter loop FFT. initialAttn=0 → AMP=0.5.
character:
  O: sine
  AMP: 0.5
  A: "0.001:1,100"
  S: "0.025:100;1,100.0"
  R: "1.017:100;1,0"
  VCF: "500;0.89;4539;0.001;1.029"
  PROFILE:
    - 100.0  # H1
    - 100.0  # H2
    - 88.8   # H3
    - 76.4   # H4
    - 75.3   # H5
    - 73.4   # H6
    - 71.0   # H7
    - 64.8   # H8
    - 63.5   # H9
    - 65.2   # H10
    - 62.7   # H11
    - 53.9   # H12
    - 57.5   # H13
    - 58.6   # H14
    - 62.6   # H15
    - 43.8   # H16
    - 55.2   # H17
    - 43.8   # H18
    - 56.1   # H19
    - 49.5   # H20
    - 54.6   # H21
    - 53.3   # H22
    - 48.1   # H23
    - 42.4   # H24
`

const OXYGENE_STRINGS = `# strings: Synth Strings 2 (GM52 / FluidR3_GM2.sf2).
# Sample: 'saw-fb-110'  root=60  rate=44100 Hz  loop=401fr (9.1ms)
# Feedback sawtooth sample (confirmed by name). O:sawtooth models this directly;
# no PROFILE needed (sawtooth generates its own 1/n harmonic series).
# Filter sweep: 5549 Hz → 6745 Hz via mod envelope (instant, 1.8s release).
# Vibrato: 8.18 Hz, ±15¢, 0.37s delay. initialAttn=0 → AMP=0.5.
character:
  O: sawtooth
  AMP: 0.5
  A: "0.001:1,100"
  S: "0.001:100;1,100.0"
  R: "0.001:100;1,0"
  VCF: "5549;0.95;1196;0.001;1.782"
  LFO: "8.18@sin[0.37];15.000:pitch"
`

const OXYGENE_ENSEMBLE = `# ensemble: String Ensemble 1 (GM49 / FluidR3_GM2.sf2). PROFILE from loop FFT.
# Sample: 'Strings C#5L'  root=60  rate=32000 Hz  loop=30844fr (963.9ms)
# H1–H5 all at 100 RDFS, gradual rolloff from H6, dense content up to H24.
# SF2 envelope: instant attack, 0.1s decay to silence (no sustain), 1s release.
# This is a "strings hit" articulation — not a sustained pad. initialAttn=30cB → AMP=0.354.
# Filter sweep 10002→11227 Hz is above hearing — effectively open, no VCF needed.
character:
  O: sine
  AMP: 0.354
  A: "0.001:1,100"
  S: "0.1:100;1,0.0"
  R: "1.017:100;1,0"
  PROFILE:
    - 100.0  # H1
    - 100.0  # H2
    - 100.0  # H3
    - 100.0  # H4
    - 100.0  # H5
    - 91.2   # H6
    - 89.4   # H7
    - 80.4   # H8
    - 72.8   # H9
    - 89.0   # H10
    - 93.1   # H11
    - 86.5   # H12
    - 94.2   # H13
    - 88.1   # H14
    - 86.0   # H15
    - 86.4   # H16
    - 85.8   # H17
    - 82.7   # H18
    - 83.3   # H19
    - 79.4   # H20
    - 73.7   # H21
    - 72.5   # H22
    - 63.6   # H23
    - 59.9   # H24
`

const OXYGENE_BOWEDPAD = `# bowedpad: Bowed Glass (GM93 / FluidR3_GM2.sf2).
# Sample: 'Bowed Glass'  root=60  rate=44100 Hz  loop=252fr (5.7ms)
# Single-cycle loop — flat spectrum, all harmonics equal. Timbre entirely from
# VCF at 1720 Hz fixed (filterQ=0cB). No LFO in SF2. Envelope: instant attack,
# full sustain, instant release. initialAttn≈24cB → AMP=0.158.
character:
  O: sine
  AMP: 0.158
  A: "0.001:1,100"
  S: "0.011:100;1,100.0"
  R: "0.001:100;1,0"
  VCF: "1720;0.95"
  PROFILE:
    - 100.0  # H1
    - 100.0  # H2
    - 100.0  # H3
    - 100.0  # H4
    - 100.0  # H5
    - 100.0  # H6
    - 100.0  # H7
    - 100.0  # H8
    - 100.0  # H9
    - 100.0  # H10
    - 100.0  # H11
    - 100.0  # H12
    - 100.0  # H13
    - 100.0  # H14
    - 100.0  # H15
    - 100.0  # H16
    - 100.0  # H17
    - 100.0  # H18
    - 100.0  # H19
    - 100.0  # H20
    - 100.0  # H21
    - 99.2   # H22
    - 100.0  # H23
    - 100.0  # H24
`

const OXYGENE_MELODY = `# melody: Nylon String Guitar (GM25 / FluidR3_GM2.sf2). PROFILE from loop FFT.
# Sample: 'Nylon B4'  root=60  rate=44100 Hz  loop=357fr (8.1ms)
# H1–H5 strong (83–100 RDFS), H6–H8 dip, H10+ broad high-partial content.
# Filter at 10397 Hz — effectively open, no VCF. Instant attack, 1s decay to
# silence (plucked), 1.8s release. initialAttn=0 → AMP=0.5.
character:
  O: sine
  AMP: 0.5
  A: "0.001:1,100"
  S: "1:100;1,0.0"
  R: "1.782:100;1,0"
  PROFILE:
    - 100.0  # H1
    - 92.8   # H2
    - 98.2   # H3
    - 91.4   # H4
    - 83.4   # H5
    - 58.1   # H6
    - 37.1   # H7
    - 26.6   # H8
    - 27.4   # H9
    - 40.5   # H10
    - 37.1   # H11
    - 41.6   # H12
    - 40.1   # H13
    - 43.8   # H14
    - 41.3   # H15
    - 36.2   # H16
    - 33.3   # H17
    - 33.6   # H18
    - 23.3   # H19
    - 43.1   # H20
    - 38.5   # H21
    - 38.2   # H22
    - 30.2   # H23
    - 28.0   # H24
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
  S: "0.001:100;1,0.0"
  R: "0.001:100;1,0"
`

const OXYGENE_SEASHORE = `# seashore: Sea Shore (GM123 / FluidR3_GM2.sf2). Noise instrument.
# Sample: 'Sea Shore'  root=60  rate=44100 Hz  loop=71159fr (1613.6ms)
# Pre-recorded ocean wash — O:noise approximates the broadband source.
# SF2 envelope: 1.96s rise, hold 2.67s, decay 1.79s to silence, instant release.
# Total natural duration ≈ 6.4s. initialAttn≈25cB → AMP=0.375.
character:
  O: noise
  AMP: 0.375
  A: "1.96:1,100"
  S: "4.46:100;0.599,100;1,0.0"
  R: "0.001:100;1,0"
`

const OXYGENE = `title: Oxygène Pt. IV
author: Jean-Michel Jarre (1976)
stage:
  seashore:  1|1 1.8 seashore
  kalimba:   1|1 0.2 kalimba
  bass:      1|1 0.0 filtered-bass
  kick:      1|1 0.0 oxygene-kick
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
  beats_per_minute: 369
  ticks_per_measure: 12
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
kick:
  0: C1 2
  6: C1 2
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
kick: false
melody:
  0: A4 1
  1: G4 1
  2: A4 1
  3: F4 2
  5: C5 3
  8: F4 4`

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
  { name: 'synstrings',      ext: 'spli', body: OXYGENE_STRINGS,    inProject: true },
  { name: 'string-ensemble', ext: 'spli', body: OXYGENE_ENSEMBLE,   inProject: true },
  { name: 'bowed-pad',       ext: 'spli', body: OXYGENE_BOWEDPAD,   inProject: true },
  { name: 'oxygene-melody',  ext: 'spli', body: OXYGENE_MELODY,     inProject: true },
  { name: 'tambourine',      ext: 'spli', body: OXYGENE_TAMBOURINE, inProject: true },
  { name: 'seashore',        ext: 'spli', body: OXYGENE_SEASHORE,   inProject: true },
  { name: 'tones_euro',      ext: 'splt', body: STARTER_TUNING,     inProject: true },
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
