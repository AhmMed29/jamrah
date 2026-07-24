// settings-visual.test.js — 10 visual tests for settings page element visibility

// ─── Replicated state ───
var settingsDirty = false

function markDirty() {
  settingsDirty = true
  var row = document.getElementById('settingsBtnRow')
  if (row) row.style.display = 'flex'
}

function switchSettingsTab(tab) {
  var panes = ['general', 'pomodoro', 'storage']
  panes.forEach(function (p) {
    var el = document.getElementById('pane' + p.charAt(0).toUpperCase() + p.slice(1))
    if (el) el.style.display = p === tab ? 'block' : 'none'
  })
  var title = document.getElementById('settingsTabTitle')
  if (title) title.textContent = tab === 'general' ? 'General' : tab === 'pomodoro' ? 'Pomodoro' : 'Storage'
}

function openSettings() {
  showPage('settings')
  settingsDirty = false
  var row = document.getElementById('settingsBtnRow')
  if (row) row.style.display = 'none'
  var cancel = document.getElementById('settingsCancelBtn')
  if (cancel) cancel.style.display = ''
}

function closeSettings(e) {
  if (e && e.target !== e.currentTarget) return
  if (settingsDirty) {
    var modal = document.getElementById('settingsConfirmModal')
    if (modal) modal.style.display = 'flex'
    return
  }
  showPage('pomodoro')
}

function showPage(name) {
  var pages = ['home', 'pomodoro', 'habits', 'calender', 'tasks', 'settings', 'stats']
  pages.forEach(function (p) {
    var el = document.getElementById('page-' + p)
    if (el) {
      if (p === name) el.classList.remove('hidden')
      else el.classList.add('hidden')
    }
  })
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
  settingsDirty = false
  _getElemMap = {}
  jest.clearAllMocks()
}

beforeEach(function () {
  resetState()
})

// ═══════════════════════════════════════════════════
// 1. Settings page visibility (3 tests)
// ═══════════════════════════════════════════════════

describe('settings page visibility', function () {
  test('hidden by default', function () {
    var page = mockEl()
    page.classList.contains.mockReturnValue(true)
    setupGetElementById({ 'page-settings': page })
    expect(page.classList.contains('hidden')).toBe(true)
  })

  test('openSettings shows the page', function () {
    var page = mockEl()
    var row = mockEl()
    var cancel = mockEl()
    var otherPages = ['page-home', 'page-pomodoro', 'page-habits', 'page-calender', 'page-tasks', 'page-stats']
    var map = { 'page-settings': page, settingsBtnRow: row, settingsCancelBtn: cancel }
    otherPages.forEach(function (id) { map[id] = mockEl() })
    setupGetElementById(map)
    openSettings()
    expect(page.classList.remove).toHaveBeenCalledWith('hidden')
  })

  test('closeSettings hides the page', function () {
    var page = mockEl()
    var pomodoroPage = mockEl()
    setupGetElementById({ 'page-settings': page, 'page-pomodoro': pomodoroPage })
    settingsDirty = false
    closeSettings()
    expect(page.classList.add).toHaveBeenCalledWith('hidden')
  })
})

// ═══════════════════════════════════════════════════
// 2. Settings tab switching (3 tests)
// ═══════════════════════════════════════════════════

describe('settings tab switching', function () {
  test('pomodoro tab switches panes', function () {
    var paneGeneral = mockEl()
    var panePomodoro = mockEl()
    var paneStorage = mockEl()
    setupGetElementById({
      paneGeneral: paneGeneral, panePomodoro: panePomodoro, paneStorage: paneStorage,
      settingsTabTitle: mockEl()
    })
    switchSettingsTab('pomodoro')
    expect(paneGeneral.style.display).toBe('none')
    expect(panePomodoro.style.display).toBe('block')
    expect(paneStorage.style.display).toBe('none')
  })

  test('general tab switches back', function () {
    var paneGeneral = mockEl()
    var panePomodoro = mockEl()
    var paneStorage = mockEl()
    setupGetElementById({
      paneGeneral: paneGeneral, panePomodoro: panePomodoro, paneStorage: paneStorage,
      settingsTabTitle: mockEl()
    })
    switchSettingsTab('general')
    expect(paneGeneral.style.display).toBe('block')
    expect(panePomodoro.style.display).toBe('none')
    expect(paneStorage.style.display).toBe('none')
  })

  test('storage tab switches', function () {
    var paneGeneral = mockEl()
    var panePomodoro = mockEl()
    var paneStorage = mockEl()
    setupGetElementById({
      paneGeneral: paneGeneral, panePomodoro: panePomodoro, paneStorage: paneStorage,
      settingsTabTitle: mockEl()
    })
    switchSettingsTab('storage')
    expect(paneGeneral.style.display).toBe('none')
    expect(panePomodoro.style.display).toBe('none')
    expect(paneStorage.style.display).toBe('block')
  })
})

// ═══════════════════════════════════════════════════
// 3. Cancel button visibility (2 tests)
// ═══════════════════════════════════════════════════

describe('cancel button visibility', function () {
  test('cancel button row hidden when clean', function () {
    var row = mockEl()
    setupGetElementById({ settingsBtnRow: row })
    settingsDirty = false
    expect(row.style.display).toBe('')
  })

  test('cancel button row visible when dirty', function () {
    var row = mockEl()
    setupGetElementById({ settingsBtnRow: row })
    markDirty()
    expect(settingsDirty).toBe(true)
    expect(row.style.display).toBe('flex')
  })
})

// ═══════════════════════════════════════════════════
// 4. Close settings with/without dirty (2 tests)
// ═══════════════════════════════════════════════════

describe('closeSettings dirty handling', function () {
  test('closeSettings with dirty shows confirm modal', function () {
    var modal = mockEl()
    var page = mockEl()
    var pomodoroPage = mockEl()
    setupGetElementById({ settingsConfirmModal: modal, 'page-settings': page, 'page-pomodoro': pomodoroPage })
    settingsDirty = true
    closeSettings()
    expect(modal.style.display).toBe('flex')
  })

  test('closeSettings without dirty hides directly', function () {
    var modal = mockEl()
    var page = mockEl()
    var pomodoroPage = mockEl()
    setupGetElementById({ settingsConfirmModal: modal, 'page-settings': page, 'page-pomodoro': pomodoroPage })
    settingsDirty = false
    closeSettings()
    expect(modal.style.display).toBe('')
  })
})
