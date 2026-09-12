import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

const DEFAULT_LAYOUT = [3, 3, 4, 4, 4, 4]
const STORAGE_KEY = 'seat-change-classroom'

const shuffle = (items) => {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const readSaved = () => {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (Array.isArray(data?.seats) && data.seats.length === 22) {
      return { count: 22, layout: DEFAULT_LAYOUT, seats: data.seats }
    }
  } catch { /* start fresh */ }
  return { count: 22, layout: DEFAULT_LAYOUT, seats: shuffle(Array.from({ length: 22 }, (_, i) => i + 1)) }
}

function App() {
  const initial = useMemo(readSaved, [])
  const [count] = useState(initial.count)
  const [layout] = useState(initial.layout)
  const [seats, setSeats] = useState(initial.seats)
  const [activeAction, setActiveAction] = useState('')
  const [draggedSeat, setDraggedSeat] = useState(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count, layout, seats }))
  }, [count, layout, seats])

  const positions = useMemo(() => {
    let cursor = 0
    return layout.map((column, colIndex) => Array.from({ length: column }, (_, rowIndex) => ({
      id: `${colIndex}-${rowIndex}`,
      student: seats[cursor++] ?? null,
      label: cursor,
    })))
  }, [layout, seats])

  const flash = (name) => {
    setActiveAction(name)
    window.setTimeout(() => setActiveAction(''), 430)
  }

  const randomize = () => {
    setSeats(shuffle(Array.from({ length: count }, (_, i) => i + 1)))
    flash('random')
  }

  const moveForward = () => {
    setSeats((current) => current.length ? [...current.slice(1), current[0]] : current)
    flash('move')
  }

  const swapSeats = (from, to) => {
    if (from === null || from === to) return
    setSeats((current) => {
      const next = [...current]
      ;[next[from], next[to]] = [next[to], next[from]]
      return next
    })
  }

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top" aria-label="자리 변경 홈">자리 변경</a>
      <div className="class-info">
        <span>우리 반</span>
        <i />
        <strong>{count}명</strong>
      </div>
      <span className="layout-label">3 · 3 · 4 · 4 · 4 · 4</span>
    </header>

    <section className="hero" id="top">
      <div>
        <p className="eyebrow">CLASSROOM SEATING</p>
        <h1>오늘의 자리</h1>
      </div>
      <div className="actions">
        <button className={`outline-action ${activeAction === 'move' ? 'pressed' : ''}`} onClick={moveForward}>
          <span className="arrow">←</span> 한 칸 앞으로
        </button>
        <button className={`primary-action ${activeAction === 'random' ? 'pressed' : ''}`} onClick={randomize}>
          <span className="spark">✦</span> 랜덤 배치
        </button>
      </div>
    </section>

    <section className="classroom" aria-label="학급 자리 배치도">
      <div className="front-line"><span>교탁</span></div>
      <div className="seat-area">
        <div className="seat-grid" style={{ '--columns': layout.length }}>
          {positions.map((column, index) => <div className="seat-column" key={index}>
            {column.map((seat) => <div
              className={`seat ${activeAction ? 'seat-moving' : ''} ${draggedSeat === seat.label - 1 ? 'dragging' : ''}`}
              key={seat.id}
              style={{ '--delay': `${(index * 4 + Number(seat.id.split('-')[1])) * 18}ms` }}
              draggable={seat.student !== null}
              onDragStart={(event) => { setDraggedSeat(seat.label - 1); event.dataTransfer.effectAllowed = 'move' }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => { event.preventDefault(); swapSeats(draggedSeat, seat.label - 1); setDraggedSeat(null) }}
              onDragEnd={() => setDraggedSeat(null)}
              aria-label={`${seat.label}번 자리, ${seat.student ? `${seat.student}번 학생` : '비어 있음'}`}
            >
              <span className="seat-number">{seat.label}</span>
              <strong>{seat.student ?? '—'}</strong>
            </div>)}
          </div>)}
        </div>
      </div>
      <div className="back-label">뒤쪽</div>
    </section>

    <footer>자리 변경</footer>
  </main>
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
