#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { buildPrompt, parseResponse } from './prompt.mjs'
import { PROVIDERS } from './providers.mjs'
import { loadCache, saveCache } from './cache.mjs'

const LEVELS = ['n5', 'n4', 'n3', 'n2', 'n1']
const BATCH = 50
const RETRIES = 3
const FLAGS = ['--provider', '--model', '--sample', '--levels']

/** @throws on any missing/invalid flag value — must fail fast, before any network call. */
export function parseArgs(argv) {
  const args = { provider: 'ollama', model: 'translategemma:12b', sample: 0, levels: LEVELS }
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i]
    const v = argv[i + 1]
    if (!FLAGS.includes(k)) throw new Error(`unknown flag ${k}`)
    if (v === undefined) throw new Error(`flag ${k} requires a value`)

    if (k === '--provider') {
      if (!(v in PROVIDERS)) {
        throw new Error(`unknown provider ${v} (expected one of ${Object.keys(PROVIDERS).join(', ')})`)
      }
      args.provider = v
    } else if (k === '--model') {
      args.model = v
    } else if (k === '--sample') {
      const n = Number(v)
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`--sample must be a finite number greater than 0, got ${v}`)
      }
      args.sample = n
    } else if (k === '--levels') {
      const levels = v.split(',')
      const bad = levels.filter((lv) => !LEVELS.includes(lv))
      if (bad.length) {
        throw new Error(`unknown level(s): ${bad.join(', ')} (expected one of ${LEVELS.join(', ')})`)
      }
      args.levels = levels
    }
  }
  return args
}

/**
 * Sample from both ends of the difficulty range (first level, last level),
 * without ever duplicating an item when the queue is at or below sample size.
 */
export function sampleQueue(queue, sampleSize) {
  if (queue.length <= sampleSize) return [...queue]
  const half = Math.ceil(sampleSize / 2)
  const tailSize = sampleSize - half
  const head = queue.slice(0, half)
  const tail = tailSize > 0 ? queue.slice(queue.length - tailSize) : []
  return [...head, ...tail]
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Merge freshly-translated glosses with the previously committed ones so a
 * run that fails to (re)translate an item never overwrites a good committed
 * gloss with ''. Cache wins when present; otherwise fall back to the
 * existing committed value; otherwise ''.
 *
 * `existing` is ignored entirely (treated as absent) when its length doesn't
 * match `words` — a mismatch means the files are out of sync and blindly
 * merging by index would silently corrupt data instead of just losing it.
 *
 * @param {Array} words - the level's word entries, each `[expr, reading, meaning]`
 * @param {Record<string,string>} cache - gloss cache, keyed by English meaning
 * @param {string[] | undefined | null} existing - previously committed glosses for this level, by index
 * @returns {string[]}
 */
export function mergeGlosses(words, cache, existing) {
  const safeExisting = Array.isArray(existing) && existing.length === words.length ? existing : null
  return words.map((w, i) => cache[w[2]] || safeExisting?.[i] || '')
}

/**
 * Translate one batch. Retries resend only the items still outstanding, and
 * every valid translation is kept even if some items never validate — one
 * stubborn item no longer throws away 49 good ones or re-pays for them.
 *
 * @returns {{glosses: Record<number,string>, missing: Array}} `missing` holds
 *   the original item objects that never validated within RETRIES attempts.
 */
async function translateBatch(provider, model, items) {
  let outstanding = items
  const glosses = {}
  for (let attempt = 1; attempt <= RETRIES && outstanding.length > 0; attempt++) {
    let lastError
    try {
      const text = await PROVIDERS[provider](model, buildPrompt(outstanding))
      const { glosses: got, invalid, error } = parseResponse(text, outstanding)
      if (error) {
        lastError = error
      } else {
        Object.assign(glosses, got)
        const invalidNs = new Set(invalid.map((x) => x.n))
        outstanding = outstanding.filter((it) => invalidNs.has(it.n))
        if (invalid.length) {
          lastError = invalid.map((x) => `item ${x.n}: ${x.reason}`).join('; ')
        }
      }
    } catch (e) {
      lastError = e.message
    }
    if (outstanding.length > 0) {
      console.warn(`  retry ${attempt}/${RETRIES}: ${lastError}`)
      await sleep(500 * attempt)
    }
  }
  return { glosses, missing: outstanding }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const cachePath = `scripts/translate-th/.cache/${args.provider}-${args.model.replace(/[^\w.-]/g, '_')}.json`
  const cache = loadCache(cachePath)
  console.log(`provider=${args.provider} model=${args.model} cached=${Object.keys(cache).length}`)

  // Collect every distinct English gloss still needing a translation.
  const data = {}
  const pending = new Map() // english gloss -> representative item
  for (const lv of args.levels) {
    const words = JSON.parse(readFileSync(`src/data/${lv}.json`, 'utf8'))
    data[lv] = words
    for (const w of words) {
      if (cache[w[2]] || pending.has(w[2])) continue
      pending.set(w[2], { expression: w[0], reading: w[1], meaning: w[2] })
    }
  }

  let queue = [...pending.values()]
  if (args.sample > 0) {
    queue = sampleQueue(queue, args.sample)
    console.log(`sample mode — ${queue.length} glosses`)
  }
  console.log(`${queue.length} glosses to translate`)

  const failed = []
  for (let i = 0; i < queue.length; i += BATCH) {
    const slice = queue.slice(i, i + BATCH)
    const items = slice.map((it, n) => ({ n: n + 1, ...it }))
    process.stdout.write(`[${i + slice.length}/${queue.length}] `)
    const { glosses, missing } = await translateBatch(args.provider, args.model, items)
    // Cache every item that validated, even when the batch was only partially
    // successful — a stubborn item no longer costs the whole batch's work.
    for (const it of items) {
      if (glosses[it.n] !== undefined) cache[it.meaning] = glosses[it.n]
    }
    saveCache(cachePath, cache) // checkpoint every batch — runs are resumable
    if (missing.length) {
      failed.push(...missing.map((it) => it.meaning))
      console.log(`partial: ${items.length - missing.length}/${items.length} ok, ${missing.length} failed`)
    } else {
      console.log('ok')
    }
  }

  // Sample mode never touches the data files — it exists to be eyeballed.
  if (args.sample > 0) {
    for (const it of queue) {
      console.log(`${it.expression} (${it.reading})\n  EN: ${it.meaning}\n  TH: ${cache[it.meaning] ?? '—'}`)
    }
    return
  }

  for (const lv of args.levels) {
    const path = `src/data/th/${lv}.json`
    let existing = null
    try {
      existing = JSON.parse(readFileSync(path, 'utf8'))
    } catch {
      existing = null // absent or unreadable — treat as all-empty
    }
    if (existing !== null && (!Array.isArray(existing) || existing.length !== data[lv].length)) {
      console.warn(`  warning: existing ${path} has ${existing.length ?? '?'} entries, expected ${data[lv].length} — ignoring it entirely`)
      existing = null
    }
    const out = mergeGlosses(data[lv], cache, existing)
    writeFileSync(path, JSON.stringify(out))
    const done = out.filter(Boolean).length
    console.log(`${lv}: ${done}/${out.length} translated`)
  }

  if (failed.length) {
    console.error(`\n${failed.length} glosses failed:`)
    for (const f of failed) console.error(`  ${f}`)
    process.exit(1)
  }
}

// Only run when executed directly (`node cli.mjs ...`), never when imported by a test.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
