// Which meaning text a word shows. One place, so Browse, Flashcards and Quiz
// can never drift apart.

export const LANGS = ['TH', 'EN', 'TH+EN']
export const DEFAULT_LANG = 'TH+EN'

export const LANG_LABELS = {
  TH: 'ไทย',
  EN: 'EN',
  'TH+EN': 'ไทย+EN',
}

/**
 * @param {string} en  English gloss from the word list
 * @param {string} th  Thai gloss, possibly '' when not translated yet
 * @param {string} lang  one of LANGS
 * @returns {{primary: string, secondary: string|null}}
 */
export function meaningFor(en, th, lang) {
  const t = (th || '').trim()
  if (!t) return { primary: en, secondary: null } // silent English fallback
  if (lang === 'TH') return { primary: t, secondary: null }
  if (lang === 'EN') return { primary: en, secondary: null }
  return { primary: t, secondary: en }
}
