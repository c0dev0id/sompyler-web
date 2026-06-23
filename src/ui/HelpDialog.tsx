import { For, Show, type Component } from 'solid-js'
import type { FileExtension } from '../storage/files'

// ── Content ────────────────────────────────────────────────────────────────────

interface Block {
  subtitle?: string
  code: string
}

interface Section {
  title: string
  intro: string
  blocks: Block[]
}

// ── Score ─────────────────────────────────────────────────────────────────────

const SCORE: Section = {
  title: 'Score  (.spls)',
  intro:
    'A score file describes a complete piece: the instruments, how they sit in ' +
    'the stereo field, the tempo and dynamics, and all the notes.',
  blocks: [
    {
      subtitle: 'File header — shared settings at the top of the file',
      code: `title: Song Title
author: Artist Name
tuning_config: tones_euro  # .splt file that defines note names and frequencies
room: hall                 # .splr file that adds reverb; omit for a dry sound

stage:                     # places each voice in the stereo field
  bass: "1|1 0.0 bass"    # "L|R  distance  instrument"
  lead: "2|1 0.5 piano"   #
  pad:  "1|2 0.8 strings" # L|R      — pan ratio; 1|1=centre, 2|1=left, 1|2=right
                            # distance — room send amount; 0.0=dry, 1.0=fully wet
                            # instrument — name of a .spli file in the project`,
    },
    {
      subtitle: 'Measure settings — the _meta block',
      code: `_meta:
  beats_per_minute: 120           # tempo; multiplied by stress sub-level count
                                   # to derive the internal ticks-per-minute rate
  stress_pattern: "2,0,1,0"      # accent cycle: 2=strong, 1=weak, 0=off-beat
                                   # "2,0,1,0" → four ticks per beat (4/4 time)
                                   # each group separated by ";" is one beat
  lower_stress_bound: 70          # quietest note velocity (0–100)
  upper_stress_bound: 95          # loudest note velocity; narrow range = flat dynamics
  repeat_unmentioned_voices: true # voices not listed here loop their previous measure`,
    },
    {
      subtitle: 'Notes — placing pitches on the timeline',
      code: `voice:              # must match a name declared in stage:
  0:  C4  3          # tick, pitch, duration (in ticks)
  3:  Bb3 2          # note names: C D E F G A B
                      # sharps: C# D# F# G# A#   flats: Db Eb Gb Ab Bb
                      # octave 4 = middle C ≈ 262 Hz; each +1 doubles the pitch

  0:  G3  2  damp=2  # damp=N — extend the release phase by N extra ticks
                      # (the note rings past the end of the score's note window)

  3,5: E4 1          # comma list — place the same note at multiple ticks
  0+2*4: C5 1        # range — start + step * count → ticks 0, 2, 4, 6

  voice: false        # silence this voice for the measure`,
    },
    {
      subtitle: 'Chain notation — compact sequences and chords',
      code: `# Assign a string to a voice instead of individual tick offsets:
voice: "C4 E4 G4 C5"           # sequential: one note per tick
voice: "G3_11; B3_11; D4_11"   # chord: all three share a start tick
                                 # _11 = hold for 12 ticks (1 + 11)

# Modifiers:
#   _N    hold for 1+N ticks              (_3 = 4 ticks, _11 = 12 ticks)
#   ;     the next note starts at the same tick (chord)
#   .     rest — silence one tick         (.3 = three silent ticks)
#   +N    shift up N semitones from the previous pitch  (+7 = a fifth)
#   -N    shift down N semitones

# Examples:
voice: "C4_3 E4_3 G4_3"         # ascending arpeggio, 4 ticks each
voice: "C4_3 .2 +4_3 .2 +3_3"  # with rests, each note a third above the last`,
    },
  ],
}

// ── Instrument ────────────────────────────────────────────────────────────────

const INSTRUMENT: Section = {
  title: 'Instrument  (.spli)',
  intro:
    'An instrument file describes how a voice sounds — the wave shape, the ' +
    'amplitude envelope, the overtone spectrum, and any modulation effects.',
  blocks: [
    {
      subtitle: 'Wave shape and envelope',
      code: `character:
  O: sine      # oscillator waveform: sine | sawtooth | square | triangle | noise
  AMP: 0.8     # master amplitude scalar — use this to balance instruments

  # Envelope — shape strings: "DURATION:startVal;pos,val;pos,val;…"
  #   DURATION = phase length in seconds
  #   Values are in REVERSED_DBFS: 100 = peak amplitude, 0 = silence
  #   Positions between points are bezier-interpolated
  A: "0.01:1,100"       # attack:  10ms, ramps 0 → 100
  S: "0.10:100;1,85"    # sustain: 100ms decay 100 → 85, then holds at 85
  R: "0.30:100;1,0"     # release: 300ms fall 100 → 0

  # T: tail (optional) — inserted between sustain and release
  T: "0.20:85;1,50"     # 200ms further decay from 85 to 50

  # Multiple control points give finer curve control:
  R: "0.50:100;0.3,70;1,0"   # fast initial drop, then slow fade`,
    },
    {
      subtitle: 'PROFILE — overtone structure',
      code: `character:
  O: sine
  A: "0.01:1,100"
  S: "0.1:100;1,80"
  R: "0.3:100;1,0"

  # PROFILE defines the amplitude of each harmonic partial.
  # Index 0 = fundamental (H1), index 1 = 2nd harmonic (H2), and so on.
  # Values are in REVERSED_DBFS: 100 = same level as H1, 0 = absent.
  PROFILE: [100, 60, 30, 15, 8, 4]    # fundamental + 5 overtones

  # Per-partial overrides — any entry can be an object with V, A, S, R, D:
  PROFILE:
    - 100                          # H1 — simple value
    - V: 60                        # H2 — same as plain 60
      A: "0.5:1,100"               #      but this harmonic builds more slowly
    - V: 30                        # H3
      D: 7                         #      frequency offset: +7 cents (slightly sharp)
    - 15                           # H4 — plain value
    # V   — amplitude in REVERSED_DBFS; required when the entry is an object
    # A/S/R/T — per-partial envelope phases; inherit from root when omitted
    # D   — deviance in cents from the pure harmonic series
    #        D:7 = 7¢ sharp, D:-12 = 12¢ flat; models string inharmonicity

  SPREAD: [0, 3, -2, 5]   # cumulative per-partial detune in cents; adds warmth`,
    },
    {
      subtitle: 'VCF — resonant low-pass filter',
      code: `# Removes high frequencies to make the sound darker and warmer.
# "Resonant" adds a peak right at the cutoff, giving the classic synthesizer
# "wah" quality. With an envelope the filter sweeps open and closed per note.

character:
  VCF: "CUTOFF;RESONANCE[;ENV_AMOUNT[;ENV_ATTACK[;ENV_RELEASE]]]"

  # CUTOFF      — frequency in Hz where the filter begins to cut
  #               200–600 Hz = dark/muffled   1–3 kHz = warm   8 kHz+ = bright
  # RESONANCE   — 0.0 = gentle slope, no peak  →  0.9 = sharp ringing peak
  # ENV_AMOUNT  — Hz the cutoff shifts on attack (positive = brighter, negative = darker)
  # ENV_ATTACK  — seconds for the filter to reach its peak (optional)
  # ENV_RELEASE — seconds to fall back to CUTOFF (optional)

  VCF: "2000;0.5"               # static: 2 kHz cutoff, gentle resonance
  VCF: "800;0.6;1200;0.05;0.4"  # sweep: opens from 800 Hz to 2 kHz on attack`,
    },
    {
      subtitle: 'LFO — slow cyclic modulation',
      code: `# Produces slow, repeating movement. Routed to the filter cutoff it creates
# a wah sweep; routed to amplitude it creates tremolo (volume pulsing).

character:
  LFO: "RATE[@OSC][[DELAY]];DEPTH:TARGET[+PHASE]"

  # RATE    — cycles per second; 0.2 Hz = one sweep per 5s; 5 Hz = fast tremolo
  # @OSC    — LFO waveform (sin | saw | square | triangle); default sin
  # [DELAY] — fade-in time in seconds; the LFO grows from zero to full depth
  # DEPTH   — swing amount: Hz for vcf target; fraction 0–1 for amp target
  # TARGET  — what to modulate: vcf (filter cutoff) or amp (volume)
  # +PHASE  — starting phase in degrees (0–359); optional

  LFO: "0.5@sin[0.5];200:vcf"  # slow filter wobble, 0.5s fade-in
  LFO: "3.0@tri;0.08:amp"      # fast tremolo, no fade-in

  # Multiple LFOs:
  LFO:
    - "0.5@sin[0.5];200:vcf"
    - "3.0@tri;0.08:amp"`,
    },
    {
      subtitle: 'FM — frequency modulation',
      code: `# Uses one oscillator (the modulator) to rapidly vary the pitch of the note.
# Unlike the LFO, the modulator runs at audio frequencies, creating complex
# sidebands — metallic, bell-like, or harsh tones not achievable with simple waves.

character:
  FM: "FREQ[f][@OSC][[DEPTH_ENV]];DEPTH[+PHASE]"

  # FREQ       — modulator frequency in Hz
  # f          — treat FREQ as a ratio of the note pitch ("2f" at A4 = 880 Hz)
  #              keeps timbre consistent across all pitches; omit for fixed Hz
  # @OSC       — modulator waveform (sin | saw | square | triangle); default sin
  # [DEPTH_ENV]— shape string controlling depth over time
  #              "1:1;0.5,0" = full depth, fades to zero by halfway
  # DEPTH      — pitch swing as fraction of carrier frequency
  #              0.05 = subtle shimmer   0.3 = metallic/bell   0.8+ = heavy distortion
  # +PHASE     — modulator starting phase in degrees; +90 creates a downward pitch dip

  FM: "2f[1:1;0.5,0];0.4"  # 2× ratio, depth fades out: metallic attack, clean sustain
  FM: "220@saw;0.3"         # fixed 220 Hz sawtooth modulator, depth 0.3
  FM: "2f;0.4+90"           # ratio 2×, depth 0.4, phase 90° (downward pitch dip)`,
    },
  ],
}

// ── Tuning ────────────────────────────────────────────────────────────────────

const TUNING: Section = {
  title: 'Tuning  (.splt)',
  intro:
    'A tuning file defines the pitch system — what frequencies the note names ' +
    'map to, which scales are available, and which scale is active by default. ' +
    'The built-in "tones_euro" covers standard Western notation (A–G, sharps and flats).',
  blocks: [
    {
      code: `basics:
  ref_frequency:    440  # Hz of the reference pitch; 440 = concert A
  ref_octave_number:  4  # octave containing the reference (A4 = 440 Hz)
  ref_octave_offset:  9  # semitones above C: C=0 D=2 E=4 F=5 G=7 A=9 B=11
  tones_per_octave:  12  # 12 = equal temperament; increase for microtonal systems

tones:                   # custom note names (merged with built-in Anglo-Saxon set)
  H:   11                # semitone position in [0, tones_per_octave)
  Cis:  1                # e.g. German notation: H=B-natural, Cis=C-sharp

scales:                  # step sizes in semitones; must sum to tones_per_octave
  mj:  "2 2 1 2 2 2 1"  # major scale (W W H W W W H)
  mn:  "2 1 2 2 1 2 2"  # natural minor
  chr: "1 1 1 1 1 1 1 1 1 1 1 1"  # chromatic (all 12 semitones)

default_scale: mj        # scale used when no scale is specified in the score

# When a scale is active, off-scale notes require an explicit suffix:
#   C#4?  — snap to the nearest in-scale pitch
#   C#4!  — play the exact chromatic pitch regardless of scale`,
    },
  ],
}

// ── Room ──────────────────────────────────────────────────────────────────────

const ROOM: Section = {
  title: 'Room  (.splr)',
  intro:
    'A room file adds reverb — reflected sound that builds a sense of space. ' +
    'There are two room types: a tap-delay model (explicit echo taps) and ' +
    'Freeverb (a smooth algorithmic reverb). The same shape string format used ' +
    'in instrument envelopes also appears in room fields.',
  blocks: [
    {
      subtitle: 'Shape strings — bezier curves in a compact notation',
      code: `# Format:  DURATION : [startVal ;] pos,val [; pos,val …]
#
# DURATION  — output size: seconds (instrument envelopes) or tap count (rooms)
# startVal  — value at position 0; omit to start from 0
# pos,val   — control points; positions must increase left to right
# Values between points are smoothly bezier-interpolated.
#
# Examples used in instrument envelopes (REVERSED_DBFS: 100=peak, 0=silence):
"0.01:1,100"          # 10ms ramp: 0 → 100
"0.10:100;1,85"       # 100ms decay: 100 → 85
"0.30:100;0.3,70;1,0" # 300ms release: fast drop, then slow fade to 0
#
# Example used in room levels/delays (6 taps):
"6:90;1,60;4,20;6,5"  # 6-output curve
#
#  90 ●                   ← tap 0
#  60   ╲
#  20       ━━━━━━●       ← tap 4
#   5              ────────●  ← tap 6
#     0   1   2   3   4   5   6`,
    },
    {
      subtitle: 'Tap-delay room',
      code: `name: hall   # human-readable label (not used in score references)

levels: "6:90;1,60;4,20;6,5"
# Amplitude of each echo tap — defines the reverb decay curve.
# Higher = louder reflections; shape controls how fast the reverb fades.

delays: "6:0;6,100"
# Delay of each tap in milliseconds.
# "6:0;6,100" spreads 6 taps evenly from 0 ms to 100 ms.

jitter: "1:0.12"
# Small random amplitude variation per tap — prevents metallic comb-filter
# colouration from evenly spaced taps. Separate L/R: "1:0.12|1:0.18"

deldiffs: "0.008|0.014"
# Per-channel arrival offset in seconds (L: 8ms, R: 14ms).
# Makes left and right echo times differ slightly → stereo width.`,
    },
    {
      subtitle: 'Freeverb — algorithmic reverb',
      code: `# A classic plate-style reverb: parallel comb filters → all-pass diffusers.
# Produces smooth, dense decay without explicit tap configuration.
# Use this for natural-sounding ambience; use tap-delay for distinct echoes.

type: freeverb

room_size:    0.76  # reverb decay length (0–1)
                     # 0.3 = tight room   0.7 = medium hall   0.9 = cathedral
damping:      0.45  # high-frequency absorption (0–1)
                     # 0.0 = bright (highs sustain as long as lows)
                     # 0.9 = very dark / padded-studio sound
wet:          0.22  # reverb mix level (0–1)
                     # 0.1 = subtle ambience   0.3 = noticeable   0.7 = very wet
width:        1.0   # stereo spread of the reverb tail (0=mono, 1=full stereo)
pre_delay_ms: 10    # ms before reverb starts after the direct sound
                     # 0 = immediate   10 = natural separation   50 = slapback`,
    },
  ],
}

// ── Component ─────────────────────────────────────────────────────────────────

function sectionsFor(exts: FileExtension[]): Section[] {
  const out: Section[] = []
  if (exts.includes('spls')) out.push(SCORE)
  if (exts.includes('spli')) out.push(INSTRUMENT)
  if (exts.includes('splt')) out.push(TUNING)
  if (exts.includes('splr')) out.push(ROOM)
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
              <p class="help-intro">{s.intro}</p>
              <For each={s.blocks}>
                {(b) => (
                  <>
                    <Show when={b.subtitle}>
                      <p class="help-subtitle">{b.subtitle}</p>
                    </Show>
                    <pre><code>{b.code}</code></pre>
                  </>
                )}
              </For>
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
