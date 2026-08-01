import { describe, it, expect } from 'vitest'
import { LANGS, DEFAULT_LANG, LANG_LABELS, meaningFor } from '../src/lang.js'

describe('constants', () => {
  it('has exactly three modes with labels', () => {
    expect(LANGS).toEqual(['TH', 'EN', 'TH+EN'])
    expect(LANGS.every((l) => typeof LANG_LABELS[l] === 'string')).toBe(true)
  })

  it('defaults to showing both', () => {
    expect(DEFAULT_LANG).toBe('TH+EN')
  })
})

describe('meaningFor with a Thai gloss present', () => {
  const en = 'blue'
  const th = 'สีน้ำเงิน'

  it('TH shows Thai only', () => {
    expect(meaningFor(en, th, 'TH')).toEqual({ primary: 'สีน้ำเงิน', secondary: null })
  })

  it('EN shows English only', () => {
    expect(meaningFor(en, th, 'EN')).toEqual({ primary: 'blue', secondary: null })
  })

  it('TH+EN shows Thai first with English underneath', () => {
    expect(meaningFor(en, th, 'TH+EN')).toEqual({ primary: 'สีน้ำเงิน', secondary: 'blue' })
  })
})

describe('meaningFor falls back to English when Thai is missing', () => {
  const en = 'blue'

  it('falls back for an empty gloss', () => {
    expect(meaningFor(en, '', 'TH')).toEqual({ primary: 'blue', secondary: null })
  })

  it('falls back for a whitespace-only gloss', () => {
    expect(meaningFor(en, '   ', 'TH+EN')).toEqual({ primary: 'blue', secondary: null })
  })

  it('falls back for undefined', () => {
    expect(meaningFor(en, undefined, 'TH+EN')).toEqual({ primary: 'blue', secondary: null })
  })

  it('never duplicates English on both lines', () => {
    const r = meaningFor(en, '', 'TH+EN')
    expect(r.secondary).toBeNull()
  })
})

describe('meaningFor with an unknown mode', () => {
  it('behaves like the default', () => {
    expect(meaningFor('blue', 'สีน้ำเงิน', 'XX')).toEqual({
      primary: 'สีน้ำเงิน',
      secondary: 'blue',
    })
  })
})

describe('meaningFor trims', () => {
  it('trims the Thai gloss', () => {
    expect(meaningFor('blue', '  สีน้ำเงิน  ', 'TH').primary).toBe('สีน้ำเงิน')
  })
})
