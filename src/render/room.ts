/**
 * Phase 5: room / position model.
 *
 * v1 ships only `FreeField` — equivalent to Sompyler's `FreeField` class
 * (`Sompyler/shapereverb.py:8`). Each voice has a panorama (`L|R`) and a
 * distance; both reduce to a pair of channel gains. No convolution reverb yet
 * — the `Room` impulse-response model (R8, `lib/rooms/*.splr`) is deferred to
 * a later phase. Mix-only is therefore a pure additive sum into two channels.
 *
 * Reference: `Sompyler/score/stage.py:Voice.__init__` and
 * `Sompyler/shapereverb.py:FreeField.Position.apply_reverb_to_sound`.
 */
import { ScoreError } from '../errors'

export interface ChannelGains {
  left: number
  right: number
  /** Reverb tail length in samples. Always 0 for FreeField. */
  tailSamples: number
}

const DIRECTION_RX = /^(\d+(?:\.\d+)?)\|(\d+(?:\.\d+)?)$/

/**
 * Resolve a stage spec to per-channel gains.
 *
 * Mirrors `Voice.__init__` with the default space `0|1:0` (minvol=0,
 * vardir=1, framedir=0), which is what every test fixture uses:
 *
 *   intensity = 1 / (1 + distance)
 *   panorama  = normalised(L, R) so max(L, R) = 1
 *
 * `distance >= 0`. Negative distances are non-physical; we clamp to 0.
 */
export function freeFieldGains(direction: string, distance: number): ChannelGains {
  const m = DIRECTION_RX.exec(direction)
  if (!m) {
    throw new ScoreError(`Stage direction must be 'L|R', got '${direction}'`)
  }
  const left = parseFloat(m[1]!)
  const right = parseFloat(m[2]!)
  const both = left + right
  if (both === 0) return { left: 0, right: 0, tailSamples: 0 }
  const intensity = 1 / (1 + Math.max(0, distance))
  const max = Math.max(left, right)
  return {
    left: (left / max) * intensity,
    right: (right / max) * intensity,
    tailSamples: 0,
  }
}
