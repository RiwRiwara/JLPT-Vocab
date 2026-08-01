// Quality gate for a single returned gloss. Anything this rejects goes back on
// the retry queue rather than into the data files.

// Escapes, not literal characters — these ranges must survive being copied
// through editors and terminals.
const THAI = /[\u0E00-\u0E7F]/
const KANA_OR_KANJI = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF]/
const LATIN = /[A-Za-z]/
const MAX_LEN = 120

/** @returns {string|null} null when valid, otherwise the reason it was rejected. */
export function validateGloss(s) {
  if (typeof s !== 'string') return 'not a string'
  const t = s.trim()
  if (!t) return 'empty'
  if (!THAI.test(t)) return 'no Thai characters'
  if (KANA_OR_KANJI.test(t)) return 'contains kana or kanji'
  if (LATIN.test(t)) return 'contains Latin letters'
  if (t.length > MAX_LEN) return 'too long'
  return null
}
