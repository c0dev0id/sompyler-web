import { NOTES_STORE, txStore, wrapRequest } from './db'

export interface CachedNote {
  key: string
  pcm: Float32Array
  sampleRate: number
  mtime: number
}

export async function putNote(note: Omit<CachedNote, 'mtime'>): Promise<void> {
  const record: CachedNote = { ...note, mtime: Date.now() }
  const store = await txStore(NOTES_STORE, 'readwrite')
  await wrapRequest(store.put(record))
}

export async function getNote(key: string): Promise<CachedNote | undefined> {
  const store = await txStore(NOTES_STORE, 'readonly')
  return wrapRequest(store.get(key))
}

export async function hasNote(key: string): Promise<boolean> {
  const store = await txStore(NOTES_STORE, 'readonly')
  return (await wrapRequest(store.count(IDBKeyRange.only(key)))) > 0
}

export async function listNoteKeys(): Promise<string[]> {
  const store = await txStore(NOTES_STORE, 'readonly')
  return wrapRequest(store.getAllKeys()) as Promise<string[]>
}

export async function deleteNote(key: string): Promise<void> {
  const store = await txStore(NOTES_STORE, 'readwrite')
  await wrapRequest(store.delete(key))
}

/** Delete every cached note whose key is not in the keep set. */
export async function orphanSweep(keep: ReadonlySet<string>): Promise<number> {
  const allKeys = await listNoteKeys()
  let removed = 0
  for (const key of allKeys) {
    if (!keep.has(key)) {
      await deleteNote(key)
      removed++
    }
  }
  return removed
}
