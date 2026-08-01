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

export default function Quiz() {
  const [level, setLevel] = useState('N5')
  const [quiz, setQuiz] = useState(null)
  const [pos, setPos] = useState(0)
  const [picked, setPicked] = useState(null)
  const [score, setScore] = useState(0)

  const lang = useSyncExternalStore(store.subscribe, prefs.getLang)
  const words = WORDS[level]
  const thWords = TH[level]
  const label = (i) => meaningFor(words[i][2], thWords[i], lang).primary

  const start = () => {
    setQuiz(startQuiz(level))
    setPos(0)
    setPicked(null)
    setScore(0)
  }

  if (!quiz) {
    return (
      <div className="setup">
        <h2>Quiz</h2>
        <p>
          {QUIZ_LEN} ข้อ สลับสองแบบ: เห็นศัพท์เลือกความหมาย และเห็นความหมายเลือกศัพท์
          <br />
          คำที่เคยออกแล้วจะไม่ออกซ้ำ จนกว่าจะครบทั้งระดับ
        </p>
        <div className="levels">
          {LEVELS.map((lv) => (
            <button key={lv} className={lv === level ? 'active' : ''} onClick={() => setLevel(lv)}>
              {lv}
            </button>
          ))}
        </div>
        <button className="primary-btn" onClick={start}>
          เริ่ม Quiz
        </button>
      </div>
    )
  }

  if (pos >= quiz.length) {
    return (
      <div className="fc-summary">
        <div className="big mono">
          {score}/{quiz.length}
        </div>
        <p>{score === quiz.length ? 'เต็ม — ไประดับถัดไปได้เลย' : 'ข้อที่พลาดลองไปเปิดใน Browse แล้ว MARK ไว้'}</p>
        <button className="primary-btn" onClick={start}>
          เล่นอีกรอบ (ชุดคำใหม่)
        </button>{' '}
        <button className="ghost-btn" onClick={() => setQuiz(null)}>
          เปลี่ยนระดับ
        </button>
      </div>
    )
  }

  const { qi, choices, dir } = quiz[pos]
  const answered = picked !== null

  const pick = (ci) => {
    if (answered) return
    setPicked(ci)
    if (ci === qi) setScore(score + 1)
  }

  return (
    <div>
      <div className="fc-meta" style={{ maxWidth: 620, margin: '0 auto 6px' }}>
        <span>
          {level} · {pos + 1}/{quiz.length} · {dir === 'jm' ? 'ศัพท์ → ความหมาย' : 'ความหมาย → ศัพท์'}
        </span>
        <span>score {score}</span>
      </div>

      <div className="quiz-q">
        {dir === 'jm' ? (
          <>
            <div className="expr jp">{words[qi][0]}</div>
            {answered && <div className="reading jp">{words[qi][1]}</div>}
          </>
        ) : (
          <>
            <div className="q-meaning">{label(qi)}</div>
            {answered && <div className="reading jp">{words[qi][1]}</div>}
          </>
        )}
      </div>

      <div className="choices">
        {choices.map((ci) => {
          let cls = ''
          if (answered && ci === qi) cls = 'correct'
          else if (answered && ci === picked) cls = 'wrong'
          return (
            <button key={ci} className={cls} disabled={answered} onClick={() => pick(ci)}>
              {dir === 'jm' ? (
                label(ci)
              ) : (
                <span className="jp choice-word">{words[ci][0]}</span>
              )}
            </button>
          )
        })}
      </div>

      {answered && (
        <button
          className="quiz-next"
          onClick={() => {
            setPos(pos + 1)
            setPicked(null)
          }}
        >
          {pos + 1 === quiz.length ? 'ดูผล' : 'ข้อถัดไป'}
        </button>
      )}
    </div>
  )
}
