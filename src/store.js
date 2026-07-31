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
