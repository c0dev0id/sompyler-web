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
  ticks_per_minute: 363     # tempo: how many note slots (ticks) per minute
  beats_per_minute: 120     # alias for ticks_per_minute (RFC §S46140)
                             # if both are present, beats_per_minute wins
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
      subtitle: 'Basic sound — wave shape and volume',
      code: `amp: 0.8          # master output level (0–1)
               # use this to balance instruments against each other

oscillator: sin  # the basic wave shape — sets the core character:
               #   sin      — smooth, pure tone (flute, sine bass)
               #   saw      — bright and buzzy (strings, brass, synth lead)
               #   square   — hollow and reedy (clarinet, chiptune, organ)
               #   triangle — softer than saw, rounder than square (mellow lead)
               #   noise    — unpitched hiss (cymbals, breath, wind)

envelope:
  attack: 0.01        # seconds from silence to full volume at note start
                       # 0.001 = instant, punchy attack
                       # 0.3   = slow swell (pad, strings)
  decay: 0.1          # seconds to fall from peak volume to sustainLevel
                       # 0   = no decay (stays at peak until release)
                       # 0.1 = piano-like drop after the hammer strike
  sustainLevel: 0.85  # volume level held during the note body (0–1)
                       # 1.0 = stays at peak (no audible decay)
                       # 0.3 = plucked-string character: loud attack, quiet sustain
  release: 0.3        # seconds to fade out after the note ends
                       # short release = staccato, clipped
                       # long release  = notes ring and overlap`,
    },
    {
      subtitle: 'Partials — adding overtones to shape the timbre',
      code: `# A real instrument's sound is made up of many frequencies at once.
# The fundamental is the note you hear; overtones (partials) sit above
# it and determine whether it sounds like a piano, a violin, or a synth.

partials:
  - { freqMult: 1, amp: 1.0 }   # fundamental — the base pitch itself
  - { freqMult: 2, amp: 0.5 }   # 1 octave above, half as loud
  - { freqMult: 3, amp: 0.25 }  # octave + perfect fifth above
  - { freqMult: 4, amp: 0.12 }  # 2 octaves above
  # freqMult is a multiplier of the base frequency:
  #   1 = base, 2 = double (octave), 3 = triple, etc.
  # Higher-numbered partials with louder amp values = brighter sound
  # Each partial can also override the oscillator:
  - { freqMult: 2, amp: 0.3, oscillator: saw }

spread: [0, 5, -3, 4]
  # Detunes each partial by a cumulative number of cents (1/100 of a semitone)
  # [0, 5, -3, 4] means:
  #   partial 1: no shift
  #   partial 2: +5 cents flat
  #   partial 3: +5−3 = +2 cents sharp (values are cumulative)
  #   partial 4: +2+4 = +6 cents flat
  # Small detuning creates beating between partials — adds warmth and life
  # to sounds that would otherwise be too mathematically perfect`,
    },
    {
      subtitle: 'character block — RFC format (alternative to flat keys)',
      code: `# The character: block is the original Sompyler instrument format.
# It replaces the flat oscillator/envelope/partials keys above.
# character: takes precedence over any flat keys in the same file.

character:
  O: sine          # oscillator wave shape (RFC §S32110):
                    #   sine | sawtooth | square | triangle | noise
                    # (same waveforms as "oscillator:", different names)

  A: ".01:1,100"   # attack  — DURATION:SHAPE  (RFC §S32130)
  S: ".2:100;1,0"  # sustain — DURATION:START;SHAPE
  R: ".05:100;1,0" # release — DURATION:START;SHAPE
                    #
                    # DURATION is a float in seconds (.01 = 10ms, 1.5 = 1.5s)
                    # SHAPE is a list of x,y control points for a Bezier curve
                    # Values are REVERSED_DBFS: 100 = full amplitude, 0 = silence
                    # S defines the body decay; the end value sets sustainLevel

  SPREAD: [0, 5, -3, 7]
                    # detuning per partial in cumulative cents (S32132)
                    # same as flat "spread:" key, values are cumulative offsets

  PROFILE: [100, 72, 52, 38, 26]
                    # partial amplitudes in REVERSED_DBFS (S32130)
                    # list index i → partial i+1 at freqMult = i+1
                    # 100 = full, 0 = silent
                    # replaces the flat "partials:" list for simple amplitude shaping
                    # complex form: [{V: 100}, {V: 72}] — V key holds the amplitude

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

vcf:
  cutoff_hz: 2000  # frequency where filtering begins (in Hz)
                    # 200–600   = very dark / muffled
                    # 1000–3000 = warm and present
                    # 8000+     = bright (filter barely noticeable)
  resonance: 0.5   # sharpness of the peak at the cutoff (0–1)
                    # 0.0 = gentle slope, no peak
                    # 0.6 = pronounced "wah" character
                    # 0.9 = sharp ringing — handle carefully

  # Filter envelope — optional; omit for a static (non-moving) filter:
  env_amount: 1000  # how many Hz the cutoff rises at the start of each note
                     # positive = filter opens brighter on attack
                     # negative = filter closes darker on attack
  env_attack: 0.05  # seconds for the filter to reach its peak opening
  env_release: 0.3  # seconds for the filter to fall back to cutoff_hz`,
    },
    {
      subtitle: 'LFO — slow cyclic modulation',
      code: `# An LFO (low-frequency oscillator) produces slow, repeating movement.
# Routed to the filter it creates a wah sweep; routed to amplitude
# it creates tremolo (volume pulsing).

lfo:
  rate_hz: 0.5      # how fast the cycle repeats (oscillations per second)
                     # 0.2 Hz = one full sweep every 5 seconds (very slow)
                     # 5.0 Hz = fast tremolo / vibrato
  target: vcf       # what the LFO modulates:
                     #   vcf = filter cutoff frequency
                     #   amp = output volume
  depth: 200        # how strongly it modulates the target:
                     #   if target=vcf: depth in Hz (cutoff swings ±200 Hz)
                     #   if target=amp: fraction 0–1 (volume swings by this much)
  waveform: sin     # shape of the modulation wave (sin|saw|square|triangle)
  phase: 0          # starting position in the cycle (0–1, where 1 = full turn)
                     # 0.25 = starts at the peak of a sin wave
  delay_seconds: 0.5 # LFO fades in gradually over this many seconds
                      # prevents an abrupt jump at the start of each note

# To use multiple LFOs simultaneously, write lfo as a list:
# lfo:
#   - { rate_hz: 0.5, target: vcf, depth: 300, waveform: sin }
#   - { rate_hz: 3.0, target: amp, depth: 0.1, waveform: triangle }`,
    },
    {
      subtitle: 'FM synthesis — frequency modulation for complex tones',
      code: `# FM synthesis uses one oscillator (the "modulator") to rapidly vary
# the pitch of another (the "carrier" — the note you're playing).
# Unlike the LFO, the modulator runs at audio frequencies, creating
# complex sidebands — metallic, bell-like, or harsh tones that are
# impossible to achieve with simple waveforms.

fm:
  freq_hz: 2.01    # modulator frequency
  dynamic: true    # if true, freq_hz is a ratio of the carrier pitch
                    # e.g. 2.01 at C4 (262 Hz) → modulator at 524.6 Hz
                    # keeps the timbre consistent across all pitches
                    # false = fixed frequency regardless of note played
  depth: 0.4       # intensity of the pitch distortion (fraction of carrier)
                    # 0.05 = subtle shimmer
                    # 0.3  = metallic, bell-like
                    # 0.8+ = heavy distortion, inharmonic noise
  init_phase: 0    # modulator starting position (0–1)
                    # 0.25 puts a sine modulator at its positive peak at t=0,
                    # which creates a downward pitch sweep on the attack
  depth_env: "1:1;0.5,0"
                    # shape string: how FM depth changes over the note lifetime
                    # "1:1;0.5,0" = starts at full depth, fades to zero by
                    # the halfway point — gives a metallic attack that cleans up`,
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
