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
 * Salvages every item that validates instead of discarding the whole batch
 * over one bad item — the caller retries only what's in `invalid`.
 *
 * @returns {{glosses: Record<number,string>, invalid: Array<{n:number, reason:string}>, error: string|null}}
 *   `error` is reserved for a whole-response failure (no JSON object at all),
 *   in which case `glosses` and `invalid` are both empty — there's nothing
 *   usable to salvage or attribute to a specific item.
 */
export function parseResponse(text, items) {
  const obj = extractJson(String(text || ''))
  if (!obj || typeof obj !== 'object') return { glosses: {}, invalid: [], error: 'no JSON object in response' }

  const glosses = {}
  const invalid = []
  for (const it of items) {
    const raw = obj[it.n] ?? obj[String(it.n)]
    if (raw === undefined) {
      invalid.push({ n: it.n, reason: 'missing' })
      continue
    }
    const reason = validateGloss(raw, it.meaning)
    if (reason) {
      invalid.push({ n: it.n, reason })
      continue
    }
    glosses[it.n] = raw.trim()
  }
  return { glosses, invalid, error: null }
}
