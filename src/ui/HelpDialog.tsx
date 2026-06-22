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
    'A score file describes an entire piece of music: which instruments play, ' +
    'how they are positioned in the stereo field, the tempo, and all the notes.',
  blocks: [
    {
      subtitle: 'File header — one-time settings at the top of the file',
      code: `title: "Song Title"
author: "Author"
tuning_config: tones_euro  # name of a .splt file (no extension)
                            # defines which note names are valid and their
                            # frequencies; "tones_euro" covers C–B notation
room: hall                  # name of a .splr file (no extension)
                            # adds reverb — omit for a dry, anechoic sound

stage:                      # places each voice in the stereo field
  lead: "1|1 0.0 piano"    # format: "L|R  distance  instrument-name"
  bass: "1|1 0.8 bass"
  #
  # L|R      — stereo balance as a ratio
  #            1|1 = centre, 2|1 = panned left, 1|2 = panned right
  #
  # distance — how far back the voice sits in the room
  #            0.0 = completely dry (no reverb)
  #            0.5 = moderate reverb mix
  #            2.0 = very wet, sounds distant
  #
  # instrument-name — the "name:" field from a .spli file in the project`,
    },
    {
      subtitle: 'Measure settings — controls tempo and dynamics for one measure',
      code: `_meta:
  beats_per_minute: 120     # tempo (RFC §S46100): scaled by the stress_pattern
                             # to get the internal ticks-per-minute rate
  stress_pattern: "2,0,1,0" # accent cycle applied across ticks
                             # 2 = strong beat (loudest)
                             # 1 = weak beat
                             # 0 = off-beat (quietest)
                             # "2,0,1,0" repeats every 4 ticks — standard 4/4
  lower_stress_bound: 70    # quietest note velocity (0–100)
  upper_stress_bound: 95    # loudest note velocity (0–100)
                             # narrow range = flat dynamics; wide = expressive
  repeat_unmentioned_voices: true
                             # if true, voices not listed in this measure
                             # keep playing their previous content (loops them)`,
    },
    {
      subtitle: 'Notes — placing pitches on the timeline',
      code: `voice:                      # voice name must match one declared in stage:
  0: C4 3                  # at tick 0: play C in octave 4, lasting 3 ticks
  3: Bb2 2                 # at tick 3: B-flat in octave 2, lasting 2 ticks
                            # note names: C D E F G A B
                            # accidentals: # = sharp, b = flat  (e.g. F#4, Bb3)
                            # octave numbers: C4 = middle C (262 Hz)
                            #                 C5 = one octave higher
  3,5: G3 1               # ticks 3 AND 5: same note placed at two offsets
  0+1*12: A4 1            # range shorthand — expands to ticks 0,1,2,…11
                            # format: start + step * count
  0: C4 3 damp=2           # damp=2 extends the release phase by 2 extra ticks
                            # (makes the note ring longer before it cuts off)
  voice: false             # silence this voice completely for this measure`,
    },
    {
      subtitle: 'Chain notation — compact shorthand for sequences and chords',
      code: `# Instead of individual tick offsets, assign a string to a voice:
voice: "C4 E4 G4"          # three notes played sequentially, one tick each

# Modifiers:
#   _N   hold the note for 1+N ticks  (_3 = 4 ticks, _11 = 12 ticks)
#   ;    parallel — notes share the same start tick (chord)
#   no ; sequential — each note starts where the previous one ended
#   .    rest — silent tick(s)  (.3 = 3 silent ticks)
#   +N   shift up N semitones from the previous pitch  (+7 = a fifth up)
#   -N   shift down N semitones

voice: "G3_11; C4_11; D#4_11"   # chord: all three notes start together,
                                   # each held for 12 ticks
voice: "C4 E4 G4 C5"             # ascending arpeggio, one tick per note
voice: "C4_3 . E4_3 . G4_3"     # with rests between notes`,
    },
  ],
}

// ── Instrument ────────────────────────────────────────────────────────────────

const INSTRUMENT: Section = {
  title: 'Instrument  (.spli)',
  intro:
    'An instrument file describes the sound of one voice — the wave shape, how it ' +
    'fades in and out, which overtones are present, and any modulation effects ' +
    'like filters, vibrato, or FM synthesis.',
  blocks: [
    {
      subtitle: 'Wave shape, envelope, and overtones — the character block',
      code: `character:
  O: sine          # oscillator wave shape (RFC §S32110):
                    #   sine | sawtooth | square | triangle | noise
  AMP: 0.8          # master output level (0–1); balances instruments

  A: "0.01:1,100"  # attack  — DURATION:from,to  (RFC §S32130)
  S: "0.1:100;1,85"# decay/sustain — DURATION:start;count,sustainLevel
  R: "0.3:100;1,0" # release — DURATION:start;count,0
                    #
                    # DURATION is a float in seconds (0.01 = 10ms, 1.5 = 1.5s)
                    # Values are REVERSED_DBFS: 100 = full amplitude, 0 = silence
                    # A: rise from 1 to 100 over attack duration
                    # S: decay from 100 to sustain level (85 here = 0.85)
                    # R: fall from 100 to silence over release duration

  PROFILE: [100, 50, 25, 12]
                    # partial amplitudes in REVERSED_DBFS (S32130)
                    # index i → partial i+1 (freqMult = i+1)
                    # 100 = full, 0 = silent, omitted = absent
                    # [100, 50, 25, 12] = fundamental + 3 overtones

  SPREAD: [0, 5, -3, 7]
                    # detuning per partial in cumulative cents (S32132)
                    # small values add warmth and beating between partials

  TIMBRE: "4:shape" # spectrum width shape string (S32134)
  MORPH: ["1 shape"] # per-partial amplitude shape overrides (S32135)`,
    },
    {
      subtitle: 'VCF — resonant low-pass filter',
      code: `# A low-pass filter removes high frequencies, making the sound darker
# and warmer. "Resonant" adds a peak right at the cutoff frequency,
# giving the classic "wah" or "quack" quality of synthesizers.
#
# With an envelope, the filter sweeps open and closed over each note —
# the trademark sound of acid bass lines and pad filter sweeps.

character:
  VCF: "CUTOFF;RESONANCE[;ENV_AMOUNT[;ENV_ATTACK[;ENV_RELEASE]]]"
  #
  # CUTOFF      — frequency where filtering begins (Hz)
  #               200–600   = very dark / muffled
  #               1000–3000 = warm and present
  #               8000+     = bright (filter barely noticeable)
  # RESONANCE   — sharpness of the peak at the cutoff (0–1)
  #               0.0 = gentle slope, no peak
  #               0.6 = pronounced "wah" character
  #               0.9 = sharp ringing — handle carefully
  # ENV_AMOUNT  — Hz the cutoff opens on attack (optional)
  #               positive = filter opens brighter on attack
  #               negative = filter closes darker on attack
  # ENV_ATTACK  — seconds for the filter to reach its peak (optional)
  # ENV_RELEASE — seconds for the filter to fall back to CUTOFF (optional)
  #
  # Static filter (no envelope):
  VCF: "2000;0.5"
  # With envelope:
  VCF: "2000;0.5;1000;0.05;0.3"`,
    },
    {
      subtitle: 'LFO — slow cyclic modulation',
      code: `# An LFO (low-frequency oscillator) produces slow, repeating movement.
# Routed to the filter it creates a wah sweep; routed to amplitude
# it creates tremolo (volume pulsing).

character:
  LFO: "RATE[@OSC][[DELAY]];DEPTH:TARGET[+PHASE_DEG]"
  #
  # RATE       — oscillations per second
  #              0.2 Hz = one full sweep every 5 seconds (very slow)
  #              5.0 Hz = fast tremolo / vibrato
  # @OSC       — optional waveform for the LFO (sin|saw|square|triangle)
  # [DELAY]    — optional fade-in seconds; LFO grows from zero to full depth
  #              over this time, preventing an abrupt jump at note start
  # DEPTH      — modulation intensity:
  #              if target=vcf: in Hz (cutoff swings by ±DEPTH Hz)
  #              if target=amp: fraction 0–1 (volume swings by this much)
  # TARGET     — what the LFO modulates: vcf or amp
  # +PHASE_DEG — optional starting phase in degrees (0–359)
  #              +90 = sine starts at its positive peak

  # Examples:
  LFO: "0.5@sin[0.5];200:vcf"   # slow filter sweep, 0.5 s fade-in
  LFO: "3.0@triangle;0.1:amp"   # fast tremolo, no fade-in

  # Multiple LFOs — write LFO as a list:
  LFO:
    - "0.5@sin[0.5];200:vcf"
    - "3.0@triangle;0.1:amp"`,
    },
    {
      subtitle: 'FM synthesis — frequency modulation for complex tones',
      code: `# FM synthesis uses one oscillator (the "modulator") to rapidly vary
# the pitch of another (the "carrier" — the note you're playing).
# Unlike the LFO, the modulator runs at audio frequencies, creating
# complex sidebands — metallic, bell-like, or harsh tones that are
# impossible to achieve with simple waveforms.

character:
  FM: "FREQ[f][@OSC][[DEPTH_ENV]];DEPTH[+PHASE_DEG]"
  #
  # FREQ      — modulator frequency in Hz
  # f or F    — optional: FREQ is a ratio of the carrier pitch (dynamic)
  #             e.g. "2f" at C4 (262 Hz) → modulator at 524 Hz
  #             keeps the timbre consistent across all pitches;
  #             omit for a fixed frequency regardless of note played
  # @OSC      — optional waveform for the modulator (sin|saw|square|triangle)
  # [DEPTH_ENV] — optional shape string: how depth changes over the note
  #               "1:1;0.5,0" = full depth, fades to zero by halfway
  #               gives a metallic attack that cleans up
  # DEPTH     — intensity of pitch distortion (fraction of carrier frequency)
  #             0.05 = subtle shimmer
  #             0.3  = metallic, bell-like
  #             0.8+ = heavy distortion, inharmonic noise
  # +PHASE_DEG — optional modulator starting phase in degrees (0–359)
  #              +90 puts a sine modulator at its positive peak at t=0,
  #              creating a downward pitch sweep on the attack

  # Examples:
  FM: "2f[1:1;0.5,0];0.4"    # dynamic 2× ratio, depth envelope, depth 0.4
  FM: "2f;0.4+90"             # dynamic, depth 0.4, initial phase 90°
  FM: "220@saw;0.3"           # fixed 220 Hz sawtooth modulator`,
    },
  ],
}

// ── Tuning ────────────────────────────────────────────────────────────────────

const TUNING: Section = {
  title: 'Tuning  (.splt)',
  intro:
    'A tuning file defines the pitch system — what frequencies the note names map ' +
    'to, how many steps are in an octave, and which scales are available. ' +
    'The built-in "tones_euro" covers standard Western notation (A–G, sharps and flats).',
  blocks: [
    {
      code: `basics:
  ref_frequency: 440    # Hz for the reference pitch (440 = concert A, the standard)
  ref_octave_number: 4  # which octave the reference falls in (A4 = 440 Hz)
  ref_octave_offset: 9  # semitones above C in the reference octave
                         # C=0, D=2, E=4, F=5, G=7, A=9, B=11
  tones_per_octave: 12  # equal steps per octave
                         # 12 = standard Western equal temperament
                         # other values enable microtonal systems

scales:
  # Each scale is a list of step sizes in semitones.
  # The values must sum to tones_per_octave.
  chr: "1 1 1 1 1 1 1 1 1 1 1 1"  # chromatic: all 12 semitones
  mj:  "2 2 1 2 2 2 1"             # major scale (W W H W W W H)
  mn:  "2 1 2 2 1 2 2"             # natural minor scale

default_scale: chr   # scale used when no scale is specified in a score`,
    },
  ],
}

// ── Room ──────────────────────────────────────────────────────────────────────

const ROOM: Section = {
  title: 'Room  (.splr)',
  intro:
    'A room file defines a reverb effect — the way sound reflects off surfaces ' +
    'and gradually decays. It simulates anything from a tight studio to a concert hall. ' +
    'The room is applied to all voices in a score according to their distance setting.',
  blocks: [
    {
      subtitle: 'Shape strings — how curves are written',
      code: `# Many room fields (and some instrument fields) use a compact curve format
# called a shape string:
#
#   N : startValue ; position,value ; position,value ; …
#
#   N           — number of output points (for room fields, also = tail length in seconds)
#   startValue  — the value at position 0
#   position,value — a control point: at this position, the value is this
#   Positions must increase left to right.
#   Values between control points are smoothly interpolated (Bezier curve).
#
# Example:  "6:90;1,60;4,20;6,5"
#
#   "6"    → 6 output points (6-second reverb tail)
#   "90"   → starts at amplitude 90
#   "1,60" → by position 1 it has dropped to 60   (fast initial decay)
#   "4,20" → by position 4 it has dropped to 20   (slower middle decay)
#   "6,5"  → by position 6 it is nearly silent     (long quiet tail)
#
#                90 ┤●
#                60 ┤  ╲
#                20 ┤     ─────●
#                 5 ┤              ─────────────●
#                   └───┬──┬──┬──┬──┬──
#                   0   1  2  3  4  5  6`,
    },
    {
      subtitle: 'Room fields',
      code: `name: my room    # human-readable label (not used in score references)

levels: "6:90;1,60;4,20;6,5"
  # Amplitude of each echo tap — defines the decay curve of the reverb.
  # Higher values = louder echoes = longer-sounding reverb.
  # The example decays quickly at first, then trails off slowly.

delays: "6:0;6,100"
  # Delay of each echo tap in milliseconds.
  # Spreads the 6 taps across a 0–100 ms window.
  # Longer delays = more distinct echoes (slapback); shorter = denser wash.

border: "6:0;6,100"
  # Optional. Controls how much direct sound fades with distance.
  # Mostly relevant for voices at large distance values in the stage.

jitter: "1:0.12"
  # Adds a small random amplitude variation to each echo tap.
  # Prevents the mechanical "comb filter" metallic colouration
  # that happens when taps are perfectly evenly spaced.
  # "1:0.12|1:0.18" = separate values for left and right channels.

deldiffs: "0.008|0.014"
  # Per-tap delay offset in seconds, applied independently per channel.
  # Left channel taps are offset by 8 ms, right by 14 ms.
  # Makes the two channels' echoes arrive at slightly different times,
  # creating stereo width — without this, reverb sounds mono.`,
    },
    {
      subtitle: 'Freeverb — algorithmic reverb (alternative room type)',
      code: `# Freeverb is a classic algorithmic reverb based on Schroeder/Moorer design:
# 8 parallel feedback comb filters → 4 series all-pass diffusers.
# It produces smooth, dense reverb without any WAV impulse file.
# Use it when you want plate-style reverb with a simple parameter knob.
#
# To use freeverb, set type: freeverb and omit the levels/delays fields.

type: freeverb

room_size: 0.76   # controls how long the reverb decays (0–1)
                   # 0.3 = tight room / short tail
                   # 0.7 = medium hall
                   # 0.9 = large hall / cathedral (very long tail)

damping: 0.45     # high-frequency damping (0–1)
                   # 0.0 = bright reverb (highs sustain as long as lows)
                   # 0.5 = natural-sounding absorptive room
                   # 0.9 = very dark / muffled (like recording in a padded studio)

wet: 0.22         # how much reverb is added to the output (0–1)
                   # 0.1 = subtle ambience, dry sound still dominates
                   # 0.3 = noticeable reverb
                   # 0.7 = very wet, distant-sounding

width: 1.0        # stereo width of the reverb tail (0–1)
                   # 0.0 = mono reverb (both channels identical)
                   # 1.0 = full stereo spread (default; usually leave this)

pre_delay_ms: 10  # milliseconds before reverb starts after the direct sound
                   # 0  = reverb begins immediately (sounds very close)
                   # 10 = small pre-delay separates dry from wet (more natural)
                   # 50 = large pre-delay, notable "slap" before reverb builds`,
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
