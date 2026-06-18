import { log } from '../debug'
import { getNote } from '../storage/notes'
import type { ScoreHead } from '../parse/score'
import type { DistinctRenderPlan } from './distinct'
import { freeFieldGains, type ChannelGains } from './room'

/**
 * Phase 5: `Render.mixOnly()` — fast path, assumes every distinct note is in
 * the cache. Returns a stereo Float32Array pair (left, right) at a single
 * sample rate.
 *
 * Reference: `Sompyler/orchestra/__init__.py:241–291` (the `samples = ...`
 * loop). We replace per-position convolution reverb with simple panorama
 * gains (R8 — Room reverb is a forward door).
 */

export interface MixOptions {
  sampleRate?: number
}

export interface MixResult {
  sampleRate: number
  lengthSamples: number
  left: Float32Array
  right: Float32Array
}

export class MissingNoteCacheError extends Error {
  constructor(public readonly keys: string[]) {
    super(`Cache miss for ${keys.length} notes; cannot mix without rendering`)
    this.name = 'MissingNoteCacheError'
  }
}

export async function mixOnly(
  plan: DistinctRenderPlan,
  head: ScoreHead,
  opts: MixOptions = {},
): Promise<MixResult> {
  const sampleRate = opts.sampleRate ?? 44100
  const gainsByVoice = new Map<string, ChannelGains>()
  for (const [voice, spec] of Object.entries(head.stage)) {
    // `volume` in our StageVoice is Sompyler's `distance`. See parseStageVoice.
    gainsByVoice.set(voice, freeFieldGains(spec.channels, spec.volume))
  }

  // Pre-load every note. If any is missing, fail fast — no point doing the
  // additive work just to throw at the end.
  const cachedNotes = new Map<string, Float32Array>()
  const missingKeys: string[] = []
  for (const note of plan.notes) {
    const cached = await getNote(note.key)
    if (!cached) missingKeys.push(note.key)
    else cachedNotes.set(note.key, cached.pcm)
  }
  if (missingKeys.length > 0) {
    throw new MissingNoteCacheError(missingKeys)
  }

  const lengthSamples = Math.ceil(plan.totalLengthSeconds * sampleRate)
  const left = new Float32Array(lengthSamples)
  const right = new Float32Array(lengthSamples)

  for (const note of plan.notes) {
    const pcm = cachedNotes.get(note.key)!
    for (const occ of note.occurrences) {
      const gains = gainsByVoice.get(occ.voice)
      if (!gains) continue
      const start = Math.round(occ.offsetSeconds * sampleRate)
      const end = Math.min(start + pcm.length, lengthSamples)
      const span = end - start
      if (span <= 0) continue

      if (gains.left !== 0) {
        for (let i = 0; i < span; i++) {
          left[start + i]! += pcm[i]! * gains.left
        }
      }
      if (gains.right !== 0) {
        for (let i = 0; i < span; i++) {
          right[start + i]! += pcm[i]! * gains.right
        }
      }
    }
  }

  // Clip to [-1, 1] to keep playback safe regardless of overlap density.
  let peak = 0
  for (let i = 0; i < lengthSamples; i++) {
    const l = Math.abs(left[i]!)
    if (l > peak) peak = l
    const r = Math.abs(right[i]!)
    if (r > peak) peak = r
  }
  if (peak > 1) {
    const scale = 1 / peak
    for (let i = 0; i < lengthSamples; i++) {
      left[i] = left[i]! * scale
      right[i] = right[i]! * scale
    }
  }

  log('mix', 'info', `mixOnly complete`, {
    distinct: plan.notes.length,
    lengthSamples,
    peak,
    sampleRate,
  })

  return { sampleRate, lengthSamples, left, right }
}
