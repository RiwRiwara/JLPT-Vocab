import { useMemo, useState, useSyncExternalStore } from 'react'
import { LEVELS, WORDS, TH, wordId } from '../data/index.js'
import { store, prefs } from '../store.js'
import { meaningFor } from '../lang.js'
import { matchWord } from '../search.js'

const PAGE = 100
const SET_SIZE = 50

// ----- gojūon row of the first kana in the reading -----
const KANA_ROWS = [
  ['あ', 'あいうえおぁぃぅぇぉアイウエオ'],
  ['か', 'かきくけこがぎぐげごカキクケコガギグゲゴ'],
  ['さ', 'さしすせそざじずぜぞサシスセソザジズゼゾ'],
  ['た', 'たちつてとだぢづでどっタチツテトダヂヅデド'],
  ['な', 'なにぬねのナニヌネノ'],
  ['は', 'はひふへほばびぶべぼぱぴぷぺぽハヒフヘホバビブベボパピプペポ'],
  ['ま', 'まみむめもマミムメモ'],
  ['や', 'やゆよゃゅょヤユヨ'],
  ['ら', 'らりるれろラリルレロ'],
  ['わ', 'わをんワヲン'],
]
function kanaRow(reading) {
  const c = (reading || '')[0]
  for (const [row, chars] of KANA_ROWS) if (chars.includes(c)) return row + ' —'
  return 'อื่น ๆ'
}

const hasKanji = (s) => /[一-鿿々]/.test(s)

const STATUS_OPTS = [
  ['all', 'ทั้งหมด'],
  ['todo', 'ยังไม่รู้'],
  ['known', 'รู้แล้ว'],
]
const SCRIPT_OPTS = [
  ['all', 'ทุกแบบ'],
  ['kanji', 'มีคันจิ'],
  ['kana', 'คานะล้วน'],
]
const GROUP_OPTS = [
  ['none', 'ไม่จัดกลุ่ม'],
  ['kana', 'หมวดเสียง あ–わ'],
  ['set', `ชุดละ ${SET_SIZE} คำ`],
]

export default function Browse() {
  const [level, setLevel] = useState('N5')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [script, setScript] = useState('all')
  const [group, setGroup] = useState('none')
  const [limit, setLimit] = useState(PAGE)
  const lang = useSyncExternalStore(store.subscribe, prefs.getLang)
  useSyncExternalStore(store.subscribe, () => store.countKnown(level) + ':' + status)

  const words = WORDS[level]
  const thWords = TH[level]

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let list = words.map((w, i) => [w, i])
    if (needle) list = list.filter(([w, i]) => matchWord(w, thWords[i], needle))
    if (status !== 'all')
      list = list.filter(([, i]) => store.isKnown(wordId(level, i)) === (status === 'known'))
    if (script !== 'all') list = list.filter(([w]) => hasKanji(w[0]) === (script === 'kanji'))
    return list
  }, [words, thWords, q, status, script, level])

  const shown = results.slice(0, limit)

  // group shown rows into [title, rows[]] sections
  const sections = useMemo(() => {
    if (group === 'none') return [[null, shown]]
    if (group === 'set') {
      const out = []
      for (let s = 0; s < shown.length; s += SET_SIZE) {
        const setNo = Math.floor(s / SET_SIZE) + 1
        out.push([`ชุดที่ ${setNo} · คำที่ ${s + 1}–${Math.min(s + SET_SIZE, results.length)}`, shown.slice(s, s + SET_SIZE)])
      }
      return out
    }
    // kana rows — keep gojūon order
    const buckets = new Map()
    for (const item of shown) {
      const key = kanaRow(item[0][1])
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key).push(item)
    }
    const order = [...KANA_ROWS.map(([r]) => r + ' —'), 'อื่น ๆ']
    return order.filter((k) => buckets.has(k)).map((k) => [k, buckets.get(k)])
  }, [shown, group, results.length])

  const reset = () => setLimit(PAGE)

  return (
    <div>
      <div className="levels">
        {LEVELS.map((lv) => (
          <button
            key={lv}
            className={lv === level ? 'active' : ''}
            onClick={() => {
              setLevel(lv)
              reset()
            }}
          >
            {lv}
            <span className="cnt">
              {store.countKnown(lv)}/{WORDS[lv].length}
            </span>
          </button>
        ))}
      </div>

      <div className="browse-sticky">
        <input
          className="search"
          placeholder="ค้นหา — คันจิ / คำอ่าน / ความหมาย ไทย-EN"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            reset()
          }}
        />
        <div className="filter-row">
          <div className="chip-group">
            {STATUS_OPTS.map(([v, label]) => (
              <button
                key={v}
                className={'chip' + (status === v ? ' active' : '')}
                onClick={() => {
                  setStatus(v)
                  reset()
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="chip-group">
            {SCRIPT_OPTS.map(([v, label]) => (
              <button
                key={v}
                className={'chip' + (script === v ? ' active' : '')}
                onClick={() => {
                  setScript(v)
                  reset()
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="chip-group">
            {GROUP_OPTS.map(([v, label]) => (
              <button
                key={v}
                className={'chip' + (group === v ? ' active' : '')}
                onClick={() => setGroup(v)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="result-meta mono">
          {results.length.toLocaleString()} words · รู้แล้ว {store.countKnown(level)}/{words.length}
        </div>
      </div>

      {sections.map(([title, rows], si) => (
        <section key={si}>
          {title && (
            <div className="group-head">
              <span className="jp">{title}</span>
              <span className="mono">{rows.length}</span>
            </div>
          )}
          <ul className="word-list">
            {rows.map(([w, i]) => {
              const id = wordId(level, i)
              const known = store.isKnown(id)
              return (
                <li className="word-row" key={id}>
                  <span className="expr jp">{w[0]}</span>
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
                  <button
                    className={'known-mark' + (known ? ' on' : '')}
                    onClick={() => store.toggle(id)}
                    title="ติ๊กว่ารู้คำนี้แล้ว"
                  >
                    {known ? 'KNOWN' : 'MARK'}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      {shown.length === 0 && <p className="empty">ไม่พบคำที่ตรงกับฟิลเตอร์</p>}

      {shown.length < results.length && (
        <button className="load-more" onClick={() => setLimit(limit + PAGE)}>
          แสดงเพิ่ม ({(results.length - shown.length).toLocaleString()} คำ)
        </button>
      )}
    </div>
  )
}
