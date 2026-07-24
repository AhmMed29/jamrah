// pomodoro-visual.test.js — 15 visual tests for pomodoro page element visibility

// ─── Replicated state from timer.js ───
var phase = 'idle'
var isRunning = false
var _pomoRightPanelOpen = false
var _pendingSessionStart = false

function updateUI() {
  var sideBox = document.getElementById('pomoSideBox')
  var mainArea = document.getElementById('mainArea')
  if (sideBox) {
    if (isRunning) {
      sideBox.classList.add('hidden-fade')
      if (mainArea) mainArea.style.paddingLeft = '0px'
    } else {
      sideBox.classList.remove('hidden-fade')
      if (mainArea) mainArea.style.paddingLeft = sideBox.offsetWidth + 'px'
    }
  }
  var notePanel = document.getElementById('pomoNotePanel')
  if (notePanel) {
    if (phase !== 'idle') {
      notePanel.classList.remove('hidden')
    } else if (_pomoRightPanelOpen) {
      notePanel.classList.remove('hidden')
    } else {
      notePanel.classList.add('hidden')
    }
  }
  var wrapper = document.getElementById('timerCircle')
  if (wrapper) {
    if (isRunning) wrapper.classList.add('timer-running')
    else wrapper.classList.remove('timer-running')
  }
}

function showSessionNamePopup() {
  var popup = document.getElementById('pomoNamePopup')
  if (!popup) return
  popup.classList.remove('hidden')
}

function hideSessionNamePopup() {
  var popup = document.getElementById('pomoNamePopup')
  if (popup) popup.classList.add('hidden')
  var backdrop = document.getElementById('pomoNamePopupBackdrop')
  if (backdrop) backdrop.classList.add('hidden')
  _pendingSessionStart = false
}

function togglePomoRightPanel(forceState) {
  if (typeof forceState === 'boolean') {
    _pomoRightPanelOpen = forceState
  } else {
    _pomoRightPanelOpen = !_pomoRightPanelOpen
  }
  var panel = document.getElementById('pomoRightPanelWrapper')
  var btn = document.getElementById('pomoRightToggleBtn')
  if (panel && btn) {
    if (_pomoRightPanelOpen) {
      panel.style.transform = 'translate(0, -50%)'
      panel.style.opacity = '1'
      panel.style.pointerEvents = 'auto'
      btn.style.right = '340px'
      document.getElementById('pomoNotePanel')?.classList.remove('hidden')
    } else {
      panel.style.transform = 'translate(150%, -50%)'
      panel.style.opacity = '0'
      panel.style.pointerEvents = 'none'
      btn.style.right = '0'
    }
  }
}

function openEndPopup() {
  if (phase === 'idle') return
  var popup = document.getElementById('endPopup')
  if (popup) popup.classList.remove('hidden')
}

function cancelEnd() {
  var popup = document.getElementById('endPopup')
  if (popup) popup.classList.add('hidden')
}

function closeEndPopup(e) {
  if (e && e.target !== e.currentTarget) return
  cancelEnd()
}

// ─── Mock elements ───
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
  phase = 'idle'
  isRunning = false
  _pomoRightPanelOpen = false
  _pendingSessionStart = false
  _getElemMap = {}
  jest.clearAllMocks()
}

beforeEach(function () {
  resetState()
})

// ═══════════════════════════════════════════════════
// 1. Side box visibility (4 tests)
// ═══════════════════════════════════════════════════

describe('side box visibility', function () {
  test('hidden-fade added when isRunning', function () {
    var sideBox = mockEl()
    setupGetElementById({ pomoSideBox: sideBox, mainArea: mockEl(), pomoNotePanel: mockEl(), timerCircle: mockEl() })
    isRunning = true
    updateUI()
    expect(sideBox.classList.add).toHaveBeenCalledWith('hidden-fade')
  })

  test('hidden-fade removed when idle', function () {
    var sideBox = mockEl()
    setupGetElementById({ pomoSideBox: sideBox, mainArea: mockEl(), pomoNotePanel: mockEl(), timerCircle: mockEl() })
    isRunning = false
    updateUI()
    expect(sideBox.classList.remove).toHaveBeenCalledWith('hidden-fade')
  })

  test('mainArea paddingLeft set to offsetWidth when not running', function () {
    var sideBox = mockEl({ offsetWidth: 320 })
    var mainArea = mockEl()
    setupGetElementById({ pomoSideBox: sideBox, mainArea: mainArea, pomoNotePanel: mockEl(), timerCircle: mockEl() })
    isRunning = false
    updateUI()
    expect(mainArea.style.paddingLeft).toBe('320px')
  })

  test('mainArea paddingLeft 0px when running', function () {
    var mainArea = mockEl()
    setupGetElementById({ pomoSideBox: mockEl(), mainArea: mainArea, pomoNotePanel: mockEl(), timerCircle: mockEl() })
    isRunning = true
    updateUI()
    expect(mainArea.style.paddingLeft).toBe('0px')
  })
})

// ═══════════════════════════════════════════════════
// 2. Name popup (3 tests)
// ═══════════════════════════════════════════════════

describe('name popup', function () {
  test('hidden by default — contains hidden class', function () {
    var popup = mockEl()
    popup.classList.contains.mockReturnValue(true)
    setupGetElementById({ pomoNamePopup: popup })
    expect(popup.classList.contains('hidden')).toBe(true)
  })

  test('showSessionNamePopup removes hidden class', function () {
    var popup = mockEl()
    setupGetElementById({ pomoNamePopup: popup })
    showSessionNamePopup()
    expect(popup.classList.remove).toHaveBeenCalledWith('hidden')
  })

  test('hideSessionNamePopup adds hidden class', function () {
    var popup = mockEl()
    var backdrop = mockEl()
    setupGetElementById({ pomoNamePopup: popup, pomoNamePopupBackdrop: backdrop })
    hideSessionNamePopup()
    expect(popup.classList.add).toHaveBeenCalledWith('hidden')
    expect(backdrop.classList.add).toHaveBeenCalledWith('hidden')
    expect(_pendingSessionStart).toBe(false)
  })
})

// ═══════════════════════════════════════════════════
// 3. Right panel toggle (2 tests)
// ═══════════════════════════════════════════════════

describe('right panel toggle', function () {
  test('open sets transform and opacity', function () {
    var panel = mockEl()
    var btn = mockEl()
    setupGetElementById({ pomoRightPanelWrapper: panel, pomoRightToggleBtn: btn, pomoNotePanel: mockEl() })
    togglePomoRightPanel(true)
    expect(panel.style.transform).toBe('translate(0, -50%)')
    expect(panel.style.opacity).toBe('1')
    expect(panel.style.pointerEvents).toBe('auto')
    expect(btn.style.right).toBe('340px')
  })

  test('close sets transform and opacity', function () {
    var panel = mockEl()
    var btn = mockEl()
    setupGetElementById({ pomoRightPanelWrapper: panel, pomoRightToggleBtn: btn, pomoNotePanel: mockEl() })
    togglePomoRightPanel(false)
    expect(panel.style.transform).toBe('translate(150%, -50%)')
    expect(panel.style.opacity).toBe('0')
    expect(panel.style.pointerEvents).toBe('none')
    expect(btn.style.right).toBe('0')
  })
})

// ═══════════════════════════════════════════════════
// 4. Note panel visibility (2 tests)
// ═══════════════════════════════════════════════════

describe('note panel visibility', function () {
  test('hidden removed during work phase', function () {
    var notePanel = mockEl()
    setupGetElementById({ pomoNotePanel: notePanel, pomoSideBox: mockEl(), mainArea: mockEl(), timerCircle: mockEl() })
    phase = 'work'
    updateUI()
    expect(notePanel.classList.remove).toHaveBeenCalledWith('hidden')
  })

  test('hidden added when idle and panel closed', function () {
    var notePanel = mockEl()
    setupGetElementById({ pomoNotePanel: notePanel, pomoSideBox: mockEl(), mainArea: mockEl(), timerCircle: mockEl() })
    phase = 'idle'
    _pomoRightPanelOpen = false
    updateUI()
    expect(notePanel.classList.add).toHaveBeenCalledWith('hidden')
  })
})

// ═══════════════════════════════════════════════════
// 5. End popup (4 tests)
// ═══════════════════════════════════════════════════

describe('end popup', function () {
  test('hidden by default — contains hidden class', function () {
    var popup = mockEl()
    popup.classList.contains.mockReturnValue(true)
    setupGetElementById({ endPopup: popup })
    expect(popup.classList.contains('hidden')).toBe(true)
  })

  test('openEndPopup shows when phase !== idle', function () {
    var popup = mockEl()
    setupGetElementById({ endPopup: popup })
    phase = 'work'
    openEndPopup()
    expect(popup.classList.remove).toHaveBeenCalledWith('hidden')
  })

  test('cancelEnd hides end popup', function () {
    var popup = mockEl()
    setupGetElementById({ endPopup: popup })
    cancelEnd()
    expect(popup.classList.add).toHaveBeenCalledWith('hidden')
  })

  test('closeEndPopup on backdrop click cancels', function () {
    var popup = mockEl()
    setupGetElementById({ endPopup: popup })
    var event = { target: 'backdrop', currentTarget: 'backdrop' }
    closeEndPopup(event)
    expect(popup.classList.add).toHaveBeenCalledWith('hidden')
  })
})
