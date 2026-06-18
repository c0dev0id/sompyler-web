import { txStore, PREFS_STORE, wrapRequest } from './db'

interface PrefRecord {
  key: string
  value: unknown
}

export async function getPref<T>(key: string, fallback: T): Promise<T> {
  const store = await txStore(PREFS_STORE, 'readonly')
  const rec = (await wrapRequest(store.get(key))) as PrefRecord | undefined
  return (rec?.value as T) ?? fallback
}

export async function setPref<T>(key: string, value: T): Promise<void> {
  const store = await txStore(PREFS_STORE, 'readwrite')
  await wrapRequest(store.put({ key, value } satisfies PrefRecord))
}
