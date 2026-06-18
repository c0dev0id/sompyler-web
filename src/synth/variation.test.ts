import { describe, it, expect } from 'vitest'
import jsyaml from 'js-yaml'
import {
  parseCharacterBlock,
  pickVariation,
  topologicalSortLabels,
  validateVariationGraph,
} from './variation'
import { InstrumentError } from '../errors'

function parse(yaml: string) {
  return jsyaml.load(yaml)
}

describe('parseCharacterBlock', () => {
  it('returns an empty block when no character section is present', () => {
    const block = parseCharacterBlock(parse('oscillator: sin'))
    expect(block.variations).toHaveLength(0)
    expect(block.labels.size).toBe(0)
    expect(block.attr).toBe('pitch')
  })

  it('extracts ATTR + variations + labels from a list-shaped character block', () => {
    const yaml = `
character:
  - ATTR: pitch
    O: sin
    edb65p01:
      A: '.24:1,91;2,97;3,100'
    bumpslope:
      S: '5:100;1,92'
    27:
      PROFILE:
        - "74 edb65p01"
    49:
      PROFILE:
        - "83 bumpslope"
`
    const block = parseCharacterBlock(parse(yaml))
    expect(block.attr).toBe('pitch')
    expect(block.root.O).toBe('sin')
    expect(block.labels.has('edb65p01')).toBe(true)
    expect(block.labels.has('bumpslope')).toBe(true)
    expect(block.variations.map((v) => v.variationValue)).toEqual([27, 49])
  })
})

describe('topologicalSortLabels', () => {
  it('orders labels by dependency', () => {
    const yaml = `
character:
  - aa:
      S: 'foo @bb bar'
    bb:
      S: 'baz @cc'
    cc:
      S: 'leaf'
`
    const block = parseCharacterBlock(parse(yaml))
    const order = topologicalSortLabels(block.labels)
    expect(order.indexOf('cc')).toBeLessThan(order.indexOf('bb'))
    expect(order.indexOf('bb')).toBeLessThan(order.indexOf('aa'))
  })

  it('throws on a circular reference (S32122)', () => {
    const yaml = `
character:
  - aa:
      S: 'one @bb'
    bb:
      S: 'two @aa'
`
    const block = parseCharacterBlock(parse(yaml))
    expect(() => topologicalSortLabels(block.labels)).toThrow(InstrumentError)
    try {
      topologicalSortLabels(block.labels)
    } catch (e) {
      expect((e as Error).message).toContain('Circular')
    }
  })

  it('ignores self-references for the purpose of cycle detection', () => {
    // Self-references aren't meaningful as dependencies — they'd otherwise
    // trivially trip the cycle detector.
    const yaml = `
character:
  - foo:
      S: 'self @foo only'
`
    const block = parseCharacterBlock(parse(yaml))
    expect(() => topologicalSortLabels(block.labels)).not.toThrow()
  })

  it('ignores @references that point outside the label set', () => {
    const yaml = `
character:
  - foo:
      S: 'extern @other reference'
`
    const block = parseCharacterBlock(parse(yaml))
    const order = topologicalSortLabels(block.labels)
    expect(order).toEqual(['foo'])
  })
})

describe('pickVariation', () => {
  const yaml = `
character:
  - 27:
      O: sin
    49:
      O: square
    98:
      O: triangle
`
  const block = parseCharacterBlock(parse(yaml))

  it('returns the nearest variation by value', () => {
    expect(pickVariation(block, { attrValue: 30 })?.key).toBe('27')
    expect(pickVariation(block, { attrValue: 60 })?.key).toBe('49')
    expect(pickVariation(block, { attrValue: 200 })?.key).toBe('98')
  })

  it('returns null when there are no variations', () => {
    const empty = parseCharacterBlock(parse('oscillator: sin'))
    expect(pickVariation(empty, { attrValue: 100 })).toBeNull()
  })
})

describe('validateVariationGraph', () => {
  it('passes for a clean instrument body', () => {
    const yaml = `
character:
  - ATTR: pitch
    O: sin
    foo:
      S: 'plain'
    27:
      PROFILE: ["100 foo"]
`
    const block = parseCharacterBlock(parse(yaml))
    expect(() => validateVariationGraph(block)).not.toThrow()
  })
})
