import { describe, it, expect } from 'vitest'
import { validateGloss } from '../scripts/translate-th/validate.mjs'

describe('validateGloss accepts', () => {
  it('a plain Thai gloss', () => {
    expect(validateGloss('สีน้ำเงิน')).toBeNull()
  })

  it('comma-separated Thai alternatives', () => {
    expect(validateGloss('พบ, เจอ')).toBeNull()
  })

  it('Thai with a parenthetical', () => {
    expect(validateGloss('ร่าเริง, สดใส (นิสัยหรืออากาศ)')).toBeNull()
  })

  it('Thai with digits', () => {
    expect(validateGloss('ชั้น 2')).toBeNull()
  })
})

describe('validateGloss rejects', () => {
  it('an empty string', () => {
    expect(validateGloss('')).toBe('empty')
  })

  it('whitespace only', () => {
    expect(validateGloss('   ')).toBe('empty')
  })

  it('a non-string', () => {
    expect(validateGloss(null)).toBe('not a string')
    expect(validateGloss(42)).toBe('not a string')
  })

  it('text with no Thai characters', () => {
    expect(validateGloss('blue')).toBe('no Thai characters')
  })

  it('leftover kanji', () => {
    expect(validateGloss('สีน้ำเงิน 青')).toBe('contains kana or kanji')
  })

  it('leftover kana', () => {
    expect(validateGloss('สีน้ำเงิน あお')).toBe('contains kana or kanji')
  })

  it('leftover Latin letters', () => {
    expect(validateGloss('สีน้ำเงิน (blue)')).toBe('contains Latin letters')
  })

  it('a runaway sentence', () => {
    expect(validateGloss('สี'.repeat(100))).toBe('too long')
  })
})
