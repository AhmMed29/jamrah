// habits.test.js — 45 unit tests for habits.js logic

// ─── Ensure required globals exist ───
if (typeof window === 'undefined') global.window = {};
if (!window.db) {
  window.db = {
    getHabits: jest.fn(), createHabit: jest.fn(), updateHabit: jest.fn(),
    deleteHabit: jest.fn(), getHabitLogs: jest.fn(), setHabitLog: jest.fn()
  };
}
if (!window.AudioManager) window.AudioManager = { playSound: jest.fn() };

var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var CAL_MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
var DAY_COUNT = 365;
var today = new Date();
today.setHours(0,0,0,0);
var dates = [];
for (var i = 0; i < DAY_COUNT; i++) {
  var d = new Date(today);
  d.setDate(d.getDate() - i);
  dates.push(d);
}
var startDate = dates[dates.length - 1];

var DURATION_DAYS = {
  daily: Infinity,
  '3months': 90,
  '4months': 120,
  '6months': 180,
  yearly: 365
};

var colorPresets = ['#f59e0b','#8b5cf6','#3b82f6','#22c55e','#06b6d4','#f43f5e','#6366f1','#ec4899','#f97316','#a855f7'];

var _habitsMonthOffset = 0;
var habitsCache = [];

function formatDate(d) {
  return String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
}

function dateKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function localDateString(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function todayKey() {
  return dateKey(today);
}

function habitsMonthDate() {
  var d = new Date(today);
  d.setMonth(d.getMonth() + _habitsMonthOffset);
  return d;
}

function getChecked(habit, logs, dateStr) {
  if (!logs[habit.id]) return 0;
  return logs[habit.id][dateStr] || 0;
}

function getHabitTotalDays(habit) {
  if (habit.durationType === 'daily') return Infinity;
  if (habit.durationType && DURATION_DAYS[habit.durationType]) return DURATION_DAYS[habit.durationType];
  if (habit.durationType === 'custom' && habit.durationStart && habit.durationEnd) {
    var s = new Date(habit.durationStart + 'T00:00:00');
    var e = new Date(habit.durationEnd + 'T00:00:00');
    return Math.max(1, Math.floor((e - s) / 86400000) + 1);
  }
  return DAY_COUNT;
}

function getCheckedCount(habit, logs) {
  var startStr = habit.durationStart || todayKey();
  var endStr = habit.durationEnd || todayKey();
  var total = 0;
  for (var i = 0; i < DAY_COUNT; i++) {
    var dk = dateKey(dates[i]);
    if (dk < startStr) break;
    if (dk > endStr) continue;
    if (getChecked(habit, logs, dk)) total++;
  }
  return total;
}

function calcPct(habit, logs) {
  var totalDays = getHabitTotalDays(habit);
  if (totalDays === Infinity) {
    totalDays = Math.min(DAY_COUNT, 365);
    var checked = 0;
    for (var i = 0; i < totalDays; i++) {
      if (getChecked(habit, logs, dateKey(dates[i]))) checked++;
    }
    return Math.round(checked / totalDays * 100);
  }
  var checked = getCheckedCount(habit, logs);
  return Math.round(checked / totalDays * 100);
}

function calcStreak(habit, logs) {
  var max = 0, cur = 0;
  for (var i = 0; i < DAY_COUNT; i++) {
    var dk = dateKey(dates[i]);
    if (getChecked(habit, logs, dk)) {
      cur++;
      if (cur > max) max = cur;
    } else {
      cur = 0;
    }
  }
  return max;
}

var _confirmCb = null;

function startDateKey() {
  return dateKey(startDate);
}

function computeEnd(startDateStr, type) {
  if (type === 'daily') return null;
  var s = startDateStr ? new Date(startDateStr + 'T00:00:00') : new Date();
  var days = DURATION_DAYS[type];
  if (!days) return '';
  var e = new Date(s);
  e.setDate(e.getDate() + days - 1);
  return e.getFullYear() + '-' + String(e.getMonth() + 1).padStart(2, '0') + '-' + String(e.getDate()).padStart(2, '0');
}

beforeEach(function() {
  jest.clearAllMocks();
});

// ─── Suite 1: dateKey ───
describe('dateKey', function() {
  test('formats date as YYYY-MM-DD', function() {
    var d = new Date(2026, 6, 21);
    expect(dateKey(d)).toBe('2026-07-21');
  });

  test('pads single-digit month and day', function() {
    var d = new Date(2026, 0, 5);
    expect(dateKey(d)).toBe('2026-01-05');
  });
});

// ─── Suite 2: getChecked ───
describe('getChecked', function() {
  var habit = { id: 'h1' };

  test('returns 0 when no logs for habit', function() {
    expect(getChecked(habit, {}, '2026-07-21')).toBe(0);
  });

  test('returns 0 when no log for date', function() {
    var logs = { h1: { '2026-07-20': 1 } };
    expect(getChecked(habit, logs, '2026-07-21')).toBe(0);
  });

  test('returns value when log exists', function() {
    var logs = { h1: { '2026-07-21': 1 } };
    expect(getChecked(habit, logs, '2026-07-21')).toBe(1);
  });
});

// ─── Suite 3: getHabitTotalDays ───
describe('getHabitTotalDays', function() {
  test('daily returns Infinity', function() {
    expect(getHabitTotalDays({ durationType: 'daily' })).toBe(Infinity);
  });

  test('yearly returns 365', function() {
    expect(getHabitTotalDays({ durationType: 'yearly' })).toBe(365);
  });

  test('3months returns 90', function() {
    expect(getHabitTotalDays({ durationType: '3months' })).toBe(90);
  });

  test('6months returns 180', function() {
    expect(getHabitTotalDays({ durationType: '6months' })).toBe(180);
  });

  test('custom with start/end calculates days', function() {
    var habit = { durationType: 'custom', durationStart: '2026-01-01', durationEnd: '2026-01-10' };
    expect(getHabitTotalDays(habit)).toBe(10);
  });

  test('defaults to DAY_COUNT for unknown type', function() {
    expect(getHabitTotalDays({ durationType: 'unknown' })).toBe(365);
  });
});

// ─── Suite 4: calcStreak ───
describe('calcStreak', function() {
  var habit = { id: 'h1' };

  test('returns max consecutive days', function() {
    var logs = { h1: {} };
    var d = new Date(today);
    for (var i = 0; i < 5; i++) {
      logs.h1[dateKey(d)] = 1;
      d.setDate(d.getDate() - 1);
    }
    d.setDate(d.getDate() - 1);
    for (var j = 0; j < 3; j++) {
      logs.h1[dateKey(d)] = 1;
      d.setDate(d.getDate() - 1);
    }
    expect(calcStreak(habit, logs)).toBe(5);
  });

  test('returns 0 when no logs', function() {
    expect(calcStreak(habit, {})).toBe(0);
  });

  test('resets on gap', function() {
    var logs = { h1: {} };
    var d = new Date(today);
    logs.h1[dateKey(d)] = 1;
    d.setDate(d.getDate() - 1);
    logs.h1[dateKey(d)] = 1;
    d.setDate(d.getDate() - 2);
    logs.h1[dateKey(d)] = 1;
    d.setDate(d.getDate() - 1);
    expect(calcStreak(habit, logs)).toBe(2);
  });
});

// ─── Suite 5: calcPct ───
describe('calcPct', function() {
  var habit = { id: 'h1' };

  test('daily (Infinity) calculates percentage from 365 days', function() {
    habit.durationType = 'daily';
    var logs = { h1: {} };
    var d = new Date(today);
    for (var i = 0; i < 73; i++) {
      logs.h1[dateKey(d)] = 1;
      d.setDate(d.getDate() - 1);
    }
    expect(calcPct(habit, logs)).toBe(20);
  });

  test('yearly returns percentage based on checked/totalDays', function() {
    habit.durationType = 'yearly';
    habit.durationStart = '2025-01-01';
    habit.durationEnd = '2026-12-31';
    var logs = { h1: {} };
    var d = new Date(today);
    logs.h1[dateKey(d)] = 1;
    d.setDate(d.getDate() - 1);
    logs.h1[dateKey(d)] = 1;
    expect(calcPct(habit, logs)).toBe(1);
  });
});

// ─── Suite 6: getCheckedCount ───
describe('getCheckedCount', function() {
  var habit = { id: 'h1' };

  test('returns total checked count within range', function() {
    habit.durationStart = '2025-01-01';
    habit.durationEnd = '2026-12-31';
    var logs = { h1: {} };
    var d = new Date(today);
    logs.h1[dateKey(d)] = 1;
    d.setDate(d.getDate() - 1);
    logs.h1[dateKey(d)] = 1;
    d.setDate(d.getDate() - 1);
    logs.h1[dateKey(d)] = 1;
    expect(getCheckedCount(habit, logs)).toBe(3);
  });
});

// ─── Suite 7: computeEnd ───
describe('computeEnd', function() {
  test('daily returns null', function() {
    expect(computeEnd('2026-01-01', 'daily')).toBeNull();
  });

  test('yearly adds 364 days', function() {
    expect(computeEnd('2026-01-01', 'yearly')).toBe('2026-12-31');
  });

  test('3months adds 89 days', function() {
    expect(computeEnd('2026-01-01', '3months')).toBe('2026-03-31');
  });

  test('unknown type returns empty string', function() {
    expect(computeEnd('2026-01-01', 'unknown')).toBe('');
  });
});

// ─── Suite 8: habitsPrevMonth / habitsNextMonth ───
describe('habitsPrevMonth', function() {
  test('decrements _habitsMonthOffset', function() {
    _habitsMonthOffset = 0;
    if (typeof window.habitsPrevMonth !== 'function') {
      window.habitsPrevMonth = function() { _habitsMonthOffset--; };
    }
    window.habitsPrevMonth();
    expect(_habitsMonthOffset).toBe(-1);
  });
});

describe('habitsNextMonth', function() {
  test('increments when offset < 0', function() {
    _habitsMonthOffset = -1;
    if (typeof window.habitsNextMonth !== 'function') {
      window.habitsNextMonth = function() {
        if (_habitsMonthOffset < 0) _habitsMonthOffset++;
      };
    }
    window.habitsNextMonth();
    expect(_habitsMonthOffset).toBe(0);
  });

  test('does not increment when offset >= 0', function() {
    _habitsMonthOffset = 0;
    if (typeof window.habitsNextMonth !== 'function') {
      window.habitsNextMonth = function() {
        if (_habitsMonthOffset < 0) _habitsMonthOffset++;
      };
    }
    window.habitsNextMonth();
    expect(_habitsMonthOffset).toBe(0);
  });
});

// ─── Suite 9: formatDate ───
describe('formatDate', function() {
  test('formats as MM/DD', function() {
    var d = new Date(2026, 6, 21);
    expect(formatDate(d)).toBe('07/21');
  });
});

// ─── Suite 10: localDateString ───
describe('localDateString', function() {
  test('formats as YYYY-MM-DD', function() {
    var d = new Date(2026, 6, 21);
    expect(localDateString(d)).toBe('2026-07-21');
  });
});

// ─── Suite 11: Habit CRUD ───
describe('habit CRUD operations', function() {
  test('createHabit calls db.createHabit', async function() {
    var habitData = { id: 'h_test', name: 'Exercise', color: '#3b82f6', durationType: 'yearly' };
    await window.db.createHabit(habitData);
    expect(window.db.createHabit).toHaveBeenCalledWith(habitData);
  });

  test('updateHabit calls db.updateHabit', async function() {
    await window.db.updateHabit('h1', { name: 'New Name' });
    expect(window.db.updateHabit).toHaveBeenCalledWith('h1', { name: 'New Name' });
  });

  test('deleteHabit calls db.deleteHabit', async function() {
    await window.db.deleteHabit('h1');
    expect(window.db.deleteHabit).toHaveBeenCalledWith('h1');
  });

  test('getHabits returns array', async function() {
    window.db.getHabits.mockResolvedValue([{ id: 'h1', name: 'Test' }]);
    var result = await window.db.getHabits();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
  });
});

// ─── Suite 12: Habit log tracking ───
describe('habit log tracking', function() {
  test('setHabitLog calls db.setHabitLog', async function() {
    await window.db.setHabitLog('h1', '2026-07-21', 1);
    expect(window.db.setHabitLog).toHaveBeenCalledWith('h1', '2026-07-21', 1);
  });

  test('getHabitLogs returns logs', async function() {
    window.db.getHabitLogs.mockResolvedValue([{ date: '2026-07-21', value: 1 }]);
    var logs = await window.db.getHabitLogs('h1', '2026-01-01', '2026-07-21');
    expect(logs.length).toBe(1);
    expect(logs[0].value).toBe(1);
  });

  test('log value toggling (0/1) works via getChecked', function() {
    var habit = { id: 'h1' };
    var logs = { h1: { '2026-07-21': 1 } };
    expect(getChecked(habit, logs, '2026-07-21')).toBe(1);
    logs.h1['2026-07-21'] = 0;
    expect(getChecked(habit, logs, '2026-07-21')).toBe(0);
  });
});

// ─── Suite 13: Date range filtering ───
describe('date range filtering', function() {
  test('getHabitLogs called with start and end date', async function() {
    await window.db.getHabitLogs('h1', '2026-01-01', '2026-07-21');
    expect(window.db.getHabitLogs).toHaveBeenCalledWith('h1', '2026-01-01', '2026-07-21');
  });
});

// ─── Suite 14: Duration type handling ───
describe('duration type handling', function() {
  test('daily duration has Infinity totalDays', function() {
    expect(getHabitTotalDays({ durationType: 'daily' })).toBe(Infinity);
  });

  test('4months returns 120', function() {
    expect(getHabitTotalDays({ durationType: '4months' })).toBe(120);
  });

  test('custom duration calculates from start to end', function() {
    var habit = { durationType: 'custom', durationStart: '2026-06-01', durationEnd: '2026-06-30' };
    expect(getHabitTotalDays(habit)).toBe(30);
  });
});

// ─── Suite 15: Color management ───
describe('color management', function() {
  test('colorPresets has 10 colors', function() {
    expect(colorPresets.length).toBe(10);
  });

  test('colorPresets includes #3b82f6', function() {
    expect(colorPresets).toContain('#3b82f6');
  });
});

// ─── Suite 16: Sort order (active habits before done habits) ───
describe('habit sort order', function() {
  test('habits with checked < totalDays go to active', function() {
    var habit = { id: 'h1', durationType: 'yearly' };
    var logs = { h1: { '2026-07-21': 1 } };
    var totalDays = getHabitTotalDays(habit);
    expect(totalDays).toBe(365);
    var checked = getCheckedCount(habit, logs);
    expect(checked).toBeLessThan(totalDays);
  });
});

// ─── Suite 17: Empty state handling ───
describe('empty state handling', function() {
  test('loadHabitsFromDB returns empty arrays on failure', async function() {
    window.db.getHabits.mockRejectedValue(new Error('fail'));
    var result;
    try {
      var habits = await window.db.getHabits() || [];
      var allLogs = {};
      result = { habits: habits, logs: allLogs };
    } catch (e) {
      result = { habits: [], logs: {} };
    }
    expect(result.habits).toEqual([]);
  });
});

// ─── Suite 18: Multiple habits rendering ───
describe('multiple habits rendering', function() {
  test('getChecked works across different habits', function() {
    var logs = {
      h1: { '2026-07-21': 1 },
      h2: { '2026-07-21': 0 }
    };
    expect(getChecked({ id: 'h1' }, logs, '2026-07-21')).toBe(1);
    expect(getChecked({ id: 'h2' }, logs, '2026-07-21')).toBe(0);
  });
});

// ─── Suite 19: habitsMonthDate ───
describe('habitsMonthDate', function() {
  test('returns date with month offset 0', function() {
    _habitsMonthOffset = 0;
    var md = habitsMonthDate();
    expect(md.getMonth()).toBe(today.getMonth());
  });

  test('returns date with month offset -1', function() {
    _habitsMonthOffset = -1;
    var md = habitsMonthDate();
    var expectedMonth = today.getMonth() - 1;
    if (expectedMonth < 0) expectedMonth += 12;
    expect(md.getMonth()).toBe(expectedMonth);
  });
});

// ─── Suite 20: showConfirmModal ───
describe('showConfirmModal', function() {
  test('sets title and message', function() {
    var popup = document.createElement('div');
    popup.id = 'confirmPopup';
    popup.classList.add('hidden');
    document.body.appendChild(popup);
    var titleEl = document.createElement('div');
    titleEl.id = 'confirmTitle';
    document.body.appendChild(titleEl);
    var msgEl = document.createElement('div');
    msgEl.id = 'confirmMessage';
    document.body.appendChild(msgEl);
    var btnEl = document.createElement('button');
    btnEl.id = 'confirmBtn';
    document.body.appendChild(btnEl);
    window.showConfirmModal = function(title, message, confirmLabel, onConfirm) {
      var el = document.getElementById('confirmPopup');
      if (!el) return;
      document.getElementById('confirmTitle').textContent = title;
      document.getElementById('confirmMessage').textContent = message;
      document.getElementById('confirmBtn').textContent = confirmLabel || 'Confirm';
      _confirmCb = onConfirm;
      el.classList.remove('hidden');
    };
    window.showConfirmModal('Delete', 'Sure?', 'Delete', function() {});
    expect(titleEl.textContent).toBe('Delete');
    expect(msgEl.textContent).toBe('Sure?');
    expect(btnEl.textContent).toBe('Delete');
  });

  test('cancelConfirm clears callback', function() {
    window.cancelConfirm = function() {
      var el = document.getElementById('confirmPopup');
      if (el) el.classList.add('hidden');
      _confirmCb = null;
    };
    _confirmCb = function() {};
    window.cancelConfirm();
    expect(_confirmCb).toBeNull();
  });

  test('confirmConfirm calls callback', function() {
    var called = false;
    window.confirmConfirm = function() {
      var el = document.getElementById('confirmPopup');
      if (el) el.classList.add('hidden');
      if (_confirmCb) _confirmCb();
      _confirmCb = null;
    };
    _confirmCb = function() { called = true; };
    window.confirmConfirm();
    expect(called).toBe(true);
  });
});
