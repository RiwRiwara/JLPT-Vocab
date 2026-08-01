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

/** Translate one batch, retrying the whole batch on any validation failure. */
async function translateBatch(provider, model, items) {
  let lastError = 'not attempted'
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const text = await PROVIDERS[provider](model, buildPrompt(items))
      const { glosses, error } = parseResponse(text, items)
      if (!error) return glosses
      lastError = error
    } catch (e) {
      lastError = e.message
    }
    console.warn(`  retry ${attempt}/${RETRIES}: ${lastError}`)
    await sleep(500 * attempt)
  }
  throw new Error(lastError)
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
    try {
      const glosses = await translateBatch(args.provider, args.model, items)
      for (const it of items) cache[it.meaning] = glosses[it.n]
      saveCache(cachePath, cache) // checkpoint every batch — runs are resumable
      console.log('ok')
    } catch (e) {
      console.log(`FAILED: ${e.message}`)
      failed.push(...slice.map((it) => it.meaning))
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
    const out = data[lv].map((w) => cache[w[2]] ?? '')
    writeFileSync(`src/data/th/${lv}.json`, JSON.stringify(out))
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
