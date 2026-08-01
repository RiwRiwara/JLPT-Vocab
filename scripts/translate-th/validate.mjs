// Quality gate for a single returned gloss. Anything this rejects goes back on
// the retry queue rather than into the data files.

// Escapes, not literal characters — these ranges must survive being copied
// through editors and terminals.
const THAI = /[\u0E00-\u0E7F]/
const KANA_OR_KANJI = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF]/
const LATIN = /[A-Za-z]/
const MAX_LEN = 120

/**
 * @param {string} s the candidate Thai gloss to validate.
 * @param {string} sourceEn the English gloss it was translated from. Required —
 *   a handful of source glosses (honorific/humble cross-references, e.g.
 *   "why (same as どうして)") legitimately contain kana/kanji, so a correct
 *   Thai answer must be allowed to echo that Japanese back. Omitting it is a
 *   call-site bug, not something to paper over with a default value.
 * @returns {string|null} null when valid, otherwise the reason it was rejected.
 */
export function validateGloss(s, sourceEn) {
  if (typeof s !== 'string') return 'not a string'
  const t = s.trim()
  if (!t) return 'empty'
  if (!THAI.test(t)) return 'no Thai characters'
  const sourceHasKanaOrKanji = KANA_OR_KANJI.test(String(sourceEn))
  if (!sourceHasKanaOrKanji && KANA_OR_KANJI.test(t)) return 'contains kana or kanji'
  if (LATIN.test(t)) return 'contains Latin letters'
  if (t.length > MAX_LEN) return 'too long'
  return null
}
