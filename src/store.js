import { LANGS, DEFAULT_LANG } from './lang.js'

// Progress lives in localStorage — the whole app is client-side by design.
const KEY = 'jlpt-vocab:known:v1'

function read() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))
  } catch {
    return new Set()
  }
}

let known = read()
const listeners = new Set()

function persist() {
  localStorage.setItem(KEY, JSON.stringify([...known]))
  listeners.forEach((fn) => fn())
}

export const store = {
  isKnown: (id) => known.has(id),
  countKnown: (prefix) => [...known].filter((id) => id.startsWith(prefix + ':')).length,
  setKnown(id, value) {
    if (value) known.add(id)
    else known.delete(id)
    persist()
  },
  toggle(id) {
    this.setKnown(id, !known.has(id))
  },
  resetLevel(prefix) {
    known = new Set([...known].filter((id) => !id.startsWith(prefix + ':')))
    persist()
  },
  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}

// ----- display preferences -----
const LANG_KEY = 'jlpt-vocab:lang:v1'

function readLang() {
  try {
    const v = localStorage.getItem(LANG_KEY)
    return LANGS.includes(v) ? v : DEFAULT_LANG
  } catch {
    return DEFAULT_LANG
  }
}

let lang = readLang()

export const prefs = {
  getLang: () => lang,
  setLang(v) {
    if (!LANGS.includes(v) || v === lang) return
    lang = v
    localStorage.setItem(LANG_KEY, v)
    listeners.forEach((fn) => fn())
  },
}
