const layout = [3, 3, 4, 4, 4, 4]
const key = 'seat-change-classroom'
const historyKey = 'seat-change-history'
const students = Array.from({ length: 22 }, (_, index) => index + 1)
let draggedSeat = null
let selectedSeat = null
let isDrawing = false
let selectedHistoryDate = null

const loadHistory = () => {
  try { return JSON.parse(localStorage.getItem(historyKey)) || {} } catch { return {} }
}

const seatPairs = (arrangement) => {
  const columns = []
  let cursor = 0
  layout.forEach((size) => columns.push(arrangement.slice(cursor, cursor += size)))
  const pairs = []
  for (let row = 0; row < Math.max(...layout); row += 1) {
    const rowStudents = columns.map((column) => column[row]).filter(Boolean)
    for (let index = 0; index < rowStudents.length - 1; index += 1) {
      pairs.push([rowStudents[index], rowStudents[index + 1]].sort((a, b) => a - b).join('-'))
    }
  }
  return pairs
}

const historyPairCounts = () => {
  const counts = new Map()
  Object.values(loadHistory()).forEach((arrangement) => seatPairs(arrangement).forEach((pair) => counts.set(pair, (counts.get(pair) || 0) + 1)))
  return counts
}

const historicalPairMarks = (arrangement) => {
  const counts = historyPairCounts()
  const columns = []
  let cursor = 0
  layout.forEach((size) => columns.push(Array.from({ length: size }, () => ({ position: cursor, student: arrangement[cursor++] }))))
  const marks = new Map()
  for (let row = 0; row < Math.max(...layout); row += 1) {
    const rowSeats = columns.map((column) => column[row]).filter(Boolean)
    for (let index = 0; index < rowSeats.length - 1; index += 1) {
      const [left, right] = [rowSeats[index], rowSeats[index + 1]]
      const count = counts.get([left.student, right.student].sort((a, b) => a - b).join('-')) || 0
      if (count) {
        marks.set(left.position, Math.max(marks.get(left.position) || 0, count))
        marks.set(right.position, Math.max(marks.get(right.position) || 0, count))
      }
    }
  }
  return marks
}

const shuffled = (items) => {
  const copy = [...items]
  for (let i = copy.length - 1; i; i -= 1) {
    const swap = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[swap]] = [copy[swap], copy[i]]
  }
  return copy
}

const load = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(key))
    if (Array.isArray(saved) && saved.length === 22) return saved
  } catch { /* first visit */ }
  return shuffled(students)
}

let seats = load()
let displaySeats = [...seats]
const app = document.querySelector('#root')

const save = () => localStorage.setItem(key, JSON.stringify(seats))
const animate = (positions = null) => {
  document.querySelectorAll('.seat').forEach((seat, index) => {
    if (positions && !positions.includes(Number(seat.dataset.position))) return
    seat.classList.remove('seat-moving')
    void seat.offsetWidth
    seat.style.setProperty('--delay', `${index * 18}ms`)
    seat.classList.add('seat-moving')
  })
}

const renderSeats = () => {
  const grid = document.querySelector('.seat-grid')
  let cursor = 0
  const marks = historicalPairMarks(displaySeats)
  grid.innerHTML = layout.map((column) => `<div class="seat-column">${Array.from({ length: column }, () => {
    const position = cursor
    const student = displaySeats[cursor++]
    const historyMark = marks.get(position)
    return `<button class="seat ${selectedSeat === position ? 'selected' : ''}" draggable="true" data-position="${position}" aria-pressed="${selectedSeat === position}" aria-label="${student}번 학생${historyMark ? `, 이전 짝 ${historyMark}회` : ''}"><strong>${student}</strong>${historyMark ? `<span class="pair-badge">이전 짝 ${historyMark}회</span>` : ''}</button>`
  }).join('')}</div>`).join('')

  grid.querySelectorAll('.seat').forEach((seat) => {
    seat.addEventListener('click', () => {
      if (isDrawing) return
      const target = Number(seat.dataset.position)
      if (selectedSeat === null) { selectedSeat = target; renderSeats(); return }
      if (selectedSeat === target) { selectedSeat = null; renderSeats(); return }
      const from = selectedSeat
      ;[seats[from], seats[target]] = [seats[target], seats[from]]
      displaySeats = [...seats]
      selectedSeat = null
      save(); renderSeats(); animate([from, target])
    })
    seat.addEventListener('dragstart', (event) => { if (isDrawing) { event.preventDefault(); return } draggedSeat = Number(seat.dataset.position); event.dataTransfer.effectAllowed = 'move'; seat.classList.add('dragging') })
    seat.addEventListener('dragend', () => { draggedSeat = null; seat.classList.remove('dragging') })
    seat.addEventListener('dragover', (event) => event.preventDefault())
    seat.addEventListener('drop', (event) => {
      event.preventDefault()
      const target = Number(seat.dataset.position)
      const from = draggedSeat
      if (from !== null && from !== target) [seats[from], seats[target]] = [seats[target], seats[from]]
      displaySeats = [...seats]
      draggedSeat = null
      save(); renderSeats(); animate([from, target])
    })
  })
}

const renderSavedDates = () => {
  const target = document.querySelector('#saved-dates')
  const dates = Object.keys(loadHistory()).sort((a, b) => b.localeCompare(a))
  target.innerHTML = dates.length
    ? dates.map((date) => `<li class="saved-date-row"><button class="date-entry ${selectedHistoryDate === date ? 'active' : ''}" data-date="${date}">${date.replaceAll('-', '.')}</button><button class="delete-date" data-delete-date="${date}" aria-label="${date} 기록 삭제">×</button></li>`).join('')
    : '<li class="no-saved-date">저장된 날짜 없음</li>'
  target.querySelectorAll('.date-entry').forEach((button) => button.addEventListener('click', () => {
    selectedHistoryDate = button.dataset.date
    document.querySelector('.saved-dates').open = false
    renderSavedDates(); renderDateRecord()
  }))
  target.querySelectorAll('.delete-date').forEach((button) => button.addEventListener('click', () => {
    const history = loadHistory()
    delete history[button.dataset.deleteDate]
    if (selectedHistoryDate === button.dataset.deleteDate) selectedHistoryDate = null
    localStorage.setItem(historyKey, JSON.stringify(history))
    renderSavedDates(); renderDateRecord(); renderSeats()
  }))
}

const renderDateRecord = () => {
  const target = document.querySelector('#date-pair-record')
  if (!selectedHistoryDate) { target.hidden = true; target.innerHTML = ''; return }
  const arrangement = loadHistory()[selectedHistoryDate]
  if (!arrangement) { target.hidden = true; return }
  const pairs = seatPairs(arrangement)
  target.hidden = false
  target.innerHTML = `<p>${selectedHistoryDate.replaceAll('-', '.')} 짝 기록</p><ul>${pairs.map((pair) => `<li>${pair.replace('-', '번 · ')}번</li>`).join('')}</ul>`
}

app.innerHTML = `
  <main class="app-shell">
    <header class="topbar"><a class="brand" href="#top">자리 변경</a><div class="class-info"><span>우리 반</span><i></i><strong>22명</strong></div><span class="layout-label">3 · 3 · 4 · 4 · 4 · 4</span></header>
    <section class="hero" id="top"><div><h1>오늘의 자리</h1></div><div class="actions"><button class="outline-action" id="move"><span class="arrow">←</span> 한 칸 앞으로</button><button class="outline-action" id="random"><span class="spark">✦</span> 랜덤 배치</button><button class="primary-action" id="fake"><span class="spark">✦</span> 자리 뽑기</button></div></section>
    <section class="history-tools"><div class="save-place"><input id="save-date" type="date" aria-label="자리 배치 날짜"><button id="save-history">이 날짜로 저장</button></div><details class="saved-dates"><summary>저장된 날짜</summary><ul id="saved-dates"></ul></details></section><section class="date-pair-record" id="date-pair-record" hidden></section>
    <section class="classroom" aria-label="학급 자리 배치도"><div class="front-line"><span>교탁</span></div><div class="seat-area"><div class="seat-grid" style="--columns: 6"></div></div><div class="back-label">뒤쪽</div></section>
    <footer>자리 변경</footer>
  </main>`

renderSeats()
document.querySelector('#save-date').value = new Date().toISOString().slice(0, 10)
renderSavedDates()
renderDateRecord()
document.querySelector('#random').addEventListener('click', () => { seats = shuffled(students); displaySeats = [...seats]; save(); renderSeats(); animate() })
document.querySelector('#move').addEventListener('click', () => {
  seats = seats.map((student) => student === students.length ? 1 : student + 1)
  displaySeats = [...seats]
  save(); renderSeats(); animate()
})
document.querySelector('#fake').addEventListener('click', () => {
  if (isDrawing) return
  isDrawing = true
  const button = document.querySelector('#fake')
  button.disabled = true
  let turns = 0
  const timer = window.setInterval(() => {
    displaySeats = shuffled(students)
    renderSeats(); animate()
    turns += 1
    if (turns < 9) return
    window.clearInterval(timer)
    window.setTimeout(() => {
      displaySeats = [...seats]
      renderSeats(); animate()
      isDrawing = false
      button.disabled = false
    }, 260)
  }, 170)
})
document.querySelector('#save-history').addEventListener('click', () => {
  const date = document.querySelector('#save-date').value
  if (!date) return
  const history = loadHistory()
  history[date] = [...seats]
  localStorage.setItem(historyKey, JSON.stringify(history))
  renderSeats()
  renderSavedDates()
  renderDateRecord()
})
