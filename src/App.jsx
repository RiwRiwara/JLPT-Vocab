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
