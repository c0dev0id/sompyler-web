import { InstrumentError } from '../errors'

/**
 * Variation graph for instrument definitions.
 * Reference: `Sompyler/orchestra/instrument/variation.py`.
 * Spec: RFC §S32100 (variations), §S32122 (label references with `@`),
 * §S32200 (gradual variation by note property).
 *
 * Sompyler instruments declare a `character` block — a list of mappings
 * keyed either by:
 *   1. a numeric key (e.g. `27:`, `49:`) — a *variation* selected by the
 *      gradual ATTR (pitch / stress / length) declared on a sibling.
 *   2. an identifier (e.g. `edb65p01:`, `bumpslope:`) — a *label spec*
 *      that other entries can reference via `@labelname` in their values
 *      (mostly inside `PROFILE` lists).
 *
 * Phase 10 ships the cycle-detector + a thin variation picker. The
 * cycle-detector is what S32122 explicitly requires; the picker just
 * gives `compileInstrument()` a single label-resolved spec to render
 * from. Per-attribute interpolation (S32200) lands in Phase 12.
 */

const LABEL_REF_RX = /@([a-z]\w+)/g
const LABEL_REF_RX_BRACE = /\{([a-z]\w+)\}/g

export interface CharacterEntry {
  /**
   * Either a numeric key (frequency / pitch-id / stress / length) or a
   * label identifier.
   */
  key: string
  /** Raw spec body — typed as `unknown` because Sympyler accepts many shapes. */
  spec: Record<string, unknown>
  /** True when `key` parses to a finite number (a variation, not a label). */
  isVariation: boolean
  /** Numeric value of `key` when `isVariation` is true; else NaN. */
  variationValue: number
}

export interface CharacterBlock {
  /**
   * Properties declared on the *root* character entry (the first item if
   * it doesn't have a recognised key form). These apply to every variation.
   */
  root: Record<string, unknown>
  labels: Map<string, CharacterEntry>
  variations: CharacterEntry[]
  /**
   * ATTR token: 'pitch' | 'stress' | 'length' | etc. — drives which
   * note property selects a variation. Defaults to 'pitch' when absent.
   */
  attr: string
}

const ROOT_KEY_TOKENS = new Set([
  'ATTR',
  'A',
  'S',
  'R',
  'O',
  'PROFILE',
  'SPREAD',
  'RAILSBACK_CURVE',
  'TIMBRE',
  'MORPH',
  'VCF',
  'VOLUMES',
  'name',
  'source',
  'character',
])

function isVariationKey(key: string): { ok: boolean; value: number } {
  const n = Number(key)
  return { ok: Number.isFinite(n), value: n }
}

/**
 * Build the character block from a parsed instrument body. Accepts both
 * `character: [...]` (list of mappings) and `character: {...}` (single
 * mapping) shapes — Sompyler examples use both.
 */
export function parseCharacterBlock(parsed: unknown): CharacterBlock {
  const block: CharacterBlock = {
    root: {},
    labels: new Map(),
    variations: [],
    attr: 'pitch',
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return block
  const obj = parsed as Record<string, unknown>
  const raw = obj.character
  if (!raw) return block

  const entries: Record<string, unknown>[] = []
  if (Array.isArray(raw)) {
    for (const e of raw) {
      if (e && typeof e === 'object' && !Array.isArray(e)) {
        entries.push(e as Record<string, unknown>)
      }
    }
  } else if (typeof raw === 'object') {
    entries.push(raw as Record<string, unknown>)
  }

  for (const entry of entries) {
    for (const [key, value] of Object.entries(entry)) {
      if (key === 'ATTR' && typeof value === 'string') {
        block.attr = value
        continue
      }
      if (ROOT_KEY_TOKENS.has(key)) {
        block.root[key] = value
        continue
      }
      const vKey = isVariationKey(key)
      if (vKey.ok) {
        block.variations.push({
          key,
          spec: (value as Record<string, unknown>) ?? {},
          isVariation: true,
          variationValue: vKey.value,
        })
      } else {
        block.labels.set(key, {
          key,
          spec: (value as Record<string, unknown>) ?? {},
          isVariation: false,
          variationValue: NaN,
        })
      }
    }
  }
  block.variations.sort((a, b) => a.variationValue - b.variationValue)
  return block
}

/**
 * Collect `@labelname` and `{labelname}` references appearing anywhere
 * in the spec values. Sympyler's regex form (`re.findall(r'@([a-z]\w+)', s)`)
 * is faithfully replicated.
 */
function findDependencies(spec: Record<string, unknown>): Set<string> {
  const deps = new Set<string>()
  const visit = (v: unknown): void => {
    if (v == null) return
    if (typeof v === 'string') {
      for (const m of v.matchAll(LABEL_REF_RX)) deps.add(m[1]!)
      for (const m of v.matchAll(LABEL_REF_RX_BRACE)) deps.add(m[1]!)
      return
    }
    if (typeof v === 'number' || typeof v === 'boolean') return
    if (Array.isArray(v)) {
      for (const item of v) visit(item)
      return
    }
    if (typeof v === 'object') {
      for (const [k, vv] of Object.entries(v as Record<string, unknown>)) {
        // Sompyler's find_dependencies inspects dict *keys* for nested dicts
        // (LABEL_REF_RX matches against the key text). Mirror that.
        for (const m of k.matchAll(LABEL_REF_RX)) deps.add(m[1]!)
        visit(vv)
      }
    }
  }
  for (const v of Object.values(spec)) visit(v)
  return deps
}

/**
 * Topological sort with cycle detection.
 * Faithful port of `topological_sort(labeled_specs, lookup)` in
 * `Sompyler/orchestra/instrument/variation.py` — Kahn-style sweep that
 * raises when no acyclic node can be peeled this round (S32122).
 *
 * @returns label names in dependency order (deps before dependents).
 * @throws InstrumentError on a cycle.
 */
export function topologicalSortLabels(labels: Map<string, CharacterEntry>): string[] {
  const labelNames = new Set(labels.keys())
  const deps = new Map<string, Set<string>>()
  for (const [name, entry] of labels) {
    const allDeps = findDependencies(entry.spec)
    // Only count dependencies that target known labels — external refs
    // (e.g. `@pitch`) aren't part of the cycle graph.
    const local = new Set<string>()
    for (const d of allDeps) if (labelNames.has(d) && d !== name) local.add(d)
    deps.set(name, local)
  }

  const sorted: string[] = []
  const remaining = new Map(deps)
  while (remaining.size > 0) {
    let acyclic = false
    for (const [node, edges] of [...remaining]) {
      let blocked = false
      for (const edge of edges) {
        if (remaining.has(edge)) {
          blocked = true
          break
        }
      }
      if (!blocked) {
        acyclic = true
        remaining.delete(node)
        sorted.push(node)
      }
    }
    if (!acyclic) {
      const cycle = [...remaining.keys()].join(', ')
      throw new InstrumentError(
        `Circular dependencies could not be resolved among elements ${cycle}`,
      )
    }
  }
  return sorted
}

export interface NoteSelector {
  /** Note property value used to pick a variation (e.g. pitch in Hz). */
  attrValue: number
}

/**
 * Pick the variation whose key is closest to (and ≤ where possible) the
 * note's attribute value. Falls back to the root spec if no variations
 * exist. Mirrors `variation.sound_generator_for(note)` lookup semantics.
 */
export function pickVariation(
  block: CharacterBlock,
  selector: NoteSelector,
): CharacterEntry | null {
  if (block.variations.length === 0) return null
  let best: CharacterEntry | null = null
  let bestDelta = Infinity
  for (const v of block.variations) {
    const delta = Math.abs(v.variationValue - selector.attrValue)
    if (delta < bestDelta) {
      best = v
      bestDelta = delta
    }
  }
  return best
}

/**
 * Validate the variation graph for cycles. Returns the labels in dep
 * order on success; throws InstrumentError on a cycle (S32122).
 */
export function validateVariationGraph(block: CharacterBlock): string[] {
  return topologicalSortLabels(block.labels)
}
