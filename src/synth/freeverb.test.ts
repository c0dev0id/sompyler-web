import { describe, it, expect } from 'vitest'
import { applyFreeverb, type FreeverbBody } from './freeverb'

const SR = 44100

function makeSpec(overrides: Partial<FreeverbBody> = {}): FreeverbBody {
  return {
    kind: 'freeverb',
    roomSize: 0.76,
    damping: 0.45,
    wet: 0.3,
    width: 1.0,
    preDelayMs: 0,
    ...overrides,
  }
}

function rms(arr: Float32Array): number {
  let sum = 0
  for (const v of arr) sum += v * v
  return Math.sqrt(sum / arr.length)
}

function sine(len: number, hz = 440, amp = 0.5): Float32Array {
  const buf = new Float32Array(len)
  for (let i = 0; i < len; i++) buf[i] = amp * Math.sin((2 * Math.PI * hz * i) / SR)
  return buf
}

describe('applyFreeverb', () => {
  it('silence in → silence out', () => {
    const L = new Float32Array(SR)
    const R = new Float32Array(SR)
    applyFreeverb(L, R, makeSpec(), SR)
    expect(rms(L)).toBe(0)
    expect(rms(R)).toBe(0)
  })

  it('produces reverb tail after note ends', () => {
    // 1 s sine, then 1 s silence — reverb tail should persist into second half
    const L = new Float32Array(SR * 2)
    const R = new Float32Array(SR * 2)
    const sig = sine(SR)
    L.set(sig); R.set(sig)
    applyFreeverb(L, R, makeSpec({ wet: 0.5 }), SR)
    expect(rms(L.slice(SR))).toBeGreaterThan(0.001)
    expect(rms(R.slice(SR))).toBeGreaterThan(0.001)
  })

  it('higher roomSize → more energy in late tail', () => {
    function tailEnergy(roomSize: number): number {
      const L = new Float32Array(SR * 4)
      const R = new Float32Array(SR * 4)
      const sig = sine(SR)
      L.set(sig); R.set(sig)
      applyFreeverb(L, R, makeSpec({ roomSize, wet: 0.5 }), SR)
      // Energy in seconds 2-4
      let e = 0
      for (let i = SR; i < SR * 4; i++) e += L[i]! ** 2
      return e
    }
    expect(tailEnergy(0.9)).toBeGreaterThan(tailEnergy(0.5))
  })

  it('produces no NaN or Infinity', () => {
    const L = sine(SR)
    const R = sine(SR, 440, -0.5)
    applyFreeverb(L, R, makeSpec(), SR)
    expect(L.some((v) => !isFinite(v))).toBe(false)
    expect(R.some((v) => !isFinite(v))).toBe(false)
  })

  it('pre-delay shifts reverb onset', () => {
    // With 50ms pre-delay the reverb builds up ~50ms later than with 0ms.
    // Measure RMS in [25ms, 50ms] window — should be higher with no pre-delay.
    const a = Math.round(0.025 * SR)
    const b = Math.round(0.050 * SR)

    const L0 = sine(SR); const R0 = sine(SR)
    applyFreeverb(L0, R0, makeSpec({ wet: 0.5, preDelayMs: 0 }), SR)

    const L50 = sine(SR); const R50 = sine(SR)
    applyFreeverb(L50, R50, makeSpec({ wet: 0.5, preDelayMs: 50 }), SR)

    expect(rms(L0.slice(a, b))).toBeGreaterThan(rms(L50.slice(a, b)))
  })
})
