# Thai Translations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show Thai meanings for all 7,972 JLPT words, translated once offline into index-aligned JSON files and committed to the repo.

**Architecture:** Thai glosses live in `src/data/th/<level>.json` — flat string arrays aligned 1:1 with the existing `src/data/<level>.json` word arrays. They ship as placeholders (empty strings) first, so the whole UI can be built and reviewed with an English fallback before any translation runs. A standalone, resumable Node script then fills them in via a pluggable model provider. Display logic is extracted into small pure modules so it can be unit-tested without a DOM.

**Tech Stack:** Vite 6, React 18 (JSX, no TypeScript), Vitest (new), Node 20+ for the translation script, Ollama and/or the OpenAI HTTP API as translation providers.

## Global Constraints

- **No runtime translation.** Every Thai string is baked into the repo at authoring time. The app stays client-side only with no network calls.
- **Never modify `src/data/{n1..n5}.json`.** They are upstream data from elzup/jlpt-word-list (MIT) and must stay re-syncable.
- **Thai arrays are index-aligned.** `TH[level][i]` describes `WORDS[level][i]`. Lengths must match exactly: N5 718, N4 668, N3 2139, N2 1748, N1 2699.
- **Empty string means "not translated yet"** and must fall back to English silently — never an error, never a blank line.
- **No new runtime dependencies.** `vitest` is a devDependency. `react` and `react-dom` remain the only entries under `dependencies`.
- **Tests are pure-function tests.** No jsdom, no React Testing Library. Anything that needs testing gets extracted out of JSX first.
- **Language modes are exactly** `'TH'`, `'EN'`, `'TH+EN'` — these exact strings, used as localStorage values and React keys.
- **Package manager is pnpm.**

## File Structure

**Created:**
- `src/lang.js` — language constants and `meaningFor()`, the single place that decides which text a word displays.
- `src/search.js` — `matchWord()`, the Browse search predicate.
- `src/views/quiz-build.js` — `pickDecoys()` and `buildQuiz()`, extracted from `Quiz.jsx` so quiz randomness is testable.
- `src/data/th/{n5,n4,n3,n2,n1}.json` — Thai glosses, placeholders at first.
- `scripts/translate-th/validate.mjs` — pure validation of a returned gloss.
- `scripts/translate-th/prompt.mjs` — pure prompt construction and response parsing.
- `scripts/translate-th/providers.mjs` — `ollama` and `openai` request functions behind one interface.
- `scripts/translate-th/cache.mjs` — resumable on-disk cache keyed by English gloss.
- `scripts/translate-th/cli.mjs` — the runnable entry point.
- `tests/lang.test.js`, `tests/search.test.js`, `tests/quiz-build.test.js`, `tests/data.test.js`, `tests/translate-validate.test.js`, `tests/translate-prompt.test.js`

**Modified:**
- `src/data/index.js` — export `TH` and `thFor()`.
- `src/store.js` — add a `prefs` slice for the language preference.
- `src/App.jsx` — render the language switch.
- `src/views/Browse.jsx` — Thai in the meaning line and in search.
- `src/views/Flashcards.jsx` — Thai on the card back.
- `src/views/Quiz.jsx` — Thai in prompt and choices; use extracted builder.
- `src/styles.css` — styles for the language switch and the secondary meaning line.
- `package.json` — `vitest` devDependency, `test` and `translate:th` scripts.
- `README.md` — document the language feature and the translation script.

---

### Task 1: Test harness and Thai data files

Sets up Vitest and creates the index-aligned placeholder files, so every later task has somewhere to read Thai from.

**Files:**
- Modify: `package.json`
- Create: `src/data/th/{n5,n4,n3,n2,n1}.json`
- Modify: `src/data/index.js`
- Create: `tests/data.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `TH` — object `{ N5: string[], N4: string[], N3: string[], N2: string[], N1: string[] }`, exported from `src/data/index.js`.
  - `thFor(level, idx)` — returns the trimmed Thai gloss as a string, or `''` when absent.

- [ ] **Step 1: Install Vitest and add scripts**

```bash
pnpm add -D vitest
```

Then edit the `"scripts"` block in `package.json` so it reads:

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "deploy": "vite build && wrangler deploy"
  },
```

- [ ] **Step 2: Generate the placeholder Thai files**

Run this once. It creates one file per level, each a JSON array of empty
strings the same length as that level's word list.

```bash
node --input-type=module -e "
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
mkdirSync('src/data/th', { recursive: true })
for (const lv of ['n5','n4','n3','n2','n1']) {
  const words = JSON.parse(readFileSync('src/data/' + lv + '.json', 'utf8'))
  writeFileSync('src/data/th/' + lv + '.json', JSON.stringify(words.map(() => '')))
  console.log(lv, words.length)
}
"
```

Expected output:

```
n5 718
n4 668
n3 2139
n2 1748
n1 2699
```

- [ ] **Step 3: Write the failing test**

Create `tests/data.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { LEVELS, WORDS, TH, thFor } from '../src/data/index.js'

describe('Thai data files', () => {
  it('has a Thai array for every level, aligned 1:1 with the words', () => {
    for (const lv of LEVELS) {
      expect(TH[lv], `TH.${lv} missing`).toBeDefined()
      expect(TH[lv].length, `TH.${lv} length`).toBe(WORDS[lv].length)
    }
  })

  it('contains only strings', () => {
    for (const lv of LEVELS) {
      for (const t of TH[lv]) expect(typeof t).toBe('string')
    }
  })

  it('totals 7,972 entries', () => {
    const total = LEVELS.reduce((n, lv) => n + TH[lv].length, 0)
    expect(total).toBe(7972)
  })
})

describe('thFor', () => {
  it('returns the gloss at an index', () => {
    TH.N5[0] = '  อ่า!, โอ้!  '
    expect(thFor('N5', 0)).toBe('อ่า!, โอ้!')
  })

  it('returns an empty string for an untranslated entry', () => {
    TH.N5[1] = ''
    expect(thFor('N5', 1)).toBe('')
  })

  it('returns an empty string for an out-of-range index', () => {
    expect(thFor('N5', 999999)).toBe('')
  })

  it('returns an empty string for an unknown level', () => {
    expect(thFor('N9', 0)).toBe('')
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `TH` and `thFor` are not exported from `src/data/index.js`.

- [ ] **Step 5: Export `TH` and `thFor`**

Replace the whole contents of `src/data/index.js` with:

```js
// JLPT word data — source: github.com/elzup/jlpt-word-list (MIT)
// Each entry: [expression, reading, meaning]
import n5 from './n5.json'
import n4 from './n4.json'
import n3 from './n3.json'
import n2 from './n2.json'
import n1 from './n1.json'

// Thai glosses — machine-translated once by scripts/translate-th, index-aligned
// with the arrays above. An empty string means "not translated yet".
import th5 from './th/n5.json'
import th4 from './th/n4.json'
import th3 from './th/n3.json'
import th2 from './th/n2.json'
import th1 from './th/n1.json'

export const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

export const WORDS = { N5: n5, N4: n4, N3: n3, N2: n2, N1: n1 }

export const TH = { N5: th5, N4: th4, N3: th3, N2: th2, N1: th1 }

/** Stable id for a word — level + index survives reloads because data is static. */
export const wordId = (level, idx) => `${level}:${idx}`

/** Thai gloss for a word, or '' when it has not been translated yet. */
export const thFor = (level, idx) => (TH[level]?.[idx] || '').trim()
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm test`
Expected: PASS — 7 tests.

- [ ] **Step 7: Verify the app still builds**

Run: `pnpm build`
Expected: build succeeds, no unresolved import errors.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml src/data/index.js src/data/th tests/data.test.js
git commit -m "feat: add index-aligned Thai gloss files and vitest harness"
```

---

### Task 2: Language preference and display rules

The single decision point for which text a word shows, plus the persisted preference.

**Files:**
- Create: `src/lang.js`
- Modify: `src/store.js`
- Create: `tests/lang.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `LANGS` — `['TH', 'EN', 'TH+EN']`
  - `DEFAULT_LANG` — `'TH+EN'`
  - `LANG_LABELS` — `{ TH: 'ไทย', EN: 'EN', 'TH+EN': 'ไทย+EN' }`
  - `meaningFor(en, th, lang)` — returns `{ primary: string, secondary: string | null }`
  - `prefs` from `src/store.js` — `{ getLang(): string, setLang(v): void }`, notifying the existing `store.subscribe` listeners.

- [ ] **Step 1: Write the failing test**

Create `tests/lang.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { LANGS, DEFAULT_LANG, LANG_LABELS, meaningFor } from '../src/lang.js'

describe('constants', () => {
  it('has exactly three modes with labels', () => {
    expect(LANGS).toEqual(['TH', 'EN', 'TH+EN'])
    expect(LANGS.every((l) => typeof LANG_LABELS[l] === 'string')).toBe(true)
  })

  it('defaults to showing both', () => {
    expect(DEFAULT_LANG).toBe('TH+EN')
  })
})

describe('meaningFor with a Thai gloss present', () => {
  const en = 'blue'
  const th = 'สีน้ำเงิน'

  it('TH shows Thai only', () => {
    expect(meaningFor(en, th, 'TH')).toEqual({ primary: 'สีน้ำเงิน', secondary: null })
  })

  it('EN shows English only', () => {
    expect(meaningFor(en, th, 'EN')).toEqual({ primary: 'blue', secondary: null })
  })

  it('TH+EN shows Thai first with English underneath', () => {
    expect(meaningFor(en, th, 'TH+EN')).toEqual({ primary: 'สีน้ำเงิน', secondary: 'blue' })
  })
})

describe('meaningFor falls back to English when Thai is missing', () => {
  const en = 'blue'

  it('falls back for an empty gloss', () => {
    expect(meaningFor(en, '', 'TH')).toEqual({ primary: 'blue', secondary: null })
  })

  it('falls back for a whitespace-only gloss', () => {
    expect(meaningFor(en, '   ', 'TH+EN')).toEqual({ primary: 'blue', secondary: null })
  })

  it('falls back for undefined', () => {
    expect(meaningFor(en, undefined, 'TH+EN')).toEqual({ primary: 'blue', secondary: null })
  })

  it('never duplicates English on both lines', () => {
    const r = meaningFor(en, '', 'TH+EN')
    expect(r.secondary).toBeNull()
  })
})

describe('meaningFor with an unknown mode', () => {
  it('behaves like the default', () => {
    expect(meaningFor('blue', 'สีน้ำเงิน', 'XX')).toEqual({
      primary: 'สีน้ำเงิน',
      secondary: 'blue',
    })
  })
})

describe('meaningFor trims', () => {
  it('trims the Thai gloss', () => {
    expect(meaningFor('blue', '  สีน้ำเงิน  ', 'TH').primary).toBe('สีน้ำเงิน')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test tests/lang.test.js`
Expected: FAIL — cannot resolve `../src/lang.js`.

- [ ] **Step 3: Write `src/lang.js`**

```js
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test tests/lang.test.js`
Expected: PASS — 11 tests.

- [ ] **Step 5: Add the `prefs` slice to `src/store.js`**

Append to `src/store.js`, after the existing `export const store = {...}` block:

```js
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
```

and add this import at the very top of `src/store.js`:

```js
import { LANGS, DEFAULT_LANG } from './lang.js'
```

- [ ] **Step 6: Run the full suite**

Run: `pnpm test`
Expected: PASS — all tests from Tasks 1 and 2.

- [ ] **Step 7: Commit**

```bash
git add src/lang.js src/store.js tests/lang.test.js
git commit -m "feat: add language preference and meaning display rules"
```

---

### Task 3: Language switch and Browse

Puts the switch in the header and makes Browse render and search Thai.

**Files:**
- Create: `src/search.js`
- Create: `tests/search.test.js`
- Modify: `src/App.jsx`
- Modify: `src/views/Browse.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `meaningFor`, `LANGS`, `LANG_LABELS` from `src/lang.js`; `prefs`, `store` from `src/store.js`; `thFor` from `src/data/index.js`.
- Produces: `matchWord(word, th, needle)` from `src/search.js` — `word` is the `[expression, reading, meaning]` triple, `needle` is already lowercased and trimmed, returns `boolean`.

- [ ] **Step 1: Write the failing test**

Create `tests/search.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { matchWord } from '../src/search.js'

const AO = ['青', 'あお', 'blue']

describe('matchWord', () => {
  it('matches everything on an empty needle', () => {
    expect(matchWord(AO, 'สีน้ำเงิน', '')).toBe(true)
  })

  it('matches the expression', () => {
    expect(matchWord(AO, 'สีน้ำเงิน', '青')).toBe(true)
  })

  it('matches the reading', () => {
    expect(matchWord(AO, 'สีน้ำเงิน', 'あお')).toBe(true)
  })

  it('matches the English meaning case-insensitively', () => {
    expect(matchWord(AO, 'สีน้ำเงิน', 'blu')).toBe(true)
    expect(matchWord(AO, 'สีน้ำเงิน', 'BLUE'.toLowerCase())).toBe(true)
  })

  it('matches the Thai gloss', () => {
    expect(matchWord(AO, 'สีน้ำเงิน', 'สีน้ำเงิน')).toBe(true)
  })

  it('matches a partial Thai gloss', () => {
    expect(matchWord(AO, 'สีน้ำเงิน', 'น้ำเงิน')).toBe(true)
  })

  it('does not match unrelated text', () => {
    expect(matchWord(AO, 'สีน้ำเงิน', 'red')).toBe(false)
    expect(matchWord(AO, 'สีน้ำเงิน', 'สีแดง')).toBe(false)
  })

  it('tolerates a missing Thai gloss', () => {
    expect(matchWord(AO, '', 'blue')).toBe(true)
    expect(matchWord(AO, undefined, 'สีน้ำเงิน')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test tests/search.test.js`
Expected: FAIL — cannot resolve `../src/search.js`.

- [ ] **Step 3: Write `src/search.js`**

```js
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test tests/search.test.js`
Expected: PASS — 8 tests.

- [ ] **Step 5: Add the language switch to `src/App.jsx`**

Replace the whole file with:

```jsx
import { useState, useSyncExternalStore } from 'react'
import Browse from './views/Browse.jsx'
import Flashcards from './views/Flashcards.jsx'
import Quiz from './views/Quiz.jsx'
import { LANGS, LANG_LABELS } from './lang.js'
import { store, prefs } from './store.js'

const VIEWS = {
  browse: { label: 'Browse', el: Browse },
  cards: { label: 'Flashcards', el: Flashcards },
  quiz: { label: 'Quiz', el: Quiz },
}

export default function App() {
  const [view, setView] = useState('browse')
  const lang = useSyncExternalStore(store.subscribe, prefs.getLang)
  const Active = VIEWS[view].el

  return (
    <div className="app">
      <header>
        <div className="brand">
          <h1>JLPT VOCAB</h1>
          <span className="sub">N5–N1 · 7,972 words · client-side only</span>
        </div>
        <nav>
          {Object.entries(VIEWS).map(([key, v]) => (
            <button key={key} className={key === view ? 'active' : ''} onClick={() => setView(key)}>
              {v.label}
            </button>
          ))}
        </nav>
        <div className="lang-switch" role="group" aria-label="ภาษาของความหมาย">
          {LANGS.map((l) => (
            <button
              key={l}
              className={l === lang ? 'active' : ''}
              aria-pressed={l === lang}
              onClick={() => prefs.setLang(l)}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
      </header>

      <Active />

      <footer>
        <span>
          data: <a href="https://github.com/elzup/jlpt-word-list">elzup/jlpt-word-list</a> (MIT) ·
          คำแปลไทยแปลด้วย AI · progress เก็บในเครื่องคุณเท่านั้น
        </span>
        <span className="mono">AIONEDAY</span>
      </footer>
    </div>
  )
}
```

- [ ] **Step 6: Wire Thai into `src/views/Browse.jsx`**

Make these four edits.

a. Replace the import block at the top (lines 1–3) with:

```jsx
import { useMemo, useState, useSyncExternalStore } from 'react'
import { LEVELS, WORDS, TH, wordId } from '../data/index.js'
import { store, prefs } from '../store.js'
import { meaningFor } from '../lang.js'
import { matchWord } from '../search.js'
```

b. Inside `export default function Browse()`, replace the existing
`useSyncExternalStore(...)` line with these two lines:

```jsx
  const lang = useSyncExternalStore(store.subscribe, prefs.getLang)
  useSyncExternalStore(store.subscribe, () => store.countKnown(level) + ':' + status)
```

and replace `const words = WORDS[level]` with:

```jsx
  const words = WORDS[level]
  const thWords = TH[level]
```

c. Replace the `results` memo with one that searches Thai too:

```jsx
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let list = words.map((w, i) => [w, i])
    if (needle) list = list.filter(([w, i]) => matchWord(w, thWords[i], needle))
    if (status !== 'all')
      list = list.filter(([, i]) => store.isKnown(wordId(level, i)) === (status === 'known'))
    if (script !== 'all') list = list.filter(([w]) => hasKanji(w[0]) === (script === 'kanji'))
    return list
  }, [words, thWords, q, status, script, level])
```

d. Change the search placeholder to mention Thai:

```jsx
          placeholder="ค้นหา — คันจิ / คำอ่าน / ความหมาย ไทย-EN"
```

e. Replace the meaning line inside the row `<span className="body">` with the
two-line version. The row body becomes:

```jsx
                  <span className="body">
                    <div className="reading jp">{w[1]}</div>
                    {(() => {
                      const m = meaningFor(w[2], thWords[i], lang)
                      return (
                        <>
                          <div className="meaning">{m.primary}</div>
                          {m.secondary && <div className="meaning-alt">{m.secondary}</div>}
                        </>
                      )
                    })()}
                  </span>
```

- [ ] **Step 7: Add styles to `src/styles.css`**

Append:

```css
/* ----- language switch ----- */
.lang-switch {
  display: flex;
  gap: 4px;
}
.lang-switch button {
  font-size: 12px;
  padding: 4px 10px;
  border: 1px solid var(--ink, #111111);
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.lang-switch button.active {
  background: var(--ink, #111111);
  color: var(--paper, #fafaf7);
}

/* secondary meaning line, shown only in TH+EN */
.meaning-alt {
  opacity: 0.5;
  font-size: 0.9em;
}
```

- [ ] **Step 8: Verify in the browser**

Run: `pnpm dev`, open http://localhost:5173

Check, in order:
1. Three language buttons appear in the header, `ไทย+EN` active.
2. Every word still shows its English meaning — Thai files are all empty, so
   the fallback is doing its job and no blank lines appear.
3. Clicking `ไทย` and `EN` changes nothing visible yet (still all fallback), but
   does not error. Open the console and confirm it is clean.
4. Reload the page — the selected button stays selected.
5. Search `blue` — 青 and 青い appear.

- [ ] **Step 9: Verify the build and full suite**

Run: `pnpm test && pnpm build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 10: Commit**

```bash
git add src/search.js src/App.jsx src/views/Browse.jsx src/styles.css tests/search.test.js
git commit -m "feat: language switch and Thai meanings in Browse"
```

---

### Task 4: Flashcards and Quiz

Extracts the quiz builder so the decoy-collision fix can be tested, then wires
both views to the language switch.

**Files:**
- Create: `src/views/quiz-build.js`
- Create: `tests/quiz-build.test.js`
- Modify: `src/views/Quiz.jsx`
- Modify: `src/views/Flashcards.jsx`

**Interfaces:**
- Consumes: `meaningFor` from `src/lang.js`; `prefs`, `store` from `src/store.js`; `TH`, `thFor` from `src/data/index.js`.
- Produces, from `src/views/quiz-build.js`:
  - `QUIZ_LEN` — `10`
  - `CHOICES` — `4`
  - `shuffle(arr, rand?)` — returns a new shuffled array
  - `pickDecoys(words, thWords, qi, count, rand?)` — returns an array of indices
  - `buildQuiz(words, thWords, seen, rand?)` — returns `{ questions, seen }` where
    `questions` is an array of `{ qi, choices, dir }` and `seen` is the updated `Set`
  - `rand` defaults to `Math.random` everywhere and is injected only by tests.

- [ ] **Step 1: Write the failing test**

Create `tests/quiz-build.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { QUIZ_LEN, CHOICES, shuffle, pickDecoys, buildQuiz } from '../src/views/quiz-build.js'

// 青 and 青い share both glosses — the exact collision this task fixes.
const WORDS = [
  ['青', 'あお', 'blue'],
  ['青い', 'あおい', 'blue'],
  ['赤', 'あか', 'red'],
  ['白', 'しろ', 'white'],
  ['黒', 'くろ', 'black'],
  ['緑', 'みどり', 'green'],
  ['黄色', 'きいろ', 'yellow'],
  ['紫', 'むらさき', 'purple'],
]
const TH = [
  'สีน้ำเงิน',
  'สีน้ำเงิน',
  'สีแดง',
  'สีขาว',
  'สีดำ',
  'สีเขียว',
  'สีเหลือง',
  'สีม่วง',
]

/** Deterministic generator cycling through the given values. */
function seq(values) {
  let i = 0
  return () => values[i++ % values.length]
}

describe('shuffle', () => {
  it('keeps the same members', () => {
    const out = shuffle([1, 2, 3, 4], seq([0.9, 0.1, 0.5]))
    expect(out.sort()).toEqual([1, 2, 3, 4])
  })

  it('does not mutate the input', () => {
    const input = [1, 2, 3]
    shuffle(input, seq([0.9, 0.1]))
    expect(input).toEqual([1, 2, 3])
  })
})

describe('pickDecoys', () => {
  it('returns the requested number of decoys', () => {
    const d = pickDecoys(WORDS, TH, 0, CHOICES - 1)
    expect(d).toHaveLength(CHOICES - 1)
  })

  it('never returns the answer itself', () => {
    for (let n = 0; n < 50; n++) {
      expect(pickDecoys(WORDS, TH, 2, CHOICES - 1)).not.toContain(2)
    }
  })

  it('never returns a decoy whose English gloss equals the answer', () => {
    for (let n = 0; n < 50; n++) {
      // index 0 is 'blue'; index 1 is also 'blue' and must be excluded
      expect(pickDecoys(WORDS, TH, 0, CHOICES - 1)).not.toContain(1)
    }
  })

  it('never returns a decoy whose Thai gloss equals the answer', () => {
    // Same English, different Thai would still collide in TH mode.
    const th = [...TH]
    const words = WORDS.map((w) => [...w])
    words[1][2] = 'blue-ish' // English now differs...
    // ...but Thai is still 'สีน้ำเงิน' for both, so it must still be rejected
    for (let n = 0; n < 50; n++) {
      expect(pickDecoys(words, th, 0, CHOICES - 1)).not.toContain(1)
    }
  })

  it('returns decoys with distinct glosses from each other', () => {
    for (let n = 0; n < 50; n++) {
      const d = pickDecoys(WORDS, TH, 2, CHOICES - 1)
      const en = d.map((i) => WORDS[i][2])
      const th = d.map((i) => TH[i])
      expect(new Set(en).size).toBe(en.length)
      expect(new Set(th).size).toBe(th.length)
    }
  })

  it('terminates and returns fewer decoys when the pool is too small', () => {
    const tiny = [
      ['青', 'あお', 'blue'],
      ['青い', 'あおい', 'blue'],
    ]
    const tinyTh = ['สีน้ำเงิน', 'สีน้ำเงิน']
    const d = pickDecoys(tiny, tinyTh, 0, CHOICES - 1)
    expect(d).toHaveLength(0)
  })

  it('tolerates untranslated entries', () => {
    const blank = WORDS.map(() => '')
    const d = pickDecoys(WORDS, blank, 2, CHOICES - 1)
    expect(d).toHaveLength(CHOICES - 1)
    expect(new Set(d.map((i) => WORDS[i][2])).size).toBe(d.length)
  })
})

describe('buildQuiz', () => {
  const big = Array.from({ length: 200 }, (_, i) => [`語${i}`, `ご${i}`, `meaning ${i}`])
  const bigTh = big.map((_, i) => `ความหมาย ${i}`)

  it('builds QUIZ_LEN questions', () => {
    const { questions } = buildQuiz(big, bigTh, new Set())
    expect(questions).toHaveLength(QUIZ_LEN)
  })

  it('never repeats a word within one quiz', () => {
    const { questions } = buildQuiz(big, bigTh, new Set())
    expect(new Set(questions.map((q) => q.qi)).size).toBe(QUIZ_LEN)
  })

  it('includes the answer among the choices', () => {
    const { questions } = buildQuiz(big, bigTh, new Set())
    for (const q of questions) expect(q.choices).toContain(q.qi)
  })

  it('gives every question a direction', () => {
    const { questions } = buildQuiz(big, bigTh, new Set())
    for (const q of questions) expect(['jm', 'mj']).toContain(q.dir)
  })

  it('avoids words already seen', () => {
    const seen = new Set(Array.from({ length: 190 }, (_, i) => i))
    const { questions } = buildQuiz(big, bigTh, seen)
    for (const q of questions) expect(q.qi).toBeGreaterThanOrEqual(190)
  })

  it('starts a fresh cycle when the pool is exhausted', () => {
    const seen = new Set(big.map((_, i) => i))
    const { questions, seen: after } = buildQuiz(big, bigTh, seen)
    expect(questions).toHaveLength(QUIZ_LEN)
    expect(after.size).toBe(QUIZ_LEN)
  })

  it('returns the seen set updated with this round', () => {
    const { questions, seen } = buildQuiz(big, bigTh, new Set())
    for (const q of questions) expect(seen.has(q.qi)).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test tests/quiz-build.test.js`
Expected: FAIL — cannot resolve `../src/views/quiz-build.js`.

- [ ] **Step 3: Write `src/views/quiz-build.js`**

```js
// Quiz question construction — pure, so the randomness rules stay testable.

export const QUIZ_LEN = 10
export const CHOICES = 4

/** Attempts before giving up on filling a question's decoys. Guards against a
 *  corpus too small or too repetitive to satisfy the uniqueness rules. */
const MAX_DRAWS = 500

export function shuffle(arr, rand = Math.random) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Wrong answers for question `qi`.
 *
 * A decoy is rejected when its English gloss OR its Thai gloss matches the
 * answer's, or another decoy's. Checking both languages means one built quiz
 * stays valid however the reader flips the language switch — 青 and 青い are
 * both "blue" and both "สีน้ำเงิน", and either collision would give a question
 * two correct answers.
 */
export function pickDecoys(words, thWords, qi, count, rand = Math.random) {
  const usedEn = new Set([words[qi][2]])
  const answerTh = (thWords[qi] || '').trim()
  const usedTh = new Set(answerTh ? [answerTh] : [])
  const decoys = []

  for (let draws = 0; decoys.length < count && draws < MAX_DRAWS; draws++) {
    const d = Math.floor(rand() * words.length)
    if (d === qi) continue
    const en = words[d][2]
    const th = (thWords[d] || '').trim()
    if (usedEn.has(en)) continue
    if (th && usedTh.has(th)) continue
    usedEn.add(en)
    if (th) usedTh.add(th)
    decoys.push(d)
  }
  return decoys
}

/**
 * @param {Array} words     the level's [expression, reading, meaning] triples
 * @param {string[]} thWords the level's Thai glosses, index-aligned
 * @param {Set<number>} seen indices asked in previous rounds
 * @returns {{questions: Array<{qi:number, choices:number[], dir:'jm'|'mj'}>, seen:Set<number>}}
 */
export function buildQuiz(words, thWords, seen, rand = Math.random) {
  let pool = new Set(seen)
  let fresh = words.map((_, i) => i).filter((i) => !pool.has(i))
  if (fresh.length < QUIZ_LEN) {
    // pool exhausted — start a new cycle
    pool = new Set()
    fresh = words.map((_, i) => i)
  }

  const picks = shuffle(fresh, rand).slice(0, QUIZ_LEN)
  picks.forEach((i) => pool.add(i))

  const questions = picks.map((qi) => ({
    qi,
    choices: shuffle([qi, ...pickDecoys(words, thWords, qi, CHOICES - 1, rand)], rand),
    dir: rand() < 0.5 ? 'jm' : 'mj', // jm: word->meaning, mj: meaning->word
  }))

  return { questions, seen: pool }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test tests/quiz-build.test.js`
Expected: PASS — 16 tests.

- [ ] **Step 5: Rewrite `src/views/Quiz.jsx` to use the builder and the language switch**

Replace lines 1–68 (the imports, `shuffle`, and `buildQuiz`) with:

```jsx
import { useState, useSyncExternalStore } from 'react'
import { LEVELS, WORDS, TH } from '../data/index.js'
import { store, prefs } from '../store.js'
import { meaningFor } from '../lang.js'
import { QUIZ_LEN, buildQuiz } from './quiz-build.js'

const SEEN_KEY = (level) => `jlpt-vocab:quizseen:v1:${level}`

/** Words already asked in past sessions — avoided until the whole level is exhausted. */
function readSeen(level) {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY(level)) || '[]'))
  } catch {
    return new Set()
  }
}
function writeSeen(level, seen) {
  localStorage.setItem(SEEN_KEY(level), JSON.stringify([...seen]))
}

function startQuiz(level) {
  const { questions, seen } = buildQuiz(WORDS[level], TH[level], readSeen(level))
  writeSeen(level, seen)
  return questions
}
```

Then inside `export default function Quiz()`:

a. Add the language subscription and the Thai array, right after
`const [score, setScore] = useState(0)`:

```jsx
  const lang = useSyncExternalStore(store.subscribe, prefs.getLang)
  const words = WORDS[level]
  const thWords = TH[level]
  const label = (i) => meaningFor(words[i][2], thWords[i], lang).primary
```

and delete the now-duplicated `const words = WORDS[level]` line below it.

b. Replace `setQuiz(buildQuiz(level))` inside `start` with:

```jsx
    setQuiz(startQuiz(level))
```

c. In the question block, replace `<div className="q-meaning">{words[qi][2]}</div>` with:

```jsx
            <div className="q-meaning">{label(qi)}</div>
```

d. In the choices block, replace `words[ci][2]` with:

```jsx
                label(ci)
```

- [ ] **Step 6: Wire `src/views/Flashcards.jsx` to the language switch**

a. Replace the import block (lines 1–3) with:

```jsx
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { LEVELS, WORDS, TH, wordId } from '../data/index.js'
import { store, prefs } from '../store.js'
import { meaningFor } from '../lang.js'
```

b. Add the language subscription right after `const [got, setGot] = useState(0)`:

```jsx
  const lang = useSyncExternalStore(store.subscribe, prefs.getLang)
```

c. Carry the Thai gloss on each pool item — replace the `pool` memo with:

```jsx
  const pool = useMemo(() => {
    const all = WORDS[level].map((w, i) => ({ w, th: TH[level][i], id: wordId(level, i) }))
    return skipKnown ? all.filter((x) => !store.isKnown(x.id)) : all
  }, [level, skipKnown])
```

d. Replace `const { w } = deck[pos]` with:

```jsx
  const { w, th } = deck[pos]
  const meaning = meaningFor(w[2], th, lang)
```

e. Replace the flipped card back with the two-line version:

```jsx
          {flipped ? (
            <>
              <div className="reading jp">{w[1]}</div>
              <div className="meaning">{meaning.primary}</div>
              {meaning.secondary && <div className="meaning-alt">{meaning.secondary}</div>}
            </>
          ) : (
            <div className="hint">แตะเพื่อเปิดเฉลย · ปัดซ้าย/ขวาเพื่อตอบ</div>
          )}
```

- [ ] **Step 7: Verify in the browser**

Run: `pnpm dev`

Check:
1. Flashcards — start a deck, flip a card, the English meaning shows (fallback).
   Switch language in the header mid-deck; the card back updates without
   resetting the deck.
2. Quiz — run one full round of 10 in each of the three language modes. No
   question shows the same option text twice. No console errors.
3. Existing behaviour intact: swipe left/right still marks known/unknown,
   arrow keys still work, quiz score still counts.

- [ ] **Step 8: Verify the build and full suite**

Run: `pnpm test && pnpm build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/views/quiz-build.js src/views/Quiz.jsx src/views/Flashcards.jsx tests/quiz-build.test.js
git commit -m "feat: Thai meanings in Flashcards and Quiz, reject colliding decoys"
```

---

### Task 5: Translation script

The offline pipeline. Pure parts are unit-tested; the network parts are thin
adapters exercised by the sample run in Task 6.

**Files:**
- Create: `scripts/translate-th/validate.mjs`
- Create: `scripts/translate-th/prompt.mjs`
- Create: `scripts/translate-th/providers.mjs`
- Create: `scripts/translate-th/cache.mjs`
- Create: `scripts/translate-th/cli.mjs`
- Create: `tests/translate-validate.test.js`
- Create: `tests/translate-prompt.test.js`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `src/data/index.js` data files, read from disk (not imported — the
  script runs in plain Node without Vite's JSON import handling).
- Produces:
  - `validateGloss(s)` → `null` when valid, otherwise a reason string.
  - `buildPrompt(items)` → `{ system: string, user: string }`; `items` is an array of `{ n, expression, reading, meaning }`.
  - `parseResponse(text, items)` → `{ glosses: Record<number,string>, error: string|null }`.
  - `PROVIDERS` — `{ ollama, openai }`, each `(model, {system, user}) => Promise<string>`.
  - `loadCache(path)` / `saveCache(path, map)` — plain `Record<string,string>` keyed by English gloss.
  - `cli.mjs` is an entry point, not a module — nothing imports from it.

- [ ] **Step 1: Write the failing validation test**

Create `tests/translate-validate.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { validateGloss } from '../scripts/translate-th/validate.mjs'

describe('validateGloss accepts', () => {
  it('a plain Thai gloss', () => {
    expect(validateGloss('สีน้ำเงิน')).toBeNull()
  })

  it('comma-separated Thai alternatives', () => {
    expect(validateGloss('พบ, เจอ')).toBeNull()
  })

  it('Thai with a parenthetical', () => {
    expect(validateGloss('ร่าเริง, สดใส (นิสัยหรืออากาศ)')).toBeNull()
  })

  it('Thai with digits', () => {
    expect(validateGloss('ชั้น 2')).toBeNull()
  })
})

describe('validateGloss rejects', () => {
  it('an empty string', () => {
    expect(validateGloss('')).toBe('empty')
  })

  it('whitespace only', () => {
    expect(validateGloss('   ')).toBe('empty')
  })

  it('a non-string', () => {
    expect(validateGloss(null)).toBe('not a string')
    expect(validateGloss(42)).toBe('not a string')
  })

  it('text with no Thai characters', () => {
    expect(validateGloss('blue')).toBe('no Thai characters')
  })

  it('leftover kanji', () => {
    expect(validateGloss('สีน้ำเงิน 青')).toBe('contains kana or kanji')
  })

  it('leftover kana', () => {
    expect(validateGloss('สีน้ำเงิน あお')).toBe('contains kana or kanji')
  })

  it('leftover Latin letters', () => {
    expect(validateGloss('สีน้ำเงิน (blue)')).toBe('contains Latin letters')
  })

  it('a runaway sentence', () => {
    expect(validateGloss('สี'.repeat(100))).toBe('too long')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test tests/translate-validate.test.js`
Expected: FAIL — cannot resolve `../scripts/translate-th/validate.mjs`.

- [ ] **Step 3: Write `scripts/translate-th/validate.mjs`**

```js
// Quality gate for a single returned gloss. Anything this rejects goes back on
// the retry queue rather than into the data files.

// Escapes, not literal characters — these ranges must survive being copied
// through editors and terminals.
const THAI = /[\u0E00-\u0E7F]/
const KANA_OR_KANJI = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF]/
const LATIN = /[A-Za-z]/
const MAX_LEN = 120

/** @returns {string|null} null when valid, otherwise the reason it was rejected. */
export function validateGloss(s) {
  if (typeof s !== 'string') return 'not a string'
  const t = s.trim()
  if (!t) return 'empty'
  if (!THAI.test(t)) return 'no Thai characters'
  if (KANA_OR_KANJI.test(t)) return 'contains kana or kanji'
  if (LATIN.test(t)) return 'contains Latin letters'
  if (t.length > MAX_LEN) return 'too long'
  return null
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test tests/translate-validate.test.js`
Expected: PASS — 13 tests.

- [ ] **Step 5: Write the failing prompt/parse test**

Create `tests/translate-prompt.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { buildPrompt, parseResponse } from '../scripts/translate-th/prompt.mjs'

const ITEMS = [
  { n: 1, expression: '青', reading: 'あお', meaning: 'blue' },
  { n: 2, expression: '開ける', reading: 'あける', meaning: 'to open (v.t.)' },
]

describe('buildPrompt', () => {
  it('returns a system and user message', () => {
    const p = buildPrompt(ITEMS)
    expect(typeof p.system).toBe('string')
    expect(typeof p.user).toBe('string')
  })

  it('tells the model these are dictionary headwords, not sentences', () => {
    expect(buildPrompt(ITEMS).system).toMatch(/headword/i)
  })

  it('includes every item with its number, expression, reading and meaning', () => {
    const { user } = buildPrompt(ITEMS)
    expect(user).toContain('1')
    expect(user).toContain('青')
    expect(user).toContain('あお')
    expect(user).toContain('blue')
    expect(user).toContain('2')
    expect(user).toContain('開ける')
    expect(user).toContain('to open (v.t.)')
  })
})

describe('parseResponse', () => {
  it('parses a clean JSON object', () => {
    const r = parseResponse('{"1":"สีน้ำเงิน","2":"เปิด"}', ITEMS)
    expect(r.error).toBeNull()
    expect(r.glosses).toEqual({ 1: 'สีน้ำเงิน', 2: 'เปิด' })
  })

  it('strips a markdown code fence', () => {
    const r = parseResponse('```json\n{"1":"สีน้ำเงิน","2":"เปิด"}\n```', ITEMS)
    expect(r.error).toBeNull()
    expect(r.glosses[1]).toBe('สีน้ำเงิน')
  })

  it('ignores prose around the JSON', () => {
    const r = parseResponse('Here you go:\n{"1":"สีน้ำเงิน","2":"เปิด"}\nHope that helps!', ITEMS)
    expect(r.error).toBeNull()
    expect(r.glosses[2]).toBe('เปิด')
  })

  it('reports unparseable output', () => {
    const r = parseResponse('I cannot do that', ITEMS)
    expect(r.error).toMatch(/no JSON/i)
  })

  it('reports a missing item', () => {
    const r = parseResponse('{"1":"สีน้ำเงิน"}', ITEMS)
    expect(r.error).toMatch(/missing/i)
  })

  it('reports an invalid gloss', () => {
    const r = parseResponse('{"1":"สีน้ำเงิน","2":"to open"}', ITEMS)
    expect(r.error).toMatch(/item 2/)
  })

  it('coerces numeric keys consistently', () => {
    const r = parseResponse('{"1": "สีน้ำเงิน", "2": "เปิด"}', ITEMS)
    expect(r.glosses[1]).toBe('สีน้ำเงิน')
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `pnpm test tests/translate-prompt.test.js`
Expected: FAIL — cannot resolve `../scripts/translate-th/prompt.mjs`.

- [ ] **Step 7: Write `scripts/translate-th/prompt.mjs`**

```js
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
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `pnpm test tests/translate-prompt.test.js`
Expected: PASS — 10 tests.

- [ ] **Step 9: Write `scripts/translate-th/providers.mjs`**

```js
// One request function per backend, same shape: (model, {system, user}) => text.

async function ollama(model, { system, user }) {
  const host = process.env.OLLAMA_HOST || 'http://localhost:11434'
  const res = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      options: { temperature: 0.2 },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`)
  const json = await res.json()
  return json.message?.content ?? ''
}

async function openai(model, { system, user }) {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not set')
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`openai ${res.status}: ${await res.text()}`)
  const json = await res.json()
  return json.choices?.[0]?.message?.content ?? ''
}

export const PROVIDERS = { ollama, openai }
```

- [ ] **Step 10: Write `scripts/translate-th/cache.mjs`**

```js
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
```

- [ ] **Step 11: Write `scripts/translate-th/cli.mjs`**

```js
#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { buildPrompt, parseResponse } from './prompt.mjs'
import { PROVIDERS } from './providers.mjs'
import { loadCache, saveCache } from './cache.mjs'

const LEVELS = ['n5', 'n4', 'n3', 'n2', 'n1']
const BATCH = 50
const RETRIES = 3

function parseArgs(argv) {
  const args = { provider: 'ollama', model: 'translategemma:12b', sample: 0, levels: LEVELS }
  for (let i = 0; i < argv.length; i += 2) {
    const [k, v] = [argv[i], argv[i + 1]]
    if (k === '--provider') args.provider = v
    else if (k === '--model') args.model = v
    else if (k === '--sample') args.sample = Number(v)
    else if (k === '--levels') args.levels = v.split(',')
    else throw new Error(`unknown flag ${k}`)
  }
  return args
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
    // Sample from both ends of the difficulty range: first level and last level.
    const half = Math.ceil(args.sample / 2)
    queue = [...queue.slice(0, half), ...queue.slice(-half)]
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

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 12: Register the script and ignore the cache**

Add to `"scripts"` in `package.json`:

```json
    "translate:th": "node scripts/translate-th/cli.mjs",
```

Append to `.gitignore`:

```
scripts/translate-th/.cache/
```

- [ ] **Step 13: Run the full suite**

Run: `pnpm test`
Expected: PASS — every test from Tasks 1–5.

- [ ] **Step 14: Smoke-test the CLI's argument handling**

Run: `pnpm translate:th --provider ollama --model nonexistent-model --sample 2`
Expected: it prints the provider line, attempts a batch, retries 3 times with a
visible error, prints `FAILED`, then prints the two sampled words with `TH: —`.
This confirms the retry path and the sample path without needing a working model.

- [ ] **Step 15: Commit**

```bash
git add scripts/translate-th package.json .gitignore tests/translate-validate.test.js tests/translate-prompt.test.js
git commit -m "feat: add resumable Thai translation script with pluggable providers"
```

---

### Task 6: Model bake-off

Decide which model translates the corpus. This task ends with a human decision,
not a passing test.

**Files:** none changed — this task only reads.

**Interfaces:**
- Consumes: `scripts/translate-th/cli.mjs` from Task 5.
- Produces: the chosen `--provider` and `--model` values for Task 7.

- [ ] **Step 1: Pull the translation-specialist model**

```bash
ollama pull translategemma:12b
```

Expected: ~8.1GB download.

- [ ] **Step 2: Run the sample through each candidate**

```bash
pnpm translate:th --provider ollama --model translategemma:12b --sample 50 > /tmp/bakeoff-translategemma.txt
pnpm translate:th --provider ollama --model gemma4:12b --sample 50 > /tmp/bakeoff-gemma4.txt
```

If an OpenAI key is available, add a third:

```bash
OPENAI_API_KEY=... pnpm translate:th --provider openai --model gpt-4.1-mini --sample 50 > /tmp/bakeoff-openai.txt
```

- [ ] **Step 3: Compare the three side by side**

Read all three files. Judge on:
- **Sense selection** — did `開ける "to open (v.t.)"` become เปิด, or something about opening a *shop*?
- **Register** — dictionary gloss, or a full sentence?
- **Contamination** — any leftover English, romaji, kana or kanji that slipped past validation?
- **N1 abstract words** — this is where a sentence-translation model degrades first.

Present the comparison to the user and let them pick. Do not proceed to Task 7
without an explicit choice.

- [ ] **Step 4: Record the decision**

Add a short section to the bottom of
`docs/superpowers/specs/2026-08-01-thai-translations-design.md` under a
`## Model chosen` heading, naming the provider, the model, and a one-line reason.

```bash
git add docs/superpowers/specs/2026-08-01-thai-translations-design.md
git commit -m "docs: record the model chosen for Thai translation"
```

---

### Task 7: Full translation run

**Files:**
- Modify: `src/data/th/{n5,n4,n3,n2,n1}.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: the provider and model chosen in Task 6.
- Produces: populated Thai data files.

- [ ] **Step 1: Translate N5 first and inspect the result**

```bash
pnpm translate:th --provider <chosen> --model <chosen> --levels n5
```

Expected: `n5: 718/718 translated`, exit code 0. A local run may take a while;
the script checkpoints every 50 glosses, so it is safe to interrupt and re-run.

- [ ] **Step 2: Verify N5 in the browser before spending hours on the rest**

Run: `pnpm dev`

Check:
1. Browse N5 in `ไทย` mode — meanings are Thai, no blanks, no English left over.
2. `ไทย+EN` mode — Thai on top, muted English underneath.
3. Search `สีน้ำเงิน` — finds 青.
4. Quiz on N5 in `ไทย` mode — ten questions, no duplicated option text.

If the quality is not acceptable, stop and go back to Task 6 with a different
model. The `.cache` is per-model, so switching costs nothing already spent.

- [ ] **Step 3: Commit N5**

```bash
git add src/data/th/n5.json
git commit -m "data: Thai translations for N5"
```

- [ ] **Step 4: Translate the remaining levels**

```bash
pnpm translate:th --provider <chosen> --model <chosen> --levels n4,n3,n2,n1
```

Expected: each level reports `<n>/<n> translated` and the command exits 0. If it
exits 1, it lists the glosses that failed — re-run the same command; cached
entries are skipped and only the failures are retried.

- [ ] **Step 5: Verify the data files**

Run: `pnpm test`
Expected: PASS — `tests/data.test.js` confirms lengths still line up at 7,972.

Then check coverage:

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs'
let total = 0, done = 0
for (const lv of ['n5','n4','n3','n2','n1']) {
  const a = JSON.parse(readFileSync('src/data/th/' + lv + '.json', 'utf8'))
  const d = a.filter((s) => s.trim()).length
  console.log(lv, d + '/' + a.length)
  total += a.length; done += d
}
console.log('TOTAL', done + '/' + total)
"
```

Expected: `TOTAL 7972/7972`.

- [ ] **Step 6: Check the bundle size**

Run: `pnpm build`
Expected: build succeeds. Note the reported gzip size — the spec budgeted about
90KB of gzipped Thai on top of the existing bundle. If it lands far above that,
report the number rather than silently accepting it.

- [ ] **Step 7: Update the README**

In `README.md`, under `## Features`, change the Browse bullet to mention Thai:

```markdown
- **Browse** — ไล่ดู/ค้นหาศัพท์ตามระดับ (คันจิ, คำอ่าน, ความหมาย ไทย/EN) และ MARK คำที่รู้แล้ว
```

Add a bullet after the Quiz bullet:

```markdown
- **สลับภาษา** — ปุ่ม ไทย / EN / ไทย+EN บนหัวเว็บ คุมความหมายทั้ง Browse, Flashcards และ Quiz
```

Replace the `## Data` section with:

```markdown
## Data

คำศัพท์จาก [elzup/jlpt-word-list](https://github.com/elzup/jlpt-word-list) (MIT)
แปลงจาก CSV เป็น JSON ไว้ที่ `src/data/*.json` ตอน build ไม่มีการโหลดข้อมูลจากภายนอก

รูปแบบข้อมูล: `[expression, reading, meaning]` ต่อคำ

คำแปลไทยอยู่ที่ `src/data/th/*.json` เป็น array ของ string เรียงตรง index กับไฟล์ข้างบน 1:1
สร้างด้วย AI ครั้งเดียวตอน authoring แล้ว commit ลง repo — ไม่มีการแปลตอน runtime
ค่าว่างหมายถึงยังไม่ได้แปล แล้วจะ fallback ไปแสดงภาษาอังกฤษแทน

สร้าง/อัปเดตคำแปลใหม่:

```bash
pnpm translate:th --provider ollama --model translategemma:12b        # ทั้งหมด
pnpm translate:th --provider ollama --model translategemma:12b --levels n5
pnpm translate:th --provider openai --model gpt-4.1-mini --sample 50  # ลองดูตัวอย่างก่อน
```

สคริปต์ cache ผลลัพธ์ไว้ที่ `scripts/translate-th/.cache/` (ไม่ commit)
หยุดกลางคันแล้วรันใหม่ได้ ของที่แปลแล้วจะถูกข้าม
```

Also add a `## Test` section after `## Run`:

```markdown
## Test

```bash
pnpm test
```

เทสต์เป็น pure-function ล้วน (vitest, ไม่ใช้ jsdom) — ครอบ display rules, search,
quiz builder และ validation ของสคริปต์แปล
```

- [ ] **Step 8: Final verification**

Run: `pnpm test && pnpm build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/data/th README.md
git commit -m "data: Thai translations for N4-N1, document the language feature"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Separate index-aligned `src/data/th/*.json` | 1 |
| `TH` export and lookup helper | 1 |
| Empty string = not translated, silent English fallback | 1 (helper), 2 (`meaningFor`), verified 3/4 |
| Three-value language switch persisted in localStorage | 2 (`prefs`), 3 (UI) |
| Browse two-line meaning | 3 |
| Browse searches Thai, placeholder updated | 3 |
| Flashcards card back follows the switch | 4 |
| Quiz prompt and choices follow the switch | 4 |
| Quiz rejects decoys colliding with the answer | 4 |
| Dedupe by English gloss | 5 (`pending` map) |
| Batch of ~50 with expression + reading + gloss | 5 |
| Resume via on-disk cache | 5 |
| Validation with retry, report failures | 5 |
| Pluggable provider | 5 |
| `--sample 50` bake-off | 5 (flag), 6 (run) |
| Bundle stays in the main chunk, size noted | 7 Step 6 |
| Never modify upstream data files | Global constraint; no task touches them |
| No runtime translation | Global constraint; script is manual, never in `build` |

**Note on the sample:** the spec asked for 25 N5 + 25 N1 words. The implemented
`--sample` takes the first and last halves of the deduplicated queue, which
lands on N5 words at the head and N1 words at the tail when all levels are
queued — the same intent, achieved without a second selection path.
