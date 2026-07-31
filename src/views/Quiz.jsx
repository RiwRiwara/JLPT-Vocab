import { useState } from 'react'
import { LEVELS, WORDS } from '../data/index.js'

const QUIZ_LEN = 10
const CHOICES = 4
const SEEN_KEY = (level) => `jlpt-vocab:quizseen:v1:${level}`

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

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

/**
 * Build QUIZ_LEN questions with good randomness:
 * - no word repeats within a quiz (unique picks)
 * - words asked in previous rounds are avoided until the level is exhausted,
 *   then the seen-list resets automatically
 * - each question randomly flips direction: word -> meaning, or meaning -> word
 * - decoys are unique meanings from the same level
 */
function buildQuiz(level) {
  const words = WORDS[level]
  const seen = readSeen(level)

  let fresh = words.map((_, i) => i).filter((i) => !seen.has(i))
  if (fresh.length < QUIZ_LEN) {
    // pool exhausted — start a new cycle
    seen.clear()
    fresh = words.map((_, i) => i)
  }

  const picks = shuffle(fresh).slice(0, QUIZ_LEN)
  picks.forEach((i) => seen.add(i))
  writeSeen(level, seen)

  return picks.map((qi) => {
    const used = new Set([words[qi][2]])
    const decoys = []
    while (decoys.length < CHOICES - 1) {
      const d = Math.floor(Math.random() * words.length)
      if (d !== qi && !used.has(words[d][2])) {
        used.add(words[d][2])
        decoys.push(d)
      }
    }
    return {
      qi,
      choices: shuffle([qi, ...decoys]),
      dir: Math.random() < 0.5 ? 'jm' : 'mj', // jm: word->meaning, mj: meaning->word
    }
  })
}

export default function Quiz() {
  const [level, setLevel] = useState('N5')
  const [quiz, setQuiz] = useState(null)
  const [pos, setPos] = useState(0)
  const [picked, setPicked] = useState(null)
  const [score, setScore] = useState(0)

  const words = WORDS[level]

  const start = () => {
    setQuiz(buildQuiz(level))
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
            <div className="q-meaning">{words[qi][2]}</div>
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
                words[ci][2]
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
