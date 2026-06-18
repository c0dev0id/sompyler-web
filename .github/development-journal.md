# Development Journal

## Software stack

- **Language**: TypeScript (strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`).
- **UI framework**: Solid 1.9 (fine-grained signals; the framework disappears around imperative APIs like CodeMirror, Web Workers, AudioContext).
- **Build tool**: Vite 6 + `vite-plugin-solid`.
- **PWA tooling**: `vite-plugin-pwa` (Workbox under the hood) with `registerType: 'autoUpdate'`.
- **Editor component**: CodeMirror 6 (`@codemirror/state`, `view`, `lang-yaml`, `lint`, `commands`).
- **YAML parser**: `js-yaml` (used both for editor-side debounced lint and renderer-side fresh parse).
- **Testing**: Vitest 2 with `jsdom` + `fake-indexeddb`.
- **Persistence**: IndexedDB (no `localStorage` for binary data; no migration scaffolding while < 1.0.0).
- **DSP**: pure TS + `Float32Array` typed-array primitives. WASM is a forward door, not a v1 obligation.
- **Cache-key hash**: `SubtleCrypto.digest('SHA-256', ...)` — browser-native, zero deps.
- **Hosting**: GitHub Pages via a GitHub Actions workflow (Phase 9).

## Key decisions

- **Content-addressed per-note cache.** The hash *is* the identity; invalidation is implicit. Cache key includes resolved frequency (Hz), so tuning edits invalidate exactly the notes whose frequency changed.
- **Two-pass render**: synthesis (per-note PCM, persisted to IndexedDB) and mix (stereo buffer, in-memory only). `Render.mixOnly()` is a first-class operation, runs on app load to restore the player without re-synthesising.
- **Staging-area file model.** Every file is either *in staging* or *in project*. At most one `.spls` in-project at a time; arbitrary multiplicity for instruments / tunings / rooms.
- **Modal render dialog** during render (R11). Auto-closes on success.
- **Solid signals as cross-domain state.** Session module hosts three signals (`editLock`, `renderStatus`, `currentBuffer`) in a plain `.ts` module; every domain imports them directly.
- **Debug logging strategy** (R-Debug): structured logger with console + in-memory ring buffer + downloadable JSON dump. No IndexedDB sink in v1 to avoid write contention with the note cache.

## Core features (v1 target)

1. Edit four Sompyler file types (`.spls`, `.spli`, `.splt`, `.splr`) in CodeMirror.
2. Render in the browser via a Web Worker pool — no server, no native binaries.
3. Loop the rendered audio with Play / Pause / Stop / Loop transport.
4. Persist instruments, scores, tunings, rooms, and per-note PCM cache in IndexedDB.
5. Import / export individual files or zip archives.
6. Download the final mix as WAV.
7. Install as a PWA; works offline.

## Reference

- Language spec: `../sompyler/doc/rfc.md`.
- Python reference implementation: `../sompyler/Sompyler/`.
- Architecture plan: `/home/sdk/.claude/plans/noble-imagining-treehouse.md`.
