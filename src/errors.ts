export class SompylerError extends Error {
  constructor(message: string, public context?: unknown) {
    super(message)
    this.name = this.constructor.name
  }
}

export class ScoreError extends SompylerError {}
export class TuningError extends SompylerError {}
export class InstrumentError extends SompylerError {}
export class StorageError extends SompylerError {}

/**
 * Thrown when a pitch falls outside the active scale and was *not* flagged
 * `?` (snap) or `!` (force-literal). Surfaces through the render pipeline
 * as a CodeMirror inline diagnostic (R6, S53400). Ported from
 * `Sompyler/intonation.py::ToneOffScaleError`.
 */
export class OffScaleError extends SompylerError {}
