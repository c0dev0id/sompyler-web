export interface PositionPath {
  file?: string
  measure?: string
  voice?: string
  offset?: number | string
  chord?: number
  stem?: number
  position?: number
  article?: string
}

/**
 * R-ErrorCtx: tracks the parser's descent through the score tree so render
 * errors can be reported as `(file, voice, measure, chord, note)`.
 */
export class PositionStack {
  private frames: PositionPath[] = [{}]

  push(scope: Partial<PositionPath>): void {
    this.frames.push({ ...this.current(), ...scope })
  }

  pop(): void {
    if (this.frames.length > 1) this.frames.pop()
  }

  current(): PositionPath {
    return this.frames[this.frames.length - 1]!
  }

  with<T>(scope: Partial<PositionPath>, fn: () => T): T {
    this.push(scope)
    try {
      return fn()
    } finally {
      this.pop()
    }
  }

  async withAsync<T>(scope: Partial<PositionPath>, fn: () => Promise<T>): Promise<T> {
    this.push(scope)
    try {
      return await fn()
    } finally {
      this.pop()
    }
  }

  format(): string {
    const p = this.current()
    const parts: string[] = []
    if (p.file) parts.push(p.file)
    if (p.measure !== undefined) parts.push(`m=${p.measure}`)
    if (p.voice !== undefined) parts.push(`v=${p.voice}`)
    if (p.offset !== undefined) parts.push(`o=${p.offset}`)
    if (p.chord !== undefined) parts.push(`c=${p.chord}`)
    if (p.stem !== undefined) parts.push(`s=${p.stem}`)
    if (p.position !== undefined) parts.push(`p=${p.position}`)
    if (p.article !== undefined) parts.push(`a=${p.article}`)
    return parts.join('.')
  }
}
