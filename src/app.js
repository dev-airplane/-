const layout = [3, 3, 4, 4, 4, 4]
const key = 'seat-change-classroom'
const historyKey = 'seat-change-history'
const countKey = 'seat-change-student-count'
const deskPairs = [[0, 1], [2, 3], [4, 5]]
const groupSeats = [
  { name: '1모둠', seats: ['0-0', '0-1', '0-2', '1-2', '1-1', '1-0'] },
  { name: '2모둠', seats: ['2-0', '2-1', '3-1', '3-0'] },
  { name: '3모둠', seats: ['2-2', '2-3', '3-3', '3-2'] },
  { name: '4모둠', seats: ['4-0', '4-1', '5-1', '5-0'] },
  { name: '5모둠', seats: ['4-2', '4-3', '5-3', '5-2'] },
]
const groupForSeat = (column, row) => groupSeats.find((group) => group.seats.includes(`${column}-${row}`))
const seatPosition = (coordinate) => {
  const [column, row] = coordinate.split('-').map(Number)
  return layout.slice(0, column).reduce((sum, size) => sum + size, 0) + row
}
const capacity = layout.reduce((sum, size) => sum + size, 0)
let studentCount = Number(localStorage.getItem(countKey)) || capacity
const studentNumbers = () => Array.from({ length: studentCount }, (_, index) => index + 1)
let draggedSeat = null
let selectedSeat = null
let isDrawing = false
let selectedHistoryDate = null
let showGroupNumbers = false

const loadHistory = () => {
  try { return JSON.parse(localStorage.getItem(historyKey)) || {} } catch { return {} }
}

const seatPairs = (arrangement) => {
  const columns = []
  let cursor = 0
  layout.forEach((size) => columns.push(arrangement.slice(cursor, cursor += size)))
  const pairs = []
  for (let row = 0; row < Math.max(...layout); row += 1) deskPairs.forEach(([left, right]) => {
    if (columns[left][row] && columns[right][row]) pairs.push([columns[left][row], columns[right][row]].sort((a, b) => a - b).join('-'))
  })
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
    deskPairs.forEach(([leftColumn, rightColumn]) => {
      const [left, right] = [columns[leftColumn][row], columns[rightColumn][row]]
      if (!left || !right) return
      const count = counts.get([left.student, right.student].sort((a, b) => a - b).join('-')) || 0
      if (count) {
        marks.set(left.position, Math.max(marks.get(left.position) || 0, count))
        marks.set(right.position, Math.max(marks.get(right.position) || 0, count))
      }
    })
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
  return shuffled([...studentNumbers(), ...Array(capacity - studentCount).fill(null)])
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

const animateSeatSwap = (from, to, values) => {
  const source = document.querySelector(`.seat[data-position="${from}"]`)
  const target = document.querySelector(`.seat[data-position="${to}"]`)
  if (!source || !target) return
  const motions = [
    { value: values[0], start: source.getBoundingClientRect(), end: target.getBoundingClientRect() },
    { value: values[1], start: target.getBoundingClientRect(), end: source.getBoundingClientRect() },
  ]
  source.classList.add('swap-target')
  target.classList.add('swap-target')
  motions.forEach(({ value, start, end }) => {
    const ghost = document.createElement('div')
    ghost.className = 'swap-ghost'
    ghost.textContent = value
    Object.assign(ghost.style, { left: `${start.left}px`, top: `${start.top}px`, width: `${start.width}px`, height: `${start.height}px` })
    document.body.append(ghost)
    window.requestAnimationFrame(() => { ghost.style.transform = `translate(${end.left - start.left}px, ${end.top - start.top}px)` })
    window.setTimeout(() => ghost.remove(), 470)
  })
  window.setTimeout(() => { source.classList.remove('swap-target'); target.classList.remove('swap-target') }, 470)
}

const renderSeats = () => {
  const grid = document.querySelector('.seat-grid')
  let cursor = 0
  const marks = historicalPairMarks(displaySeats)
  grid.classList.toggle('show-group-numbers', showGroupNumbers)
  grid.innerHTML = layout.map((column, columnIndex) => `<div class="seat-column ${[1, 3].includes(columnIndex) ? 'group-column-gap' : ''}">${Array.from({ length: column }, (_, rowIndex) => {
    const position = cursor
    const student = displaySeats[cursor++]
    const historyMark = marks.get(position)
    const group = groupForSeat(columnIndex, rowIndex)
    const isGroupStart = group?.seats[0] === `${columnIndex}-${rowIndex}`
    const groupSeatNumber = group ? group.seats.indexOf(`${columnIndex}-${rowIndex}`) + 1 : ''
    const groupBreak = rowIndex === 2 && columnIndex >= 2
    return `<button class="seat ${selectedSeat === position ? 'selected' : ''} ${isGroupStart ? 'group-start' : ''} ${groupBreak ? 'group-row-gap' : ''}" draggable="true" data-position="${position}" data-group="${group?.name || ''}" aria-pressed="${selectedSeat === position}" aria-label="${group?.name || ''} ${groupSeatNumber}번 자리, ${student ? `${student}번 학생` : '빈 자리'}${historyMark ? `, 이전 짝 ${historyMark}회` : ''}"><strong>${student ?? ''}</strong><span class="group-number">${groupSeatNumber}번</span>${isGroupStart ? `<span class="group-label">${group.name}</span>` : ''}${historyMark ? `<span class="pair-badge">이전 짝 ${historyMark}회</span>` : ''}</button>`
  }).join('')}</div>`).join('')

  grid.querySelectorAll('.seat').forEach((seat) => {
    seat.addEventListener('click', () => {
      if (isDrawing) return
      const target = Number(seat.dataset.position)
      if (selectedSeat === null) { selectedSeat = target; renderSeats(); return }
      if (selectedSeat === target) { selectedSeat = null; renderSeats(); return }
      const from = selectedSeat
      const values = [seats[from], seats[target]]
      ;[seats[from], seats[target]] = [seats[target], seats[from]]
      displaySeats = [...seats]
      selectedSeat = null
      save(); renderSeats(); animateSeatSwap(from, target, values)
    })
    seat.addEventListener('dragstart', (event) => { if (isDrawing) { event.preventDefault(); return } draggedSeat = Number(seat.dataset.position); event.dataTransfer.effectAllowed = 'move'; seat.classList.add('dragging') })
    seat.addEventListener('dragend', () => { draggedSeat = null; seat.classList.remove('dragging') })
    seat.addEventListener('dragover', (event) => event.preventDefault())
    seat.addEventListener('drop', (event) => {
      event.preventDefault()
      const target = Number(seat.dataset.position)
      const from = draggedSeat
      const values = from === null ? null : [seats[from], seats[target]]
      if (from !== null && from !== target) [seats[from], seats[target]] = [seats[target], seats[from]]
      displaySeats = [...seats]
      draggedSeat = null
      save(); renderSeats()
      if (from !== null && from !== target) animateSeatSwap(from, target, values)
    })
  })
  renderLunchLine()
  renderCafeteria()
}

const renderLunchLine = () => {
  const target = document.querySelector('#lunch-line')
  if (!target) return
  target.innerHTML = groupSeats.map((group) => {
    const students = group.seats.map(seatPosition).map((position) => seats[position]).filter(Boolean)
    return `<li><strong>${group.name}</strong><span class="lunch-people">${students.length ? students.map((student) => `<i>${student}</i>`).join('') : '—'}</span></li>`
  }).join('')
}

const lunchOrder = () => groupSeats.flatMap((group) => group.seats.map(seatPosition).map((position) => seats[position]).filter(Boolean))

const renderCafeteria = () => {
  const target = document.querySelector('#cafeteria')
  if (!target) return
  const line = lunchOrder()
  const seatingSlots = [11, 10, 8, 7, 6, 5, 4, 3, 2, 1, 0]
  const upper = Array(12).fill(null)
  const lower = Array(12).fill(null)
  line.slice(0, 11).forEach((student, index) => { lower[seatingSlots[index]] = student })
  line.slice(11).forEach((student, index) => { upper[seatingSlots[index]] = student })
  const person = (student) => `<span class="cafeteria-person">${student ?? ''}</span>`
  target.innerHTML = Array.from({ length: 4 }, (_, tableIndex) => {
    const start = tableIndex * 3
    return `<div class="cafeteria-table"><div class="cafeteria-seats top-seats">${upper.slice(start, start + 3).map(person).join('')}</div><div class="table-top"></div><div class="cafeteria-seats bottom-seats">${lower.slice(start, start + 3).map(person).join('')}</div></div>`
  }).join('')
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
    <section class="hero" id="top"><div><h1>오늘의 자리</h1></div><div class="actions"><button class="outline-action" id="move"><span class="arrow">←</span> 한 칸 앞으로</button><button class="outline-action" id="random"><span class="spark">✦</span> 랜덤 배치</button><button class="primary-action" id="fake"><span class="spark">✦</span> 자리 뽑기</button></div></section>
    <section class="history-tools"><div class="save-place"><input id="save-date" type="date" aria-label="자리 배치 날짜"><button id="save-history">이 날짜로 저장</button></div><button class="group-view-button" id="toggle-groups">모둠 번호 보기</button><details class="saved-dates"><summary>저장된 날짜</summary><ul id="saved-dates"></ul></details></section><section class="date-pair-record" id="date-pair-record" hidden></section>
    <section class="classroom" aria-label="학급 자리 배치도"><div class="front-line"><span>교탁</span></div><div class="seat-area"><div class="seat-grid" style="--columns: 6"></div></div><div class="back-label">뒤쪽</div></section>
    <section class="lunch-line"><h2>급식 줄</h2><ol id="lunch-line"></ol></section>
    <section class="cafeteria"><h2>급식실 자리</h2><div id="cafeteria"></div></section>
    <footer>자리 변경</footer>
    <dialog id="create-dialog"><form method="dialog" class="create-form"><button class="dialog-close" value="cancel" aria-label="닫기">×</button><p>학생 수</p><input id="student-count" type="number" min="1" max="${capacity}" value="${studentCount}" autofocus><span>명</span><button id="create-class" value="default">생성</button></form></dialog>
  </main>`

renderSeats()
document.querySelector('#save-date').value = new Date().toISOString().slice(0, 10)
renderSavedDates()
renderDateRecord()
document.querySelector('#random').addEventListener('click', () => { seats = shuffled([...studentNumbers(), ...Array(capacity - studentCount).fill(null)]); displaySeats = [...seats]; save(); renderSeats(); animate() })
document.querySelector('#move').addEventListener('click', () => {
  seats = seats.map((student) => student === null ? null : student === studentCount ? 1 : student + 1)
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
    displaySeats = shuffled([...studentNumbers(), ...Array(capacity - studentCount).fill(null)])
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
document.querySelector('#toggle-groups').addEventListener('click', () => {
  showGroupNumbers = !showGroupNumbers
  document.querySelector('#toggle-groups').textContent = showGroupNumbers ? '모둠 번호 숨기기' : '모둠 번호 보기'
  document.querySelector('.seat-grid').classList.toggle('show-group-numbers', showGroupNumbers)
})
document.querySelector('#create-class').addEventListener('click', (event) => {
  event.preventDefault()
  const input = document.querySelector('#student-count')
  const nextCount = Math.max(1, Math.min(capacity, Number(input.value) || capacity))
  studentCount = nextCount
  localStorage.setItem(countKey, String(studentCount))
  seats = shuffled([...studentNumbers(), ...Array(capacity - studentCount).fill(null)])
  displaySeats = [...seats]
  selectedSeat = null
  save(); renderSeats()
  document.querySelector('#create-dialog').close()
})
if (!localStorage.getItem(key)) document.querySelector('#create-dialog').showModal()
