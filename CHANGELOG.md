# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **`UNISON: "COUNT;DETUNE_CENTS"` — sompyler-web `.spli` extension** for stacked-voice chorus. Renders the entire partial bank `COUNT` times with each voice pitch-shifted by a linearly-distributed cent offset in `[-DETUNE_CENTS, +DETUNE_CENTS]`. Odd counts include a 0¢ centre voice; even counts straddle 0. Models SF2 stacked-sample patches (e.g. FluidR3 Synth Brass 2) without a chorus DSP — the phase drift between fixed-frequency oscillators IS the effect. Follows the LFO/VCF/FM convention (uppercase keyword, `;`-separated string DSL). Sits between partial summation and the global modulators so VCF/AMP-LFO apply once to the summed voices.

### Fixed

- **InstrumentPreview note-on truncated plucked instruments.** The preview's note duration was hard-coded as `attack + max(0.05, attack/2) + release` with `dampSeconds: 0`, ignoring the `S:` decay shape's length. Plucked instruments (kalimba, etc.) encode their character in the multi-second `S:` curve, so the preview only played the first ~50 ms of it and then released — instrument sounded clipped vs. the WAV rendered by `scripts/refine_instrument.py`. Fix: parse the `S:` shape length and use it as a floor for the sustain hold; add a fixed 2 s damp tail so the release shape rings out. Score renders are unaffected (they already pass per-note `lengthSeconds` and `dampSeconds`).

- **Oxygène intro seashore felt forced to ring out.** The instrument's `R:` is 0.001 s (instant), so each bar's seashore C4 hit a still-loud sustain level and dropped to silence in 1 ms — audible as an unnatural cutoff. Added `damp=24` to the bar-1 mapping note (carries to every subsequent bar via `repeat_unmentioned_voices: true`); the existing release shape now stretches over two bars (~4 s), and each bar's note overlaps with the next two bars' attacks for continuous ocean flow.

- **Score-editor gutter click in the head region was unpredictable.** Clicking a line number above the first `---` separator produced `barIndex=0`, which `buildBarMarkerSet` rendered as a "head + first bar" hybrid window. The handler now clamps that case to `barIndex=1`, so meta-area clicks behave the same as a click on the first bar.

### Changed

- **Oxygène score rewritten using chain notation** — sequential voice patterns (bass, kalimba, synbrass, kick, tambourine, melody) converted from offset-key to chain strings. Voices with intentional legato note overlaps (ensemble, bowedpad) remain in offset-key format. The OXYGENE score constant shrank from ~2930 lines to ~1820 lines (38% smaller). No musical change — the chain conversion is lossless, tested by 306 passing unit tests including the full chain parser suite.

- **Oxygène melody S: shape refined** — sustain control point at `x=0.333` moved from `y=4` to `y=2`, dropping the t=1.0s envelope bump from +3.9 dB to +2.4 dB vs TiMidity G3 reference. QUALITY L1 16.3 → 13.3. AMP raised 0.5 → 0.9 for song-context mix level (the 0.052 calibration value is solo-render-only; song uses voice-faders + stress modulation).

- **10-loop TiMidity/FluidR3 calibration pass** for all 9 Oxygène instruments — each instrument compared envelope-by-envelope and spectrum-by-spectrum against TiMidity SF2 output via `compare_instrument.py`:
  - **bass**: S changed from 3s plucked decay to flat sustain (SF2 sample loops at constant amplitude); PROFILE fully replaced from C2 measurements (H2=95, H5=90 — rich uniform spectrum, not sparse pluck); AMP 0.5→0.025
  - **kalimba**: same flat-sustain correction; PROFILE replaced from C4 measurements (H3/H4/H5/H7≈100 RDFS — very bright koto timbre); AMP 0.5→0.007; R extended 0.001→0.5s
  - **melody**: flat-sustain correction; PROFILE replaced from G3 measurements (characteristic dip at H4=52, bright H6–H7=83–84); AMP 0.5→0.042
  - **synbrass**: PROFILE H3–H16 VCF-boost-compensated — pre-distorted to cancel measured per-harmonic VCF gain K(f) so sompyler output matches TiMidity; AMP 0.5→0.020
  - **strings**: O:sawtooth replaced with O:sine + measured PROFILE (16 harmonics from TiMidity Eb3); VCF removed (baked into PROFILE); R extended 0.001→1.5s; AMP 0.5→0.040
  - **ensemble**: PROFILE fully replaced from TiMidity G4 t=1.5s (old H5=100/H7=91 were wrong — actual H5=72/H7=63); S changed to flat sustain; AMP 0.354→0.045 (sample builds up 7 dB over first 0.5s)
  - **bowedpad**: PROFILE fully replaced from TiMidity C4 measurements (averaged t=0.5/1.5/2.5); VCF removed (baked); R extended 0.001→1.5s; AMP 0.158→0.030
  - **tambourine**: no change (drum hit too short for meaningful envelope comparison)
  - **seashore**: shaped wave-wash envelope (non-monotonic A:/S:/R: with multiplicity-weighted dips) plus 0.8 Hz amp LFO for slow undulation; VCF cutoff 5000→1200 Hz with Q 0.2 shifts spectral centroid from "hiss" to "ocean rumble" (real ocean concentrates energy <1 kHz); AMP 0.1→0.5 compensates for the lowered cutoff. Single-band only — discussed dual hiss+rumble (UNISON/per-partial VCF/two-voice stage) and concluded it's a score-level concern.

- **All 9 Oxygène instruments rebuilt from FluidR3_GM2.sf2 source data only** — no TiMidity-rendered WAV, no hand-tuned values. Each instrument derives envelope timings from SF2 volume-envelope generators (timecents → seconds), PROFILE from loop-region FFT, AMP from `initialAttenuation` centibels, and VCF/LFO from SF2 filter/modulation generators:
  - **kalimba**: replaced near-pure-sine TimGM6mb model with GM108 Koto (FluidR3) — rich 24-harmonic PROFILE (H2/H3/H5 ≈100 RDFS), plucked 0.29s decay
  - **synbrass**: VCF filter sweep now wired — 500 Hz → 5039 Hz via mod envelope (instant attack); AMP 0.35→0.5
  - **strings**: VCF at 5549 Hz (previously missing); release instant per SF2; LFO moved inside character block
  - **ensemble**: sustain decays to 0 in 0.1s — this is a "strings hit" articulation, not a sustained pad; AMP 0.10→0.354
  - **bowedpad**: AMP 0.08→0.158; release instant per SF2; invented 0.18 Hz tremolo LFO removed (no LFO in SF2)
  - **melody**: rebuilt from GM25 Nylon Guitar FluidR3 loop FFT — replaces TimGM6mb STFT; irregular guitar spectrum with dip at H6–H8
  - **tambourine**: AMP 0.18→0.5; SF2 envelope is pass-through (all phases ≈0.001s); sample carries the transient
  - **seashore**: AMP 0.06→0.375; 1.96s attack, 4.46s shaped decay (hold 2.67s then fade); instant release
  - **bass**: AMP 0.70→0.5 (initialAttn=0); PROFILE and envelope unchanged

- `sf2_to_spli.py` fixed: vibrato now emits as `LFO: "…:pitch"` string instead of a comment; LFO delay uses `[brackets]` syntax; VCF emitted even when mod-envelope sweep is present; GM percussion bank (bank=128) supported via `drum:NOTE` argument

- **Second-pass STFT instrument analysis** using a reusable analysis script (`analyze_instrument.py`, 4096-frame Hann window, 512-hop, parabolic interpolation for sub-bin accuracy). All six pitched instruments now use per-frame harmonic tracking to select the true mid-sustain window rather than a single FFT snapshot:
  - **synstrings**: previous PROFILE used a late-sustain window (H2=36%). Corrected to mid-sustain: H2=21.9, H3=18.5, H4=12.4 (much more modest). Six harmonics (H2, H5–H9) that build after the loudness peak now have per-partial `A:` overrides — each attack time derived as `A_partial = 1.5s × (V_sustained / V_at_peak)`, so the measured onset ratio is reproduced exactly at global-attack completion. String inharmonicities added: H7(−8c), H8(+14c), H9(+17c), H11(−8c).
  - **synbrass**: previous PROFILE came from a 3-window analysis with a very narrow sustain window (0.27s). Replaced with a stable 1.0s average across the mid-swell (1.5–2.5s): H2 67→80, H6 8.2→13.6, H8 8.9→14.0, H10 7.1→13.3, H11 5.2→11.1. Six harmonics now carry measured inharmonicities: H2(+9c), H4(+6c), H5(+7c), H6(+10c), H8(+6c), H11(+12c).
  - **string-ensemble**: four measured inharmonicities added — H4(+14c), H5(−8c), H6(−7c), H11(−18c). These are string-bowing artefacts that add the characteristic ensemble roughness.
  - **bowed-pad**: inharmonicities H4(+8c), H5(+6c), H8(+10c), H9(+26c) added. H9 is the most audible single-partial deviation across all instruments.
  - **bass**: H8 inharmonicity +5c from fretless string stretch.

- Oxygène instruments re-tuned from a full multi-window WAV analysis (attack-peak, mid-sustain, late-sustain FFT windows per instrument):
  - **synbrass**: several harmonics were significantly overestimated — H6 12.2→8.2, H11 11.1→5.2, H15 7.8→1.7, H17 6.5→2.0, H21–H23 all roughly halved.
  - **synstrings**: PROFILE had been measured at attack onset, missing the harmonic build-up. H2 18.8→36, H3 18→32, H4 25→34, H5 14→19, H6 6.5→15. Now measured at mid-sustain.
  - **bowed-pad**: H4 corrected to 95 (not 99 or 131); H8/H11/H18 were all overestimated in the original analysis (H11 was 11.6 but WAV measures 3.1).
  - **string-ensemble**: H2 refined to 34 (mid-sustain measurement).
  - **seashore**: attack shortened from 2.0s to 0.75s (measured WAV peak); release extended from 3.0s to 9.0s (WAV -40dB tail at ~9.25s).

### Added

- Pitch vibrato via `LFO: "RATE[@OSC][DELAY];DEPTH:pitch"`. The LFO signal modulates each oscillator's instantaneous frequency per-sample using `freqHz × 2^(signal × depth / 1200)`, matching standard cents-based pitch deviation. Applied pre-summation per partial (not post). Synth Strings now carry the SF2-specified vibrato: 8.18 Hz, ±15 cents, 0.37s delay.

- `tones:` block support in `.splt` tuning files: maps arbitrary note names to semitone positions within an octave, extending (not replacing) the default Anglo-Saxon note table. Enables German notation (`H`, `Cis`, `Dis`, `B`) and other regional naming conventions. Tone name regex widened to accept multi-letter names.

- Per-partial envelope overrides in `PROFILE` entries: complex entries `{V, A, S, T, R, D}` now apply per-partial envelope phases that override (not replace) the root instrument envelope per phase. Missing phases inherit from the root.

- `D:` (deviance) in `PROFILE` entries: sets a per-partial frequency offset in cents from the harmonic series (RFC §S32130). Applied as a separate multiplier after spread, preserving integer `freqMult` indices required by the spread model.

- `T:` (tail) envelope segment fully implemented (RFC §3.2.1.1.4): a shape applied between sustain and release, evaluated via the bezier kernel. The tail's final amplitude level becomes the release start level rather than `sustainLevel`.

- `VOLUMES:` per-partial base amplitudes (RFC §S32131): a list or `RESOLUTION:SHAPE` string of REVERSED_DBFS values. `PROFILE.V` is additive on top (`effective = V + VOLUMES[i]`). VOLUMES entries beyond the PROFILE length create implicit partials.

### Changed

- `fm:`, `lfo:`, `vcf:`, and `amp:` instrument keys moved inside the `character:` block as uppercase strings, matching the RFC's character-block naming convention. New syntax:
  - `AMP: 0.35` — linear output scalar (replaces top-level `amp:`)
  - `FM: "FREQ[@OSC][SHAPE];DEPTH[+PHASE_DEG]"` — RFC §S32117 string (replaces `fm:` mapping)
  - `LFO: "RATE[@OSC][DELAY];DEPTH:TARGET"` — compact string (replaces `lfo:` mapping)
  - `VCF: "CUTOFF;RESONANCE[;ENV_AMOUNT[;ATTACK[;RELEASE]]]"` — compact string (replaces `vcf:` mapping)
  - All 16 built-in instruments and both kick drum variants updated accordingly.

### Fixed

- Tab strip is now properly scrollable on desktop. Tab buttons had `flex-shrink: 1` (flex default), so they silently compressed to fit the container width rather than overflowing it — nothing to scroll. Tabs now hold their natural width (`flex-shrink: 0`, `white-space: nowrap`) and a visible thin scrollbar appears when the strip overflows.

- `PROFILE` partial amplitudes now use the RFC `%dB` logarithmic scale (`10^(-5*(1-V/100))`), matching Python's `log_to_linear` in `sympartial.py`. The previous linear conversion (`V/100`) made upper harmonics up to 3000× too loud relative to the fundamental — at V=3 the error was a factor of ~2100×.

- `SPREAD` frequency model now matches Python's additive position walk. The previous model applied cumulative cents as a multiplier on top of the harmonic number (`k × 2^(cumCents/1200)`). Python's model accumulates a running position counter (`Σ 2^(cumCents_i/1200)`) — so partial k's actual frequency factor is that cumulative sum at slot k, not the harmonic number shifted by cumulative cents. Gaps in the PROFILE (partials at non-consecutive harmonic numbers) are handled correctly by walking the spread counter up to `max(freqMult)` before mapping.

### Changed

- Flat instrument keys (`oscillator:`, `envelope:`, `partials:`, `spread:`, `timbre:`, `morph:`, `railsback:`) removed from the compiler. The RFC `character:` block is now the only supported instrument format. All 14 built-in instruments in `defaults.ts` converted accordingly. `RAILSBACK_CURVE:` moves into the character block; `fm:`, `lfo:`, and `amp:` remain as top-level non-RFC extensions.

- `ticks_per_minute` removed from score meta parsing. `beats_per_minute` is the only tempo key; it is multiplied by the stress pattern's sub-level cumulative length (`sub_cumlen`) to derive ticks/minute — matching Python sompyler's `Measure.__init__` behaviour.

- `T:` (tail) envelope segment now parsed from the character block and stored in `EnvelopeSpec.tail` (RFC §3.2.1.1.4).

- Bezier rendering bug fixed: `scanBezier` was missing a `return` when the upper neighbour was already filled, mirroring Python's early-exit in `scan_bezier`. Without it the right recursion continued indefinitely, repeatedly overwriting the correct value with the last sampled y (which drifted toward the curve endpoint). Multi-segment shapes with 5 or more control points were most affected. All shape curves now match the Python reference output exactly.

- Envelope shape strings are now fully evaluated via the bezier kernel. Previously `A:`, `S:`, and `R:` strings were stripped to just their leading duration; all intermediate control points were discarded and segments were rendered as linear ramps. Now the raw strings are stored in `EnvelopeSpec` and `applyEnvelope` calls `renderShapeString` per segment, producing the correct bezier curve. Multi-segment decay curves (e.g. `S: ".20:100;1,60;2,25;3,8;4,0"`) now trace through their control points. Release is scaled by `sustainLevel` to match Python sompyler's `y_scale` chaining.

### Added

- RFC instrument format (`character:` block) is now fully wired in the compiler. The keys `O:` (oscillator waveform), `A:` / `S:` / `R:` (attack/sustain/release shape strings), and `PROFILE:` (partial amplitudes in REVERSED_DBFS) are all read and converted to the internal `InstrumentSpec`. RFC waveform names (`sine`, `sawtooth`) are mapped to the internal equivalents. Score meta now supports `beats_per_minute`, converted to ticks/minute by multiplying with the stress pattern's sub-level length (`sub_cumlen`) — matching Python sompyler's `Measure.__init__` behaviour exactly.

- `oxygene4old` score and instruments added to the library as staging defaults. The 103-measure Oxygène Part IV score from the original Python Sompyler source is now loadable from the staging pane, together with its seven instruments (kick, claves, cymbal, bass, arpeggio, pad, lead) all in the RFC `character:` format.

- Syntax reference dialog updated with a `character block` section documenting `O:`, `A:`, `S:`, `R:`, `SPREAD:`, `PROFILE:`, `TIMBRE:`, `MORPH:` keys with annotated examples. Score meta reference now shows `beats_per_minute` alongside `ticks_per_minute`.

### Fixed

- Bar duration was computed as the maximum note extent in the measure (matching a mistaken approximation). It is now computed as `stressor.cumlen` of the active stress pattern, matching Python sompyler's `Measure.length = self.stressor.cumlen` (measure.py:230). Notes that overflow the bar boundary bleed into subsequent time without stretching the bar — only the render buffer is sized to accommodate overflow. This eliminates the timing drift seen in multi-bar scores where long or damped notes shifted every subsequent bar later.

### Added

- Seekbar in the player pane: click or drag to seek, with a current-time / total-time readout. When loop is enabled, green (in) and red (out) markers appear and can be dragged independently to define the loop region. Loop points survive a new render — they are clamped to the new buffer duration but otherwise preserved, so you can re-render and immediately hear the same section. All changes apply to the live source node without restarting playback.

- Staging tree now shows ghost entries for referenced but not-yet-created files. Missing deps appear as muted italic rows inside the expanded score node with a "Create" button instead of the usual action trio. Clicking creates an empty file and marks it in-project when the parent score is already active.

- Staging area is now a grouped tree view. Score (`.spls`) files are the root nodes; clicking the arrow beside a score expands it to show all files it references (instruments, room, tuning) indented beneath it. Files not referenced by any score appear under a collapsible "unreferenced" group. All file actions (add/remove, rename, delete) remain available at both levels.

- Kick drum (`oxygene-kick`) added to the Oxygène Pt. IV score. FM pitch sweep from ~130 Hz to C1 (32.7 Hz) in the first 50 ms produces the characteristic thump. Hits on beats 1 and 3 of every bar from bar 5, silencing at bar 117 alongside the tambourine.

### Changed

- Oxygène plate reverb switched from sparse-tap model to Freeverb algorithmic reverb (`type: freeverb`, room_size 0.76, damping 0.45, wet 0.22, 10 ms pre-delay). The tap model was producing discrete echoes above the 80 ms Haas threshold, heard as notes repeating at lower volume. Freeverb produces dense, smooth tail decay closer to Jarre's EMT 140 plate unit.

- All six pitched Oxygène instruments (bass, synbrass, strings, ensemble, bowedpad, melody) now use H1–H24 partials measured from TiMidity's TimGM6mb sustained output, replacing the previous rough estimates. No harmonic information is discarded (floor: −90 dBFS ≈ 16-bit noise floor). Notable findings: bowedpad has H4 ≈ H1 in amplitude (a defining characteristic of that patch); the nylon guitar melody has an almost-absent H4 with H6/H7 re-emerging (string cancellation node); synbrass retains a H7 amplitude spike. Instruments previously approximated with a sawtooth oscillator now use sine with explicit partials so higher harmonics are not double-applied. Noise instruments (tambourine, seashore) are annotated with measured spectral centroid and 95 % rolloff values. Eight TiMidity reference WAVs added to `src/conformance/fixtures/`.

### Added

- Freeverb algorithmic reverb as a room type. Set `type: freeverb` in a `.splr` file and tune with `room_size` (0–1, decay length), `damping` (0–1, HF absorption), `wet` (0–1, mix level), `width` (0–1, stereo spread), and `pre_delay_ms`. Applied as a post-mix bus effect to the full stereo output after all voices are mixed with free-field panning. Syntax reference updated in the help dialog.

- Oxygène Pt. IV score and instruments replaced with a full 117-bar MIDI transcription. The previous 20-bar sketch with four generic instruments is gone. The new score covers the complete structure: sea-shore atmospheric intro (bars 1-4), fretless bass with the actual walking patterns from the recording, kalimba fade-in, tambourine drum pattern, SynBrass and strings layers entering at bar 10, BowedPad at bar 34, main melody at bar 40 (with a second melodic section at bars 82-117 featuring the more elaborate ornamental variations), and a fade-out at bar 117. Nine new instruments replace the four old ones: `filtered-bass`, `kalimba`, `synbrass`, `synstrings`, `string-ensemble`, `bowed-pad`, `oxygene-melody`, `tambourine`, `seashore`.

- Syntax reference help dialog: each editor pane header now has a `?` button that opens a modal with a concise annotated YAML reference for that file type (score, instrument, tuning, or room). Uses the native `<dialog>` element with `.showModal()` — no signal overhead, built-in focus trap and Escape-to-close.

- Per-file-type syntax highlighting in the CodeMirror editors. Sompyler domain tokens are colored on top of the base YAML theme: pitch names (`C4`, `Bb2`) in teal, tick offset keys in sage, shape strings (`4:100;1,55`) in gold, waveform literals (`sin`, `saw`, `triangle`) in blue. Implemented as a viewport-scoped `ViewPlugin` that avoids decorating off-screen lines.

- Scrollable tab bar: when many files are open in one editor pane the tab row now scrolls horizontally (scrollbar hidden) and the active tab is automatically scrolled into view via `scrollIntoView`.

- "New…" inline file creation in the staging area: clicking "New…" reveals an inline form (filename + extension dropdown) for creating a blank file directly into staging without leaving the page. Enter or clicking Create confirms; Escape cancels.

- Oxygène Pt. IV (Jean-Michel Jarre, 1976) added as a seeded default song: 20-measure score at 121 BPM with four instruments (`oxygene-bass`, `oxygene-sub`, `oxygene-pad`, `oxygene-arp`) and drums reusing the sandstorm kit. The bass uses a filtered walking pattern with VCF sweep, the pad has a slow LFO filter modulation, and the arpeggio alternates every other measure to match the original's phrasing. All seeded `inProject: true`. (Jean-Michel Jarre, 1976) added as a seeded default song: 20-measure score at 121 BPM with four instruments (`oxygene-bass`, `oxygene-sub`, `oxygene-pad`, `oxygene-arp`) and drums reusing the sandstorm kit. The bass uses a filtered walking pattern with VCF sweep, the pad has a slow LFO filter modulation, and the arpeggio alternates every other measure to match the original's phrasing. All seeded `inProject: true`.

- LFO (low-frequency oscillator) for instrument definitions. Add an `lfo:` block (or list for multiple) with `rate_hz`, `depth`, and `target` (`vcf` or `amp`). Routes a slow sine/square/saw/triangle oscillator to the VCF cutoff (depth in Hz) or the output amplitude (depth 0–1). Optional `delay_seconds` fades the LFO in gradually. Applied at render time per note alongside the VCF.

- Sandstorm instruments updated with VCF and LFO: the lead now has a 4.8 kHz LPF to soften the square wave; the bass has a filter envelope that opens from 500 Hz to 4 kHz on attack for a plucky character; the pad has a 2.2 kHz LPF with a slow 0.35 Hz filter LFO for movement; the atmospheric layer has a 0.22 Hz amplitude LFO for extra breathing texture.

- VCF (resonant low-pass filter) for instrument definitions. Add a `vcf:` block with `cutoff_hz` and `resonance` (0–1) for static filtering, plus optional `env_amount`, `env_attack`, and `env_release` for a filter envelope that sweeps the cutoff over the note duration. Enables acid bass sweeps, pad openings, and classic subtractive synthesis sounds.

- Instrument preview waveform in the player pane: the bottom half of the top-left quadrant now shows a static A4 waveform rendered through the currently active instrument tab. The preview updates automatically one second after each edit and switches immediately when changing instrument tabs. No manual button required.

- Sandstorm atmospheric wave voice (`sandstorm-atmos.spli`): five symmetrically detuned unison partials (±0.002 and ±0.005 freqMult offsets) create slow amplitude beating — the ±0.002 pair beats at ~0.33 Hz on E3 (~3 s cycle), the ±0.005 pair at ~0.82 Hz (~1.2 s), layered for an organic wave texture. A quiet noise partial adds breath. The envelope (attack=0.3 s, release=1.2 s) keeps the full swell within a single measure, producing one rise-hold-fall sweep per measure that chains seamlessly between repetitions. Plays E3 (Em bars) and D3 (D bars) as a whole-measure note, sitting furthest back in the stage (distance 2.5) for maximum reverb wash.

- Sandstorm room and stereo stage: `sandstorm-plate.splr` — a tight plate reverb (4 taps over 4 s, audible tail ~1.5 s) with jitter (±12% per-tap amplitude variation to smooth comb artefacts from sparse taps) and deldiffs (L +8 ms, R +14 ms per tap for stereo width). The score stage is updated with voice-specific positions: drums dry at centre, lead at distance 0.6, snare at 0.3, harmony slightly left (1.2|0.8) at distance 1.0, pad furthest back (distance 1.8) for maximum reverb wash, hihat slightly right (0.9|1.1) and dry.

- Sandstorm drum tuning towards GM SF2 (GeneralUser GS): Electric Snare (GM 40) gains a sine body partial at the scored pitch D4 (294 Hz) to approximate the SF2's mid-range spectral character (centroid 1093 Hz, IQR 215–797 Hz), which pure white noise cannot match. Closed Hi-Hat (GM 42) spectral centroid (11028 Hz) already matched white noise; the fix was the envelope: release extended 0.03 → 0.09 s to shrink the flat sustain plateau from 79 ms to 19 ms, so the note decays from near the start. Both instruments re-balanced by pattern-RMS measurement.

- Sandstorm harmony voice: GM 110 (Bagpipe) from MIDI Ch 7 approximated using 10 partials matched to GeneralUser GS SF2 spectral analysis. The bagpipe's unusual harmonic profile (H5 is the dominant overtone, H3 nearly equal, with an anomalous H8 peak) is captured in `sandstorm-harmony.spli`. The voice plays E3+G3 drone for Em bars and D3+A3 for D bars, adding mid-register harmonic support at −20 dBFS.

### Changed

- Sandstorm mix balance: all six voices adjusted to per-role dBFS targets (lead −15, bass −16, kick −17, pad −18, snare −22, hihat −25). Amp values were derived by rendering each voice's full 2-bar repeating pattern — capturing note-overlap buildup from long releases — and scaling to reach the target. Adds `scripts/balance-mix.ts` for reproducing the measurement.

### Fixed

- Score parser now accepts `false` as a voice value, silencing the voice for that measure and removing it from the `repeat_unmentioned_voices` cache. Previously `false` threw `ScoreError: Voice '…' content must be a mapping or chain string`.

- `scanBezier` infinite recursion on zero-span Bezier shapes: a single-point shape like `"1:0.12"` (used by the sandstorm-plate jitter field) has `coordSpan = 0`, causing `getBezierFunc` to return a constant `{x: 0, ...}`. In `scanBezier` this meant `x < max` never cleared, recursing forever. Fix: skip the bisection pass entirely when `coordSpan = 0`; the pre-filled equal endpoints plus the existing linear-fill post-pass correctly output the constant value for all interior samples.

- S46192 `cut`: surviving notes now retain their original tick offsets instead of being shifted left by N. The full measure span (including the silent cut range) is preserved in the timeline, which is the correct semantics per RFC §S46192 ("the cumulative offset advances as if those ticks elapsed"). The previous left-shift was causing `slow_piano-all-keys-cmaj.spls` to compute a total length of 36 s instead of 39.6 s.

### Added

- Sandstorm MIDI fidelity improvements: three missing elements added from the source MIDI. (1) `lead2` voice — the octave-doubled lower layer of the main melody (Ch 5 plays every note as a pair an octave apart; only the upper octave was previously scored). (2) `arp` voice (Lead 8, sandstorm-arp) — Ch 3's B5-G5-E5 arpeggio pattern in m34–m45, which previously overwrote the lead voice instead of playing alongside it. (3) `subbass` voice (Lead 8, sandstorm-subbass) — Ch 11's 16th-note E1/E2 ostinato entering at m55, with A2/G2 variant measures at m84, m88, m92, m96, m102, m106, m112, m116, m120, m124, m130, m134. Instrument reassignment: `sandstorm-lead` is now Lead 1 square (the actual melody timbre); `sandstorm-arp` is now Lead 8 sine (the arpeggio timbre); `sandstorm-bass` is now Jazz Guitar (GM 27) character with a plucky attack rather than the square wave previously used.

- Darude Sandstorm full-song score (141 measures, ≈4:09 at 136 BPM): expanded `STARTER_SANDSTORM` from the 12-measure showcase loop to the complete song. All eight sections are transcribed from MIDI (PPQ=120, channel-to-voice mapping: kick, snare, hi-hat, bass, pad, harmony, atmos, lead). Chord structure: E minor dominant throughout, with Am→G→D passing-chord transition measures every 4 bars in the active sections. Chain notation used for melodic voices; explicit tick notation for chord transitions. `repeat_unmentioned_voices: true` throughout to compress the heavily repetitive drum/bass arrangement.

- FM synthesis: `fm` block on instruments (top-level or per-partial) drives a modulator oscillator that varies the carrier's instantaneous frequency each sample (`renderOscillatorFM` in `oscillator.ts`). Key fields: `freq_hz` (modulator frequency in Hz, or ratio when `dynamic: true`), `depth` (peak deviation as fraction of carrier), `init_phase` (modulator start phase in turns; 0.25 puts a sin at its positive peak), `depth_env` (Shape string evaluated per note for time-varying depth, enabling pitch sweeps). When any partial has FM the per-partial rendering path is activated. A `dev/kick.spli` starter instrument demonstrates a classic electronic kick drum: near-DC modulator (1 Hz) at peak phase produces a 4× frequency sweep decaying to the base pitch in the first 10% of the note.
- Chain pitch-shift operators and rest (S53000, Option A): `+N`/`+` shifts up N semitones (default 1) from the current base and emits a note; `-N`/`-` shifts down; `=` resets the shift to 0 and emits the base pitch. Shifts are cumulative within a subchain; any new absolute pitch token resets both the base and the shift to 0. `.N`/`.` inserts a silent rest of N (default 1) ticks, advancing the offset without emitting. Shift tokens accept an optional length suffix (`+4__` = E4 held for 3 ticks). All existing shift wraps across octave boundaries (B4→C5, C4→B3). Remaining deferred: stress adjustment (`^`), article extension stacks (`:ext`), paren clusters, repeated-sign notation (`++`).
- Chain voice syntax (Phase 24, S53000): a voice whose YAML value is a plain string (rather than an offset-key mapping) is now parsed as a chain. Space-separated tokens are sequential notes whose tick offsets accumulate; `"; "` (semicolon + space) separates parallel subchains that both start at tick 0. Per-token modifiers: `_` / `__` / `_N` extend the note length by 1 / N extra ticks above the 1-tick default; an immediately following `*N` token repeats the preceding clause N times. Off-scale flags (`?`/`!`) on pitches are forwarded.
- Continuum article attributes (Phase 23, S432b0): a `key=START-END` token on a note line now detects the `START-END` format (e.g. `vol=80-40`) and routes it to a new `continuumArticles` field on `RawNote` instead of `staticArticles`. In `buildDistinctNotes`, continuum values are resolved to a scalar using linear interpolation: `start + (end-start) * (offsetTick / measureSpan)`. Notes at different tick offsets within the same measure get different resolved values and therefore distinct cache entries. LPU pattern (S432c0) remains a forward door.
- Room reverb sub-properties (Phase 22): `jitter` (S33500) and `deldiffs` (S33600) are now parsed from `.splr` YAML and applied in `buildRoomPositionIR()`. `jitter` is a Shape string (or `L|R` Shape pair) rendered to `numEchoes` samples; per-tap amplitude is perturbed by `±jitter[i] * random()` on non-direct reverb taps. `deldiffs` is a stressor-format string (comma/semicolon-separated seconds, optionally `L|R` split) cycled across taps; each tap's delay index is offset independently per channel, widening the stereo image. The IR buffer extends to accommodate the maximum deldiff offset. `freq_lanes` (S33300) and `diffusion` (S33700) remain forward doors — the Python's FFT-band and comb-filter logic is complex and no shipped room file depends on them.
- Elasticks & stress bounds (Phase 21): `_meta.elasticks_pattern` (S46170) accepts a stressor-format string (`"1,3"`, `"4;1,2,3,1"`) parsed into per-tick duration multipliers. The array is normalised so its sum equals its length, preserving total measure duration on average. `_meta.elasticks_shape` (S46180) is applied as per-tick exponentiation on top of the pattern values. Both fields are inherited across measures (tracked in `MeasureMeta`). When elasticks are active on a constant-TPM measure, a constant-tick-seconds array is materialised and the elastick multipliers are folded in before integration, keeping `tickRangeSeconds` unchanged.
- Multimeasure constructs (Phase 20, S47000): a new `expandMultiMeasures()` pre-expansion pass in `src/parse/multimeasure.ts` runs inside `parseScore()` before `walkMeasures` ever sees the measure list. A measure is detected as a multi-measure if `_meta._loop` is set or any string value contains ` |` as a cycling separator. `flattenCycleString()` expands a ` |`-separated string into an ordered list of alternatives supporting `*N` (repeat preceding item N additional times), `%N` (back-reference to the Nth literal value, 1-indexed), `+`/`-` (boolean true/false for meta flags), and empty slots (null = omit the entry from that iteration). The loop count is taken from `_meta._loop` or auto-detected as the longest cycle length. Each sub-measure gets an `_id` like `"name[i]"` so the measure name stays traceable. Forward-doors: `||` nested cycling depth, voice-level `_meta` cycling, `_articles` sub-block cycling.
- Score meta completeness + multi-tick offsets (Phase 19): `_meta.skip: true` (S46193) causes `walkMeasures` to silently drop an entire measure without advancing elapsed time. `_meta.is_last: true` (S46195) halts the generator after the current measure, ignoring subsequent ones. `_meta.cut: N` (S46192) with positive N drops all notes whose offset is before tick N and shifts the remaining offsets left by N. `_meta.offset_seconds` (S46196) inserts a silent gap (in seconds) before the measure in `buildDistinctNotes`. Multi-tick offset keys (S46232) — `"0,4,8"` or `"0+2*3"` — are expanded by the new `expandOffsetKey()` helper, yielding one `RawNote` per tick instead of dropping composite keys as before.
- RFC synthesis properties (Phase 18): SPREAD (S32132) applies cumulative cent deviations per partial to shift the harmonic series away from pure integer multiples; TIMBRE (S32134) applies a per-harmonic amplitude curve ("resonance corpus") keyed by a `SPECTRUM_WIDTH:SHAPE` string; MORPH (S32135) applies post-render per-partial amplitude envelopes addressed by partial sequence patterns (`1`, `2n`, `3n+1`, etc.) with weight-averaged blending when multiple entries match. All three are compiled from `.spli` YAML (top-level keys or `character:` block roots) and applied in `renderNote()` via a per-partial buffer path that activates only when any of the three features are non-empty, keeping the common path allocation-free.
- Initial Vite + Solid + TypeScript scaffold.
- PWA shell via `vite-plugin-pwa` with web app manifest and basic service worker.
- Structured debug logger (`src/debug.ts`) with category-based thresholds, console sink, in-memory ring buffer, and JSON dump download.
- IndexedDB test setup (`fake-indexeddb`) wired into Vitest.
- IndexedDB wrappers for the `files` and `notes` object stores (`src/storage/`).
- Content-addressed per-note cache key built on `SubtleCrypto` SHA-256 (`src/storage/hash.ts`).
- `Tuner` with equal-temperament tone-name resolution (A4=440, conformance against `Sompyler/tests/test_intonation.py::test_equal_temp_tuner`).
- `PositionStack` for R-ErrorCtx parse-position tracking.
- Minimal `.spls` walker that produces a flat note stream from simple offset-keyed measures.
- `buildDistinctNotes()` that walks a score, dedupes occurrences by `(instrumentHash, freq, stress, length, properties)`, and produces a render plan with content-addressed cache keys.
- CodeMirror 6 editor component (`src/editor/Editor.tsx`) with YAML highlighting, line numbers, history, and a `readOnly` reconfiguration compartment driven by props.
- Debounced autosave that persists every keystroke into the `files` object store.
- Inline lint pipeline: YAML syntax errors plus semantic checks (unknown instrument references in `.spls`).
- Starter `.spls` document seeded into storage and surfaced in the App shell.
- Synthesis primitives: oscillators (sin/square/saw/triangle/noise), A.S.R envelope, sympartials, sound generator (sum-of-partials + master amp/clip).
- `renderNote()` produces a mono Float32Array from an instrument spec + frequency + stress + duration.
- Single Web Worker (`src/synth/worker.ts`) that runs `renderNote()` off the main thread with transferable PCM buffers.
- App shell "Preview A4 tone" button — first audible output, validates end-to-end Web Audio playback.
- Generic worker `Pool` with hard-cancellation via `terminate()` (R4); factory pattern so tests can plug in sync adapters.
- `renderAll()` orchestrator: walks the distinct-notes plan, skips cache hits, dispatches misses to the pool, writes PCM into the `notes` store, and orphan-sweeps only on success.
- Web Worker client (`src/render/workerClient.ts`) wiring the synth worker into the pool with id-keyed pending requests.
- `freeFieldGains()` resolves a stage spec `'L|R distance'` to per-channel gains (subset port of `Sompyler/score/stage.py::Voice` with default space `0|1:0`).
- `mixOnly()` sums cached per-note PCM into a stereo Float32Array buffer with offsets, panorama, and global peak-clipping. Fails fast with `MissingNoteCacheError` if any required note is uncached.
- Lenient YAML → `InstrumentSpec` compiler (`src/synth/compile.ts`) that handles the v1 instrument shape (amp / oscillator / envelope / partials).
- Player domain (R7): `AudioContext` lifecycle, `AudioBufferSourceNode` with loop, transport (play/pause/stop/loop) and a state-change listener.
- App shell wired end-to-end: Render → render-all → mixOnly → Player.loadBuffer, with progress, loop toggle, transport buttons, and error reporting.
- Starter `dev/piano.spli` seeded into storage so the starter score has a working instrument out of the box.
- `Session` coordinator (R3) owning the three cross-domain signals — `editLock`, `renderStatus`, `currentBuffer` — and routing the Render workflow end-to-end with hard cancellation.
- `RenderModal` (R11): full-screen overlay during synthesis/mix with progress bar, last-rendered-key strip, and Cancel button.
- `StagingPane` (R9): collapsible flat-file list with per-row Add / Remove / Rename / Delete, plus an Import file picker. Score multiplicity enforced (only one `.spls` may be in-project).
- Four-quadrant Layout (R-UI): transport top-left, instrument editor top-right (tabbed), score editor bottom-left, tuning / room editor bottom-right (tabbed). Editors honour `editLock` via the `readOnly` prop.
- Hand-rolled 16-bit PCM WAV writer (`src/export/wav.ts`) — RIFF/WAVE/fmt/data header, sample clipping, mono + stereo. No dependencies.
- Download WAV button on the transport row, enabled once `currentBuffer` is non-null.
- `seedDefaults()`: starter content seeded on first run — in-project starter score + `dev/piano.spli`, plus staged extras (`dev/flute.spli`, `tones_euro.splt`, `free-field.splr`, `alle_meine_entchen.spls`).
- Conformance test against Sompyler's `test_examples/alle_meine_entchen.spls` (structural parity per R-Test): one voice, plan builds, distinct-notes count and length sanity.
- GitHub Pages deployment workflow (`.github/workflows/deploy.yml`): push to `main` triggers typecheck → unit tests → build → upload + deploy. Conformance tier is opt-in via `npm run test:conformance` and not gated in CI.
- Split test scripts: `test:unit` excludes `src/conformance/**`; `test:conformance` runs only that directory. README documents the deploy story and the one-time `Settings → Pages → Source = GitHub Actions` step.
- Bezier shape kernel (`src/synth/shape/bezier.ts`, RFC §S33000-3.3): pure-TS port of `plot_bezier_gradient` with Bernstein-coefficient cache, function-shaped `evaluate` / `plotBezierGradient` boundary preserving the TS-7 WASM forward door.
- Variation graph + S32122 cycle detection (`src/synth/variation.ts`): parses Sompyler-rich `character:` blocks (label specs + numeric-keyed variations), surfaces circular `@label` references as `InstrumentError`. Wired into `compileInstrument()` so the editor lint sees them.
- Conformance test against `slow_piano-all-keys-cmaj.spls` rendered against the real `lib/instruments/dev/piano.spli` — verifies the rich instrument compiles and the C-major glissando builds a 52-note distinct-notes plan.
- Minimal Shape DSL parser (`src/synth/shape/index.ts`): `length:y0;x1,y1;x2,y2;…` strings → `ShapePoint[]`, rendered via the Bezier kernel. Subset port of `Sompyler/synthesizer/shape/Shape.from_string`.
- `.splr` (room) YAML parser (`src/parse/room.ts`): levels + delays + border shapes; deferred fields (jitter, freq_lanes, deldiffs, diffusion) accepted but currently ignored.
- Position-dependent Room IR (`src/render/room.ts::buildRoomPositionIR`): each voice direction + distance produces a per-position stereo impulse response with equal-power panning and distance-driven direct/tail balance. Free-field stays the zero-tail δ-IR fast path.
- `mixOnly()` rewrites against the IR model: convolves cached note PCM with the per-voice IR, extends the buffer by `max(tailSamples)` across voices. Free-field still hits the multiplicative fast path so existing fixtures remain bit-identical.
- Session loads the first in-project `.splr` and threads it through `mixOnly` — editing the room file now audibly changes the rendered output.
- S53400 off-scale flags (`?`/`!`) are parsed off the pitch in `src/parse/score.ts` and exposed on `RawNote.offScale`. The flag is folded into the cache-key `properties` so flag-divergent occurrences produce divergent cache entries (R1). Snap-to-nearest semantics remain deferred until a Scale subset type lands; flag tracking is the cache-correctness fix.
- S32136 railsback per-key frequency deviation: instrument YAML accepts `railsback: [lowHz, highHz, curveString]`; the curve string is parsed via the existing Shape DSL and rendered to 88 octave-fraction offsets. `applyRailsback()` in `src/synth/sound_generator.ts` applies the deviation in `renderNote()` before partial frequencies are computed.
- S51a10 damp (sustain-pedal) support: `damp=N` trailing token on a note line is parsed as ticks of extra release time. Per-note `damp` enters the cache key via `properties.dampSeconds`, threads through `RenderNoteInput` to the synth worker, and extends the envelope's release segment in `applyEnvelope()`. The mix buffer length includes per-note damp tails.
- Zip import/export (R9): staging pane now accepts `.zip` archives for import (unpacks every recognised entry into staging, flattens nested paths) and offers an Export button that writes a flat `sompyler-YYYY-MM-DD.zip` of every staged file. Implementation in `src/storage/zip.ts` uses `fflate` (≈8 KB gzipped, no deps). Archive layout matches Sompyler's flat directory convention.
- Conformance test against `simple_piano.spls` (R-Test conformance tier): documents the head-only stub form Sompyler uses as an include-target.
- Static article properties (RFC §S46300, Phase 15a): trailing `key=value` tokens on a note line are parsed as a typed dictionary. Booleans (`true`/`false`/`yes`/`no`), numeric literals, and bare identifiers fold into the cache-key `properties` so divergent article values produce divergent cache entries. Shape-literal values (any value containing `:`, `;`, or `,`) are routed to `RawNote.shapeArticles` and parsed-and-deferred for per-tick resolution in phase 16b.
- Render errors → CodeMirror inline diagnostics (R6, Phase 15b): per-note worker failures are now collected by `renderAll()` as `RenderDiagnostic[]` instead of aborting the run. `Session` exposes them via a new `renderDiagnostics` accessor; if the list is non-empty, the previous buffer keeps looping, the orphan sweep is skipped, and the editor lint (`makeLinter`) marks the affected `<voice>:<offset>` lines as errors with `"voice 'X', measure Y, offset Z (freq Hz): <reason>"`. Diagnostics clear on the next successful render or via `clearError()`.
- Render modal log strip (R11, Phase 15c): `RenderModal` subscribes to the debug ring buffer while open and shows the last 8 entries from the `parse`, `render`, and `mix` categories. Subscriber attaches on open and detaches on close so no listener leaks for the rest of the session. Warn/error entries are colour-coded.
- Deepened conformance assertions (R-Test, Phase 15d): each `.spls` fixture under `src/conformance/` now ships two layers of coverage — hand-verified anchor numbers pulled from a one-time Python YAML walk (voice count, total length seconds, occurrence count) and a `toMatchSnapshot()` of the full normalised distinct-notes plan via the new `_normalize.ts` helper. Snapshots quantise floats and exclude hashes so cosmetic hash-input tweaks don't churn the diff. Refresh with `vitest -u` after an intentional walker change.
- Scale subset + S53400 off-scale semantics (Phase 16a): new `Scale` type (`{ name, root, tonesPerOctave, positions, members }`) and `makeScale(name, steps, opts?)` builder ported from `Sompyler/intonation.py:Scale`. `Tuner.frequencyOfTone(spec, opts)` now accepts `{ scale, offScale }` — when a scale is active, `?` snaps to the nearest in-scale neighbour (ties prefer the lower neighbour, matching Sompyler), `!` forces the literal frequency through, and an unflagged off-scale pitch throws a typed `OffScaleError` (caught by the existing R6 diagnostic pipeline). Cent adjustments still apply on top of the snapped/literal resolution; key-shift adjustments (`+Nk`) move the pitch *before* the scale check so accidentals trigger the snap correctly. New `parseTuning(yamlBody)` reads a YAML `.splt` (`basics:`, `scales:` as space-separated step strings or YAML arrays, `default_scale:`); the seeded `tones_euro.splt` now ships `chr`/`mj`/`mn` scales. Forward-doors: just-intonation cent intervals, chord-relative `^n` notation, the full Sompyler scale-mode catalogue.
- Measure inheritance (RFC §S46110, Phase 15e): `walkMeasures` now tracks the resolved per-voice content of the previous measure and supports the two RFC-defined inheritance modes. A voice whose value is the boolean `true` copies its content from the previous measure (explicit per-voice opt-in). `_meta.repeat_unmentioned_voices: true` switches the copy to implicit for every previous-measure voice not redefined in the current measure — the flag itself is not propagated, it only applies to the measure that sets it. Inherited content is the *resolved* content (so chains of `voice: true` across N measures work). Forward-doors S47000 multimeasure constructs.
- Project auto-sync on score swap: adding a `.spls` to the project now also unloads every other in-project file and pulls referenced instruments, room, and tuning out of staging in one click. Referenced files missing from staging are silently skipped (editor lint catches them at render time per R6). Parse failures on the incoming score log a warning and still let the score be added so the user can open the editor to fix it. Removing an in-project score still leaves the rest of the project untouched. Logic lives in `StagingPane.toggleInProject` and reuses the existing `ScoreHead` fields (`stage[].instrument`, `room`, `tuningConfig`) — no new parsing or storage helpers.
- Pachelbel Canon in D as the starter song (Phase 17): replaces the previous one-instrument starter with a four-voice canonic showcase (cello + three violins, 12 measures of D-major canon, ~58 s with m11–m12 ritardando). Exercises every shipped RFC feature in one place: position-dependent reverb (R13) across four stage positions, content-addressed cache dedupe (R1) at ~78% hit ratio thanks to canonic repetition (48 distinct notes / 216 occurrences), measure inheritance (S46110), sympartial stacks (S33000-3.3), stress patterns (S46300), shape-typed `vibrato` articles (S32200), tempo Shape ritardando (S46140 / R13 amendment), `damp` (S51a10), `?` off-scale flag (S53400), and railsback (S32136) via a solo-piano variant in staging. New `pachelbel`, `violin`, `cello`, `pachelbel-hall`, and `tones_euro` files seed in-project; `pachelbel-piano`, `piano`, `dev/*`, `free-field`, and the original starter `.spls` remain in staging. New `src/conformance/pachelbel.test.ts` anchors the showcase against drift (voice count, ritardando length, hit ratio + snapshot of the normalised distinct-notes plan).
- Shape DSL evaluation glue (RFC §S46140 + §S32200, Phase 16b): a single `evaluateShape(shapeString, ticks)` helper now drives three runtime consumers. (1) Tempo Shape profiles: a measure-level `_meta.tempo: <Shape string>` is sampled at `cumlen` ticks; each per-tick `tpm` becomes `60/tpm` seconds in a `Float32Array`. `buildDistinctNotes` integrates that buffer per note via a new `tickRangeSeconds` helper (mirrors `Sompyler/score/measure.py:378-407`), so per-note `lengthSeconds` flows through the tempo curve and lands in the R1 cache key. Constant TPM stays the fast-path default. (2) Shape-typed article values (S32200) now enter the cache key via `properties['@<name>']` — defensive split by raw string — and forward verbatim to the synth worker via the new `shapeArticles` + `lengthTicks` fields on `RenderNoteInput`. (3) The worker applies each shape article as a multiplicative amplitude envelope (nearest-neighbour stretch from `lengthTicks` per-tick samples to the full PCM buffer); multiple articles compose multiplicatively. Real frequency-domain vibrato (FM) is a forward door — the plumbing is in place, the oscillator hook is not.

## [Unreleased]

### Fixed
- Sandstorm score was in B minor with a staccato melody — wrong key and wrong texture. Corrected to E minor (the actual key) with 16th-note arpeggios: Em (B5-G5-E5-G5 × 4 per bar) and D major (A5-F#5-D5-F#5 × 4 per bar), chord pattern Em×3 + D repeating. Bass updated to quarter-note root pumping.

### Added
- Sandstorm now has a sixth voice: a polysynth pad (GM 91 approximation) built from stacked detuned saw partials. Three copies near freqMult 1.0 beat at ~2 Hz, producing the characteristic slowly-wavering chorus/ensemble pad sound. Plays Em and D chords in parallel underneath the lead arpeggio.

### Changed
- Sandstorm instruments tuned to GeneralUser GS SF2 spectral analysis (render-and-compare pipeline):
  - **sandstorm-lead** (Lead 8): sawtooth → near-pure sine (matching SF2 H2 = −26 dB), release 60 ms → 1 s
  - **sandstorm-bass** (Lead 1 square): odd harmonics were already accurate; release 120 ms → 1 s
  - **sandstorm-pad** (Pad 3): detuned-unison partials replaced with SF2-derived harmonic series (H1–H8), release 1.8 s → 1.2 s

### Added
- `scripts/render-note.ts` — render a single Sompyler instrument note to WAV via vite-node
- `scripts/compare-spectra.py` — FFT-based spectral comparison of a reference WAV vs a Sompyler render; reports per-harmonic amplitude delta and suggests a matching partials list

## [Unreleased]

### Changed
- Oxygène instrument definitions updated from FFT spectral analysis of FluidR3 SF2 samples
  - Fretless Bass: partials now reflect Bb2 sample (near actual playing range); H2≈H3 equal-energy characteristic
  - Kalimba: replaced inharmonic guesses with measured harmonic partials; H3 dominant with H13–H14 bright cluster
  - SynStrings: switched from sin+partials to saw oscillator (FluidR3 preset is a sawtooth loop); keeps spread for chorus
  - String Ensemble: updated to measured spectral shape including H4 body resonance at 0.302
- sf2_analyze.py: fixed normalisation to max partial (not H1); added pitch_correction application; accept stereo left-channel samples (type=4)

### Changed (continued)
- Kalimba: complete rework to FM synthesis
  - Previous definition used wrong fundamental (C4 instead of G4) due to incorrect SF2 metadata
  - Previous ratios (2.756×, 5.404×) were marimba free-free beam values, not kalimba
  - Attack FFT at correct G4=392 Hz reveals dominant partial at 8.929× ("ting"), body at 1.020× and 3.146×
  - Now uses FM synthesis: carrier at 1.020×, modulator at 8.929×, depth_env decays in first 5% of note
  - Models transient metallic quality via DX7-style FM, collapses to near-sine body after ting decay
