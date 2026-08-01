import { describe, it, expect } from 'vitest'
import { buildPrompt, parseResponse } from '../scripts/translate-th/prompt.mjs'

const ITEMS = [
  { n: 1, expression: '青', reading: 'あお', meaning: 'blue' },
  { n: 2, expression: '開ける', reading: 'あける', meaning: 'to open (v.t.)' },
]

describe('buildPrompt', () => {
  it('returns a system and user message', () => {
    const p = buildPrompt(ITEMS)
    expect(typeof p.system).toBe('string')
    expect(typeof p.user).toBe('string')
  })

  it('tells the model these are dictionary headwords, not sentences', () => {
    expect(buildPrompt(ITEMS).system).toMatch(/headword/i)
  })

  it('includes every item with its number, expression, reading and meaning', () => {
    const { user } = buildPrompt(ITEMS)
    expect(user).toContain('1')
    expect(user).toContain('青')
    expect(user).toContain('あお')
    expect(user).toContain('blue')
    expect(user).toContain('2')
    expect(user).toContain('開ける')
    expect(user).toContain('to open (v.t.)')
  })
})

describe('parseResponse', () => {
  it('parses a clean JSON object', () => {
    const r = parseResponse('{"1":"สีน้ำเงิน","2":"เปิด"}', ITEMS)
    expect(r.error).toBeNull()
    expect(r.glosses).toEqual({ 1: 'สีน้ำเงิน', 2: 'เปิด' })
    expect(r.invalid).toEqual([])
  })

  it('strips a markdown code fence', () => {
    const r = parseResponse('```json\n{"1":"สีน้ำเงิน","2":"เปิด"}\n```', ITEMS)
    expect(r.error).toBeNull()
    expect(r.glosses[1]).toBe('สีน้ำเงิน')
  })

  it('ignores prose around the JSON', () => {
    const r = parseResponse('Here you go:\n{"1":"สีน้ำเงิน","2":"เปิด"}\nHope that helps!', ITEMS)
    expect(r.error).toBeNull()
    expect(r.glosses[2]).toBe('เปิด')
  })

  it('reports unparseable output', () => {
    const r = parseResponse('I cannot do that', ITEMS)
    expect(r.error).toMatch(/no JSON/i)
    expect(r.glosses).toEqual({})
    expect(r.invalid).toEqual([])
  })

  it('salvages the valid items and reports a missing item as invalid', () => {
    const r = parseResponse('{"1":"สีน้ำเงิน"}', ITEMS)
    expect(r.error).toBeNull()
    expect(r.glosses).toEqual({ 1: 'สีน้ำเงิน' })
    expect(r.invalid).toEqual([{ n: 2, reason: 'missing' }])
  })

  it('salvages the valid items and reports an invalid gloss for that item', () => {
    const r = parseResponse('{"1":"สีน้ำเงิน","2":"to open"}', ITEMS)
    expect(r.error).toBeNull()
    expect(r.glosses).toEqual({ 1: 'สีน้ำเงิน' })
    expect(r.invalid).toEqual([{ n: 2, reason: 'no Thai characters' }])
  })

  it('coerces numeric keys consistently', () => {
    const r = parseResponse('{"1": "สีน้ำเงิน", "2": "เปิด"}', ITEMS)
    expect(r.glosses[1]).toBe('สีน้ำเงิน')
  })

  it('accepts a gloss containing kana when the source itself contains kana', () => {
    const items = [{ n: 1, expression: 'なぜ', reading: 'なぜ', meaning: 'why (same as どうして)' }]
    const r = parseResponse('{"1":"ทำไม (เหมือนกับ どうして)"}', items)
    expect(r.error).toBeNull()
    expect(r.glosses).toEqual({ 1: 'ทำไม (เหมือนกับ どうして)' })
    expect(r.invalid).toEqual([])
  })

  it('salvages valid items from a partially valid three-item batch', () => {
    const items = [
      { n: 1, expression: '青', reading: 'あお', meaning: 'blue' },
      { n: 2, expression: '赤', reading: 'あか', meaning: 'red' },
      { n: 3, expression: '黄色', reading: 'きいろ', meaning: 'yellow' },
    ]
    const r = parseResponse('{"1":"สีน้ำเงิน","2":"red","3":"สีเหลือง"}', items)
    expect(r.error).toBeNull()
    expect(r.glosses).toEqual({ 1: 'สีน้ำเงิน', 3: 'สีเหลือง' })
    expect(r.invalid).toEqual([{ n: 2, reason: 'no Thai characters' }])
  })
})
