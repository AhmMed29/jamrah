// habits-visual.test.js — 7 visual tests for habits page element visibility

// ─── Replicated state ───
var colorPresets = ['#f59e0b', '#8b5cf6', '#3b82f6', '#22c55e', '#06b6d4', '#f43f5e', '#6366f1', '#ec4899', '#f97316', '#a855f7']

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ─── Replicated modal functions ───
function openAddModal() {
  var addModal = document.getElementById('add-modal')
  if (!addModal) return
  addModal.classList.add('open')
}

function closeAddModal() {
  var addModal = document.getElementById('add-modal')
  if (!addModal) return
  addModal.classList.remove('open')
}

function renderColorPalette(containerId, selectedColor) {
  var container = document.getElementById(containerId)
  if (!container) return
  var html = ''
  for (var i = 0; i < colorPresets.length; i++) {
    var c = colorPresets[i]
    var activeClass = c === selectedColor ? ' ring-2 ring-offset-2 ring-blue-400' : ''
    html += '<div class="color-swatch' + activeClass + '" style="background:' + c + '" data-color="' + c + '"></div>'
  }
  container.innerHTML = html
}

function renderHabitTable(habits) {
  var body = document.getElementById('table-body')
  if (!body) return
  if (!habits || habits.length === 0) {
    body.innerHTML = '<tr><td style="text-align:center;padding:40px;color:#9ca3af">No habits yet. Click "+ Add Habit" to get started.</td></tr>'
    return
  }
  var b = ''
  habits.forEach(function (h) {
    b += '<tr><td class="habit-name" style="color:' + h.color + '">' + escapeHtml(h.name) + '</td></tr>'
  })
  body.innerHTML = b
}

function renderHabitRow(habit, dateStr, checked) {
  if (checked) {
    return '<div class="habit-toggle checked" style="background-color:' + habit.color + '" data-habit-id="' + habit.id + '" data-date="' + dateStr + '" data-value="0">' +
      '<svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>' +
    '</div>'
  }
  return '<div class="habit-toggle unchecked" style="border-color:' + habit.color + '40" data-habit-id="' + habit.id + '" data-date="' + dateStr + '" data-value="1"></div>'
}

// ─── Mock helpers ───
function mockEl(overrides) {
  return Object.assign({
    textContent: '', value: '', innerHTML: '', className: '', id: '',
    classList: {
      add: jest.fn(), remove: jest.fn(), toggle: jest.fn(),
      contains: jest.fn(function () { return false })
    },
    style: { display: '', opacity: '', transform: '', paddingLeft: '', width: '',
             position: '', top: '', left: '', right: '', pointerEvents: '' },
    addEventListener: jest.fn(), removeEventListener: jest.fn(),
    setAttribute: jest.fn(), removeAttribute: jest.fn(),
    appendChild: jest.fn(function (c) { return c }), focus: jest.fn(),
    querySelector: jest.fn(), querySelectorAll: jest.fn(function () { return [] }),
    getAttribute: jest.fn(),
    offsetWidth: 320,
    getBoundingClientRect: jest.fn(function () { return { top: 0, left: 0, width: 100, height: 30 } }),
    dataset: {}, parentNode: null, parentElement: null, children: []
  }, overrides || {})
}

var _getElemMap = {}
function setupGetElementById(map) {
  _getElemMap = map || {}
  try { document.getElementById.mockRestore() } catch (e) {}
  jest.spyOn(document, 'getElementById').mockImplementation(function (id) {
    if (_getElemMap[id]) return _getElemMap[id]
    return null
  })
}

function resetState() {
  _getElemMap = {}
  jest.clearAllMocks()
}

beforeEach(function () {
  resetState()
})

// ═══════════════════════════════════════════════════
// 1. Habit table rendering (2 tests)
// ═══════════════════════════════════════════════════

describe('habit table rendering', function () {
  test('renders table with data', function () {
    var body = mockEl()
    setupGetElementById({ 'table-body': body })
    var habits = [
      { id: 'h1', name: 'Exercise', color: '#22c55e' },
      { id: 'h2', name: 'Read', color: '#3b82f6' }
    ]
    renderHabitTable(habits)
    expect(body.innerHTML).toContain('Exercise')
    expect(body.innerHTML).toContain('Read')
    expect(body.innerHTML).toContain('#22c55e')
    expect(body.innerHTML).toContain('#3b82f6')
  })

  test('shows empty state', function () {
    var body = mockEl()
    setupGetElementById({ 'table-body': body })
    renderHabitTable([])
    expect(body.innerHTML).toContain('No habits yet')
  })
})

// ═══════════════════════════════════════════════════
// 2. Modal open/close (2 tests)
// ═══════════════════════════════════════════════════

describe('modal open and close', function () {
  test('opens on add', function () {
    var addModal = mockEl()
    setupGetElementById({ 'add-modal': addModal })
    openAddModal()
    expect(addModal.classList.add).toHaveBeenCalledWith('open')
  })

  test('closes on close', function () {
    var addModal = mockEl()
    setupGetElementById({ 'add-modal': addModal })
    closeAddModal()
    expect(addModal.classList.remove).toHaveBeenCalledWith('open')
  })
})

// ═══════════════════════════════════════════════════
// 3. Color selector (2 tests)
// ═══════════════════════════════════════════════════

describe('color selector', function () {
  test('renders palette with all colors', function () {
    var container = mockEl()
    setupGetElementById({ 'color-picker': container })
    renderColorPalette('color-picker', '#3b82f6')
    expect(container.innerHTML).toContain('#f59e0b')
    expect(container.innerHTML).toContain('#a855f7')
    expect(colorPresets.length).toBe(10)
  })

  test('selected color gets ring classes', function () {
    var container = mockEl()
    setupGetElementById({ 'color-picker': container })
    renderColorPalette('color-picker', '#3b82f6')
    expect(container.innerHTML).toContain('ring-2 ring-offset-2 ring-blue-400')
  })
})

// ═══════════════════════════════════════════════════
// 4. Habit completion state (1 test)
// ═══════════════════════════════════════════════════

describe('habit completion state', function () {
  test('checked row shows checkmark, unchecked shows empty', function () {
    var habit = { id: 'h1', name: 'Exercise', color: '#22c55e' }
    var checkedHtml = renderHabitRow(habit, '2026-07-21', true)
    expect(checkedHtml).toContain('checked')
    expect(checkedHtml).toContain('svg')

    var uncheckedHtml = renderHabitRow(habit, '2026-07-20', false)
    expect(uncheckedHtml).toContain('unchecked')
    expect(uncheckedHtml).not.toContain('svg')
  })
})
