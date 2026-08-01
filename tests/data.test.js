import { describe, it, expect, afterEach } from 'vitest'
import { LEVELS, WORDS, TH, thFor } from '../src/data/index.js'

describe('Thai data files', () => {
  it('has a Thai array for every level, aligned 1:1 with the words', () => {
    for (const lv of LEVELS) {
      expect(TH[lv], `TH.${lv} missing`).toBeDefined()
      expect(TH[lv].length, `TH.${lv} length`).toBe(WORDS[lv].length)
    }
  })

  it('contains only strings', () => {
    for (const lv of LEVELS) {
      for (const t of TH[lv]) expect(typeof t).toBe('string')
    }
  })

  it('totals 7,972 entries', () => {
    const total = LEVELS.reduce((n, lv) => n + TH[lv].length, 0)
    expect(total).toBe(7972)
  })
})

describe('thFor', () => {
  // These tests write into the shared TH arrays because thFor reads them
  // directly. Restore afterwards so the alignment tests above stay valid
  // whatever order the files run in.
  const saved = []
  afterEach(() => {
    for (const [lv, i, v] of saved) TH[lv][i] = v
    saved.length = 0
  })
  const setTh = (lv, i, v) => {
    saved.push([lv, i, TH[lv][i]])
    TH[lv][i] = v
  }

  it('returns the gloss at an index', () => {
    setTh('N5', 0, '  อ่า!, โอ้!  ')
    expect(thFor('N5', 0)).toBe('อ่า!, โอ้!')
  })

  it('returns an empty string for an untranslated entry', () => {
    setTh('N5', 1, '')
    expect(thFor('N5', 1)).toBe('')
  })

  it('returns an empty string for an out-of-range index', () => {
    expect(thFor('N5', 999999)).toBe('')
  })

  it('returns an empty string for an unknown level', () => {
    expect(thFor('N9', 0)).toBe('')
  })
})
