/**
 * Browse's search predicate — matches kanji, reading, English gloss and Thai gloss.
 * `needle` is expected to be already trimmed and lowercased by the caller.
 */
export function matchWord(word, th, needle) {
  if (!needle) return true
  return (
    word[0].includes(needle) ||
    word[1].includes(needle) ||
    word[2].toLowerCase().includes(needle) ||
    (th || '').toLowerCase().includes(needle)
  )
}
