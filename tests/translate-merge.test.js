import { describe, it, expect } from 'vitest'
import { mergeGlosses } from '../scripts/translate-th/cli.mjs'

const words = [
  ['犬', 'いぬ', 'dog'],
  ['猫', 'ねこ', 'cat'],
  ['鳥', 'とり', 'bird'],
]

describe('mergeGlosses', () => {
  it('prefers the cache value when present', () => {
    const cache = { dog: 'สุนัข', cat: 'แมว', bird: 'นก' }
    const existing = ['old-dog', 'old-cat', 'old-bird']
    expect(mergeGlosses(words, cache, existing)).toEqual(['สุนัข', 'แมว', 'นก'])
  })

  it('falls back to the existing committed value when the cache lacks that gloss', () => {
    const cache = { dog: 'สุนัข' }
    const existing = ['old-dog', 'old-cat', 'old-bird']
    expect(mergeGlosses(words, cache, existing)).toEqual(['สุนัข', 'old-cat', 'old-bird'])
  })

  it('results in an empty string when neither cache nor existing has it', () => {
    const cache = {}
    const existing = ['', '', '']
    expect(mergeGlosses(words, cache, existing)).toEqual(['', '', ''])
  })

  it('ignores a length-mismatched existing array entirely', () => {
    const cache = { dog: 'สุนัข' }
    const existing = ['old-dog', 'old-cat'] // only 2 entries, words has 3
    expect(mergeGlosses(words, cache, existing)).toEqual(['สุนัข', '', ''])
  })

  it('treats an absent/undefined existing as all-empty', () => {
    const cache = { cat: 'แมว' }
    expect(mergeGlosses(words, cache, undefined)).toEqual(['', 'แมว', ''])
    expect(mergeGlosses(words, cache, null)).toEqual(['', 'แมว', ''])
  })

  it('never lets an empty cache value overwrite a good existing gloss', () => {
    const cache = { dog: '', cat: 'แมว' }
    const existing = ['old-dog', 'old-cat', 'old-bird']
    expect(mergeGlosses(words, cache, existing)).toEqual(['old-dog', 'แมว', 'old-bird'])
  })
})
