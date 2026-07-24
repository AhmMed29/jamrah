// Shared setup for frontend logic tests (jsdom environment)
// We let jsdom provide real DOM — we only mock Electron-specific APIs
// And provide element mocks via document.getElementById for logic tests

var _elementStore = {}

// Store original methods so we can fall through to real jsdom
var _origGetElementById = document.getElementById.bind ? document.getElementById.bind(document) : document.getElementById
var _origCreateElement = document.createElement.bind ? document.createElement.bind(document) : document.createElement
var _origQuerySelector = document.querySelector.bind ? document.querySelector.bind(document) : document.querySelector
var _origQuerySelectorAll = document.querySelectorAll.bind ? document.querySelectorAll.bind(document) : document.querySelectorAll

// Helper: create a minimal DOM element mock for logic tests
function createElementMock(id, overrides) {
  var el = {
    textContent: '',
    value: '',
    className: '',
    id: id || '',
    checked: false,
    disabled: false,
    nodeType: 1,
    tagName: 'DIV',
    style: { display: '', opacity: '', transform: '', paddingLeft: '', width: '', height: '', position: '', top: '', left: '', background: '', color: '', border: '', borderRadius: '', padding: '', fontSize: '', outline: '', fontFamily: '', boxSizing: '', cursor: '', userSelect: '', zIndex: '', cssText: '', minWidth: '', maxWidth: '', right: '', boxShadow: '', backdropFilter: '', pointerEvents: '', borderRight: '', borderTop: '', borderBottom: '' },
    classList: { add: jest.fn(), remove: jest.fn(), toggle: jest.fn(), contains: jest.fn(function () { return false }) },
    dataset: {},
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    setAttribute: jest.fn(),
    removeAttribute: jest.fn(),
    getAttribute: jest.fn(function (k) { return el.dataset ? el.dataset[k] : null }),
    appendChild: jest.fn(function (c) { return c }),
    removeChild: jest.fn(),
    insertBefore: jest.fn(),
    contains: jest.fn(function () { return false }),
    focus: jest.fn(),
    select: jest.fn(),
    blur: jest.fn(),
    click: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(function () { return [] }),
    closest: jest.fn(function () { return null }),
    getBoundingClientRect: jest.fn(function () { return { top: 0, left: 0, width: 100, height: 30, x: 0, y: 0, right: 100, bottom: 30 } }),
    innerHTML: '',
    outerHTML: '',
    offsetWidth: 320,
    offsetHeight: 200,
    scrollTop: 0,
    scrollHeight: 0,
    parentNode: null,
    parentElement: null,
    firstChild: null,
    lastChild: null,
    nextSibling: null,
    previousSibling: null,
    children: [],
    childNodes: [],
    ownerDocument: document,
    _listeners: {}
  }
  if (overrides) Object.assign(el, overrides)
  el.classList.contains.mockReturnValue(false)
  return el
}

// Override document.getElementById to use our mock store
document.getElementById = function (id) {
  if (_elementStore[id]) return _elementStore[id]
  try {
    var real = _origGetElementById(id)
    if (real) return real
  } catch (e) {}
  var mock = createElementMock(id)
  _elementStore[id] = mock
  return mock
}

// Let document.createElement use real jsdom implementation
// BUT intercept known element IDs to store in our registry
document.createElement = function (tag, options) {
  var real = _origCreateElement(tag, options)
  
  // Wrap setAttribute to also track ID in our store
  var origSetId = real.setAttribute
  real.setAttribute = function (name, value) {
    origSetId.call(real, name, value)
    if (name === 'id' && value) {
      _elementStore[value] = real
    }
  }
  
  // Intercept direct id property assignment
  Object.defineProperty(real, 'id', {
    get: function () { return real._id || '' },
    set: function (val) {
      real._id = val
      if (val) _elementStore[val] = real
    },
    configurable: true
  })
  
  return real
}

// Override querySelector/querySelectorAll to use real DOM
document.querySelector = function (sel) {
  try { return _origQuerySelector(sel) } catch (e) { return null }
}
document.querySelectorAll = function (sel) {
  try { return _origQuerySelectorAll(sel) } catch (e) { return [] }
}

// Helper: register an element mock by ID for tests that need it
global.registerElementMock = function (id, overrides) {
  var mock = createElementMock(id, overrides)
  _elementStore[id] = mock
  return mock
}

// Helper: clear all registered mocks (call in beforeEach)
global.clearElementMocks = function () {
  _elementStore = {}
}

// Mock window.db (IPC bridge)
if (!global.window) global.window = {}
global.window.db = {
  getSetting: jest.fn().mockResolvedValue('25'),
  setSetting: jest.fn().mockResolvedValue(true),
  getAllSettings: jest.fn().mockResolvedValue({}),
  getTags: jest.fn().mockResolvedValue([]),
  getTagsWithGoals: jest.fn().mockResolvedValue({ tags: [], goals: [] }),
  saveTag: jest.fn().mockResolvedValue(true),
  deleteTag: jest.fn().mockResolvedValue(true),
  getSessionsGrouped: jest.fn().mockResolvedValue({}),
  saveSession: jest.fn().mockResolvedValue(true),
  getSession: jest.fn().mockResolvedValue(null),
  updateSession: jest.fn().mockResolvedValue(true),
  deleteSession: jest.fn().mockResolvedValue(true),
  getTodayStats: jest.fn().mockResolvedValue({ todayPomos: 0, todayFocusMinutes: 0 }),
  getTotalStats: jest.fn().mockResolvedValue({ totalPomos: 0, totalFocusMinutes: 0 }),
  getGoals: jest.fn().mockResolvedValue([]),
  createGoal: jest.fn().mockResolvedValue(true),
  updateGoal: jest.fn().mockResolvedValue(true),
  deleteGoal: jest.fn().mockResolvedValue(true),
  getGoalProgress: jest.fn().mockResolvedValue([]),
  getSessionsByTag: jest.fn().mockResolvedValue([]),
  getSessionsByGoal: jest.fn().mockResolvedValue([]),
  getTasks: jest.fn().mockResolvedValue([]),
  createTask: jest.fn().mockResolvedValue(true),
  toggleTask: jest.fn().mockResolvedValue(true),
  updateTask: jest.fn().mockResolvedValue(true),
  deleteTask: jest.fn().mockResolvedValue(true),
  getHabits: jest.fn().mockResolvedValue([]),
  createHabit: jest.fn().mockResolvedValue(true),
  updateHabit: jest.fn().mockResolvedValue(true),
  deleteHabit: jest.fn().mockResolvedValue(true),
  getHabitLogs: jest.fn().mockResolvedValue([]),
  setHabitLog: jest.fn().mockResolvedValue(true),
  init: jest.fn().mockResolvedValue('/data'),
  getPath: jest.fn().mockResolvedValue('/data'),
  setPath: jest.fn().mockResolvedValue('/data')
}

global.window.electronAPI = {
  minimize: jest.fn(),
  maximize: jest.fn(),
  close: jest.fn(),
  navigate: jest.fn(),
  zoomIn: jest.fn(),
  zoomOut: jest.fn(),
  zoomReset: jest.fn(),
  setZoom: jest.fn(),
  readFile: jest.fn().mockResolvedValue(null),
  writeFile: jest.fn().mockResolvedValue(true),
  selectFolder: jest.fn().mockResolvedValue(null),
  getDefaultPath: jest.fn().mockResolvedValue('/default'),
  openUrl: jest.fn(),
  onUpdateAvailable: jest.fn(),
  onUpdateProgress: jest.fn(),
  onUpdateDownloaded: jest.fn(),
  startDownload: jest.fn().mockResolvedValue(true),
  quitAndInstall: jest.fn(),
  checkForUpdates: jest.fn().mockResolvedValue(false),
  checkFrontendUpdate: jest.fn().mockResolvedValue({}),
  backupDo: jest.fn().mockResolvedValue({ success: true }),
  backupSelectFolder: jest.fn().mockResolvedValue(null),
  backupSelectFiles: jest.fn().mockResolvedValue(null),
  backupRestore: jest.fn().mockResolvedValue({ log: [] }),
  backupGetInfo: jest.fn().mockResolvedValue({ storagePath: '/data', dbExists: false, settingsExists: false }),
  backupGetDefaultPath: jest.fn().mockResolvedValue('/backup'),
  backupOpenFolder: jest.fn(),
  closeApp: jest.fn(),
  onShortcut: jest.fn(),
  onBackendError: jest.fn()
}

global.window.AudioManager = {
  playSound: jest.fn()
}

global.window.Notification = jest.fn()
global.window.Notification.permission = 'default'
global.window.Notification.requestPermission = jest.fn().mockResolvedValue('granted')
global.window._dbInitPromise = Promise.resolve()
global.window._pendingSessionStart = false
global.window._pomoRightPanelOpen = false
global.window.settingsDirty = false

// Mock localStorage
if (!global.localStorage) {
  global.localStorage = {
    _data: {},
    getItem: function (key) { return this._data[key] !== undefined ? this._data[key] : null },
    setItem: function (key, val) { this._data[key] = String(val) },
    removeItem: function (key) { delete this._data[key] },
    clear: function () { this._data = {} }
  }
}

// Mock performance
if (!global.performance) {
  global.performance = { now: jest.fn(function () { return Date.now() }) }
}

// Mock scrollTo
if (!global.scrollTo) global.scrollTo = jest.fn()
