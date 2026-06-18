import { describe, it, expect, beforeEach } from 'vitest'
import { resetForTests } from './db'
import { putNote, getNote, hasNote, listNoteKeys, orphanSweep } from './notes'

beforeEach(async () => {
  await resetForTests()
})

describe('notes cache', () => {
  it('round-trips PCM data', async () => {
    const pcm = new Float32Array([0.1, 0.2, 0.3])
    await putNote({ key: 'abc', pcm, sampleRate: 44100 })
    const got = await getNote('abc')
    expect(got?.sampleRate).toBe(44100)
    expect(Array.from(got!.pcm)).toEqual([
      Math.fround(0.1),
      Math.fround(0.2),
      Math.fround(0.3),
    ])
  })

  it('reports presence via hasNote', async () => {
    expect(await hasNote('xxx')).toBe(false)
    await putNote({ key: 'xxx', pcm: new Float32Array(1), sampleRate: 44100 })
    expect(await hasNote('xxx')).toBe(true)
  })

  it('orphan sweep removes keys not in the keep set', async () => {
    for (const k of ['a', 'b', 'c']) {
      await putNote({ key: k, pcm: new Float32Array(1), sampleRate: 44100 })
    }
    const removed = await orphanSweep(new Set(['b']))
    expect(removed).toBe(2)
    expect(await listNoteKeys()).toEqual(['b'])
  })
})
