# sompyler-web

Browser-native reimplementation of [Sompyler](../sompyler/) as a progressive web app.

Author instruments and scores, render them to audio client-side, listen, iterate.
No backend, no native binaries. Persists in IndexedDB. Installable.

## Development

```sh
npm install
npm run dev        # vite dev server
npm run build      # production build (typechecks first)
npm run preview    # preview the production build
npm run test       # vitest
npm run typecheck  # tsc --noEmit
```

Architecture, design decisions, and per-phase deliverables are tracked in
`/home/sdk/.claude/plans/noble-imagining-treehouse.md` (the live planning
document) and summarised in `.github/development-journal.md`.

## Reference

The Python implementation under `../sompyler/` is the canonical reference.
The shared language specification is `../sompyler/doc/rfc.md`.
