// JLPT word data — source: github.com/elzup/jlpt-word-list (MIT)
// Each entry: [expression, reading, meaning]
import n5 from './n5.json'
import n4 from './n4.json'
import n3 from './n3.json'
import n2 from './n2.json'
import n1 from './n1.json'

// Thai glosses — machine-translated once by scripts/translate-th, index-aligned
// with the arrays above. An empty string means "not translated yet".
import th5 from './th/n5.json'
import th4 from './th/n4.json'
import th3 from './th/n3.json'
import th2 from './th/n2.json'
import th1 from './th/n1.json'

export const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

export const WORDS = { N5: n5, N4: n4, N3: n3, N2: n2, N1: n1 }

export const TH = { N5: th5, N4: th4, N3: th3, N2: th2, N1: th1 }

/** Stable id for a word — level + index survives reloads because data is static. */
export const wordId = (level, idx) => `${level}:${idx}`

/** Thai gloss for a word, or '' when it has not been translated yet. */
export const thFor = (level, idx) => (TH[level]?.[idx] || '').trim()
