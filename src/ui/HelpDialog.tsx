import { For, Show, type Component } from 'solid-js'
import type { FileExtension } from '../storage/files'
import { parseShape, renderShapeString } from '../synth/shape'

// ── Content ────────────────────────────────────────────────────────────────────

interface Param { key: string; desc: string }

interface Block {
  subtitle?: string
  text?: string
  params?: Param[]
  code?: string
  shapeChart?: string
}

interface Section {
  title: string
  intro: string
  blocks: Block[]
}

// ── Score ─────────────────────────────────────────────────────────────────────

const SCORE: Section = {
  title: 'Score  (.spls)',
  intro: 'Describes a complete piece: instrument layout, tempo, dynamics, and notes.',
  blocks: [
    {
      subtitle: 'File header',
      text: 'Opens the file with metadata and the stage layout that positions voices in the stereo field.',
      params: [
        { key: 'title / author', desc: 'Descriptive labels — not used during rendering.' },
        { key: 'tuning_config', desc: 'Name of a .splt file that maps note names to frequencies.' },
        { key: 'room', desc: 'Name of a .splr reverb file. Omit for a dry sound.' },
        { key: 'stage', desc: 'Places each voice. Value format: "L|R  distance  instrument" — L|R = pan ratio (1|1 = centre, 2|1 = left, 1|2 = right); distance = reverb send (0.0 = dry, 1.0 = fully wet); instrument = name of a .spli file.' },
      ],
      code: `title: Song Title
author: Artist Name
tuning_config: tones_euro
room: hall

stage:
  bass: "1|1 0.0 bass"
  lead: "2|1 0.5 piano"
  pad:  "1|2 0.8 strings"`,
    },
    {
      subtitle: 'Measure settings — _meta block',
      params: [
        { key: 'beats_per_minute', desc: 'Tempo. Multiplied by the stress sub-level count to derive internal ticks per minute.' },
        { key: 'tempo', desc: 'Shape string for per-tick tempo variation within the measure — Y values in BPM. When present, overrides beats_per_minute for this measure.' },
        { key: 'stress_pattern', desc: 'Accent cycle: 2 = strong beat, 1 = weak, 0 = off-beat. Groups separated by ";" are one beat each — "2,0,1,0" gives 4/4 time.' },
        { key: 'lower_stress_bound', desc: 'Quietest note velocity (0–100).' },
        { key: 'upper_stress_bound', desc: 'Loudest note velocity. A narrow range produces flat dynamics.' },
        { key: 'repeat_unmentioned_voices', desc: 'When true, voices absent from this measure replay their previous measure.' },
        { key: 'skip', desc: 'skip: true — the measure produces no notes and takes no elapsed time. Useful for conditionally omitting a section.' },
        { key: 'cut', desc: 'cut: N — drop all notes that start before tick N and shift the remaining offsets left by N.' },
      ],
      code: `_meta:
  beats_per_minute: 120
  stress_pattern: "2,0,1,0"
  lower_stress_bound: 70
  upper_stress_bound: 95
  repeat_unmentioned_voices: true`,
    },
    {
      subtitle: 'Notes',
      text: 'A voice block maps tick offsets to pitches. Names: C D E F G A B. Sharps: C# D# F# G# A#. Flats: Db Eb Gb Ab Bb. Octave 4 = middle C (≈262 Hz); each +1 octave doubles the frequency.',
      params: [
        { key: 'tick: pitch dur', desc: 'Basic note entry. Duration is in ticks.' },
        { key: 'damp=N', desc: 'Extend the release by N extra ticks — the note rings past the score window.' },
        { key: '3,5: pitch dur', desc: 'Comma list — place the same note at multiple tick positions.' },
        { key: '0+2*4: pitch dur', desc: 'Range — start + step × count, producing ticks 0, 2, 4, 6.' },
        { key: 'voice: true', desc: 'Inherit the full content of this voice from the previous measure.' },
        { key: 'voice: false', desc: 'Silence this voice for the measure.' },
      ],
      code: `voice:
  0:  C4  3
  3:  Bb3 2
  0:  G3  2  damp=2
  3,5: E4 1
  0+2*4: C5 1`,
    },
    {
      subtitle: 'Chain notation',
      text: 'Assign a string to a voice for compact sequences. Notes play one per tick unless joined with ";" for chords.',
      params: [
        { key: '_N', desc: 'Hold for 1+N ticks — _3 = 4 ticks, _11 = 12 ticks.' },
        { key: ';', desc: 'Start the next note at the same tick (chord).' },
        { key: '.', desc: 'Rest — silence one tick. .3 = three silent ticks.' },
        { key: '+N / -N', desc: 'Shift up or down N semitones from the previous pitch.' },
      ],
      code: `voice: "C4 E4 G4 C5"             # sequential, one note per tick
voice: "G3_11; B3_11; D4_11"    # chord, each held 12 ticks
voice: "C4_3 E4_3 G4_3"         # ascending arpeggio
voice: "C4_3 .2 +4_3 .2 +3_3"  # rests and interval shifts`,
    },
  ],
}

// ── Instrument ────────────────────────────────────────────────────────────────

const INSTRUMENT: Section = {
  title: 'Instrument  (.spli)',
  intro:
    'Defines how a voice sounds — the wave shape, amplitude envelope, overtone spectrum, and modulation effects.',
  blocks: [
    {
      subtitle: 'Oscillator and envelope',
      text: 'Shape strings use the format "DURATION:startVal;pos,val;…" — DURATION in seconds, values in REVERSED_DBFS (100 = peak amplitude, 0 = silence), with bezier interpolation between control points.',
      params: [
        { key: 'O', desc: 'Oscillator waveform — sine | sawtooth | square | triangle | noise.' },
        { key: 'AMP', desc: 'Master amplitude scalar. Use this to balance instruments against each other.' },
        { key: 'A', desc: 'Attack — ramp from silence to full amplitude.' },
        { key: 'S', desc: 'Sustain — holds while the key is held; typically decays to a plateau.' },
        { key: 'T', desc: 'Tail (optional) — additional decay inserted between sustain and release.' },
        { key: 'R', desc: 'Release — fade after the note ends.' },
      ],
      code: `character:
  O: sine
  AMP: 0.8
  A: "0.01:1,100"       # 10ms ramp up
  S: "0.10:100;1,85"    # 100ms decay to 85, then holds
  T: "0.20:85;1,50"     # 200ms further decay (optional)
  R: "0.30:100;1,0"     # 300ms release
  R: "0.50:100;0.3,70;1,0"  # multiple points for shaped curve`,
    },
    {
      subtitle: 'PROFILE — overtone structure',
      text: 'Defines the amplitude of each harmonic partial. Index 0 = fundamental (H1), index 1 = second harmonic (H2), and so on. Simple entries are REVERSED_DBFS values (100 = same level as H1). Complex entries are objects with per-partial overrides.',
      params: [
        { key: 'V', desc: 'Amplitude in REVERSED_DBFS. Required when the entry is an object.' },
        { key: 'A / S / T / R', desc: 'Per-partial envelope phases. Inherit from the root character block when omitted.' },
        { key: 'D', desc: 'Frequency deviance in cents from the pure harmonic series. +7 = 7¢ sharp, -12 = 12¢ flat. Models string inharmonicity.' },
        { key: 'SPREAD', desc: 'Cumulative per-partial detune in cents. Adds warmth by slightly spreading harmonics.' },
      ],
      code: `character:
  O: sine
  A: "0.01:1,100"
  S: "0.1:100;1,80"
  R: "0.3:100;1,0"
  PROFILE: [100, 60, 30, 15, 8, 4]   # simple list

  PROFILE:                             # per-partial overrides
    - 100
    - V: 60
      A: "0.5:1,100"   # this harmonic builds more slowly
    - V: 30
      D: 7             # +7¢ sharp

  SPREAD: [0, 3, -2, 5]`,
    },
    {
      subtitle: 'RAILSBACK_CURVE — piano inharmonicity',
      text: 'Real piano strings go slightly sharp at both extremes of the keyboard due to string stiffness. RAILSBACK_CURVE models this by applying a per-pitch cent offset across a defined frequency range.',
      params: [
        { key: 'lowHz', desc: 'Lowest frequency of the range (e.g. 27.5 = A0, the lowest piano key).' },
        { key: 'highHz', desc: 'Highest frequency of the range (e.g. 4186 = C8, the highest piano key).' },
        { key: 'shapeString', desc: 'Cent offset curve across the range. Y values are octave-fraction shifts — 0.02 = +0.02 octave sharp at that key position.' },
      ],
      code: `RAILSBACK_CURVE:
  - 27.5           # lowHz  (A0)
  - 4186           # highHz (C8)
  - "0;100,0.02"   # flat in the middle, +0.02 oct sharp at the top`,
    },
    {
      subtitle: 'VCF — resonant low-pass filter',
      text: 'Removes high frequencies to make the sound darker and warmer. Resonance adds a peak at the cutoff frequency, producing the classic synthesizer "wah" quality. An envelope makes the filter sweep open and closed per note.',
      params: [
        { key: 'CUTOFF', desc: 'Cutoff frequency in Hz — 200–600 Hz = dark, 1–3 kHz = warm, 8 kHz+ = bright.' },
        { key: 'RESONANCE', desc: '0.0 = gentle slope, no peak → 0.9 = sharp ringing peak.' },
        { key: 'ENV_AMOUNT', desc: 'Hz the cutoff shifts on attack. Positive = brighter, negative = darker.' },
        { key: 'ENV_ATTACK', desc: 'Seconds for the filter to reach its peak (optional).' },
        { key: 'ENV_RELEASE', desc: 'Seconds to fall back to CUTOFF (optional).' },
      ],
      code: `VCF: "CUTOFF;RESONANCE[;ENV_AMOUNT[;ENV_ATTACK[;ENV_RELEASE]]]"

VCF: "2000;0.5"               # static: 2 kHz cutoff, gentle resonance
VCF: "800;0.6;1200;0.05;0.4"  # sweep: opens from 800 Hz to 2 kHz on attack`,
    },
    {
      subtitle: 'LFO — slow cyclic modulation',
      text: 'Produces slow repeating movement — filter sweep, tremolo, or vibrato. Multiple LFOs can be stacked as a list.',
      params: [
        { key: 'RATE', desc: 'Cycles per second — 0.2 Hz = one sweep per 5 s, 5 Hz = fast tremolo.' },
        { key: '@OSC', desc: 'LFO waveform — sin | saw | square | triangle. Default: sin.' },
        { key: '[DELAY]', desc: 'Fade-in time in seconds. The LFO grows from zero to full depth over this period.' },
        { key: 'DEPTH', desc: 'Swing amount. Unit depends on TARGET: vcf = Hz shift, amp = 0–1 fraction, pitch = cents.' },
        { key: 'TARGET', desc: 'vcf | amp | pitch.' },
        { key: '+PHASE', desc: 'Starting phase in degrees (0–359). Optional.' },
      ],
      code: `LFO: "RATE[@OSC][[DELAY]];DEPTH:TARGET[+PHASE]"

LFO: "0.5@sin[0.5];200:vcf"     # slow filter wobble, 0.5 s fade-in
LFO: "3.0@tri;0.08:amp"         # fast tremolo
LFO: "8.18@sin[0.37];15:pitch"  # vibrato: ±15¢ at 8.18 Hz

LFO:                             # multiple LFOs
  - "5.0@sin;0.05:amp"
  - "6.0@sin[0.5];10:pitch"`,
    },
    {
      subtitle: 'UNISON — stacked detuned voices',
      text: 'Renders the note as multiple voices detuned in opposite directions, creating a chorus/ensemble thickening effect. Voices are spread linearly from −detune to +detune cents. An odd count includes a centre voice at 0¢; an even count straddles the centre.',
      params: [
        { key: 'COUNT', desc: 'Number of stacked voices. 1 is a no-op. 2–4 is typical for ensemble thickening.' },
        { key: 'DETUNE_CENTS', desc: 'Maximum cent offset from centre — the outermost voices land at ±this value. 3–5¢ = subtle warmth, 10–20¢ = wide chorus.' },
      ],
      code: `UNISON: "COUNT;DETUNE_CENTS"

UNISON: "2;4"   # two voices at −4¢ and +4¢
UNISON: "3;6"   # three voices: −6¢, 0¢, +6¢
UNISON: "4;10"  # four voices: −10¢, −3.3¢, +3.3¢, +10¢`,
    },
    {
      subtitle: 'FM — frequency modulation',
      text: 'Uses one oscillator (the modulator) to rapidly vary the pitch of the note, creating complex sidebands — metallic, bell-like, or harsh tones not achievable with simple waves.',
      params: [
        { key: 'FREQ', desc: 'Modulator frequency in Hz.' },
        { key: 'f', desc: 'Treat FREQ as a ratio of the note pitch ("2f" at A4 = 880 Hz). Keeps timbre consistent across all pitches.' },
        { key: '@OSC', desc: 'Modulator waveform — sin | saw | square | triangle. Default: sin.' },
        { key: '[DEPTH_ENV]', desc: 'Shape string controlling depth over time — "1:1;0.5,0" = full depth fading to zero by halfway.' },
        { key: 'DEPTH', desc: 'Pitch swing as fraction of carrier frequency — 0.05 = subtle shimmer, 0.3 = metallic, 0.8+ = heavy distortion.' },
        { key: '+PHASE', desc: 'Modulator starting phase in degrees. +90 creates a downward pitch dip on attack.' },
      ],
      code: `FM: "FREQ[f][@OSC][[DEPTH_ENV]];DEPTH[+PHASE]"

FM: "2f[1:1;0.5,0];0.4"  # ratio 2×, depth fades out: metallic attack, clean sustain
FM: "220@saw;0.3"         # fixed 220 Hz sawtooth modulator
FM: "2f;0.4+90"           # ratio 2×, phase 90° (downward pitch dip)`,
    },
  ],
}

// ── Tuning ────────────────────────────────────────────────────────────────────

const TUNING: Section = {
  title: 'Tuning  (.splt)',
  intro:
    'Defines the pitch system — what frequencies note names map to, which scales are available, ' +
    'and which scale is active by default. The built-in "tones_euro" covers standard Western notation.',
  blocks: [
    {
      params: [
        { key: 'ref_frequency', desc: 'Hz of the reference pitch — 440 = concert A.' },
        { key: 'ref_octave_number', desc: 'Octave containing the reference (A4 = 440 Hz → 4).' },
        { key: 'ref_octave_offset', desc: 'Semitones above C: C=0, D=2, E=4, F=5, G=7, A=9, B=11.' },
        { key: 'tones_per_octave', desc: '12 = equal temperament. Increase for microtonal systems.' },
        { key: 'tones', desc: 'Custom note names mapped to semitone positions. Merged with built-in Anglo-Saxon names.' },
        { key: 'scales', desc: 'Step sizes in semitones — must sum to tones_per_octave.' },
        { key: 'default_scale', desc: 'Scale used when no scale is specified in the score.' },
        { key: 'C#4?', desc: 'Off-scale note suffix — snap to the nearest in-scale pitch.' },
        { key: 'C#4!', desc: 'Off-scale note suffix — play the exact chromatic pitch regardless of scale.' },
      ],
      code: `basics:
  ref_frequency:    440
  ref_octave_number:  4
  ref_octave_offset:  9
  tones_per_octave:  12

tones:
  H:   11   # German B-natural
  Cis:  1   # German C-sharp

scales:
  mj:  "2 2 1 2 2 2 1"   # major
  mn:  "2 1 2 2 1 2 2"   # natural minor

default_scale: mj`,
    },
  ],
}

// ── Room ──────────────────────────────────────────────────────────────────────

const ROOM: Section = {
  title: 'Room  (.splr)',
  intro:
    'Adds reverb — reflected sound that creates a sense of space. Two types: ' +
    'tap-delay (explicit echo taps) and Freeverb (smooth algorithmic reverb).',
  blocks: [
    {
      subtitle: 'Shape strings',
      text: 'Values between control points are smoothly bezier-interpolated. Used in both instrument envelopes and room fields.',
      params: [
        { key: 'DURATION', desc: 'Output size — seconds for envelopes, tap count for rooms.' },
        { key: 'startVal', desc: 'Value at position 0. Omit to start from 0.' },
        { key: 'pos,val', desc: 'Control points. Positions must increase left to right (0–1 range).' },
      ],
      code: `# Format:  DURATION : [startVal ;] pos,val [; pos,val …]

"0.01:1,100"           # 10ms ramp: 0 → 100
"0.10:100;1,85"        # 100ms: 100 → 85
"0.30:100;0.3,70;1,0"  # 300ms: fast drop, slow fade

"6:90;1,60;4,20;6,5"  # 6-tap room curve`,
      shapeChart: '6:90;1,60;4,20;6,5',
    },
    {
      subtitle: 'Tap-delay room',
      params: [
        { key: 'levels', desc: 'Amplitude of each echo tap — shape string defining the reverb decay curve.' },
        { key: 'delays', desc: 'Delay of each tap in milliseconds. "6:0;6,100" spreads 6 taps from 0 ms to 100 ms.' },
        { key: 'border', desc: 'Optional shape string that scales the reverb tail amplitude — used as a distance-falloff curve.' },
        { key: 'jitter', desc: 'Small random amplitude variation per tap — prevents metallic comb-filter colouration. Separate L/R with "|".' },
        { key: 'deldiffs', desc: 'Per-channel arrival offset in seconds — "0.008|0.014" = 8 ms L, 14 ms R. Makes echo times differ slightly for stereo width.' },
      ],
      code: `name: hall

levels:   "6:90;1,60;4,20;6,5"
delays:   "6:0;6,100"
jitter:   "1:0.12"
deldiffs: "0.008|0.014"`,
    },
    {
      subtitle: 'Freeverb — algorithmic reverb',
      text: 'A classic plate-style reverb: parallel comb filters into all-pass diffusers. Produces smooth, dense decay without explicit tap configuration. Use for natural ambience; use tap-delay for distinct echoes.',
      params: [
        { key: 'type', desc: 'Must be "freeverb" — selects this room model.' },
        { key: 'room_size', desc: 'Reverb decay length (0–1) — 0.3 = tight room, 0.7 = medium hall, 0.9 = cathedral.' },
        { key: 'damping', desc: 'High-frequency absorption (0–1) — 0.0 = bright highs sustain, 0.9 = dark padded-studio sound.' },
        { key: 'wet', desc: 'Reverb mix level (0–1) — 0.1 = subtle, 0.3 = noticeable, 0.7 = very wet.' },
        { key: 'width', desc: 'Stereo spread of the reverb tail — 0 = mono, 1 = full stereo.' },
        { key: 'pre_delay_ms', desc: 'Milliseconds before reverb starts after the direct sound — 0 = immediate, 10 = natural, 50 = slapback.' },
      ],
      code: `type: freeverb
room_size:    0.76
damping:      0.45
wet:          0.22
width:        1.0
pre_delay_ms: 10`,
    },
  ],
}

// ── Shape chart ───────────────────────────────────────────────────────────────

function ShapeChart(props: { shapeString: string }) {
  const VW = 240, VH = 96
  const PAD = { left: 26, right: 6, top: 6, bottom: 16 }
  const pw = VW - PAD.left - PAD.right
  const ph = VH - PAD.top - PAD.bottom

  const spec = parseShape(props.shapeString)
  const N = 120
  const samples = Array.from(renderShapeString(props.shapeString, N))

  const sx = (i: number) => PAD.left + (i / (N - 1)) * pw
  const sy = (v: number) => PAD.top + (1 - v / 100) * ph

  const polyline = samples.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ')

  const ctrlPts = spec.points.map(p => ({
    cx: PAD.left + (p.x / spec.length) * pw,
    cy: sy(p.y),
    label: String(Math.round(p.y)),
  }))

  const xTicks = Array.from({ length: Math.round(spec.length) + 1 }, (_, i) => ({
    x: PAD.left + (i / spec.length) * pw,
    label: String(i),
  }))

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" class="help-shape-chart" aria-hidden="true">
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + ph} stroke="#333" stroke-width="1"/>
      <line x1={PAD.left} y1={PAD.top + ph} x2={PAD.left + pw} y2={PAD.top + ph} stroke="#333" stroke-width="1"/>
      <polyline points={polyline} fill="none" stroke="#4a8df0" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
      {ctrlPts.map(p => <circle cx={p.cx} cy={p.cy} r="2.5" fill="#4a8df0"/>)}
      {ctrlPts.map(p => <text x={PAD.left - 3} y={p.cy + 3.5} text-anchor="end" font-size="8" fill="#666">{p.label}</text>)}
      {xTicks.map(t => <>
        <line x1={t.x} y1={PAD.top + ph} x2={t.x} y2={PAD.top + ph + 3} stroke="#333" stroke-width="1"/>
        <text x={t.x} y={VH - 2} text-anchor="middle" font-size="8" fill="#666">{t.label}</text>
      </>)}
    </svg>
  )
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
                  <div class="help-block">
                    <Show when={b.subtitle}>
                      <p class="help-subtitle">{b.subtitle}</p>
                    </Show>
                    <Show when={b.text}>
                      <p class="help-text">{b.text}</p>
                    </Show>
                    <Show when={b.params && b.params.length > 0}>
                      <dl class="help-params">
                        <For each={b.params}>
                          {(p) => (
                            <>
                              <dt>{p.key}</dt>
                              <dd>{p.desc}</dd>
                            </>
                          )}
                        </For>
                      </dl>
                    </Show>
                    <Show when={b.code}>
                      <pre><code>{b.code}</code></pre>
                    </Show>
                    <Show when={b.shapeChart} keyed>
                      {(s) => <ShapeChart shapeString={s} />}
                    </Show>
                  </div>
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
