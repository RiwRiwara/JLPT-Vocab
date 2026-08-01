import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { LEVELS, WORDS, TH, wordId } from '../data/index.js'
import { store, prefs } from '../store.js'
import { meaningFor } from '../lang.js'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const DECK_SIZES = [10, 20, 50]
const SWIPE_THRESHOLD = 110 // px of horizontal drag that counts as an answer
const TAP_TOLERANCE = 8 // px — less movement than this is a tap (flip)

export default function Flashcards() {
  const [level, setLevel] = useState('N5')
  const [size, setSize] = useState(20)
  const [skipKnown, setSkipKnown] = useState(true)
  const [deck, setDeck] = useState(null)
  const [pos, setPos] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [got, setGot] = useState(0)
  const lang = useSyncExternalStore(store.subscribe, prefs.getLang)

  // drag state — kept in refs during the gesture, mirrored to state for render
  const [drag, setDrag] = useState({ dx: 0, dragging: false })
  const [leaving, setLeaving] = useState(0) // -1 fly left, 1 fly right, 0 none
  const gesture = useRef(null)

  const pool = useMemo(() => {
    const all = WORDS[level].map((w, i) => ({ w, th: TH[level][i], id: wordId(level, i) }))
    return skipKnown ? all.filter((x) => !store.isKnown(x.id)) : all
  }, [level, skipKnown])

  const start = () => {
    setDeck(shuffle(pool).slice(0, size))
    setPos(0)
    setGot(0)
    setFlipped(false)
    setDrag({ dx: 0, dragging: false })
    setLeaving(0)
  }

  const commitAnswer = (knew) => {
    const card = deck[pos]
    store.setKnown(card.id, knew)
    if (knew) setGot((g) => g + 1)
    setFlipped(false)
    setDrag({ dx: 0, dragging: false })
    setLeaving(0)
    setPos((p) => p + 1)
  }

  const flyOut = (dir) => {
    // dir: 1 = right (รู้แล้ว), -1 = left (ยังไม่รู้)
    setLeaving(dir)
    setTimeout(() => commitAnswer(dir === 1), 220)
  }

  // ----- pointer gesture -----
  const onPointerDown = (e) => {
    if (leaving) return
    gesture.current = { x0: e.clientX, moved: 0 }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ dx: 0, dragging: true })
  }
  const onPointerMove = (e) => {
    if (!gesture.current || leaving) return
    const dx = e.clientX - gesture.current.x0
    gesture.current.moved = Math.max(gesture.current.moved, Math.abs(dx))
    setDrag({ dx, dragging: true })
  }
  const onPointerUp = () => {
    if (!gesture.current || leaving) return
    const { moved } = gesture.current
    const dx = drag.dx
    gesture.current = null
    if (moved <= TAP_TOLERANCE) {
      setDrag({ dx: 0, dragging: false })
      setFlipped((f) => !f)
    } else if (dx > SWIPE_THRESHOLD) {
      flyOut(1)
    } else if (dx < -SWIPE_THRESHOLD) {
      flyOut(-1)
    } else {
      setDrag({ dx: 0, dragging: false }) // spring back
    }
  }

  // ----- keyboard: ← ยังไม่รู้ · → รู้แล้ว · Space/↑ เปิดเฉลย -----
  useEffect(() => {
    if (!deck || pos >= deck.length) return
    const onKey = (e) => {
      if (leaving) return
      if (e.key === 'ArrowRight') flyOut(1)
      else if (e.key === 'ArrowLeft') flyOut(-1)
      else if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFlipped((f) => !f)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ----- setup screen -----
  if (!deck) {
    return (
      <div className="setup">
        <h2>Flashcards</h2>
        <p>
          ปัดการ์ดขวา = รู้แล้ว · ปัดซ้าย = ยังไม่รู้ · แตะกลางการ์ดเพื่อเปิดเฉลย
          <br />
          (คีย์บอร์ด: ← → และ Space)
        </p>

        <div className="levels">
          {LEVELS.map((lv) => (
            <button key={lv} className={lv === level ? 'active' : ''} onClick={() => setLevel(lv)}>
              {lv}
              <span className="cnt">เหลือ {WORDS[lv].length - store.countKnown(lv)}</span>
            </button>
          ))}
        </div>

        <div className="options">
          {DECK_SIZES.map((n) => (
            <button key={n} className={n === size ? 'active' : ''} onClick={() => setSize(n)}>
              {n} ใบ
            </button>
          ))}
          <button className={skipKnown ? 'active' : ''} onClick={() => setSkipKnown(!skipKnown)}>
            ข้ามคำที่รู้แล้ว
          </button>
        </div>

        {pool.length === 0 ? (
          <p>
            รู้ครบทุกคำใน {level} แล้ว —{' '}
            <button className="ghost-btn" onClick={() => store.resetLevel(level)}>
              รีเซ็ตระดับนี้
            </button>
          </p>
        ) : (
          <button className="primary-btn" onClick={start}>
            เริ่ม ({Math.min(size, pool.length)} ใบ)
          </button>
        )}
      </div>
    )
  }

  // ----- summary -----
  if (pos >= deck.length) {
    return (
      <div className="fc-summary">
        <div className="big mono">
          {got}/{deck.length}
        </div>
        <p>
          รู้แล้ว {got} · ยังไม่รู้ {deck.length - got} — คำที่ยังไม่รู้จะวนกลับมาในรอบหน้า
        </p>
        <button className="primary-btn" onClick={start}>
          สุ่มรอบใหม่
        </button>{' '}
        <button className="ghost-btn" onClick={() => setDeck(null)}>
          กลับไปตั้งค่า
        </button>
      </div>
    )
  }

  // ----- card -----
  const { w, th } = deck[pos]
  const meaning = meaningFor(w[2], th, lang)
  const next = deck[pos + 1]

  const dx = leaving ? leaving * 560 : drag.dx
  const style = {
    transform: `translateX(${dx}px) rotate(${dx / 16}deg)`,
    transition: drag.dragging ? 'none' : 'transform 0.22s ease',
    opacity: leaving ? 0 : 1,
  }
  const stampRight = Math.min(1, Math.max(0, dx / SWIPE_THRESHOLD))
  const stampLeft = Math.min(1, Math.max(0, -dx / SWIPE_THRESHOLD))

  return (
    <div className="fc-stage">
      <div className="fc-meta">
        <span>
          {level} · card {pos + 1}/{deck.length}
        </span>
        <span>known {got}</span>
      </div>
      <div className="fc-bar">
        <div style={{ width: `${(pos / deck.length) * 100}%` }} />
      </div>

      <div className="card-stack">
        {next && (
          <div className="card card-under">
            <div className="expr jp">{next.w[0]}</div>
          </div>
        )}
        <div
          className="card card-top"
          style={style}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="stamp stamp-yes" style={{ opacity: stampRight }}>
            รู้แล้ว
          </div>
          <div className="stamp stamp-no" style={{ opacity: stampLeft }}>
            ยังไม่รู้
          </div>

          <div className="expr jp">{w[0]}</div>
          {flipped ? (
            <>
              <div className="reading jp">{w[1]}</div>
              <div className="meaning">{meaning.primary}</div>
              {meaning.secondary && <div className="meaning-alt">{meaning.secondary}</div>}
            </>
          ) : (
            <div className="hint">แตะเพื่อเปิดเฉลย · ปัดซ้าย/ขวาเพื่อตอบ</div>
          )}
        </div>
      </div>

      <div className="fc-actions">
        <button className="btn-no" onClick={() => flyOut(-1)}>
          ← ยังไม่รู้
        </button>
        <button className="btn-yes" onClick={() => flyOut(1)}>
          รู้แล้ว →
        </button>
      </div>
    </div>
  )
}
