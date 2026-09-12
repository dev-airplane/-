const layout = [3, 3, 4, 4, 4, 4]
const key = 'seat-change-classroom'
const students = Array.from({ length: 22 }, (_, index) => index + 1)
let draggedSeat = null
let selectedSeat = null

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
const app = document.querySelector('#root')

const save = () => localStorage.setItem(key, JSON.stringify(seats))
const animate = () => {
  document.querySelectorAll('.seat').forEach((seat, index) => {
    seat.classList.remove('seat-moving')
    void seat.offsetWidth
    seat.style.setProperty('--delay', `${index * 18}ms`)
    seat.classList.add('seat-moving')
  })
}

const renderSeats = () => {
  const grid = document.querySelector('.seat-grid')
  let cursor = 0
  grid.innerHTML = layout.map((column) => `<div class="seat-column">${Array.from({ length: column }, () => {
    const position = cursor
    const student = seats[cursor++]
    return `<button class="seat ${selectedSeat === position ? 'selected' : ''}" draggable="true" data-position="${position}" aria-pressed="${selectedSeat === position}" aria-label="${position + 1}번 자리, ${student}번 학생"><span class="seat-number">${position + 1}</span><strong>${student}</strong></button>`
  }).join('')}</div>`).join('')

  grid.querySelectorAll('.seat').forEach((seat) => {
    seat.addEventListener('click', () => {
      const target = Number(seat.dataset.position)
      if (selectedSeat === null) { selectedSeat = target; renderSeats(); return }
      if (selectedSeat === target) { selectedSeat = null; renderSeats(); return }
      ;[seats[selectedSeat], seats[target]] = [seats[target], seats[selectedSeat]]
      selectedSeat = null
      save(); renderSeats(); animate()
    })
    seat.addEventListener('dragstart', (event) => { draggedSeat = Number(seat.dataset.position); event.dataTransfer.effectAllowed = 'move'; seat.classList.add('dragging') })
    seat.addEventListener('dragend', () => { draggedSeat = null; seat.classList.remove('dragging') })
    seat.addEventListener('dragover', (event) => event.preventDefault())
    seat.addEventListener('drop', (event) => {
      event.preventDefault()
      const target = Number(seat.dataset.position)
      if (draggedSeat !== null && draggedSeat !== target) [seats[draggedSeat], seats[target]] = [seats[target], seats[draggedSeat]]
      draggedSeat = null
      save(); renderSeats(); animate()
    })
  })
}

app.innerHTML = `
  <main class="app-shell">
    <header class="topbar"><a class="brand" href="#top">자리 변경</a><div class="class-info"><span>우리 반</span><i></i><strong>22명</strong></div><span class="layout-label">3 · 3 · 4 · 4 · 4 · 4</span></header>
    <section class="hero" id="top"><div><p class="eyebrow">CLASSROOM SEATING</p><h1>오늘의 자리</h1></div><div class="actions"><button class="outline-action" id="move"><span class="arrow">←</span> 한 칸 앞으로</button><button class="primary-action" id="random"><span class="spark">✦</span> 랜덤 배치</button></div></section>
    <section class="classroom" aria-label="학급 자리 배치도"><div class="front-line"><span>교탁</span></div><div class="seat-area"><div class="seat-grid" style="--columns: 6"></div></div><div class="back-label">뒤쪽</div></section>
    <footer>자리 변경</footer>
  </main>`

renderSeats()
document.querySelector('#random').addEventListener('click', () => { seats = shuffled(students); save(); renderSeats(); animate() })
document.querySelector('#move').addEventListener('click', () => {
  seats = seats.map((student) => student === students.length ? 1 : student + 1)
  save(); renderSeats(); animate()
})
