# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical project rules

- **Always** check RFC conformance with `../sompyler/doc/rfc.md` before implementing syntax behaviour.
- **Must** support RFC-specified syntax — existing sompyler `.spls`/`.spli` files must work.
- **Do not** implement features flagged as experimental in the RFC.
- **Do not** create syntax aliases or web-only extensions that diverge from RFC semantics.
- Sompyler-web **must** produce the same output as Python sompyler when given RFC-compliant input files.
- The canonical truth for sompyler file compilation algorithms **is** the Python code in `../sompyler/`.
- The canonical truth for sompyler file **syntax** is `../sompyler/doc/rfc.md`. Cite section numbers in commits.
- When spec and Python implementation disagree, **ask the user** which is the ground truth.

### RFC-compliance rules (hard constraints established during development)

- **`voice: {}`** is the RFC-compliant empty voice (no notes, no inheritance). `voice: false` is not RFC and not supported.
- **`beats_per_minute`** is the RFC tempo field. `ticks_per_measure` is not RFC and not supported.
- **S53000 chain string voices** (e.g. `piano: "C4_1 . E4_1"`) are not RFC and not supported. Use offset-key dicts (`piano: {0: "C4 1", 2: "E4 1"}`).
- RFC inline chain notation (character suffixes like `o,2` appended to note strings) is supported.

## Project

A **reimplementation of [Sompyler](../sompyler/)** as a progressive web app. End goal: a single static page hosted on GitHub Pages where a user can author instruments and scores, render them to audio entirely client-side, play the result, iterate, and persist their work in IndexedDB.

## Hard constraints

- **Static site, GitHub Pages host.** No server, no API, no build step that depends on runtime services.
- **Client-side persistence only.** IndexedDB for scores, instruments, rendered audio, and any cache.
- **PWA.** Service worker for offline use; a web app manifest; installable.
- **Audio rendering happens in the browser.** Web Audio API (`OfflineAudioContext`). No native binaries.
- **No database/schema migration code** while version < 1.0.0. Drop and recreate on schema changes.

## Commands

```sh
npm run dev              # Vite dev server
npm run build            # tsc --noEmit && vite build
npm run typecheck        # tsc --noEmit
npm run test:unit        # vitest --run (excludes conformance/)
npm run test:conformance # vitest --run src/conformance
```

Single test file:
```sh
node_modules/.bin/vitest run src/parse/score.test.ts
```

Ad-hoc TypeScript script:
```sh
node_modules/.bin/vite-node <script.ts>   # script must live inside the project root
```

## Architecture

### Render pipeline

Two render paths exist; both are triggered from `src/session/Session.ts`:

1. **JS core** (`core` ≠ `'python'`): `renderAll` → `mixOnly` → `Player.loadBuffer`
   - `renderAll.ts`: builds `DistinctNote[]` from parsed score, farms per-note synthesis to a Web Worker pool (`pool.ts` → `synth/worker.ts`)
   - `mixOnly` (`mix.ts`): assembles rendered buffers into stereo PCM, applies room reverb if present

2. **Python core** (`core === 'python'`, triggered by `.splt` file with `python-core` marker):
   - `startRender()` calls `renderScorePython.ts` which spins up a Pyodide worker
   - The worker receives the raw `.spls`, all `.spli` bodies, and optionally a `.splr` body
   - Python's `play()` function does everything (parsing, synthesis, mixing) and returns stereo Float32Arrays
   - `startSoloRender()` (instrument preview) stays on the per-note `renderAllPython.ts` path regardless of core setting

### Score parsing (`src/parse/`)

- `score.ts` — `parseScore()` / `walkMeasures()`: YAML multi-doc parse → `RawNote[]` generator
  - `walkMeasures` handles: `_meta` inheritance, `voice: true` inheritance, `repeat_unmentioned_voices`, `skip`, `is_last`, `cut`, off-scale flags (`?`/`!`), `expandOffsetKey` (comma lists, `start+step*count`)
- `instrument.ts` — parses `.spli` YAML into `Instrument` shape
- `room.ts` — parses `.splr` YAML; returns `null` for freeverb-only rooms (Python path renders dry)
- `position.ts` — pitch/frequency math, RFC intonation
- `tuning.ts` — `tuning_config:` processing (web-only extension, stripped before Python handoff)
- `multimeasure.ts` — multi-measure note expansion

### Synthesis (`src/synth/`)

JS synthesis path: `compile.ts` turns an `Instrument` into a `CompiledInstrument`; `sound_generator.ts` synthesises a single note. Supporting modules: `envelope.ts`, `oscillator.ts`, `shape/` (Bézier shape renderer), `filter.ts`, `lfo.ts`, `variation.ts`, `freeverb.ts`.

### Python core (`public/python-core/`)

**Files in `public/python-core/Sompyler/` are verbatim copies from `../sompyler/`**, updated by copying, not editing.

**Exception: `public/python-core/Sompyler/__init__.py`** is a sompyler-web shim. It defines the no-op `Progress` class (monitor interface) and the `FROM_BASE_DIR` helper. This file does NOT exist in the Python repo in this form — it can be edited freely.

Entry scripts (`render_note.py`, `render_score.py`) are also sompyler-web owned, not verbatim.

The Pyodide worker (`src/workers/pyodideWorker.ts`) loads `manifest.json` to know which Python files to fetch, then runs the entry scripts with globals pre-set.

### `stripScoreBodyForPython()` (`src/render/renderScorePython.ts`)

Pre-processes score YAML before sending to Python. Currently strips:
- `tuning_config:` from the head doc (web-only extension; Python raises `ScoreError` on unknown meta)

Web-only instrument keys (`LFO`, `VCF`, `UNISON`, `amp`) are stripped per-instrument in `stripInstrumentBody()`.

### Storage (`src/storage/`)

- `db.ts` — IndexedDB schema and store accessors
- `files.ts` — CRUD for `.spls`, `.spli`, `.splr`, `.splt` files
- `notes.ts` — per-note rendered buffer cache (keyed by content hash)
- `snapshots.ts`, `zip.ts` — project snapshot/export

### UI (`src/ui/`, `src/editor/`)

SolidJS components. `Editor.tsx` wraps CodeMirror with YAML highlighting and lint. `Session.ts` is the central state machine that coordinates file load, render, and playback.

## Reference implementation

When porting a feature:
1. Read `../sompyler/doc/rfc.md` for the spec.
2. Read the Python in `../sompyler/Sompyler/score/` (parsing), `Sompyler/synthesizer/` (DSP), `Sompyler/orchestra/instrument/` (instrument compilation).
3. Use `../sompyler/test_examples/*.spls` as cross-implementation conformance inputs.

Sample-accurate parity is not a goal. Semantic parity (same notes, same timings, audibly the same result) is.
