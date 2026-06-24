import { describe, it, expect, beforeEach } from 'vitest'
import { makeAutosaver } from './autosave'
import { getFile } from '../storage/files'
import { resetForTests } from '../storage/db'

beforeEach(async () => {
  await resetForTests()
})

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('makeAutosaver', () => {
  it('debounces writes to Storage', async () => {
    const saver = makeAutosaver('song', 'spls', 30)
    saver.schedule('first', true, null)
    saver.schedule('second', true, null)
    saver.schedule('third', true, null)

    expect(await getFile('song', 'spls')).toBeUndefined()
    await wait(80)
    await saver.flush()

    const stored = await getFile('song', 'spls')
    expect(stored?.body).toBe('third')
  })

  it('flush forces an immediate write', async () => {
    const saver = makeAutosaver('song', 'spls', 10_000)
    saver.schedule('hello', true, null)
    await saver.flush()
    expect((await getFile('song', 'spls'))?.body).toBe('hello')
  })

  it('cancel discards the pending edit', async () => {
    const saver = makeAutosaver('song', 'spls', 30)
    saver.schedule('hello', true, null)
    saver.cancel()
    await wait(80)
    await saver.flush()
    expect(await getFile('song', 'spls')).toBeUndefined()
  })

  it('preserves inProject across writes', async () => {
    const saver = makeAutosaver('song', 'spls', 5)
    saver.schedule('body', false, null)
    await wait(30)
    await saver.flush()
    expect((await getFile('song', 'spls'))?.inProject).toBe(false)
  })
})
