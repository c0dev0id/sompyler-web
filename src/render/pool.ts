import { log } from '../debug'

/**
 * R4: a generic worker pool with hard cancellation. Each job lives in
 * exactly one worker; cancel terminates every worker and reconstructs
 * the pool on demand.
 *
 * Phase 4 ships this abstract pool; the Web Worker implementation lives
 * in `workerClient.ts`. Tests use a synchronous adapter that calls
 * `renderNote` directly.
 */

export interface WorkerHandle<I, O> {
  submit(input: I): Promise<O>
  terminate(): void
}

export type WorkerFactory<I, O> = () => WorkerHandle<I, O>

interface PendingJob<I, O> {
  input: I
  resolve: (value: O) => void
  reject: (reason: unknown) => void
}

interface PoolSlot<I, O> {
  worker: WorkerHandle<I, O>
  busy: boolean
}

export class Pool<I, O> {
  private slots: PoolSlot<I, O>[] = []
  private queue: PendingJob<I, O>[] = []
  private terminated = false

  constructor(
    private readonly factory: WorkerFactory<I, O>,
    readonly size: number,
  ) {
    for (let i = 0; i < size; i++) {
      this.slots.push({ worker: factory(), busy: false })
    }
  }

  submit(input: I): Promise<O> {
    if (this.terminated) return Promise.reject(new Error('Pool terminated'))
    return new Promise((resolve, reject) => {
      this.queue.push({ input, resolve, reject })
      this.dispatch()
    })
  }

  private dispatch(): void {
    for (const slot of this.slots) {
      if (slot.busy) continue
      const job = this.queue.shift()
      if (!job) return
      slot.busy = true
      slot.worker
        .submit(job.input)
        .then(
          (out) => job.resolve(out),
          (err) => job.reject(err),
        )
        .finally(() => {
          slot.busy = false
          this.dispatch()
        })
    }
  }

  terminate(): void {
    if (this.terminated) return
    this.terminated = true
    log('worker', 'info', `Terminating pool (${this.slots.length} workers)`)
    for (const slot of this.slots) slot.worker.terminate()
    for (const job of this.queue) {
      job.reject(new Error('Pool terminated'))
    }
    this.queue = []
    this.slots = []
  }

  get inFlight(): number {
    return this.slots.filter((s) => s.busy).length
  }

  get queued(): number {
    return this.queue.length
  }
}
