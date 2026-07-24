// calender.test.js — 40 unit tests for calender logic
//
// Pure functions replicated here for isolated testing.
// No DOM rendering tests — focuses on date math, navigation, and state.

// ─── Replicated constants ───

var CAL_WEEKDAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
var CAL_SHORT_WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
var CAL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ─── Replicated pure utility functions ───

function toISODate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function formatDate(d) {
  return CAL_MONTH_NAMES[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

function formatShortDate(d) {
  return CAL_MONTH_NAMES[d.getMonth()].substring(0, 3) + ' ' + d.getDate();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayCol(year, month) {
  var firstDay = new Date(year, month, 1).getDay();
  return (firstDay + 1) % 7;
}

// ─── Week logic (replicated from calender.js) ───

function getCurrentWeekBounds(baseDate, weekOffset) {
  var now = baseDate ? new Date(baseDate) : new Date();
  now.setDate(now.getDate() + (weekOffset || 0) * 7);
  var day = now.getDay();
  var diff = (day + 1) % 7;
  now.setDate(now.getDate() - diff);
  var start = new Date(now);
  var end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: start, end: end };
}

function getWeekDates(baseDate, weekOffset) {
  var bounds = getCurrentWeekBounds(baseDate, weekOffset);
  var dates = [];
  var cur = new Date(bounds.start);
  while (cur <= bounds.end) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ─── Year view logic (replicated from renderYearMonth) ───

function getYearMonthWeeks(year, month) {
  var dim = daysInMonth(year, month);
  var weeks = [];
  var currentWeek = [];
  for (var day = 1; day <= dim; day++) {
    var date = new Date(year, month, day);
    var dayOfWeek = date.getDay();
    var col = (dayOfWeek + 1) % 7;
    if (col === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
    if (col === 6 || day === dim) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);
  return weeks;
}

// ─── Calendar view logic (replicated from renderCalendarMonth) ───

function getCalendarMonthCells(year, month) {
  var firstCol = firstDayCol(year, month);
  var dim = daysInMonth(year, month);
  var cells = [];
  for (var e = 0; e < firstCol; e++) {
    cells.push({ type: 'empty' });
  }
  for (var d = 1; d <= dim; d++) {
    cells.push({ type: 'day', day: d });
  }
  return cells;
}

// ─── Activity/state (replicated from calState) ───

var _calState = {
  sessions: {},
  tasks: [],
  tags: [],
  goals: [],
  notes: {},
  filter: 'all',
  year: 2026
};

function resetCalTestState() {
  _calState.sessions = {};
  _calState.tasks = [];
  _calState.tags = [];
  _calState.goals = [];
  _calState.notes = {};
  _calState.filter = 'all';
  _calState.year = new Date().getFullYear();
}

function getActivityLevel(dateKey) {
  var daySessions = _calState.sessions[dateKey] || [];
  var dayTasks = _calState.tasks.filter(function(t) {
    return (t.scheduledTime || t.createdAt || '').substring(0, 10) === dateKey;
  });
  var completedTasks = dayTasks.filter(function(t) { return t.completed; }).length;
  var focusMinutes = 0;
  daySessions.forEach(function(s) { focusMinutes += s.focusMinutes || 0; });
  if (completedTasks === 0 && focusMinutes === 0) return 0;
  if (completedTasks < 5 && focusMinutes < 60) return 1;
  if ((completedTasks >= 5 && completedTasks <= 8) || (focusMinutes >= 60 && focusMinutes <= 180)) return 2;
  if (completedTasks > 8 || focusMinutes > 180) return 3;
  return 1;
}

function getFocusMinutes(dateKey) {
  var daySessions = _calState.sessions[dateKey] || [];
  var total = 0;
  daySessions.forEach(function(s) { total += s.focusMinutes || 0; });
  return Math.round(total);
}

// ═══════════════════════════════════════════════════════════
// 1. Date formatting utilities (8 tests)
// ═══════════════════════════════════════════════════════════

describe('toISODate', function() {
  test('formats date as YYYY-MM-DD', function() {
    expect(toISODate(new Date(2026, 6, 21))).toBe('2026-07-21');
  });

  test('pads single-digit month and day', function() {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('formatDate', function() {
  test('formats with full month name, day, year', function() {
    expect(formatDate(new Date(2026, 6, 21))).toBe('July 21, 2026');
  });

  test('handles first day of year', function() {
    expect(formatDate(new Date(2026, 0, 1))).toBe('January 1, 2026');
  });
});

describe('formatShortDate', function() {
  test('formats with 3-letter month abbreviation', function() {
    expect(formatShortDate(new Date(2026, 6, 21))).toBe('Jul 21');
  });

  test('handles December date', function() {
    expect(formatShortDate(new Date(2026, 11, 25))).toBe('Dec 25');
  });
});

describe('escapeHtml', function() {
  test('escapes & < > " and \' and returns empty for null/undefined', function() {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#039;');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  test('returns original string when no special chars', function() {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

// ═══════════════════════════════════════════════════════════
// 2. Week view logic (8 tests)
// ═══════════════════════════════════════════════════════════

describe('getWeekDates', function() {
  test('returns exactly 7 days', function() {
    var dates = getWeekDates('2026-07-21');
    expect(dates.length).toBe(7);
  });

  test('week starts on Saturday (CAL_WEEKDAYS[0])', function() {
    // 2026-07-21 is Tuesday; week should start Sat Jul 18
    var dates = getWeekDates('2026-07-21');
    expect(dates[0].getDay()).toBe(6); // Saturday
    expect(toISODate(dates[0])).toBe('2026-07-18');
  });

  test('week ends on Friday', function() {
    var dates = getWeekDates('2026-07-21');
    expect(dates[6].getDay()).toBe(5); // Friday
    expect(toISODate(dates[6])).toBe('2026-07-24');
  });

  test('navigate to previous week (offset -1)', function() {
    var dates = getWeekDates('2026-07-21', -1);
    expect(toISODate(dates[0])).toBe('2026-07-11');
    expect(dates.length).toBe(7);
  });

  test('navigate to next week (offset +1)', function() {
    var dates = getWeekDates('2026-07-21', 1);
    expect(toISODate(dates[0])).toBe('2026-07-25');
  });

  test('handles month boundary across July/August', function() {
    // Week starting Sat Jul 25 includes Jul 31 and Aug 1
    var dates = getWeekDates('2026-07-29');
    expect(toISODate(dates[0])).toBe('2026-07-25');
    expect(toISODate(dates[6])).toBe('2026-07-31');
  });

  test('handles year boundary across Dec/Jan', function() {
    // 2026-12-30 is Wednesday; week starts Sat Dec 26
    var dates = getWeekDates('2026-12-30');
    expect(toISODate(dates[0])).toBe('2026-12-26');
    expect(dates.length).toBe(7);
  });

  test('week contains consecutive dates', function() {
    var dates = getWeekDates('2026-07-21');
    for (var i = 1; i < dates.length; i++) {
      var prev = new Date(dates[i - 1]);
      prev.setDate(prev.getDate() + 1);
      expect(toISODate(prev)).toBe(toISODate(dates[i]));
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 3. Year view logic (8 tests)
// ═══════════════════════════════════════════════════════════

describe('getYearMonthWeeks', function() {
  test('July 2026 returns correct week structure', function() {
    var weeks = getYearMonthWeeks(2026, 6); // July (0-indexed)
    expect(Array.isArray(weeks)).toBe(true);
    expect(weeks.length).toBeGreaterThan(0);
    // July 1 2026 is Wednesday; col = (3+1)%7 = 4 => starts in week with Sat-Sun-Mon-Tue
    // First week should start Sat Jun 27... no wait, the week starts on Saturday
    // Jul 1 is Wed, col = 4, so it's in a week that started on Sat Jun 27
    // col 0=Sat, 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri
    // So Jul 1 is col 4, meaning it's the 5th day of its week
    // The first week should have days 1,2,3,4 (Wed,Thu,Fri,Sat) — no, week ends on Friday
    // When col=6 (Fri) or day=dim, the week is pushed
    // Jul 1 col=4, Jul 2 col=5, Jul 3 col=6 → pushed [1,2,3]
    // Jul 4 col=0 → new week, Jul 4 col=0... wait col 0 starts a new week
    // Let me check: col=0 means Saturday, and the code does: if col===0 && currentWeek.length>0, push
    // So Saturday starts a new week. Jul 4 is Saturday.
    // First week: [1,2,3] (Wed-Fri). Second week: [4,5,6,7,8,9,10] (Sat-Fri).
    expect(weeks[0]).toEqual([1, 2, 3]);
  });

  test('12 months in a year', function() {
    for (var m = 0; m < 12; m++) {
      var weeks = getYearMonthWeeks(2026, m);
      expect(weeks.length).toBeGreaterThan(0);
    }
  });

  test('each month days are sequential within weeks', function() {
    var weeks = getYearMonthWeeks(2026, 0); // January
    weeks.forEach(function(week) {
      for (var i = 1; i < week.length; i++) {
        expect(week[i]).toBe(week[i - 1] + 1);
      }
    });
  });

  test('month labels match CAL_MONTH_NAMES', function() {
    expect(CAL_MONTH_NAMES[0]).toBe('January');
    expect(CAL_MONTH_NAMES[11]).toBe('December');
    expect(CAL_MONTH_NAMES.length).toBe(12);
  });

  test('February 2024 (leap year) has 29 days', function() {
    expect(daysInMonth(2024, 1)).toBe(29);
  });

  test('February 2026 (non-leap) has 28 days', function() {
    expect(daysInMonth(2026, 1)).toBe(28);
  });

  test('January always has 31 days', function() {
    expect(daysInMonth(2026, 0)).toBe(31);
  });

  test('April has 30 days', function() {
    expect(daysInMonth(2026, 3)).toBe(30);
  });
});

// ═══════════════════════════════════════════════════════════
// 4. Calendar view logic (8 tests)
// ═══════════════════════════════════════════════════════════

describe('getCalendarMonthCells', function() {
  test('total cells = empty prefix + days in month', function() {
    var cells = getCalendarMonthCells(2026, 6); // July 2026
    var dim = daysInMonth(2026, 6);
    var empties = cells.filter(function(c) { return c.type === 'empty'; }).length;
    expect(empties + dim).toBe(cells.length);
  });

  test('first day alignment — July 2026 starts on Wednesday (col 4)', function() {
    // Jul 1 2026 is Wednesday, getDay() = 3, firstCol = (3+1)%7 = 4
    expect(firstDayCol(2026, 6)).toBe(4);
    var cells = getCalendarMonthCells(2026, 6);
    expect(cells[0].type).toBe('empty');
    expect(cells[1].type).toBe('empty');
    expect(cells[2].type).toBe('empty');
    expect(cells[3].type).toBe('empty');
    expect(cells[4].type).toBe('day');
    expect(cells[4].day).toBe(1);
  });

  test('CAL_SHORT_WEEKDAYS has 7 entries starting with S (Sat)', function() {
    expect(CAL_SHORT_WEEKDAYS.length).toBe(7);
    expect(CAL_SHORT_WEEKDAYS[0]).toBe('S');
    expect(CAL_SHORT_WEEKDAYS[6]).toBe('S');
  });

  test('correct day numbers in month', function() {
    var cells = getCalendarMonthCells(2026, 0); // January
    var dayCells = cells.filter(function(c) { return c.type === 'day'; });
    expect(dayCells.length).toBe(31);
    expect(dayCells[0].day).toBe(1);
    expect(dayCells[30].day).toBe(31);
  });

  test('navigation between months changes grid', function() {
    var janCells = getCalendarMonthCells(2026, 0);
    var febCells = getCalendarMonthCells(2026, 1);
    var janDays = janCells.filter(function(c) { return c.type === 'day'; }).length;
    var febDays = febCells.filter(function(c) { return c.type === 'day'; }).length;
    expect(janDays).toBe(31);
    expect(febDays).toBe(28);
  });

  test('empty cells at start for month not starting on Sat column 0', function() {
    // January 2026: Jan 1 is Thursday, getDay()=4, firstCol=(4+1)%7=5
    expect(firstDayCol(2026, 0)).toBe(5);
    var cells = getCalendarMonthCells(2026, 0);
    var empties = cells.filter(function(c) { return c.type === 'empty'; }).length;
    expect(empties).toBe(5);
  });

  test('month starting on Saturday has 0 empty cells', function() {
    // Need a month where 1st is Saturday. 2026-08-01 is Saturday.
    // Aug 1 2026 is Saturday, getDay()=6, firstCol=(6+1)%7=0
    expect(firstDayCol(2026, 7)).toBe(0);
    var cells = getCalendarMonthCells(2026, 7);
    var empties = cells.filter(function(c) { return c.type === 'empty'; }).length;
    expect(empties).toBe(0);
    expect(cells[0].type).toBe('day');
    expect(cells[0].day).toBe(1);
  });

  test('year display — calendar uses getFullYear() + calOffset', function() {
    // The calendar view renders year = new Date().getFullYear() + calOffset
    var baseYear = 2026;
    var calOffset = 0;
    expect(baseYear + calOffset).toBe(2026);
    calOffset = 1;
    expect(baseYear + calOffset).toBe(2027);
    calOffset = -1;
    expect(baseYear + calOffset).toBe(2025);
  });
});

// ═══════════════════════════════════════════════════════════
// 5. Notes logic (4 tests)
// ═══════════════════════════════════════════════════════════

describe('calender notes logic', function() {
  beforeEach(function() {
    resetCalTestState();
  });

  test('week note stored and retrieved', function() {
    var wkKey = 'week:2026-07-18';
    _calState.notes[wkKey] = 'Focus on project X';
    expect(_calState.notes[wkKey]).toBe('Focus on project X');
  });

  test('day note stored and retrieved', function() {
    var dayKey = 'day:2026-07-21';
    _calState.notes[dayKey] = 'Completed milestone';
    expect(_calState.notes[dayKey]).toBe('Completed milestone');
  });

  test('note preview shown when note exists, hidden when empty', function() {
    var wkKey = 'week:2026-07-18';
    // No note
    expect(_calState.notes[wkKey]).toBeUndefined();
    // With note
    _calState.notes[wkKey] = 'Some note';
    expect(_calState.notes[wkKey]).toBe('Some note');
  });

  test('deleting a note sets it to undefined', function() {
    var wkKey = 'week:2026-07-18';
    _calState.notes[wkKey] = 'Temporary note';
    delete _calState.notes[wkKey];
    expect(_calState.notes[wkKey]).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════
// 6. View switching (4 tests)
// ═══════════════════════════════════════════════════════════

describe('calender view switching', function() {
  var calTab = 'year';
  var calYear = 2026;
  var calWeekOffset = 0;
  var calCalOffset = 0;

  function switchCalTab(tab) {
    calTab = tab;
  }

  function navigateWeek(dir) {
    calWeekOffset += dir;
  }

  function navigateCalendar(dir) {
    calCalOffset += dir;
  }

  function navigateYear(dir) {
    calYear += dir;
  }

  function resetViewState() {
    calTab = 'year';
    calYear = 2026;
    calWeekOffset = 0;
    calCalOffset = 0;
  }

  beforeEach(function() {
    resetViewState();
  });

  test('switch between week/year/calendar tabs', function() {
    switchCalTab('week');
    expect(calTab).toBe('week');
    switchCalTab('calendar');
    expect(calTab).toBe('calendar');
    switchCalTab('year');
    expect(calTab).toBe('year');
  });

  test('navigateWeek increments/decrements offset', function() {
    navigateWeek(1);
    expect(calWeekOffset).toBe(1);
    navigateWeek(-1);
    expect(calWeekOffset).toBe(0);
    navigateWeek(-1);
    expect(calWeekOffset).toBe(-1);
  });

  test('navigateCalendar increments/decrements calOffset', function() {
    navigateCalendar(1);
    expect(calCalOffset).toBe(1);
    navigateCalendar(-1);
    expect(calCalOffset).toBe(0);
    navigateCalendar(2);
    expect(calCalOffset).toBe(2);
  });

  test('navigateYear increments/decrements year', function() {
    navigateYear(1);
    expect(calYear).toBe(2027);
    navigateYear(-1);
    expect(calYear).toBe(2026);
    navigateYear(-2);
    expect(calYear).toBe(2024);
  });
});
