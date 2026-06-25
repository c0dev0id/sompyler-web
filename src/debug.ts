export type LogCategory =
  | 'parse'
  | 'render'
  | 'mix'
  | 'storage'
  | 'player'
  | 'session'
  | 'worker'
  | 'python-core'

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  ts: number
  category: LogCategory
  level: LogLevel
  message: string
  payload?: unknown
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
}

const DEFAULT_THRESHOLD: LogLevel = 'info'

const thresholds: Partial<Record<LogCategory, LogLevel>> = {}
let globalThreshold: LogLevel = DEFAULT_THRESHOLD

const RING_CAPACITY = 5000
const ring: LogEntry[] = []
let ringNext = 0
let ringSize = 0

const subscribers = new Set<(entry: LogEntry) => void>()

export function setThreshold(category: LogCategory | '*', level: LogLevel): void {
  if (category === '*') globalThreshold = level
  else thresholds[category] = level
}

function shouldLog(category: LogCategory, level: LogLevel): boolean {
  const t = thresholds[category] ?? globalThreshold
  return LEVEL_ORDER[level] >= LEVEL_ORDER[t]
}

const CONSOLE_FN: Record<LogLevel, (message?: unknown, ...args: unknown[]) => void> = {
  trace: console.debug.bind(console),
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
}

export function log(
  category: LogCategory,
  level: LogLevel,
  message: string,
  payload?: unknown,
): void {
  if (!shouldLog(category, level)) return

  const entry: LogEntry = { ts: Date.now(), category, level, message, payload }

  ring[ringNext] = entry
  ringNext = (ringNext + 1) % RING_CAPACITY
  if (ringSize < RING_CAPACITY) ringSize++

  const prefix = `[${category}]`
  if (payload === undefined) CONSOLE_FN[level](prefix, message)
  else CONSOLE_FN[level](prefix, message, payload)

  for (const sub of subscribers) sub(entry)
}

export function subscribe(fn: (entry: LogEntry) => void): () => void {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}

export function snapshot(): LogEntry[] {
  if (ringSize < RING_CAPACITY) return ring.slice(0, ringSize)
  return [...ring.slice(ringNext), ...ring.slice(0, ringNext)]
}

export function downloadLog(): void {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          meta: {
            ts: new Date().toISOString(),
            userAgent: navigator.userAgent,
            version: __APP_VERSION__,
          },
          entries: snapshot(),
        },
        null,
        2,
      ),
    ],
    { type: 'application/json' },
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sompyler-debug-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
