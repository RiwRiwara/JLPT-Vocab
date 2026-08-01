import { describe, it, expect } from 'vitest'
import { QUIZ_LEN, CHOICES, shuffle, pickDecoys, buildQuiz } from '../src/views/quiz-build.js'

// 青 and 青い share both glosses — the exact collision this task fixes.
const WORDS = [
  ['青', 'あお', 'blue'],
  ['青い', 'あおい', 'blue'],
  ['赤', 'あか', 'red'],
  ['白', 'しろ', 'white'],
  ['黒', 'くろ', 'black'],
  ['緑', 'みどり', 'green'],
  ['黄色', 'きいろ', 'yellow'],
  ['紫', 'むらさき', 'purple'],
]
const TH = [
  'สีน้ำเงิน',
  'สีน้ำเงิน',
  'สีแดง',
  'สีขาว',
  'สีดำ',
  'สีเขียว',
  'สีเหลือง',
  'สีม่วง',
]

/** Deterministic generator cycling through the given values. */
function seq(values) {
  let i = 0
  return () => values[i++ % values.length]
}

describe('shuffle', () => {
  it('keeps the same members', () => {
    const out = shuffle([1, 2, 3, 4], seq([0.9, 0.1, 0.5]))
    expect(out.sort()).toEqual([1, 2, 3, 4])
  })

  it('does not mutate the input', () => {
    const input = [1, 2, 3]
    shuffle(input, seq([0.9, 0.1]))
    expect(input).toEqual([1, 2, 3])
  })
})

describe('pickDecoys', () => {
  it('returns the requested number of decoys', () => {
    const d = pickDecoys(WORDS, TH, 0, CHOICES - 1)
    expect(d).toHaveLength(CHOICES - 1)
  })

  it('never returns the answer itself', () => {
    for (let n = 0; n < 50; n++) {
      expect(pickDecoys(WORDS, TH, 2, CHOICES - 1)).not.toContain(2)
    }
  })

  it('never returns a decoy whose English gloss equals the answer', () => {
    for (let n = 0; n < 50; n++) {
      // index 0 is 'blue'; index 1 is also 'blue' and must be excluded
      expect(pickDecoys(WORDS, TH, 0, CHOICES - 1)).not.toContain(1)
    }
  })

  it('never returns a decoy whose Thai gloss equals the answer', () => {
    // Same English, different Thai would still collide in TH mode.
    const th = [...TH]
    const words = WORDS.map((w) => [...w])
    words[1][2] = 'blue-ish' // English now differs...
    // ...but Thai is still 'สีน้ำเงิน' for both, so it must still be rejected
    for (let n = 0; n < 50; n++) {
      expect(pickDecoys(words, th, 0, CHOICES - 1)).not.toContain(1)
    }
  })

  it('returns decoys with distinct glosses from each other', () => {
    for (let n = 0; n < 50; n++) {
      const d = pickDecoys(WORDS, TH, 2, CHOICES - 1)
      const en = d.map((i) => WORDS[i][2])
      const th = d.map((i) => TH[i])
      expect(new Set(en).size).toBe(en.length)
      expect(new Set(th).size).toBe(th.length)
    }
  })

  it('terminates and returns fewer decoys when the pool is too small', () => {
    const tiny = [
      ['青', 'あお', 'blue'],
      ['青い', 'あおい', 'blue'],
    ]
    const tinyTh = ['สีน้ำเงิน', 'สีน้ำเงิน']
    const d = pickDecoys(tiny, tinyTh, 0, CHOICES - 1)
    expect(d).toHaveLength(0)
  })

  it('tolerates untranslated entries', () => {
    const blank = WORDS.map(() => '')
    const d = pickDecoys(WORDS, blank, 2, CHOICES - 1)
    expect(d).toHaveLength(CHOICES - 1)
    expect(new Set(d.map((i) => WORDS[i][2])).size).toBe(d.length)
  })
})

describe('buildQuiz', () => {
  const big = Array.from({ length: 200 }, (_, i) => [`語${i}`, `ご${i}`, `meaning ${i}`])
  const bigTh = big.map((_, i) => `ความหมาย ${i}`)

  it('builds QUIZ_LEN questions', () => {
    const { questions } = buildQuiz(big, bigTh, new Set())
    expect(questions).toHaveLength(QUIZ_LEN)
  })

  it('never repeats a word within one quiz', () => {
    const { questions } = buildQuiz(big, bigTh, new Set())
    expect(new Set(questions.map((q) => q.qi)).size).toBe(QUIZ_LEN)
  })

  it('includes the answer among the choices', () => {
    const { questions } = buildQuiz(big, bigTh, new Set())
    for (const q of questions) expect(q.choices).toContain(q.qi)
  })

  it('gives every question a direction', () => {
    const { questions } = buildQuiz(big, bigTh, new Set())
    for (const q of questions) expect(['jm', 'mj']).toContain(q.dir)
  })

  it('avoids words already seen', () => {
    const seen = new Set(Array.from({ length: 190 }, (_, i) => i))
    const { questions } = buildQuiz(big, bigTh, seen)
    for (const q of questions) expect(q.qi).toBeGreaterThanOrEqual(190)
  })

  it('starts a fresh cycle when the pool is exhausted', () => {
    const seen = new Set(big.map((_, i) => i))
    const { questions, seen: after } = buildQuiz(big, bigTh, seen)
    expect(questions).toHaveLength(QUIZ_LEN)
    expect(after.size).toBe(QUIZ_LEN)
  })

  it('returns the seen set updated with this round', () => {
    const { questions, seen } = buildQuiz(big, bigTh, new Set())
    for (const q of questions) expect(seen.has(q.qi)).toBe(true)
  })
})
