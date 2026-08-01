# Thai translations for JLPT Vocab — design

Date: 2026-08-01
Status: approved, pending implementation plan

## Goal

Show Thai meanings alongside (or instead of) the English glosses for all 7,972
JLPT N5–N1 words, without giving up the app's client-side-only design.

## Background

`src/data/{n5..n1}.json` holds `[expression, reading, meaning]` triples sourced
from [elzup/jlpt-word-list](https://github.com/elzup/jlpt-word-list) (MIT).
Total 396KB, bundled eagerly at build time. Meanings are English only.

No usable open Japanese–Thai gloss dataset exists. JMdict — the largest
multilingual Japanese dictionary — ships English, Dutch, French, German,
Hungarian, Russian, Slovenian, Spanish and Swedish glosses, but not Thai.
Wiktionary would have to be scraped word by word for low coverage, worst on the
abstract N1 vocabulary. Therefore all 7,972 Thai glosses are machine-translated
once, at authoring time, and committed to the repo. Nothing is translated at
runtime.

## Decisions

- Translate every word with one model, for consistent register and phrasing.
  A dataset/AI hybrid was considered and rejected: the dataset half would cover
  under 10% and mix two voices.
- Pick the model by evidence, not by reputation. The pipeline is provider-
  agnostic and a 50-word bake-off runs before the full 7,972-word job.
- Keep translations in files separate from the source data, aligned by index.

## Part A — data and translation pipeline

### Data layout

```
src/data/n5.json       unchanged: [expression, reading, meaning]
src/data/th/n5.json    new: ["อ่า!, โอ้!", "พบ, เจอ", "สีน้ำเงิน", ...]
```

`src/data/th/<level>.json` is a flat array of Thai strings, index-aligned 1:1
with the same level's source array. This keeps the upstream data pristine so it
can be re-synced, lets a partially finished translation run ship as-is, and
leaves the door open to loading Thai separately later.

A missing or empty string at an index means "not translated yet".

`src/data/index.js` gains a `TH` export shaped like the existing `WORDS`, plus a
lookup helper that returns the Thai gloss or `null`.

### `scripts/translate-th.mjs`

Run manually, not part of `pnpm build`. Responsibilities:

1. **Dedupe.** Words sharing an identical English gloss (青 and 青い are both
   "blue") translate once and share the result.
2. **Batch.** ~50 words per request, JSON in and JSON out. Each item carries
   expression, reading and English gloss so the model can disambiguate.
   The prompt states that these are dictionary headwords and asks for a concise
   Thai gloss, not a sentence translation.
3. **Resume.** Every completed batch is written to an on-disk cache keyed by the
   English gloss. Re-running skips cached entries. A local run may take 1–3
   hours; it must survive being interrupted.
4. **Validate.** Each returned gloss must contain Thai characters, contain no
   kanji/kana/Latin letters, be within a sane length bound, and the batch must
   return exactly as many items as were sent. Failures go back on the queue and
   are retried; after a retry cap the script prints the list of words it could
   not translate and exits non-zero.
5. **Pluggable provider.** `--provider ollama --model translategemma:12b` or
   `--provider openai --model <name>`. Only the request function differs.

### Bake-off before the full run

`--sample 50` picks 25 N5 words and 25 N1 words — the easiest and hardest ends
of the corpus — and runs them through each candidate. Candidates on hand:

- `translategemma:12b` (Ollama, 8.1GB) — Gemma 3 based, purpose-built for
  translation, explicitly supports `ja` and `th`. Risk: it is a *sentence*
  translator, so terse ambiguous glosses like `"to open (v.t.)"` or
  `"fall (season)"` may come back literal.
- `gemma4:12b` (Ollama, already installed) — general model, better at
  interpreting dictionary shorthand, possibly weaker Thai.
- An OpenAI model via the user's existing key.

Results are shown side by side; the user picks the winner, then the full run
proceeds with that provider.

## Part B — UI

### Language switch

One global preference with three values: `TH`, `EN`, `TH+EN`. Rendered in the
top bar beside the Browse / Flashcards / Quiz tabs. Persisted in localStorage
via a new `prefs` slice in `src/store.js`, alongside the existing progress
store — same concern, same file.

### Browse

The meaning line follows the switch:

```
明るい   あかるい
         ร่าเริง, สดใส (นิสัยหรืออากาศ)          ← TH
         bright (in reference to personality…)   ← EN, muted, only in TH+EN
```

Search additionally matches the Thai gloss, so typing `สีน้ำเงิน` finds 青.
The input placeholder becomes `ค้นหา — คันจิ / คำอ่าน / ความหมาย ไทย-EN`.

### Flashcards

The card back renders the meaning in the selected language. No change to the
deck, shuffle or known/unknown logic.

### Quiz

The four options render in the selected language. **Distractors whose displayed
text equals the correct answer's displayed text must be rejected and re-drawn**
— 青 and 青い both translate to `สีน้ำเงิน`, which would give a question two
correct answers. The same hazard exists in English today but is rarer; Thai
glosses are shorter and collide more often.

### Bundle size

Thai adds roughly 300KB raw (~90KB gzipped), taking the app to about 700KB.
Shipped in the main bundle like the existing data. No lazy loading — it stays
small enough, and eager bundling is the established pattern here.

### Missing translations

Any word without a Thai gloss silently falls back to English, with no error
state. This makes it safe to translate and deploy one level at a time.

## Out of scope

- Runtime translation of any kind.
- Languages other than Thai.
- Changing the upstream word list or the progress/known-word model.
