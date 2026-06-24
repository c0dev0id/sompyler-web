import { log } from '../debug'
import { putFile, type FileExtension, type StoredFile } from '../storage/files'

const DEFAULT_DELAY_MS = 500

/**
 * R14: autosave-only. There's no Save button and no dirty UI. Edits flow
 * straight into Storage via this debounced writer. Each editor owns its
 * own writer (one per open file).
 */
export function makeAutosaver(
  name: string,
  ext: FileExtension,
  delayMs: number = DEFAULT_DELAY_MS,
): {
  schedule: (body: string, inProject: boolean) => void
  flush: () => Promise<void>
  cancel: () => void
} {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: { body: string; inProject: boolean } | undefined
  let inFlight: Promise<StoredFile> | undefined

  async function write() {
    if (!pending) return
    const snapshot = pending
    pending = undefined
    timer = undefined
    try {
      inFlight = putFile({ name, ext, body: snapshot.body, inProject: snapshot.inProject })
      await inFlight
    } catch (err) {
      log('storage', 'error', `Autosave failed for ${name}.${ext}`, err)
    } finally {
      inFlight = undefined
    }
  }

  function schedule(body: string, inProject: boolean): void {
    pending = { body, inProject }
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(write, delayMs)
  }

  async function flush(): Promise<void> {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
      await write()
    }
    if (inFlight) await inFlight
  }

  function cancel(): void {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    pending = undefined
  }

  return { schedule, flush, cancel }
}
