// tasks-visual.test.js — 8 visual tests for tasks page element visibility

// ─── Replicated state from tasks.js ───
var _filterMode = 'all'
var _viewMode = 'daily'
var _selectedId = null
var tasksData = []

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function prioColor(p) {
  if (p === 'High') return '#ef4444'
  if (p === 'Medium') return '#10b981'
  return '#d1d5db'
}

// ─── Replicated render functions ───

function renderTaskItem(t, allTasks) {
  var isSelected = t.id === _selectedId
  var doneClass = t.completed ? 'completed' : ''
  var selClass = isSelected ? ' selected' : ''
  var dotColor = prioColor(t.priority)

  var html = '<div class="task-item' + (doneClass ? ' ' + doneClass : '') + selClass + '" data-task-id="' + escapeHtml(t.id) + '">' +
    '<div class="task-checkbox' + (t.completed ? ' checked' : '') + '">' +
      (t.completed ? '<svg width="14" height="14"><path d="M5 13l4 4L19 7"/></svg>' : '') +
    '</div>' +
    '<span class="task-priority-dot" style="background:' + dotColor + '"></span>' +
    '<div class="task-content">' +
      '<div class="task-title' + (t.completed ? ' done' : '') + '">' + escapeHtml(t.name) + '</div>' +
    '</div></div>'
  return html
}

function renderTaskList(tasks) {
  var listEl = document.getElementById('tasks-list')
  if (!listEl) return
  if (tasks.length === 0) {
    listEl.innerHTML = '<div class="no-tasks-msg">No tasks.</div>'
    return
  }
  var html = ''
  tasks.forEach(function (t) { html += renderTaskItem(t, tasks) })
  listEl.innerHTML = html
}

function renderDetailEmpty() {
  var panel = document.getElementById('task-detail-panel')
  if (!panel) return
  panel.innerHTML = '<div class="task-detail-empty">Select a task to view and edit</div>'
}

function selectTask(id) {
  _selectedId = id
  document.querySelectorAll('.task-item').forEach(function (el) {
    el.classList.toggle('selected', el.getAttribute('data-task-id') === id)
  })
}

function closeDetail() {
  _selectedId = null
  document.querySelectorAll('.task-item').forEach(function (el) { el.classList.remove('selected') })
  renderDetailEmpty()
}

function cycleFilter() {
  if (_filterMode === 'all') _filterMode = 'active'
  else if (_filterMode === 'active') _filterMode = 'completed'
  else _filterMode = 'all'
}

function toggleViewMode() {
  if (_viewMode === 'daily') _viewMode = 'archive'
  else _viewMode = 'daily'
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
var _queryAllResults = []

function setupGetElementById(map) {
  _getElemMap = map || {}
  try { document.getElementById.mockRestore() } catch (e) {}
  jest.spyOn(document, 'getElementById').mockImplementation(function (id) {
    if (_getElemMap[id]) return _getElemMap[id]
    return null
  })
}

function resetState() {
  _filterMode = 'all'
  _viewMode = 'daily'
  _selectedId = null
  tasksData = []
  _getElemMap = {}
  _queryAllResults = []
  jest.clearAllMocks()
  try { document.querySelectorAll.mockRestore() } catch (e) {}
  document.querySelectorAll = jest.fn(function () { return _queryAllResults })
}

beforeEach(function () {
  resetState()
})

// ═══════════════════════════════════════════════════
// 1. Empty state (1 test)
// ═══════════════════════════════════════════════════

describe('empty state', function () {
  test('no tasks message when list empty', function () {
    var listEl = mockEl()
    setupGetElementById({ 'tasks-list': listEl })
    renderTaskList([])
    expect(listEl.innerHTML).toContain('No tasks.')
  })
})

// ═══════════════════════════════════════════════════
// 2. Task selection (2 tests)
// ═══════════════════════════════════════════════════

describe('task selection', function () {
  test('selectTask adds selected class', function () {
    var el1 = mockEl()
    el1.getAttribute = jest.fn(function () { return 't1' })
    var el2 = mockEl()
    el2.getAttribute = jest.fn(function () { return 't2' })
    _queryAllResults = [el1, el2]
    selectTask('t1')
    expect(el1.classList.toggle).toHaveBeenCalledWith('selected', true)
    expect(el2.classList.toggle).toHaveBeenCalledWith('selected', false)
  })

  test('closeDetail removes selected class', function () {
    var el1 = mockEl()
    el1.getAttribute = jest.fn(function () { return 't1' })
    _queryAllResults = [el1]
    _selectedId = 't1'
    var panel = mockEl()
    setupGetElementById({ 'task-detail-panel': panel })
    closeDetail()
    expect(el1.classList.remove).toHaveBeenCalledWith('selected')
    expect(_selectedId).toBeNull()
  })
})

// ═══════════════════════════════════════════════════
// 3. Completed task (1 test)
// ═══════════════════════════════════════════════════

describe('completed task', function () {
  test('completed task gets completed and done classes', function () {
    var task = { id: 't1', name: 'Done Task', completed: true, priority: 'none' }
    var html = renderTaskItem(task, [task])
    expect(html).toContain('completed')
    expect(html).toContain('done')
    expect(html).toContain('checkbox checked')
  })
})

// ═══════════════════════════════════════════════════
// 4. Detail panel (1 test)
// ═══════════════════════════════════════════════════

describe('detail panel', function () {
  test('empty panel shows select a task message', function () {
    var panel = mockEl()
    setupGetElementById({ 'task-detail-panel': panel })
    renderDetailEmpty()
    expect(panel.innerHTML).toBe('<div class="task-detail-empty">Select a task to view and edit</div>')
  })
})

// ═══════════════════════════════════════════════════
// 5. Filter mode (1 test)
// ═══════════════════════════════════════════════════

describe('filter mode cycling', function () {
  test('cycles all → active → completed → all', function () {
    expect(_filterMode).toBe('all')
    cycleFilter()
    expect(_filterMode).toBe('active')
    cycleFilter()
    expect(_filterMode).toBe('completed')
    cycleFilter()
    expect(_filterMode).toBe('all')
  })
})

// ═══════════════════════════════════════════════════
// 6. View mode switching (2 tests)
// ═══════════════════════════════════════════════════

describe('view mode switching', function () {
  test('archive view switch', function () {
    expect(_viewMode).toBe('daily')
    toggleViewMode()
    expect(_viewMode).toBe('archive')
  })

  test('daily view switch back from archive', function () {
    toggleViewMode()
    expect(_viewMode).toBe('archive')
    toggleViewMode()
    expect(_viewMode).toBe('daily')
  })
})
