import type { DistinctRenderPlan } from '../render/distinct'

/**
 * Stable, snapshot-friendly view of a distinct-notes plan. Hashes are
 * intentionally excluded: a hash change for the *same* (freq, stress,
 * length, props) tuple would be a hashing regression, not a renderer
 * regression — and we want this snapshot to survive cosmetic hash-input
 * tweaks. Floats are quantised to keep the diff stable across runs.
 *
 * Phase 15d (R-Test): self-regression — any drift in the walker or in
 * cache-key inputs surfaces as a snapshot diff that a developer reviews
 * intentionally (refresh with `vitest -u`).
 */
export function normalizePlan(plan: DistinctRenderPlan) {
  const notes = plan.notes
    .map((n) => ({
      freq: Number(n.frequencyHz.toFixed(2)),
      stress: Number(n.stress.toFixed(4)),
      length: Number(n.lengthSeconds.toFixed(4)),
      instrument: n.instrumentName,
      properties: n.properties,
      occurrences: n.occurrences
        .map((o) => ({
          voice: o.voice,
          measure: o.measureName,
          offsetTicks: o.offsetTicks,
          offsetSeconds: Number(o.offsetSeconds.toFixed(4)),
        }))
        .sort(
          (a, b) =>
            a.voice.localeCompare(b.voice) ||
            a.measure.localeCompare(b.measure) ||
            a.offsetTicks - b.offsetTicks,
        ),
    }))
    .sort(
      (a, b) =>
        a.freq - b.freq ||
        a.stress - b.stress ||
        a.length - b.length ||
        a.instrument.localeCompare(b.instrument),
    )
  return {
    voices: Array.from(plan.voices).sort(),
    totalLengthSeconds: Number(plan.totalLengthSeconds.toFixed(4)),
    distinctNoteCount: notes.length,
    occurrenceCount: notes.reduce((s, n) => s + n.occurrences.length, 0),
    notes,
  }
}
