import { FILES_STORE, txStore, wrapRequest } from './db'

export type FileExtension = 'spls' | 'spli' | 'splt' | 'splr'

export interface StoredFile {
  id: string
  name: string
  ext: FileExtension
  body: string
  inProject: boolean
  mtime: number
  history?: unknown
}

function makeId(name: string, ext: FileExtension): string {
  return `${name}.${ext}`
}

export async function putFile(
  file: Omit<StoredFile, 'id' | 'mtime'> & { mtime?: number },
): Promise<StoredFile> {
  const record: StoredFile = {
    id: makeId(file.name, file.ext),
    name: file.name,
    ext: file.ext,
    body: file.body,
    inProject: file.inProject,
    mtime: file.mtime ?? Date.now(),
  }
  const store = await txStore(FILES_STORE, 'readwrite')
  await wrapRequest(store.put(record))
  return record
}

export async function getFile(name: string, ext: FileExtension): Promise<StoredFile | undefined> {
  const store = await txStore(FILES_STORE, 'readonly')
  return wrapRequest(store.get(makeId(name, ext)))
}

export async function getFileById(id: string): Promise<StoredFile | undefined> {
  const store = await txStore(FILES_STORE, 'readonly')
  return wrapRequest(store.get(id))
}

export async function listFiles(): Promise<StoredFile[]> {
  const store = await txStore(FILES_STORE, 'readonly')
  return wrapRequest(store.getAll())
}

export async function listProjectFiles(ext?: FileExtension): Promise<StoredFile[]> {
  const all = await listFiles()
  return all.filter((f) => f.inProject && (ext === undefined || f.ext === ext))
}

export async function deleteFile(name: string, ext: FileExtension): Promise<void> {
  const store = await txStore(FILES_STORE, 'readwrite')
  await wrapRequest(store.delete(makeId(name, ext)))
}

export async function setInProject(
  name: string,
  ext: FileExtension,
  inProject: boolean,
): Promise<StoredFile> {
  const existing = await getFile(name, ext)
  if (!existing) {
    throw new Error(`File not found: ${makeId(name, ext)}`)
  }
  return putFile({ ...existing, inProject, mtime: Date.now() })
}
