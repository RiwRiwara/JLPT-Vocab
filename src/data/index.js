// JLPT word data — source: github.com/elzup/jlpt-word-list (MIT)
// Each entry: [expression, reading, meaning]
import n5 from './n5.json'
import n4 from './n4.json'
import n3 from './n3.json'
import n2 from './n2.json'
import n1 from './n1.json'

export const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

export const WORDS = { N5: n5, N4: n4, N3: n3, N2: n2, N1: n1 }

/** Stable id for a word — level + index survives reloads because data is static. */
export const wordId = (level, idx) => `${level}:${idx}`
