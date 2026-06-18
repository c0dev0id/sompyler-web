const HEX = '0123456789abcdef'

function toHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]!
    out += HEX[b >> 4]! + HEX[b & 0xf]!
  }
  return out
}

export async function sha256(input: string | ArrayBuffer): Promise<string> {
  const data =
    typeof input === 'string' ? new TextEncoder().encode(input) : input
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toHex(digest)
}

export function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJSON).join(',') + ']'
  }
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return (
    '{' +
    keys
      .map((k) => JSON.stringify(k) + ':' + canonicalJSON(obj[k]))
      .join(',') +
    '}'
  )
}

export interface NoteHashInput {
  instrumentHash: string
  frequencyHz: number
  stress: number
  lengthSeconds: number
  properties: Record<string, unknown>
}

export async function noteCacheKey(input: NoteHashInput): Promise<string> {
  const serialized =
    input.instrumentHash +
    '|' +
    input.frequencyHz.toFixed(6) +
    '|' +
    input.stress.toFixed(6) +
    '|' +
    input.lengthSeconds.toFixed(6) +
    '|' +
    canonicalJSON(input.properties)
  return sha256(serialized)
}
