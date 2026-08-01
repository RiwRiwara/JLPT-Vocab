// Quiz question construction — pure, so the randomness rules stay testable.

export const QUIZ_LEN = 10
export const CHOICES = 4

/** Attempts before giving up on filling a question's decoys. Guards against a
 *  corpus too small or too repetitive to satisfy the uniqueness rules. */
const MAX_DRAWS = 500

export function shuffle(arr, rand = Math.random) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Wrong answers for question `qi`.
 *
 * A decoy is rejected when its English gloss OR its Thai gloss matches the
 * answer's, or another decoy's. Checking both languages means one built quiz
 * stays valid however the reader flips the language switch — 青 and 青い are
 * both "blue" and both "สีน้ำเงิน", and either collision would give a question
 * two correct answers.
 */
export function pickDecoys(words, thWords, qi, count, rand = Math.random) {
  const usedEn = new Set([words[qi][2]])
  const answerTh = (thWords[qi] || '').trim()
  const usedTh = new Set(answerTh ? [answerTh] : [])
  const decoys = []

  for (let draws = 0; decoys.length < count && draws < MAX_DRAWS; draws++) {
    const d = Math.floor(rand() * words.length)
    if (d === qi) continue
    const en = words[d][2]
    const th = (thWords[d] || '').trim()
    if (usedEn.has(en)) continue
    if (th && usedTh.has(th)) continue
    usedEn.add(en)
    if (th) usedTh.add(th)
    decoys.push(d)
  }
  return decoys
}

/**
 * @param {Array} words     the level's [expression, reading, meaning] triples
 * @param {string[]} thWords the level's Thai glosses, index-aligned
 * @param {Set<number>} seen indices asked in previous rounds
 * @returns {{questions: Array<{qi:number, choices:number[], dir:'jm'|'mj'}>, seen:Set<number>}}
 */
export function buildQuiz(words, thWords, seen, rand = Math.random) {
  let pool = new Set(seen)
  let fresh = words.map((_, i) => i).filter((i) => !pool.has(i))
  if (fresh.length < QUIZ_LEN) {
    // pool exhausted — start a new cycle
    pool = new Set()
    fresh = words.map((_, i) => i)
  }

  const picks = shuffle(fresh, rand).slice(0, QUIZ_LEN)
  picks.forEach((i) => pool.add(i))

  const questions = picks.map((qi) => ({
    qi,
    choices: shuffle([qi, ...pickDecoys(words, thWords, qi, CHOICES - 1, rand)], rand),
    dir: rand() < 0.5 ? 'jm' : 'mj', // jm: word->meaning, mj: meaning->word
  }))

  return { questions, seen: pool }
}
