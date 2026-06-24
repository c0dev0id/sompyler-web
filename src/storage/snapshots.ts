import { getPref, setPref } from './prefs'

export interface Snapshot {
  body: string
  ts: number
}

const MAX = 10

function key(fileId: string): string {
  return `snap.${fileId}`
}

export async function takeSnapshot(fileId: string, body: string): Promise<void> {
  const existing = await getPref<Snapshot[]>(key(fileId), [])
  if (existing.length > 0 && existing[0]!.body === body) return
  await setPref(key(fileId), [{ body, ts: Date.now() }, ...existing].slice(0, MAX))
}

export async function getSnapshots(fileId: string): Promise<Snapshot[]> {
  return getPref<Snapshot[]>(key(fileId), [])
}
