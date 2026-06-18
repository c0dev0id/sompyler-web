import { describe, it, expect } from 'vitest'
import { writeWav } from './wav'

function asciiAt(view: DataView, offset: number, length: number): string {
  let s = ''
  for (let i = 0; i < length; i++) s += String.fromCharCode(view.getUint8(offset + i))
  return s
}

describe('writeWav', () => {
  it('writes a valid RIFF / WAVE / fmt / data header (stereo)', () => {
    const left = new Float32Array([0, 0.5, -0.5, 1])
    const right = new Float32Array([0, -0.5, 0.5, -1])
    const buf = writeWav({ sampleRate: 44100, channels: [left, right] })
    const view = new DataView(buf)

    expect(asciiAt(view, 0, 4)).toBe('RIFF')
    expect(asciiAt(view, 8, 4)).toBe('WAVE')
    expect(asciiAt(view, 12, 4)).toBe('fmt ')
    expect(asciiAt(view, 36, 4)).toBe('data')
    expect(view.getUint16(20, true)).toBe(1) // PCM
    expect(view.getUint16(22, true)).toBe(2) // channels
    expect(view.getUint32(24, true)).toBe(44100) // sample rate
    expect(view.getUint16(34, true)).toBe(16) // bits/sample
    expect(view.getUint32(40, true)).toBe(4 * 2 * 2) // data size
  })

  it('handles mono', () => {
    const left = new Float32Array([0, 0.5, 1])
    const buf = writeWav({ sampleRate: 22050, channels: [left] })
    const view = new DataView(buf)
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(22050)
    expect(view.getUint32(40, true)).toBe(3 * 2)
  })

  it('clips out-of-range samples to [-1, 1]', () => {
    const buf = writeWav({
      sampleRate: 44100,
      channels: [new Float32Array([2, -2])],
    })
    const view = new DataView(buf)
    expect(view.getInt16(44, true)).toBe(0x7fff)
    expect(view.getInt16(46, true)).toBe(-0x8000)
  })

  it('round-trips a known sample value', () => {
    const buf = writeWav({
      sampleRate: 44100,
      channels: [new Float32Array([0.5])],
    })
    const view = new DataView(buf)
    expect(view.getInt16(44, true)).toBe(Math.floor(0.5 * 0x7fff))
  })

  it('rejects mismatched channel lengths', () => {
    expect(() =>
      writeWav({
        sampleRate: 44100,
        channels: [new Float32Array(10), new Float32Array(11)],
      }),
    ).toThrow(/channel lengths/i)
  })
})
