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
