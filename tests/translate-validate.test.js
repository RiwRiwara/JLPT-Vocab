import { describe, it, expect } from 'vitest'
import { validateGloss } from '../scripts/translate-th/validate.mjs'

describe('validateGloss accepts', () => {
  it('a plain Thai gloss', () => {
    expect(validateGloss('สีน้ำเงิน', 'blue')).toBeNull()
  })

  it('comma-separated Thai alternatives', () => {
    expect(validateGloss('พบ, เจอ', 'to find, to meet')).toBeNull()
  })

  it('Thai with a parenthetical', () => {
    expect(
      validateGloss('ร่าเริง, สดใส (นิสัยหรืออากาศ)', 'cheerful, bright (personality or weather)')
    ).toBeNull()
  })

  it('Thai with digits', () => {
    expect(validateGloss('ชั้น 2', 'floor 2')).toBeNull()
  })
})

describe('validateGloss rejects', () => {
  it('an empty string', () => {
    expect(validateGloss('', 'blue')).toBe('empty')
  })

  it('whitespace only', () => {
    expect(validateGloss('   ', 'blue')).toBe('empty')
  })

  it('a non-string', () => {
    expect(validateGloss(null, 'blue')).toBe('not a string')
    expect(validateGloss(42, 'blue')).toBe('not a string')
  })

  it('text with no Thai characters', () => {
    expect(validateGloss('blue', 'blue')).toBe('no Thai characters')
  })

  it('leftover kanji, when the source has none', () => {
    expect(validateGloss('สีน้ำเงิน 青', 'blue')).toBe('contains kana or kanji')
  })

  it('leftover kana, when the source has none', () => {
    expect(validateGloss('สีน้ำเงิน あお', 'blue')).toBe('contains kana or kanji')
  })

  it('leftover Latin letters', () => {
    expect(validateGloss('สีน้ำเงิน (blue)', 'blue')).toBe('contains Latin letters')
  })

  it('a runaway sentence', () => {
    expect(validateGloss('สี'.repeat(100), 'blue')).toBe('too long')
  })
})

describe('validateGloss and source glosses that legitimately contain kana/kanji', () => {
  it('accepts kana in the gloss when the source itself contains kana', () => {
    expect(validateGloss('เหมือนกับ どうして', 'why (same as どうして)')).toBeNull()
  })

  it('accepts kanji in the gloss when the source itself contains kanji', () => {
    expect(validateGloss('รูปแบบสุภาพของ 言う', 'extra-modest (humble) expression for 言う (いう)')).toBeNull()
  })

  it('still rejects a gloss with no Thai characters at all, even when the source has kana', () => {
    expect(validateGloss('どうして', 'why (same as どうして)')).toBe('no Thai characters')
  })

  it('still rejects Latin letters leaking through, even when the source has kana', () => {
    expect(validateGloss('เหมือนกับ どうして (why)', 'why (same as どうして)')).toBe('contains Latin letters')
  })
})
