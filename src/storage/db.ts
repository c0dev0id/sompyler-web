import { log } from '../debug'
import { StorageError } from '../errors'

const DB_NAME = 'sompyler'
const DB_VERSION = 1

export const FILES_STORE = 'files'
export const NOTES_STORE = 'notes'
export const PREFS_STORE = 'prefs'

let dbPromise: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        db.createObjectStore(FILES_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        db.createObjectStore(NOTES_STORE, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(PREFS_STORE)) {
        db.createObjectStore(PREFS_STORE, { keyPath: 'key' })
      }
    }
    req.onerror = () => {
      log('storage', 'error', 'IndexedDB open failed', req.error)
      reject(new StorageError('IndexedDB open failed', req.error))
    }
    req.onsuccess = () => resolve(req.result)
  })
  return dbPromise
}

export async function getDB(): Promise<IDBDatabase> {
  return open()
}

export function wrapRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(new StorageError(req.error?.message ?? 'idb error', req.error))
  })
}

export async function txStore(
  storeName: string,
  mode: IDBTransactionMode,
): Promise<IDBObjectStore> {
  const db = await open()
  return db.transaction(storeName, mode).objectStore(storeName)
}

export const resetDatabase = resetForTests

export async function resetForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise
    db.close()
    dbPromise = null
  }
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => resolve()
  })
}
