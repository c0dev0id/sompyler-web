# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
