import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate'
import type { FileExtension, StoredFile } from './files'

/**
 * R9: zip pack/unpack for staging import/export.
 *
 * Archive layout mirrors Sompyler's conventions — flat directory of
 * `name.ext` entries. This round-trips through `scripts/sompyle` on the
 * Python side as long as the score file's `_META.instruments_dir` points
 * at the same directory.
 */

const VALID_EXTS: ReadonlySet<string> = new Set(['spls', 'spli', 'splt', 'splr'])

export interface UnpackedFile {
  name: string
  ext: FileExtension
  body: string
}

function parseEntryName(entry: string): { name: string; ext: FileExtension } | null {
  // Strip leading directory components — flatten the archive.
  const base = entry.split('/').pop() ?? entry
  if (!base) return null
  const dot = base.lastIndexOf('.')
  if (dot <= 0) return null
  const ext = base.slice(dot + 1).toLowerCase()
  if (!VALID_EXTS.has(ext)) return null
  return { name: base.slice(0, dot), ext: ext as FileExtension }
}

export function unpackZip(bytes: Uint8Array): UnpackedFile[] {
  const entries = unzipSync(bytes)
  const out: UnpackedFile[] = []
  for (const [entry, data] of Object.entries(entries)) {
    if (entry.endsWith('/')) continue
    const parsed = parseEntryName(entry)
    if (!parsed) continue
    out.push({ name: parsed.name, ext: parsed.ext, body: strFromU8(data) })
  }
  return out
}

export function packZip(files: StoredFile[]): Uint8Array {
  const entries: Record<string, Uint8Array> = {}
  for (const f of files) {
    entries[`${f.name}.${f.ext}`] = strToU8(f.body)
  }
  return zipSync(entries, { level: 6 })
}
