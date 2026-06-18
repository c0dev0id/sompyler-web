import { describe, it, expect, vi } from 'vitest'
import { Pool, type WorkerHandle } from './pool'

function syncWorker<I, O>(fn: (input: I) => O | Promise<O>): WorkerHandle<I, O> {
  return {
    async submit(input) {
      return await fn(input)
    },
    terminate() {
      // no-op
    },
  }
}

describe('Pool', () => {
  it('runs jobs in parallel up to pool size', async () => {
    let active = 0
    let peak = 0
    const factory = () =>
      syncWorker<number, number>(async (n) => {
        active++
        peak = Math.max(peak, active)
        await new Promise((r) => setTimeout(r, 5))
        active--
        return n * 2
      })

    const pool = new Pool(factory, 3)
    const out = await Promise.all([1, 2, 3, 4, 5, 6].map((n) => pool.submit(n)))
    expect(out).toEqual([2, 4, 6, 8, 10, 12])
    expect(peak).toBeLessThanOrEqual(3)
    pool.terminate()
  })

  it('rejects queued jobs when terminated', async () => {
    const factory = () =>
      syncWorker<number, number>(async (n) => {
        await new Promise((r) => setTimeout(r, 50))
        return n
      })
    const pool = new Pool(factory, 1)
    pool.submit(1)
    const queued = pool.submit(2)
    pool.terminate()
    await expect(queued).rejects.toThrow(/terminated/)
  })

  it('calls worker.terminate on every slot', () => {
    const terminate = vi.fn()
    const factory = () =>
      ({
        submit: vi.fn(),
        terminate,
      }) satisfies WorkerHandle<unknown, unknown>
    const pool = new Pool(factory, 4)
    pool.terminate()
    expect(terminate).toHaveBeenCalledTimes(4)
  })
})
