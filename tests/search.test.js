import { describe, it, expect } from 'vitest'
import { matchWord } from '../src/search.js'

const AO = ['青', 'あお', 'blue']

describe('matchWord', () => {
  it('matches everything on an empty needle', () => {
    expect(matchWord(AO, 'สีน้ำเงิน', '')).toBe(true)
  })

  it('matches the expression', () => {
    expect(matchWord(AO, 'สีน้ำเงิน', '青')).toBe(true)
  })

  it('matches the reading', () => {
    expect(matchWord(AO, 'สีน้ำเงิน', 'あお')).toBe(true)
  })

  it('matches the English meaning case-insensitively', () => {
    expect(matchWord(AO, 'สีน้ำเงิน', 'blu')).toBe(true)
    expect(matchWord(AO, 'สีน้ำเงิน', 'BLUE'.toLowerCase())).toBe(true)
  })

  it('matches the Thai gloss', () => {
    expect(matchWord(AO, 'สีน้ำเงิน', 'สีน้ำเงิน')).toBe(true)
  })

  it('matches a partial Thai gloss', () => {
    expect(matchWord(AO, 'สีน้ำเงิน', 'น้ำเงิน')).toBe(true)
  })

  it('does not match unrelated text', () => {
    expect(matchWord(AO, 'สีน้ำเงิน', 'red')).toBe(false)
    expect(matchWord(AO, 'สีน้ำเงิน', 'สีแดง')).toBe(false)
  })

  it('tolerates a missing Thai gloss', () => {
    expect(matchWord(AO, '', 'blue')).toBe(true)
    expect(matchWord(AO, undefined, 'สีน้ำเงิน')).toBe(false)
  })
})
