import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

// Keyed by English gloss, so words sharing a gloss translate once and every
// interrupted run resumes where it stopped.

export function loadCache(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return {}
  }
}

export function saveCache(path, map) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(map, null, 0))
}
