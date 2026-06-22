# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical project rules

- **Always** check RFC conformance with ../sompyler/doc/rfc.md
- **Must** support RFC specified syntax (existing sompyler must work)
- **Must** follow existing syntax conventions when adding new features
- **Do not** implement features flagged as experimental in the RFC
- **Do not** create syntax aliases
- Sompyler-web **must** create the same output as python sompyler on the same input


## Project

A **reimplementation of [Sompyler](../sompyler/)** as a progressive web app. End goal: a single static page hosted on GitHub Pages where a user can author instruments and scores, render them to audio entirely client-side, play the result, iterate, and persist their work in IndexedDB. The full create → render → listen → fix cycle happens in the browser, with no backend.

This repository is currently empty — no stack has been committed yet. When making the first scaffolding decisions, present options and wait for the user to choose. Do not introduce a framework, bundler, or library without explicit approval.

## Hard constraints

- **Static site, GitHub Pages host.** No server, no API, no build step that depends on runtime services.
- **Client-side persistence only.** IndexedDB for scores, instruments, rendered audio, and any cache. No `localStorage` for binary data.
- **PWA.** Service worker for offline use; a web app manifest; installable.
- **Audio rendering happens in the browser.** Web Audio API (`OfflineAudioContext` for non-realtime rendering, `AudioWorklet` if a streaming/interactive path is added later). No native binaries, no WASM-from-FFmpeg.
- **Minimalist stack.** The user values low latency, small bundles, and clean architecture over feature richness. Prefer the smaller/faster option when two are otherwise equal. Exhaust browser-native APIs before adding a dependency.
- **No database/schema migration code** while version < 1.0.0. If the IndexedDB schema changes during development, drop and recreate; don't write migration scaffolding.

## Reference implementation

The Python implementation in `../sompyler/` is the working reference. When porting a feature:

1. **Read the spec first.** The canonical language spec is `../sompyler/doc/rfc.md`. Cite section numbers (e.g. `S32119-waveshape`) in commits and PR descriptions when implementing a spec-defined behaviour.
2. **Then read the Python.** Useful entry points:
   - `Sompyler/score/` — `.spls` parsing.
   - `Sompyler/orchestra/instrument/` — `.spli` compilation and variation unification.
   - `Sompyler/synthesizer/` — oscillators, envelopes, modulation, bezier shape evaluation.
   - `Sompyler/intonation.py` — pitch, scale, tuning, microtuning.
3. **Conformance fixtures.** Use `../sompyler/test_examples/*.spls` as cross-implementation test inputs once a rendering path exists. Sample-accurate parity with the Python output is *not* a goal — semantic parity (same notes, same instruments, audibly the same musical result) is.

When the spec and the Python implementation disagree, **ask the user** which is the ground truth before deciding.

## Domain vocabulary

`.spls` (score), `.spli` (instrument), `.splr` (room), `.splt` (tones / scale). These extensions and the YAML/JSON encoding underneath them carry over from the Python project. The user calls the underlying approach "Neusik" or RDM (*Radically Descriptive Model*).

## Commands

*Populated as the stack solidifies.* When tooling is added, document at minimum: dev server, production build, type-check, lint, unit tests, single-test invocation.
