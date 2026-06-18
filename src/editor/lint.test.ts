import { describe, it, expect } from 'vitest'
import { EditorState, type Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { forceLinting, diagnosticCount } from '@codemirror/lint'
import { makeLinter } from './lint'

function makeView(doc: string, ext: Extension): EditorView {
  return new EditorView({
    state: EditorState.create({ doc, extensions: [ext] }),
  })
}

async function waitForLint(view: EditorView): Promise<void> {
  forceLinting(view)
  await new Promise((r) => setTimeout(r, 0))
  await new Promise((r) => setTimeout(r, 0))
}

describe('makeLinter for .spls', () => {
  it('flags YAML syntax errors', async () => {
    const linterExt = makeLinter('spls', { instrumentNames: () => new Set() })
    const view = makeView('stage: [unbalanced', linterExt)
    await waitForLint(view)
    expect(diagnosticCount(view.state)).toBeGreaterThan(0)
  })

  it('warns when an instrument reference is unknown', async () => {
    const linterExt = makeLinter('spls', { instrumentNames: () => new Set() })
    const view = makeView(
      'stage:\n  piano: 1|1 0 dev/piano\n---\npiano:\n  0: A4 1\n',
      linterExt,
    )
    await waitForLint(view)
    expect(diagnosticCount(view.state)).toBeGreaterThan(0)
  })

  it('accepts a score whose instrument is in the project', async () => {
    const linterExt = makeLinter('spls', { instrumentNames: () => new Set(['dev/piano']) })
    const view = makeView(
      'stage:\n  piano: 1|1 0 dev/piano\n---\npiano:\n  0: A4 1\n',
      linterExt,
    )
    await waitForLint(view)
    expect(diagnosticCount(view.state)).toBe(0)
  })

  it('passes on a valid .spli', async () => {
    const linterExt = makeLinter('spli', { instrumentNames: () => new Set() })
    const view = makeView('oscillator: sin\nenvelope: A.S.R\n', linterExt)
    await waitForLint(view)
    expect(diagnosticCount(view.state)).toBe(0)
  })

  it('flags YAML errors on a .spli', async () => {
    const linterExt = makeLinter('spli', { instrumentNames: () => new Set() })
    const view = makeView('oscillator: [', linterExt)
    await waitForLint(view)
    expect(diagnosticCount(view.state)).toBeGreaterThan(0)
  })
})
