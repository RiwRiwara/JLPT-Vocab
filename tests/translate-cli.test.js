import { describe, it, expect } from 'vitest'
import { parseArgs, sampleQueue } from '../scripts/translate-th/cli.mjs'

describe('parseArgs defaults', () => {
  it('applies defaults when argv is empty', () => {
    expect(parseArgs([])).toEqual({
      provider: 'ollama',
      model: 'translategemma:12b',
      sample: 0,
      levels: ['n5', 'n4', 'n3', 'n2', 'n1'],
    })
  })

  it('parses a valid full argv', () => {
    const args = parseArgs(['--provider', 'openai', '--model', 'gpt-4o', '--sample', '10', '--levels', 'n5,n4'])
    expect(args).toEqual({
      provider: 'openai',
      model: 'gpt-4o',
      sample: 10,
      levels: ['n5', 'n4'],
    })
  })
})

describe('parseArgs rejects missing values', () => {
  it('a bare --provider throws', () => {
    expect(() => parseArgs(['--provider'])).toThrow(/--provider/)
  })

  it('a bare --model throws', () => {
    expect(() => parseArgs(['--model'])).toThrow(/--model/)
  })

  it('a bare --sample throws', () => {
    expect(() => parseArgs(['--sample'])).toThrow(/--sample/)
  })

  it('a bare --levels throws', () => {
    expect(() => parseArgs(['--levels'])).toThrow(/--levels/)
  })
})

describe('parseArgs rejects invalid --sample', () => {
  it('--sample 0 throws', () => {
    expect(() => parseArgs(['--sample', '0'])).toThrow(/--sample/)
  })

  it('--sample abc throws', () => {
    expect(() => parseArgs(['--sample', 'abc'])).toThrow(/--sample/)
  })

  it('--sample -5 throws', () => {
    expect(() => parseArgs(['--sample', '-5'])).toThrow(/--sample/)
  })
})

describe('parseArgs rejects invalid --provider and --levels', () => {
  it('an unknown provider throws', () => {
    expect(() => parseArgs(['--provider', 'anthropic'])).toThrow(/anthropic/)
  })

  it('an unknown level throws', () => {
    expect(() => parseArgs(['--levels', 'n5,n9'])).toThrow(/n9/)
  })

  it('an unknown flag throws', () => {
    expect(() => parseArgs(['--bogus', 'x'])).toThrow(/unknown flag/)
  })
})

describe('sampleQueue', () => {
  it('returns the whole queue, unmodified, when queue.length <= sampleSize', () => {
    const queue = [1, 2, 3]
    expect(sampleQueue(queue, 3)).toEqual([1, 2, 3])
    expect(sampleQueue(queue, 5)).toEqual([1, 2, 3])
  })

  it('never duplicates items when the queue is shorter than the sample size', () => {
    const queue = [1, 2, 3]
    const result = sampleQueue(queue, 10)
    expect(new Set(result).size).toBe(result.length)
  })

  it('takes disjoint items from both ends when queue is longer than sample size', () => {
    const queue = Array.from({ length: 20 }, (_, i) => i)
    const result = sampleQueue(queue, 6)
    expect(result.length).toBe(6)
    expect(new Set(result).size).toBe(6)
    expect(result).toEqual([0, 1, 2, 17, 18, 19])
  })
})
