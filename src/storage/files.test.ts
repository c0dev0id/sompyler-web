import { describe, it, expect, beforeEach } from 'vitest'
import { resetForTests } from './db'
import {
  putFile,
  getFile,
  listFiles,
  listProjectFiles,
  setInProject,
  deleteFile,
} from './files'

beforeEach(async () => {
  await resetForTests()
})

describe('files storage', () => {
  it('round-trips a file', async () => {
    await putFile({ name: 'piano', ext: 'spli', body: 'oscillator: sin', inProject: true })
    const got = await getFile('piano', 'spli')
    expect(got?.body).toBe('oscillator: sin')
    expect(got?.inProject).toBe(true)
  })

  it('lists in-project files filtered by extension', async () => {
    await putFile({ name: 'song', ext: 'spls', body: '', inProject: true })
    await putFile({ name: 'piano', ext: 'spli', body: '', inProject: true })
    await putFile({ name: 'organ', ext: 'spli', body: '', inProject: false })
    const projectInstruments = await listProjectFiles('spli')
    expect(projectInstruments.map((f) => f.name)).toEqual(['piano'])
  })

  it('toggles inProject', async () => {
    await putFile({ name: 'organ', ext: 'spli', body: '', inProject: false })
    const after = await setInProject('organ', 'spli', true)
    expect(after.inProject).toBe(true)
  })

  it('deletes files', async () => {
    await putFile({ name: 'gone', ext: 'spli', body: '', inProject: false })
    await deleteFile('gone', 'spli')
    expect(await getFile('gone', 'spli')).toBeUndefined()
    expect(await listFiles()).toHaveLength(0)
  })
})
