import { validateGloss } from './validate.mjs'

const SYSTEM = `You translate Japanese vocabulary entries into Thai for a JLPT study app.

Each item is a dictionary headword, not a sentence. Produce the concise Thai
gloss a Japanese-Thai dictionary would print — not a literal translation of the
English phrasing.

Rules:
- Keep comma-separated alternatives when the English gloss lists several senses.
- Keep a short parenthetical when the English gloss disambiguates a sense,
  but write it in Thai.
- Output Thai only. No Japanese, no romaji, no English, no explanation.
- Reply with a JSON object keyed by the item numbers you were given, and nothing else.
  Example: {"1":"สีน้ำเงิน","2":"เปิด"}`

/**
 * @param {Array<{n:number, expression:string, reading:string, meaning:string}>} items
 * @returns {{system: string, user: string}}
 */
export function buildPrompt(items) {
  const lines = items.map(
    (it) => `${it.n}. ${it.expression} (${it.reading}) — ${it.meaning}`
  )
  return {
    system: SYSTEM,
    user: `Translate these ${items.length} entries to Thai:\n\n${lines.join('\n')}`,
  }
}

/** Pull the first JSON object out of a model response, tolerating fences and prose. */
function extractJson(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

/**
 * @returns {{glosses: Record<number,string>, error: string|null}}
 */
export function parseResponse(text, items) {
  const obj = extractJson(String(text || ''))
  if (!obj || typeof obj !== 'object') return { glosses: {}, error: 'no JSON object in response' }

  const glosses = {}
  for (const it of items) {
    const raw = obj[it.n] ?? obj[String(it.n)]
    if (raw === undefined) return { glosses: {}, error: `missing item ${it.n}` }
    const reason = validateGloss(raw)
    if (reason) return { glosses: {}, error: `item ${it.n} invalid: ${reason}` }
    glosses[it.n] = raw.trim()
  }
  return { glosses, error: null }
}
