/**
 * R8: starter content seeded on first run.
 *
 * Phase 17 — the showcase. The starter song is Pachelbel's *Canon in D*
 * (the strings setting); a solo-piano variant of the same melody ships
 * alongside it in staging. The four-voice canon exercises every shipped
 * RFC feature:
 *
 *   - Position-dependent reverb (R13) — four voices at distinct stage
 *     positions get four distinct IRs.
 *   - Cache hit ratio — the cello ostinato repeats verbatim every two
 *     bars and the three violins play the same melody in canon, so a
 *     full render is dominated by hits after the first pass.
 *   - Measure inheritance (S46110) — the cello phrases are stated once
 *     and reused via `voice: true`.
 *   - Sympartials (S33000-3.3) — the violin / cello / piano instruments
 *     each ship a 5–6 partial harmonic stack.
 *   - Stress patterns (S46300) — strong-weak beat pattern shapes the
 *     dynamic envelope of every measure.
 *   - Shape articles (S32200) — a `vibrato` shape modulates the
 *     amplitude of the violin1 high notes.
 *   - Tempo Shape (S46140, R13 amendment) — the final two measures
 *     ritardando via a continuous tempo curve.
 *   - Damp (S51a10) — the cello held notes carry `damp` for smooth
 *     bowed release.
 *   - Off-scale `?` flag (S53400) — a passing tone in violin1 sits a
 *     half-step outside the active D-major scale; `?` snaps it.
 *   - Railsback (S32136) — the piano variant carries an upward
 *     inharmonicity curve so high-register notes shift sharper.
 *
 * In-project (the starter song works out of the box):
 *   - `pachelbel.spls` — the four-voice strings canon (primary showcase).
 *   - `violin.spli`, `cello.spli` — rich string-like sympartial stacks.
 *   - `pachelbel-hall.splr` — two-delay hall reverb.
 *   - `tones_euro.splt` — equal-temperament tuning with chr/mj/mn scales.
 *
 * In staging (the user opts in by clicking +):
 *   - `pachelbel-piano.spls` — solo-piano variant of the same melody.
 *   - `piano.spli` — railsback-enabled piano (richer than dev/piano).
 *   - `dev/piano.spli`, `dev/flute.spli` — minimal alternates.
 *   - `free-field.splr` — no-reverb fast-path room.
 *   - `alle_meine_entchen.spls` — the original simple starter.
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

const SEEDS: Seed[] = [
  // The Pachelbel showcase is the starter song.
  { name: 'pachelbel', ext: 'spls', body: PACHELBEL, inProject: true },
  { name: 'violin', ext: 'spli', body: VIOLIN, inProject: true },
  { name: 'cello', ext: 'spli', body: CELLO, inProject: true },
  { name: 'pachelbel-hall', ext: 'splr', body: PACHELBEL_HALL, inProject: true },
  { name: 'tones_euro', ext: 'splt', body: STARTER_TUNING, inProject: true },

  // Solo-piano variant + richer piano in staging.
  { name: 'pachelbel-piano', ext: 'spls', body: PACHELBEL_PIANO, inProject: false },
  { name: 'piano', ext: 'spli', body: PIANO, inProject: false },

  // Previous starters preserved in staging so existing tests / examples
  // keep working when the user opts in.
  { name: 'dev/piano', ext: 'spli', body: STARTER_PIANO, inProject: false },
  { name: 'dev/flute', ext: 'spli', body: STARTER_FLUTE, inProject: false },
  { name: 'free-field', ext: 'splr', body: STARTER_FREE_FIELD, inProject: false },
  { name: 'alle_meine_entchen', ext: 'spls', body: ALLE_MEINE_ENTCHEN, inProject: false },
]

export async function seedDefaults(): Promise<void> {
  for (const seed of SEEDS) {
    if (await getFile(seed.name, seed.ext)) continue
    await putFile(seed)
  }
}
