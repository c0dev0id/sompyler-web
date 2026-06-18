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
