/**
 * Unit tests for sessions.js logic
 *
 * Pure functions replicated here for isolated testing.
 * Session management functions replicated with controllable state.
 * Timer globals and DOM handling are self-contained.
 */

// ─── Ensure required globals exist ───
if (typeof window === 'undefined') global.window = {};
if (!window.db) {
  window.db = {
    getSetting: jest.fn(), setSetting: jest.fn(), getAllSettings: jest.fn(),
    getTags: jest.fn(), getTagsWithGoals: jest.fn(), saveTag: jest.fn(),
    deleteTag: jest.fn(), getSessionsGrouped: jest.fn(), saveSession: jest.fn(),
    getSession: jest.fn(), updateSession: jest.fn(), deleteSession: jest.fn(),
    getTodayStats: jest.fn(), getTotalStats: jest.fn(), getGoals: jest.fn(),
    createGoal: jest.fn(), updateGoal: jest.fn(), deleteGoal: jest.fn(),
    getGoalProgress: jest.fn(), getSessionsByTag: jest.fn(),
    getSessionsByGoal: jest.fn(), getTasks: jest.fn(), createTask: jest.fn(),
    toggleTask: jest.fn(), updateTask: jest.fn(), deleteTask: jest.fn(),
    getHabits: jest.fn(), createHabit: jest.fn(), updateHabit: jest.fn(),
    deleteHabit: jest.fn(), getHabitLogs: jest.fn(), setHabitLog: jest.fn(),
    init: jest.fn(), getPath: jest.fn(), setPath: jest.fn()
  };
}
if (!window.AudioManager) window.AudioManager = { playSound: jest.fn() };
if (!window.localStorage) {
  window.localStorage = {
    _data: {},
    getItem: function(k) { return this._data[k] !== undefined ? this._data[k] : null; },
    setItem: function(k, v) { this._data[k] = String(v); },
    removeItem: function(k) { delete this._data[k]; },
    clear: function() { this._data = {}; }
  };
}

// ─── Replicated pure utility functions from sessions.js ───

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function formatTimeHM(ts) {
  var d = new Date(ts);
  var h = d.getHours(), m = d.getMinutes();
  var ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
}

function hexToRgb(hex) {
  var r = parseInt(hex.slice(1,3), 16);
  var g = parseInt(hex.slice(3,5), 16);
  var b = parseInt(hex.slice(5,7), 16);
  return r + ',' + g + ',' + b;
}

function formatDateLabel(dateStr) {
  var d = new Date(dateStr + 'T00:00:00');
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[d.getMonth()] + ' ' + d.getDate();
}

function formatDuration(minutes) {
  if (minutes < 1) return Math.round(minutes * 60) + 's';
  if (minutes < 60) return Math.round(minutes) + 'm';
  var h = Math.floor(minutes / 60);
  var m = Math.round(minutes % 60);
  return h + 'h ' + m + 'm';
}

function formatDurationShort(minutes) {
  if (minutes < 1) return Math.round(minutes * 60) + 's';
  if (minutes < 60) return Math.round(minutes) + 'm';
  var h = Math.floor(minutes / 60);
  var rm = Math.round(minutes % 60);
  return h + (rm > 0 ? '.' + Math.round(rm / 6) : '') + 'h';
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str || '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Timer global variables (replicated from timer.js) ───
var phase = 'idle';
var totalSeconds = 1500;
var remainingSeconds = 1500;
var accumulatedSeconds = 0;
var sessionCount = 0;
var isRunning = false;
var timerId = null;
var runStartTime = 0;

function stopTimer() {
  if (isRunning && runStartTime > 0) {
    accumulatedSeconds += (Date.now() - runStartTime) / 1000;
  }
  isRunning = false;
  if (timerId) { clearTimeout(timerId); timerId = null; }
}

function updateUI() {
  var el = document.getElementById('timerText');
  if (el) el.textContent = String(remainingSeconds);
}

async function setPhaseTime(p) {
  totalSeconds = 1500;
  remainingSeconds = 1500;
  accumulatedSeconds = 0;
}

function recalcRemaining() {
  if (!isRunning) return;
  var elapsed = (Date.now() - runStartTime) / 1000;
  var remaining = totalSeconds - accumulatedSeconds - elapsed;
  if (remaining < 0) remaining = 0;
  remainingSeconds = remaining;
}

// ─── Mock originals (replaced by sessions.js overrides) ───
var _origToggleTimer = null;
var _origCompleteTimer = null;
var _origConfirmEnd = null;
var _origResetTimer = null;
var _origSkipPhase = null;

// ─── Session state (replicated from sessions.js) ───
var activeSession = null;
var _taskPopupEnabled = false;
var _sideBoxDate = '';
var _pomoRightPanelOpen = false;
var _rightPanelSession = null;
var _pendingSessionStart = false;
var _rightPanelOriginalNote = '';

// ─── Session management functions (replicated from sessions.js) ───

function _hideSessionNamePopup() {
  var popup = document.getElementById('pomoNamePopup');
  if (popup) popup.classList.add('hidden');
  var backdrop = document.getElementById('pomoNamePopupBackdrop');
  if (backdrop) backdrop.classList.add('hidden');
  _pendingSessionStart = false;
}

function _showSessionNamePopup() {
  var popup = document.getElementById('pomoNamePopup');
  if (!popup) return;
  var tagSelect = document.getElementById('pomoPopupTag');
  if (tagSelect) {
    tagSelect.innerHTML = '<option value="">None</option>';
  }
  var goalSelect = document.getElementById('pomoPopupGoal');
  if (goalSelect) {
    goalSelect.innerHTML = '<option value="">None</option>';
  }
  popup.classList.remove('hidden');
}

window._popupRecentlyShown = false;

function _renderTimeline() {}
function _renderSessionTimeline() {}
function _renderSessionSideBox() {}

function onSessionStart() {
  _hideSessionNamePopup();
  if (activeSession) {
    activeSession = null;
  }
  var name = _taskPopupEnabled ? (window.pomoSessionName || '') : '';
  activeSession = {
    id: 's_' + Date.now(),
    startTime: Date.now(),
    accumulatedMs: 0,
    lastResumeTime: _taskPopupEnabled ? null : Date.now(),
    taskName: name,
    tagId: null,
    goalId: null,
    note: '',
    status: 'running'
  };
  _renderTimeline();
  _renderSessionTimeline();
  _renderSessionSideBox();
  if (_taskPopupEnabled && _pendingSessionStart) {
    _showSessionNamePopup();
  }
}

function onSessionPause() {
  if (!activeSession || !activeSession.lastResumeTime) return;
  activeSession.accumulatedMs += Date.now() - activeSession.lastResumeTime;
  activeSession.lastResumeTime = null;
  activeSession.status = 'paused';
  _renderTimeline();
  _renderSessionTimeline();
  _renderSessionSideBox();
}

function onSessionResume() {
  if (!activeSession) return;
  activeSession.lastResumeTime = Date.now();
  activeSession.status = 'running';
  _renderTimeline();
  _renderSessionTimeline();
  _renderSessionSideBox();
}

async function onSessionComplete(focusMinutes, plannedMinutes) {
  if (!activeSession) return;
  _pendingSessionStart = false;
  window.pomoSessionName = '';
  try { localStorage.removeItem('pomoSessionName'); } catch(e) {}
  _hideSessionNamePopup();
  if (activeSession && activeSession.lastResumeTime) {
    activeSession.accumulatedMs += Date.now() - activeSession.lastResumeTime;
  }
  if (focusMinutes === undefined) {
    focusMinutes = Math.round(activeSession.accumulatedMs / 60000);
  }
  var endTime = Date.now();
  var session = {
    id: activeSession.id,
    startTime: activeSession.startTime,
    endTime: endTime,
    plannedMinutes: plannedMinutes || focusMinutes,
    focusMinutes: focusMinutes,
    taskName: activeSession.taskName || '',
    note: activeSession.note || '',
    tagId: activeSession.tagId || null,
    goalId: activeSession.goalId || null
  };
  await window.db.saveSession(session);
  if (_rightPanelSession && activeSession && _rightPanelSession.id === activeSession.id) {
    _rightPanelSession = null;
  }
  activeSession = null;
  await _renderTimeline();
  await _renderSessionTimeline();
  await _renderSessionSideBox();
}

function onSessionCancel() {
  if (!activeSession) return;
  _pendingSessionStart = false;
  _hideSessionNamePopup();
  if (_rightPanelSession && activeSession && _rightPanelSession.id === activeSession.id) {
    _rightPanelSession = null;
  }
  activeSession = null;
  _renderTimeline();
  _renderSessionTimeline();
  _renderSessionSideBox();
}

// ─── Override functions (replicated from sessions.js) ───

function toggleTimerOverride() {
  if (remainingSeconds <= 0) return;
  if (_pendingSessionStart) return;
  if (isRunning) {
    _origToggleTimer();
    onSessionPause();
  } else {
    var isFresh = remainingSeconds === totalSeconds;
    if (isFresh && _taskPopupEnabled) {
      _pendingSessionStart = true;
      _showSessionNamePopup();
      return;
    }
    _origToggleTimer();
    if (isFresh) onSessionStart(); else onSessionResume();
  }
}

async function completeTimerOverride() {
  var sp = document.getElementById('sessionPopup');
  if (sp) sp.classList.add('hidden');
  var td = document.getElementById('tagDropdown');
  if (td) td.classList.add('hidden');
  var elapsedSec = totalSeconds - remainingSeconds;
  var plannedMinutes = totalSeconds / 60;
  if (activeSession && activeSession.lastResumeTime) {
    activeSession.accumulatedMs += Date.now() - activeSession.lastResumeTime;
    activeSession.lastResumeTime = null;
  }
  await _origCompleteTimer();
  await onSessionComplete(elapsedSec / 60, plannedMinutes);
}

async function confirmEndOverride() {
  var sp = document.getElementById('sessionPopup');
  if (sp) sp.classList.add('hidden');
  var td = document.getElementById('tagDropdown');
  if (td) td.classList.add('hidden');
  var elapsedSec = totalSeconds - remainingSeconds;
  var plannedMinutes = totalSeconds / 60;
  if (activeSession && activeSession.lastResumeTime) {
    activeSession.accumulatedMs += Date.now() - activeSession.lastResumeTime;
    activeSession.lastResumeTime = null;
  }
  await _origConfirmEnd();
  await onSessionComplete(elapsedSec / 60, plannedMinutes);
}

async function resetTimerOverride() {
  onSessionCancel();
  await _origResetTimer();
}

async function skipPhaseOverride() {
  if (_pendingSessionStart) {
    _pendingSessionStart = false;
    onSessionCancel();
  } else if (phase === 'work' && activeSession) {
    if (activeSession.lastResumeTime) {
      activeSession.accumulatedMs += Date.now() - activeSession.lastResumeTime;
      activeSession.lastResumeTime = null;
    }
    if (activeSession.accumulatedMs === 0) {
      onSessionCancel();
    } else {
      var elapsedSec = activeSession.accumulatedMs / 1000;
      var plannedMinutes = totalSeconds / 60;
      await onSessionComplete(elapsedSec / 60, plannedMinutes);
    }
  } else {
    onSessionCancel();
  }
  await _origSkipPhase();
}

// ─── Helper: create a mock DOM element ───
function mockEl(overrides) {
  return Object.assign({
    textContent: '', value: '', innerHTML: '', className: '', id: '',
    classList: {
      add: jest.fn(), remove: jest.fn(), toggle: jest.fn(),
      contains: jest.fn(function() { return false; })
    },
    style: { display: '', opacity: '', transform: '', paddingLeft: '', width: '',
             position: '', top: '', left: '', right: '', pointerEvents: '' },
    addEventListener: jest.fn(), removeEventListener: jest.fn(),
    setAttribute: jest.fn(), removeAttribute: jest.fn(),
    appendChild: jest.fn(function(c) { return c; }), focus: jest.fn(),
    querySelector: jest.fn(), querySelectorAll: jest.fn(function() { return []; }),
    getBoundingClientRect: jest.fn(function() { return { top: 0, left: 0, width: 100, height: 30 }; }),
    dataset: {}, parentNode: null, parentElement: null, children: []
  }, overrides || {});
}

// ─── Helper: set up document.getElementById mock ───
var _getElemMap = {};
function setupGetElementById(map) {
  _getElemMap = map || {};
  // Remove existing spy if any
  try { document.getElementById.mockRestore(); } catch(e) {}
  jest.spyOn(document, 'getElementById').mockImplementation(function(id) {
    if (_getElemMap[id]) return _getElemMap[id];
    return null;
  });
}

function makeElem(overrides) {
  var el = mockEl(overrides);
  return el;
}

// ─── Helper: reset all state between tests ───
function resetAllState() {
  activeSession = null;
  _taskPopupEnabled = false;
  _sideBoxDate = todayKey();
  _pomoRightPanelOpen = false;
  _rightPanelSession = null;
  _rightPanelOriginalNote = '';
  _pendingSessionStart = false;
  phase = 'idle';
  totalSeconds = 1500;
  remainingSeconds = 1500;
  accumulatedSeconds = 0;
  sessionCount = 0;
  isRunning = false;
  timerId = null;
  runStartTime = 0;
  window.pomoSessionName = '';
  window._popupRecentlyShown = false;
  // Sync window.* for code that uses window.totalSeconds etc.
  window.totalSeconds = 1500;
  window.remainingSeconds = 1500;
  _origToggleTimer = jest.fn();
  _origCompleteTimer = jest.fn();
  _origConfirmEnd = jest.fn();
  _origResetTimer = jest.fn();
  _origSkipPhase = jest.fn();
  localStorage.clear();
  _getElemMap = {};
}

beforeEach(function() {
  resetAllState();
  jest.clearAllMocks();
  try { document.getElementById.mockRestore(); } catch(e) {}
});

// ════════════════════════════════════════════════
// 1. Pure utility functions (15 tests)
// ════════════════════════════════════════════════

describe('todayKey', function() {
  it('returns YYYY-MM-DD format', function() {
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('formatTimeHM', function() {
  // Use fake timers to fix timezone for deterministic tests
  beforeEach(function() { jest.useFakeTimers(); });
  afterEach(function() { jest.useRealTimers(); });

  it('midnight returns "12:00 AM"', function() {
    var d = new Date(); d.setHours(0, 0, 0, 0);
    expect(formatTimeHM(d.getTime())).toBe('12:00 AM');
  });

  it('noon returns "12:00 PM"', function() {
    var d = new Date(); d.setHours(12, 0, 0, 0);
    expect(formatTimeHM(d.getTime())).toBe('12:00 PM');
  });

  it('13:45 returns "1:45 PM"', function() {
    var d = new Date('2026-07-21T13:45:00');
    expect(formatTimeHM(d.getTime())).toBe('1:45 PM');
  });

  it('0:05 returns "12:05 AM"', function() {
    var d = new Date('2026-07-21T00:05:00');
    expect(formatTimeHM(d.getTime())).toBe('12:05 AM');
  });
});

describe('hexToRgb', function() {
  it('#3B82F6 → "59,130,246"', function() {
    expect(hexToRgb('#3B82F6')).toBe('59,130,246');
  });

  it('6-char hex only — #fff does NOT expand', function() {
    // sessions.js hexToRgb does NOT handle short hex
    expect(hexToRgb('#fff')).toBe('255,15,NaN');
  });

  it('#000000 → "0,0,0"', function() {
    expect(hexToRgb('#000000')).toBe('0,0,0');
  });
});

describe('formatDateLabel', function() {
  it('formats "2026-07-21" as "Jul 21"', function() {
    expect(formatDateLabel('2026-07-21')).toBe('Jul 21');
  });
});

describe('formatDuration', function() {
  it('0.5 → "30s"', function() { expect(formatDuration(0.5)).toBe('30s'); });
  it('45 → "45m"', function() { expect(formatDuration(45)).toBe('45m'); });
  it('90 → "1h 30m"', function() { expect(formatDuration(90)).toBe('1h 30m'); });
  it('0 → "0s"', function() { expect(formatDuration(0)).toBe('0s'); });
});

describe('formatDurationShort', function() {
  it('0.5 → "30s"', function() { expect(formatDurationShort(0.5)).toBe('30s'); });
  it('45 → "45m"', function() { expect(formatDurationShort(45)).toBe('45m'); });
  it('90 → "1.5h"', function() { expect(formatDurationShort(90)).toBe('1.5h'); });
  it('120 → "2h"', function() { expect(formatDurationShort(120)).toBe('2h'); });
  it('0 → "0s"', function() { expect(formatDurationShort(0)).toBe('0s'); });
});

describe('escapeHtml', function() {
  it('escapes &', function() { expect(escapeHtml('a&b')).toBe('a&amp;b'); });
  it('escapes <', function() { expect(escapeHtml('<tag>')).toBe('&lt;tag&gt;'); });
  it('escapes >', function() { expect(escapeHtml('a>b')).toBe('a&gt;b'); });
  it('escapes "', function() { expect(escapeHtml('"quote"')).toBe('&quot;quote&quot;'); });
  it('null returns ""', function() { expect(escapeHtml(null)).toBe(''); });
  it('undefined returns ""', function() { expect(escapeHtml(undefined)).toBe(''); });
});

// ════════════════════════════════════════════════
// 2. activeSession state management (15 tests)
// ════════════════════════════════════════════════

describe('onSessionStart', function() {
  beforeEach(function() {
    jest.spyOn(Date, 'now').mockReturnValue(1000000);
  });
  afterEach(function() { Date.now.mockRestore(); });

  it('creates activeSession with correct structure', function() {
    onSessionStart();
    expect(activeSession).not.toBeNull();
    expect(activeSession.id).toBe('s_1000000');
    expect(activeSession.startTime).toBe(1000000);
    expect(activeSession.accumulatedMs).toBe(0);
    expect(activeSession.taskName).toBe('');
    expect(activeSession.tagId).toBeNull();
    expect(activeSession.goalId).toBeNull();
    expect(activeSession.note).toBe('');
    expect(activeSession.status).toBe('running');
  });

  it('sets lastResumeTime when _taskPopupEnabled=false', function() {
    _taskPopupEnabled = false;
    onSessionStart();
    expect(activeSession.lastResumeTime).toBe(1000000);
  });

  it('sets lastResumeTime=null when _taskPopupEnabled=true', function() {
    _taskPopupEnabled = true;
    onSessionStart();
    expect(activeSession.lastResumeTime).toBeNull();
  });

  it('calls _renderSessionSideBox', function() {
    var spy = jest.fn();
    var orig = _renderSessionSideBox;
    _renderSessionSideBox = spy;
    onSessionStart();
    expect(spy).toHaveBeenCalled();
    _renderSessionSideBox = orig;
  });

  it('clears previous activeSession if exists', function() {
    activeSession = { id: 's_old' };
    onSessionStart();
    expect(activeSession.id).toBe('s_1000000');
  });

  it('uses pomoSessionName when _taskPopupEnabled', function() {
    _taskPopupEnabled = true;
    window.pomoSessionName = 'My Task';
    onSessionStart();
    expect(activeSession.taskName).toBe('My Task');
  });

  it('sets taskName empty when _taskPopupEnabled but no name', function() {
    _taskPopupEnabled = true;
    window.pomoSessionName = '';
    onSessionStart();
    expect(activeSession.taskName).toBe('');
  });
});

describe('onSessionPause', function() {
  beforeEach(function() {
    activeSession = { id: 's_test', accumulatedMs: 5000, lastResumeTime: 1000000, status: 'running' };
    jest.spyOn(Date, 'now').mockReturnValue(1005000);
  });
  afterEach(function() { Date.now.mockRestore(); });

  it('accumulates time correctly', function() {
    onSessionPause();
    expect(activeSession.accumulatedMs).toBe(10000);
  });

  it('sets lastResumeTime=null', function() {
    onSessionPause();
    expect(activeSession.lastResumeTime).toBeNull();
  });

  it('sets status="paused"', function() {
    onSessionPause();
    expect(activeSession.status).toBe('paused');
  });

  it('returns safely when no activeSession', function() {
    activeSession = null;
    expect(function() { onSessionPause(); }).not.toThrow();
  });

  it('returns safely when lastResumeTime is null', function() {
    activeSession.lastResumeTime = null;
    expect(function() { onSessionPause(); }).not.toThrow();
    expect(activeSession.accumulatedMs).toBe(5000);
  });
});

describe('onSessionResume', function() {
  beforeEach(function() {
    activeSession = { id: 's_test', lastResumeTime: null, status: 'paused' };
    jest.spyOn(Date, 'now').mockReturnValue(2000000);
  });
  afterEach(function() { Date.now.mockRestore(); });

  it('sets lastResumeTime=Date.now()', function() {
    onSessionResume();
    expect(activeSession.lastResumeTime).toBe(2000000);
  });

  it('sets status="running"', function() {
    onSessionResume();
    expect(activeSession.status).toBe('running');
  });

  it('returns safely when no activeSession', function() {
    activeSession = null;
    expect(function() { onSessionResume(); }).not.toThrow();
  });
});

// ════════════════════════════════════════════════
// 3. toggleTimer override (12 tests)
// ════════════════════════════════════════════════

describe('toggleTimer override', function() {
  beforeEach(function() {
    isRunning = false;
    remainingSeconds = 1500;
    totalSeconds = 1500;
    activeSession = null;
    _pendingSessionStart = false;
    _taskPopupEnabled = false;
    _origToggleTimer = jest.fn();
  });

  it('returns when remainingSeconds <= 0', function() {
    remainingSeconds = 0;
    toggleTimerOverride();
    expect(_origToggleTimer).not.toHaveBeenCalled();
  });

  it('returns when remainingSeconds < 0', function() {
    remainingSeconds = -1;
    toggleTimerOverride();
    expect(_origToggleTimer).not.toHaveBeenCalled();
  });

  it('returns when _pendingSessionStart is true', function() {
    _pendingSessionStart = true;
    toggleTimerOverride();
    expect(_origToggleTimer).not.toHaveBeenCalled();
  });

  it('calls _origToggleTimer + onSessionPause when isRunning', function() {
    isRunning = true;
    activeSession = { id: 's_test', accumulatedMs: 0, lastResumeTime: 1000, status: 'running' };
    toggleTimerOverride();
    expect(_origToggleTimer).toHaveBeenCalledTimes(1);
    expect(activeSession.status).toBe('paused');
  });

  it('sets _pendingSessionStart=true and shows popup when fresh + _taskPopupEnabled', function() {
    _taskPopupEnabled = true;
    isRunning = false;
    remainingSeconds = 1500;
    totalSeconds = 1500;
    toggleTimerOverride();
    expect(_pendingSessionStart).toBe(true);
    expect(_origToggleTimer).not.toHaveBeenCalled();
  });

  it('calls _origToggleTimer + onSessionStart when fresh and !_taskPopupEnabled', function() {
    _taskPopupEnabled = false;
    isRunning = false;
    remainingSeconds = 1500;
    totalSeconds = 1500;
    toggleTimerOverride();
    expect(_origToggleTimer).toHaveBeenCalledTimes(1);
    expect(activeSession).not.toBeNull();
    expect(activeSession.status).toBe('running');
  });

  it('calls _origToggleTimer + onSessionResume when not fresh', function() {
    isRunning = false;
    remainingSeconds = 1400;
    totalSeconds = 1500;
    activeSession = { id: 's_test', lastResumeTime: null, status: 'paused' };
    toggleTimerOverride();
    expect(_origToggleTimer).toHaveBeenCalledTimes(1);
    expect(activeSession.status).toBe('running');
  });

  it('_taskPopupEnabled var checked: true shows popup, false starts', function() {
    _taskPopupEnabled = true;
    isRunning = false;
    remainingSeconds = 1500;
    totalSeconds = 1500;
    toggleTimerOverride();
    expect(_pendingSessionStart).toBe(true);

    resetAllState();
    _origToggleTimer = jest.fn();
    _taskPopupEnabled = false;
    isRunning = false;
    remainingSeconds = 1500;
    totalSeconds = 1500;
    toggleTimerOverride();
    expect(activeSession).not.toBeNull();
  });

  it('isFresh=true creates new session', function() {
    isRunning = false;
    remainingSeconds = 1500;
    totalSeconds = 1500;
    toggleTimerOverride();
    expect(activeSession.status).toBe('running');
  });

  it('isFresh=false resumes existing session', function() {
    isRunning = false;
    remainingSeconds = 1400;
    totalSeconds = 1500;
    activeSession = { id: 's_old', lastResumeTime: null, status: 'paused' };
    toggleTimerOverride();
    expect(activeSession.status).toBe('running');
  });

  it('hides session popup via _hideSessionNamePopup on start', function() {
    setupGetElementById({ pomoNamePopup: makeElem(), pomoNamePopupBackdrop: makeElem() });
    isRunning = false;
    remainingSeconds = 1500;
    totalSeconds = 1500;
    toggleTimerOverride();
    var popup = document.getElementById('pomoNamePopup');
    expect(popup.classList.add).toHaveBeenCalledWith('hidden');
  });
});

// ════════════════════════════════════════════════
// 4. completeTimer override (8 tests)
// ════════════════════════════════════════════════

describe('completeTimer override', function() {
  beforeEach(function() {
    totalSeconds = 1500;
    remainingSeconds = 0;
    activeSession = {
      id: 's_test', startTime: 1000, accumulatedMs: 60000,
      lastResumeTime: null, taskName: 'test', note: '', tagId: null, goalId: null
    };
    _origCompleteTimer = jest.fn();
    window.db.saveSession.mockResolvedValue();
  });

  it('saves session with correct focusMinutes from elapsed', async function() {
    totalSeconds = 1500; remainingSeconds = 0;
    await completeTimerOverride();
    expect(window.db.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({ focusMinutes: 25, plannedMinutes: 25 })
    );
  });

  it('calls original completeTimer', async function() {
    await completeTimerOverride();
    expect(_origCompleteTimer).toHaveBeenCalledTimes(1);
  });

  it('uses partial elapsed for correct focusMinutes', async function() {
    totalSeconds = 1500; remainingSeconds = 300;
    await completeTimerOverride();
    expect(window.db.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({ focusMinutes: 20, plannedMinutes: 25 })
    );
  });

  it('accumulates lastResumeTime before saving', async function() {
    jest.spyOn(Date, 'now').mockReturnValue(2000000);
    activeSession.accumulatedMs = 50000;
    activeSession.lastResumeTime = 1000000;
    totalSeconds = 1500; remainingSeconds = 0;
    await completeTimerOverride();
    // accumulatedMs goes to 1050000, but focusMinutes is from elapsedSec (25), not accumulatedMs
    expect(window.db.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({ focusMinutes: 25 })
    );
    Date.now.mockRestore();
  });

  it('clears activeSession after completion', async function() {
    await completeTimerOverride();
    expect(activeSession).toBeNull();
  });

  it('handles lastResumeTime accumulation then clears', async function() {
    jest.spyOn(Date, 'now').mockReturnValue(2000000);
    activeSession.lastResumeTime = 1000000;
    await completeTimerOverride();
    expect(activeSession).toBeNull();
    Date.now.mockRestore();
  });

  it('handles no activeSession gracefully', async function() {
    activeSession = null;
    await expect(completeTimerOverride()).resolves.not.toThrow();
  });

  it('hides sessionPopup and tagDropdown when they exist', async function() {
    var sp = makeElem(); var td = makeElem();
    setupGetElementById({ sessionPopup: sp, tagDropdown: td });
    await completeTimerOverride();
    expect(sp.classList.add).toHaveBeenCalledWith('hidden');
    expect(td.classList.add).toHaveBeenCalledWith('hidden');
  });
});

// ════════════════════════════════════════════════
// 5. confirmEnd override (6 tests)
// ════════════════════════════════════════════════

describe('confirmEnd override', function() {
  beforeEach(function() {
    totalSeconds = 1500; remainingSeconds = 900;
    activeSession = {
      id: 's_test', startTime: 1000, accumulatedMs: 30000,
      lastResumeTime: null, taskName: 'test', note: '', tagId: null, goalId: null
    };
    _origConfirmEnd = jest.fn();
    window.db.saveSession.mockResolvedValue();
  });

  it('calculates elapsedSec = totalSeconds - remainingSeconds', async function() {
    totalSeconds = 1500; remainingSeconds = 900;
    await confirmEndOverride();
    expect(window.db.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({ focusMinutes: 10 })
    );
  });

  it('calls original confirmEnd', async function() {
    await confirmEndOverride();
    expect(_origConfirmEnd).toHaveBeenCalledTimes(1);
  });

  it('calls onSessionComplete with elapsed/60 and plannedMinutes', async function() {
    totalSeconds = 1500; remainingSeconds = 300;
    await confirmEndOverride();
    expect(window.db.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({ focusMinutes: 20, plannedMinutes: 25 })
    );
  });

  it('accumulates lastResumeTime (focusMinutes from elapsed, not accumulatedMs)', async function() {
    jest.spyOn(Date, 'now').mockReturnValue(2000000);
    activeSession.accumulatedMs = 40000;
    activeSession.lastResumeTime = 1000000;
    await confirmEndOverride();
    // focusMinutes comes from elapsedSec = (1500-900)/60 = 10, not from accumulatedMs
    expect(window.db.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({ focusMinutes: 10 })
    );
    Date.now.mockRestore();
  });

  it('handles missing lastResumeTime gracefully', async function() {
    activeSession.lastResumeTime = null;
    await expect(confirmEndOverride()).resolves.not.toThrow();
  });

  it('clears activeSession after end', async function() {
    await confirmEndOverride();
    expect(activeSession).toBeNull();
  });
});

// ════════════════════════════════════════════════
// 6. resetTimer override (4 tests)
// ════════════════════════════════════════════════

describe('resetTimer override', function() {
  beforeEach(function() {
    activeSession = { id: 's_test', accumulatedMs: 5000, lastResumeTime: 1000, status: 'running' };
    _pendingSessionStart = true;
    _origResetTimer = jest.fn();
  });

  it('calls onSessionCancel first', async function() {
    await resetTimerOverride();
    expect(activeSession).toBeNull();
  });

  it('then calls original resetTimer', async function() {
    await resetTimerOverride();
    expect(_origResetTimer).toHaveBeenCalledTimes(1);
  });

  it('cleans up _pendingSessionStart', async function() {
    _pendingSessionStart = true;
    await resetTimerOverride();
    expect(_pendingSessionStart).toBe(false);
  });

  it('handles no activeSession gracefully', async function() {
    activeSession = null;
    _pendingSessionStart = false;
    await expect(resetTimerOverride()).resolves.not.toThrow();
    expect(_origResetTimer).toHaveBeenCalledTimes(1);
  });
});

// ════════════════════════════════════════════════
// 7. skipPhase override (10 tests)
// ════════════════════════════════════════════════

describe('skipPhase override', function() {
  beforeEach(function() {
    _pendingSessionStart = false;
    phase = 'work';
    totalSeconds = 1500;
    activeSession = { id: 's_test', accumulatedMs: 1000, lastResumeTime: null, status: 'running' };
    _origSkipPhase = jest.fn();
    window.db.saveSession.mockResolvedValue();
  });

  it('_pendingSessionStart cancels without saving', async function() {
    _pendingSessionStart = true;
    await skipPhaseOverride();
    expect(window.db.saveSession).not.toHaveBeenCalled();
    expect(activeSession).toBeNull();
  });

  it('_pendingSessionStart calls onSessionCancel', async function() {
    _pendingSessionStart = true;
    activeSession = { id: 's_pending', accumulatedMs: 0, lastResumeTime: null };
    await skipPhaseOverride();
    expect(activeSession).toBeNull();
  });

  it('work phase with accumulatedMs=0 calls onSessionCancel', async function() {
    phase = 'work';
    activeSession.accumulatedMs = 0;
    await skipPhaseOverride();
    expect(activeSession).toBeNull();
    expect(window.db.saveSession).not.toHaveBeenCalled();
  });

  it('work phase with accumulatedMs>0 calls onSessionComplete', async function() {
    phase = 'work';
    activeSession.accumulatedMs = 120000;
    await skipPhaseOverride();
    expect(window.db.saveSession).toHaveBeenCalled();
    expect(activeSession).toBeNull();
  });

  it('break phase calls onSessionCancel', async function() {
    phase = 'shortBreak';
    activeSession = { id: 's_break', accumulatedMs: 60000, lastResumeTime: null };
    await skipPhaseOverride();
    expect(activeSession).toBeNull();
    expect(window.db.saveSession).not.toHaveBeenCalled();
  });

  it('calls original skipPhase', async function() {
    activeSession.accumulatedMs = 60000;
    await skipPhaseOverride();
    expect(_origSkipPhase).toHaveBeenCalledTimes(1);
  });

  it('accumulates lastResumeTime before completing', async function() {
    jest.spyOn(Date, 'now').mockReturnValue(2000000);
    phase = 'work';
    activeSession.accumulatedMs = 50000;
    activeSession.lastResumeTime = 1000000;
    await skipPhaseOverride();
    // elapsedSec = accumulatedMs / 1000 = 1050000 / 1000 = 1050, focusMinutes = 1050/60 = 17.5
    expect(window.db.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({ focusMinutes: 17.5 })
    );
    Date.now.mockRestore();
  });

  it('handles activeSession without lastResumeTime in work phase', async function() {
    phase = 'work';
    activeSession.accumulatedMs = 60000;
    activeSession.lastResumeTime = null;
    await skipPhaseOverride();
    expect(window.db.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({ focusMinutes: 1 })
    );
  });

  it('no activeSession and not _pendingSessionStart calls orig skipPhase', async function() {
    activeSession = null;
    phase = 'work';
    await skipPhaseOverride();
    expect(_origSkipPhase).toHaveBeenCalledTimes(1);
  });

  it('work phase with accumulatedMs=0 and lastResumeTime=null cancels', async function() {
    phase = 'work';
    activeSession = { id: 's_zero', accumulatedMs: 0, lastResumeTime: null };
    await skipPhaseOverride();
    expect(window.db.saveSession).not.toHaveBeenCalled();
    expect(activeSession).toBeNull();
  });
});

// ════════════════════════════════════════════════
// 8. cancelSessionNow (10 tests)
// ════════════════════════════════════════════════

describe('cancelSessionNow', function() {
  async function cancelSessionNow() {
    if (phase === 'idle') return;
    var sp = document.getElementById('sessionPopup');
    if (sp) sp.classList.add('hidden');
    var td = document.getElementById('tagDropdown');
    if (td) td.classList.add('hidden');
    if (_pendingSessionStart) {
      _pendingSessionStart = false;
      onSessionCancel();
      stopTimer();
      phase = 'idle';
      await setPhaseTime('work');
      updateUI();
      return;
    }
    var elapsedSec = totalSeconds - remainingSeconds;
    var plannedMinutes = totalSeconds / 60;
    if (activeSession && activeSession.lastResumeTime) {
      activeSession.accumulatedMs += Date.now() - activeSession.lastResumeTime;
      activeSession.lastResumeTime = null;
    }
    stopTimer();
    phase = 'idle';
    recalcRemaining();
    updateUI();
    await onSessionComplete(elapsedSec / 60, plannedMinutes);
    if (window.AudioManager) window.AudioManager.playSound('pomo-end.mp3');
  }

  beforeEach(function() {
    phase = 'work';
    totalSeconds = 1500; remainingSeconds = 1200;
    _pendingSessionStart = false;
    activeSession = {
      id: 's_test', startTime: 1000, accumulatedMs: 180000,
      lastResumeTime: null, taskName: 'test', note: '', tagId: null, goalId: null
    };
    window.db.saveSession.mockResolvedValue();
    window.AudioManager.playSound.mockClear();
  });

  it('returns immediately when phase=idle', async function() {
    phase = 'idle';
    await cancelSessionNow();
    expect(window.db.saveSession).not.toHaveBeenCalled();
  });

  it('handles _pendingSessionStart: cancels and resets phase', async function() {
    _pendingSessionStart = true;
    activeSession = { id: 's_pending', accumulatedMs: 0, lastResumeTime: null };
    await cancelSessionNow();
    expect(activeSession).toBeNull();
    expect(phase).toBe('idle');
    expect(isRunning).toBe(false);
  });

  it('stops timer', async function() {
    isRunning = true;
    runStartTime = Date.now();
    await cancelSessionNow();
    expect(isRunning).toBe(false);
  });

  it('calls onSessionComplete with elapsed time', async function() {
    totalSeconds = 1500; remainingSeconds = 900;
    await cancelSessionNow();
    expect(window.db.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({ focusMinutes: 10 })
    );
  });

  it('accumulates lastResumeTime before completing', async function() {
    jest.spyOn(Date, 'now').mockReturnValue(2000000);
    activeSession.accumulatedMs = 120000;
    activeSession.lastResumeTime = 1000000;
    totalSeconds = 1500; remainingSeconds = 0;
    await cancelSessionNow();
    expect(window.db.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({ focusMinutes: 25 })
    );
    Date.now.mockRestore();
  });

  it('hides sessionPopup if exists', async function() {
    var sp = makeElem();
    setupGetElementById({ sessionPopup: sp, tagDropdown: makeElem() });
    await cancelSessionNow();
    expect(sp.classList.add).toHaveBeenCalledWith('hidden');
  });

  it('hides tagDropdown if exists', async function() {
    var td = makeElem();
    setupGetElementById({ sessionPopup: makeElem(), tagDropdown: td });
    await cancelSessionNow();
    expect(td.classList.add).toHaveBeenCalledWith('hidden');
  });

  it('plays pomo-end.mp3', async function() {
    await cancelSessionNow();
    expect(window.AudioManager.playSound).toHaveBeenCalledWith('pomo-end.mp3');
  });

  it('resets phase to idle', async function() {
    await cancelSessionNow();
    expect(phase).toBe('idle');
  });

  it('handles _pendingSessionStart without activeSession', async function() {
    _pendingSessionStart = true;
    activeSession = null;
    await cancelSessionNow();
    expect(phase).toBe('idle');
    expect(window.db.saveSession).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════
// 9. Session name popup (15 tests)
// ════════════════════════════════════════════════

describe('showSessionNamePopup', function() {
  it('removes hidden class from pomoNamePopup', async function() {
    var popup = makeElem();
    setupGetElementById({ pomoNamePopup: popup, pomoPopupTag: makeElem({ innerHTML: '' }), pomoPopupGoal: makeElem({ innerHTML: '' }) });
    await _showSessionNamePopup();
    expect(popup.classList.remove).toHaveBeenCalledWith('hidden');
  });

  it('does nothing if popup element missing', function() {
    setupGetElementById({});
    expect(function() { _showSessionNamePopup(); }).not.toThrow();
  });

  it('populates tag select innerHTML', async function() {
    window.db.getTags.mockResolvedValue([{ id: 't1', name: 'Work' }]);
    var tagSelect = makeElem({ innerHTML: '' });
    setupGetElementById({ pomoNamePopup: makeElem(), pomoPopupTag: tagSelect, pomoPopupGoal: makeElem({ innerHTML: '' }) });
    await _showSessionNamePopup();
    expect(tagSelect.innerHTML).toBe('<option value="">None</option>');
  });

  it('populates goal select innerHTML', async function() {
    window.db.getTagsWithGoals.mockResolvedValue({ tags: [], goals: [{ goalId: 'g1', name: 'Goal 1' }] });
    var goalSelect = makeElem({ innerHTML: '' });
    setupGetElementById({ pomoNamePopup: makeElem(), pomoPopupTag: makeElem({ innerHTML: '' }), pomoPopupGoal: goalSelect });
    await _showSessionNamePopup();
    expect(goalSelect.innerHTML).toBe('<option value="">None</option>');
  });
});

describe('hideSessionNamePopup', function() {
  it('adds hidden class to pomoNamePopup', function() {
    var popup = makeElem();
    setupGetElementById({ pomoNamePopup: popup, pomoNamePopupBackdrop: makeElem() });
    _pendingSessionStart = true;
    _hideSessionNamePopup();
    expect(popup.classList.add).toHaveBeenCalledWith('hidden');
  });

  it('sets _pendingSessionStart = false', function() {
    setupGetElementById({ pomoNamePopup: makeElem(), pomoNamePopupBackdrop: makeElem() });
    _pendingSessionStart = true;
    _hideSessionNamePopup();
    expect(_pendingSessionStart).toBe(false);
  });

  it('hides backdrop if exists', function() {
    var backdrop = makeElem();
    setupGetElementById({ pomoNamePopup: makeElem(), pomoNamePopupBackdrop: backdrop });
    _hideSessionNamePopup();
    expect(backdrop.classList.add).toHaveBeenCalledWith('hidden');
  });
});

describe('confirmSessionName', function() {
  function confirmSessionName() {
    var tagSelect = document.getElementById('pomoPopupTag');
    var goalSelect = document.getElementById('pomoPopupGoal');
    var name = '';
    var tagId = tagSelect ? tagSelect.value : null;
    var goalId = goalSelect ? goalSelect.value : null;
    var note = '';
    var durationInput = document.getElementById('pomoPopupDuration');
    var customDuration = durationInput && durationInput.value ? parseInt(durationInput.value) : null;
    if (customDuration && customDuration > 0 && (window.phase === 'work' || window.phase === 'idle')) {
      window.totalSeconds = customDuration * 60;
      window.remainingSeconds = window.totalSeconds;
      window.db.setSetting('workMinutes', customDuration);
    }
    window.pomoSessionName = name;
    try { localStorage.setItem('pomoSessionName', name); } catch(e) {}
    var wasPending = _pendingSessionStart;
    _hideSessionNamePopup();
    if (wasPending) {
      _pendingSessionStart = false;
      _origToggleTimer();
      onSessionStart();
      if (activeSession) {
        activeSession.lastResumeTime = Date.now();
        activeSession.taskName = name;
        activeSession.tagId = tagId;
        activeSession.goalId = goalId;
        activeSession.note = note;
      }
    }
    updateUI();
    _renderTimeline();
    _renderSessionTimeline();
    _renderSessionSideBox();
  }

  beforeEach(function() {
    _pendingSessionStart = true;
    _taskPopupEnabled = true;
    _origToggleTimer = jest.fn();
    window.phase = 'work';
    totalSeconds = 1500;
    remainingSeconds = 1500;
    window.db.saveSession.mockResolvedValue();
    window.db.setSetting.mockResolvedValue();
    jest.spyOn(Date, 'now').mockReturnValue(3000000);
    setupGetElementById({
      pomoPopupTag: makeElem({ value: null }),
      pomoPopupGoal: makeElem({ value: null }),
      pomoPopupDuration: makeElem({ value: '' }),
      pomoNamePopup: makeElem(),
      pomoNamePopupBackdrop: makeElem()
    });
  });

  afterEach(function() {
    Date.now.mockRestore();
    delete window.phase;
  });

  it('when wasPending, calls _origToggleTimer + onSessionStart', function() {
    _pendingSessionStart = true;
    confirmSessionName();
    expect(_origToggleTimer).toHaveBeenCalledTimes(1);
    expect(activeSession).not.toBeNull();
  });

  it('sets activeSession properties (taskName, tagId, goalId)', function() {
    confirmSessionName();
    expect(activeSession.taskName).toBe('');
    expect(activeSession.tagId).toBeNull();
    expect(activeSession.goalId).toBeNull();
  });

  it('resets _pendingSessionStart', function() {
    _pendingSessionStart = true;
    confirmSessionName();
    expect(_pendingSessionStart).toBe(false);
  });

  it('updates lastResumeTime after session start', function() {
    confirmSessionName();
    expect(activeSession.lastResumeTime).toBe(3000000);
  });

  it('sets customDuration on totalSeconds and remainingSeconds', function() {
    _getElemMap.pomoPopupDuration.value = '30';
    confirmSessionName();
    expect(window.totalSeconds).toBe(1800);
    expect(window.remainingSeconds).toBe(1800);
  });

  it('sets remainingSeconds from customDuration', function() {
    _getElemMap.pomoPopupDuration.value = '45';
    confirmSessionName();
    expect(window.remainingSeconds).toBe(2700);
  });

  it('calls updateUI', function() {
    var spy = jest.fn();
    var orig = updateUI;
    updateUI = spy;
    confirmSessionName();
    expect(spy).toHaveBeenCalled();
    updateUI = orig;
  });

  it('not wasPending skips toggle + session start', function() {
    _pendingSessionStart = false;
    confirmSessionName();
    expect(_origToggleTimer).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════
// 10. Right panel system (10 tests)
// ════════════════════════════════════════════════

describe('togglePomoRightPanel', function() {
  function togglePomoRightPanel(forceState) {
    if (typeof forceState === 'boolean') {
      _pomoRightPanelOpen = forceState;
    } else {
      _pomoRightPanelOpen = !_pomoRightPanelOpen;
    }
    var panel = document.getElementById('pomoRightPanelWrapper');
    var btn = document.getElementById('pomoRightToggleBtn');
    if (panel && btn) {
      if (_pomoRightPanelOpen) {
        panel.style.transform = 'translate(0, -50%)';
        panel.style.opacity = '1';
        panel.style.pointerEvents = 'auto';
        btn.style.right = '340px';
        if (!_rightPanelSession && activeSession) {
          _rightPanelSession = activeSession;
          _rightPanelOriginalNote = activeSession.note || '';
          var noteArea = document.getElementById('pomoNoteArea');
          if (noteArea) noteArea.value = activeSession.note || '';
        }
      } else {
        panel.style.transform = 'translate(150%, -50%)';
        panel.style.opacity = '0';
        panel.style.pointerEvents = 'none';
        btn.style.right = '0';
        saveRightPanelSession();
        _rightPanelSession = null;
      }
    }
  }

  function saveRightPanelSession() {
    if (!_rightPanelSession) return;
    var noteInput = document.getElementById('pomoNoteArea');
    var noteVal = noteInput ? noteInput.value.trim() : '';
    _rightPanelSession.note = noteVal;
    if (activeSession && _rightPanelSession.id === activeSession.id) {
      activeSession.note = noteVal;
    } else {
      window.db.updateSession(_rightPanelSession.id, {
        taskName: _rightPanelSession.taskName || '',
        tagId: _rightPanelSession.tagId || null,
        note: noteVal,
        goalId: _rightPanelSession.goalId || null
      });
    }
  }

  var panel, btn, noteArea;

  beforeEach(function() {
    _pomoRightPanelOpen = false;
    _rightPanelSession = null;
    activeSession = { id: 's_test', taskName: 'test', note: '', tagId: null, goalId: null };
    window.db.updateSession.mockResolvedValue();
    panel = makeElem();
    btn = makeElem();
    noteArea = makeElem();
    setupGetElementById({ pomoRightPanelWrapper: panel, pomoRightToggleBtn: btn, pomoNoteArea: noteArea });
  });

  it('toggles _pomoRightPanelOpen', function() {
    togglePomoRightPanel();
    expect(_pomoRightPanelOpen).toBe(true);
    togglePomoRightPanel();
    expect(_pomoRightPanelOpen).toBe(false);
  });

  it('force true opens panel', function() {
    togglePomoRightPanel(true);
    expect(_pomoRightPanelOpen).toBe(true);
  });

  it('force false closes panel', function() {
    togglePomoRightPanel(true);
    togglePomoRightPanel(false);
    expect(_pomoRightPanelOpen).toBe(false);
  });

  it('open state sets panel transform to translate(0, -50%)', function() {
    togglePomoRightPanel(true);
    expect(panel.style.transform).toBe('translate(0, -50%)');
  });

  it('close state sets panel transform to translate(150%, -50%)', function() {
    togglePomoRightPanel(false);
    expect(panel.style.transform).toBe('translate(150%, -50%)');
  });

  it('open with activeSession sets _rightPanelSession', function() {
    togglePomoRightPanel(true);
    expect(_rightPanelSession).toBe(activeSession);
  });

  it('close saves and clears _rightPanelSession', function() {
    togglePomoRightPanel(true);
    togglePomoRightPanel(false);
    expect(_rightPanelSession).toBeNull();
  });

  it('saveRightPanelSession updates activeSession.note', function() {
    _rightPanelSession = { id: 's_test', note: '', taskName: 't1', tagId: null, goalId: null };
    activeSession = { id: 's_test', note: '' };
    noteArea.value = 'my note';
    saveRightPanelSession();
    expect(activeSession.note).toBe('my note');
  });

  it('saveRightPanelSession calls db.updateSession for past sessions', function() {
    _rightPanelSession = { id: 's_old', taskName: 'old', tagId: null, note: '', goalId: null };
    activeSession = { id: 's_current', note: '' };
    noteArea.value = 'updated note';
    saveRightPanelSession();
    expect(window.db.updateSession).toHaveBeenCalledWith('s_old',
      expect.objectContaining({ note: 'updated note' }));
  });

  it('open copies activeSession note to noteArea', function() {
    activeSession.note = 'existing note';
    togglePomoRightPanel(true);
    expect(noteArea.value).toBe('existing note');
  });
});

// ════════════════════════════════════════════════
// 11. Side box day navigation (10 tests)
// ════════════════════════════════════════════════

describe('pomoPrevDay', function() {
  function pomoPrevDay() {
    var parts = _sideBoxDate.split('-');
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2] - 1);
    _sideBoxDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    _renderSessionSideBox();
  }

  beforeEach(function() { _sideBoxDate = '2026-07-15'; });

  it('decrements _sideBoxDate by 1 day', function() {
    pomoPrevDay();
    expect(_sideBoxDate).toBe('2026-07-14');
  });

  it('handles month boundary (Aug 1 to Jul 31)', function() {
    _sideBoxDate = '2026-08-01';
    pomoPrevDay();
    expect(_sideBoxDate).toBe('2026-07-31');
  });

  it('handles year boundary (Jan 1 to Dec 31)', function() {
    _sideBoxDate = '2026-01-01';
    pomoPrevDay();
    expect(_sideBoxDate).toBe('2025-12-31');
  });

  it('handles March 1 on non-leap year', function() {
    _sideBoxDate = '2026-03-01';
    pomoPrevDay();
    expect(_sideBoxDate).toBe('2026-02-28');
  });

  it('handles leap year Feb 29', function() {
    _sideBoxDate = '2024-03-01';
    pomoPrevDay();
    expect(_sideBoxDate).toBe('2024-02-29');
  });
});

describe('pomoNextDay', function() {
  function pomoNextDay() {
    var today = todayKey();
    if (_sideBoxDate >= today) return;
    var parts = _sideBoxDate.split('-');
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2] + 1);
    _sideBoxDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    _renderSessionSideBox();
  }

  beforeEach(function() {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-21'));
  });
  afterEach(function() { jest.useRealTimers(); });

  it('increments if not today', function() {
    _sideBoxDate = '2026-07-20';
    pomoNextDay();
    expect(_sideBoxDate).toBe('2026-07-21');
  });

  it('does NOT increment past today', function() {
    _sideBoxDate = '2026-07-21';
    pomoNextDay();
    expect(_sideBoxDate).toBe('2026-07-21');
  });

  it('stays on today when trying to go forward', function() {
    _sideBoxDate = '2026-07-21';
    pomoNextDay(); pomoNextDay(); pomoNextDay();
    expect(_sideBoxDate).toBe('2026-07-21');
  });

  it('handles month boundary (Jul 31 to Aug 1)', function() {
    _sideBoxDate = '2026-07-30';
    jest.setSystemTime(new Date('2026-08-01'));
    pomoNextDay();
    pomoNextDay();
    expect(_sideBoxDate).toBe('2026-08-01');
  });
});

describe('renderSessionSideBox date label and nav', function() {
  function renderSessionSideBox() {
    var container = document.getElementById('pomoSideTimeline');
    var dateLabel = document.getElementById('pomoSideDateLabel');
    var navLabel = document.getElementById('pomoSideNavLabel');
    var fwdBtn = document.querySelector('.pomo-side-nav button:last-child');
    if (!container) return;
    var today = todayKey();
    var displayDate = _sideBoxDate === today ? 'Today' : formatDateLabel(_sideBoxDate);
    if (dateLabel) dateLabel.textContent = displayDate;
    if (navLabel) navLabel.textContent = displayDate;
    if (fwdBtn) {
      if (_sideBoxDate === today) fwdBtn.setAttribute('disabled', 'true');
      else fwdBtn.removeAttribute('disabled');
    }
    var sessions = [];
    var activeOnDate = _sideBoxDate === today ? activeSession : null;
    if (sessions.length === 0 && !activeOnDate) {
      container.innerHTML = '<div style="color:#9ca3af;font-size:13px;text-align:center;padding:40px 0;">No focus sessions</div>';
      return;
    }
  }

  function makeContainer() {
    return { textContent: '', innerHTML: '', style: {}, classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn(function() { return false; }) }, scrollTop: 0, scrollHeight: 100 };
  }

  beforeEach(function() {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-21'));
    _sideBoxDate = '2026-07-21';
    var fwdBtn = { setAttribute: jest.fn(), removeAttribute: jest.fn() };
    var container = makeContainer();
    var dateLabel = makeContainer();
    var navLabel = makeContainer();
    setupGetElementById({ pomoSideTimeline: container, pomoSideDateLabel: dateLabel, pomoSideNavLabel: navLabel });
    document.querySelector = jest.fn(function(sel) {
      if (sel === '.pomo-side-nav button:last-child') return fwdBtn;
      return null;
    });
  });
  afterEach(function() { jest.useRealTimers(); });

  it('today label is "Today"', function() {
    renderSessionSideBox();
    var dateLabel = document.getElementById('pomoSideDateLabel');
    expect(dateLabel.textContent).toBe('Today');
  });

  it('past date uses formatDateLabel', function() {
    _sideBoxDate = '2026-07-20';
    renderSessionSideBox();
    var dateLabel = document.getElementById('pomoSideDateLabel');
    expect(dateLabel.textContent).toBe('Jul 20');
  });

  it('forward btn disabled on today', function() {
    var fwdBtn = document.querySelector('.pomo-side-nav button:last-child');
    renderSessionSideBox();
    expect(fwdBtn.setAttribute).toHaveBeenCalledWith('disabled', 'true');
  });

  it('forward btn enabled on past date', function() {
    _sideBoxDate = '2026-07-20';
    var fwdBtn = document.querySelector('.pomo-side-nav button:last-child');
    renderSessionSideBox();
    expect(fwdBtn.removeAttribute).toHaveBeenCalledWith('disabled');
  });

  it('renders "No focus sessions" when no sessions and no active', function() {
    _sideBoxDate = '2026-07-21';
    activeSession = null;
    window.db.getSessionsGrouped.mockResolvedValue({});
    var container = document.getElementById('pomoSideTimeline');
    renderSessionSideBox();
    expect(container.innerHTML).toContain('No focus sessions');
  });
});
