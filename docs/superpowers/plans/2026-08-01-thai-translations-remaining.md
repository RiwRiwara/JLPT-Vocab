# Thai translations — remaining work

Everything in `2026-08-01-thai-translations.md` Tasks 1–6 is done and committed on
`feat/thai-translations`. This is what is left.

Model in use: **OpenAI `gpt-4.1`**, all five levels, for one consistent voice.
Cache: `scripts/translate-th/.cache/openai-gpt-4.1.json` (gitignored, per-model,
resumable — re-running skips everything already cached).

---

## 1. Finish the full run

- [ ] Wait for the background run to exit. Log: `full-run-gpt41.log` in the session
      scratchpad. It writes `src/data/th/*.json` only at the very END, so the files
      read `718/7972` until it completes — that is not a stall.
- [ ] Check the exit code. `0` means every gloss translated. `1` means some failed
      and the script printed them; that is expected and recoverable.
- [ ] Re-run the identical command to retry any failures. Cached glosses are
      skipped, so this is cheap:

      pnpm translate:th --provider openai --model gpt-4.1

- [ ] Repeat until it exits `0`, or until the same glosses fail twice in a row.
      A gloss that never validates is fine: its slot stays `''` and the app falls
      back to English. Record which words those are.

## 2. Verify the data

- [ ] `pnpm test` — `tests/data.test.js` proves the arrays are still index-aligned
      at 718 / 668 / 2139 / 1748 / 2699, total 7972. Alignment is the one thing that
      must never break; a misaligned array silently shows wrong meanings.
- [ ] Confirm coverage per level:

      node -e "let t=0,d=0;for(const lv of ['n5','n4','n3','n2','n1']){const a=require('./src/data/th/'+lv+'.json');const f=a.filter(s=>s.trim()).length;console.log(lv,f+'/'+a.length);t+=a.length;d+=f}console.log('TOTAL',d+'/'+t)"

- [ ] Spot-check the known-hard cases, which is where a weaker model failed the
      bake-off:
      - `開ける` "to open (v.t.)" → should be `เปิด (สกรรมกริยา)`, not `(กริยารับ)`
      - `明るい` "bright (personality or weather)" → should be `สดใส`, not `สว่าง`
      - `会う` "to meet" → should be `พบ, เจอ`, not `พบ, เห็น`
      - `いらっしゃる` and the other honorific entries → the Thai gloss SHOULD contain
        Japanese (いく, くる, いる). That is correct, not a leak.
- [ ] Sanity-scan for contamination — expect 0 Latin letters, and kana/kanji only
      in the ~39 entries whose English source also contains Japanese.

## 3. Verify in the app

- [ ] `pnpm dev`, then check each of the three language modes on a level other than
      N5 (N5 was already verified; N1 is the one to trust least).
- [ ] Search a Thai word and confirm it finds the right entry.
- [ ] Run a Quiz on N1 in `ไทย` mode. Confirm no question shows the same option text
      twice — Thai glosses collide far more than English ones, and this is the check
      that matters most.
- [ ] Confirm no console errors on a fresh page load.

## 4. Ship it

- [ ] `pnpm build` and note the gzip size. The spec budgeted ~90KB gzipped for Thai
      on top of the existing bundle; report the real number rather than assuming.
- [ ] Update `README.md` per Task 7 Step 7 of the main plan — the Browse bullet, the
      language-switch bullet, the rewritten `## Data` section, and the new `## Test`
      section.
- [ ] Commit `src/data/th/*.json` and `README.md`.
- [ ] Run the final whole-branch review, then `superpowers:finishing-a-development-branch`
      to merge `feat/thai-translations` into `main`.

## 5. Housekeeping

- [ ] **Revoke the OpenAI API key.** It was pasted in plaintext into the chat
      transcript. Rotate it at platform.openai.com/api-keys once translation is done.
- [ ] Delete the SDD workspace `.superpowers/sdd/2026-08-01-thai-translations/`
      after the final review — git history is the record from then on.

---

## Deferred, non-blocking

Carried from the ledger; the final review should triage whether any must be fixed
before merge.

- The `≤560px` media-query branch was never exercised — the test browser pins
  `innerWidth` at 1912, so the mobile fallback and the language-switch touch target
  are reviewed statically only. Worth one look on a real phone.
- `validateGloss` does not hard-throw when `sourceEn` is omitted; it fails safe
  (stricter) rather than loud. Single correct call site today.
- The direct-execution guard uses strict URL equality, so it would no-op if the
  script were ever invoked through a bin symlink. Not the case today.
