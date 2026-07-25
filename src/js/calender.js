/* ═══════════════════════════════════════
   Calender Page — Vanilla JS + Database
   ═══════════════════════════════════════ */

var calState = {
  tab: 'year',
  year: new Date().getFullYear(),
  weekOffset: 0,
  calOffset: 0,
  filter: 'all',
  sessions: {},
  tasks: [],
  tags: [],
  goals: [],
  noteKeys: {},
  modal: null,
  loaded: false
};

var CAL_WEEKDAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
var CAL_SHORT_WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
var CAL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/* ── Note File Helpers ── */
async function getNotesDir() {
  var p = await window.db.getPath();
  return p ? p + '/notes' : null;
}

async function ensureNoteDir() {
  var dir = await getNotesDir();
  if (dir) await window.electronAPI.ensureDir(dir);
}

async function readNoteFile(type, id) {
  var p = await window.db.getPath();
  if (!p) return '';
  var fp = p + '/notes/' + type + '/' + id + '.md';
  return (await window.electronAPI.readFile(fp)) || '';
}

async function writeNoteFile(type, id, content) {
  var p = await window.db.getPath();
  if (!p) return false;
  var dir = p + '/notes/' + type;
  var fp = dir + '/' + id + '.md';
  await window.electronAPI.ensureDir(dir);
  return await window.electronAPI.writeFile(fp, content);
}

async function deleteNoteFile(type, id) {
  var p = await window.db.getPath();
  if (!p) return false;
  var fp = p + '/notes/' + type + '/' + id + '.md';
  return await window.electronAPI.deleteFile(fp);
}

function getNoteFilePath(type, id) {
  return 'notes/' + type + '/' + id + '.md';
}

/* ── Data Loading ── */
async function loadCalenderData() {
  try {
    var results = await Promise.all([
      window.db.getSessionsGrouped(),
      window.db.getTasks(),
      window.db.getTags(),
      window.db.getGoals()
    ]);
    calState.sessions = results[0] || {};
    calState.tasks = results[1] || [];
    calState.tags = results[2] || [];
    calState.goals = results[3] || [];
    calState.noteKeys = {};
    try {
      var p = await window.db.getPath();
      if (p) {
        var notesBase = p + '/notes';
        var types = ['day', 'week', 'month'];
        for (var ti = 0; ti < types.length; ti++) {
          var t = types[ti];
          var dir = notesBase + '/' + t;
          var files = await window.electronAPI.listDir(dir);
          if (files && files.length) {
            for (var fi = 0; fi < files.length; fi++) {
              var f = files[fi];
              if (f.endsWith('.md')) {
                var id = f.slice(0, -3);
                var key = t + ':' + id;
                var content = await window.electronAPI.readFile(dir + '/' + f);
                calState.noteKeys[key] = content || '';
              }
            }
          }
        }
      }
    } catch(e) {
      console.error('Calender notes load error:', e);
    }
    calState.loaded = true;
  } catch(e) {
    console.error('Calender load error:', e);
  }
}

function logNotesState(tag) {
  var dayKeys = Object.keys(calState.noteKeys).filter(function(k) { return k.startsWith('day:'); });
  console.log('[' + tag + '] day notes count:', dayKeys.length, 'sample:', dayKeys.slice(0, 3));
}

/* ── Activity Level ── */
function getActivityLevel(dateKey) {
  var daySessions = calState.sessions[dateKey] || [];
  var dayTasks = calState.tasks.filter(function(t) {
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
  var daySessions = calState.sessions[dateKey] || [];
  var total = 0;
  daySessions.forEach(function(s) {
    if (s.phase && s.phase !== 'work') return;
    total += s.focusMinutes || 0;
  });
  return Math.round(total);
}

/* ── Tab Switching ── */
window.switchCalTab = function(tab) {
  calState.tab = tab;
  renderCalender();
};

/* ── Navigation ── */
window.navigateWeek = function(dir) {
  calState.weekOffset += dir;
  renderCalender();
};

window.navigateCalendar = function(dir) {
  calState.calOffset += dir;
  renderCalender();
};

window.navigateYear = function(dir) {
  calState.year += dir;
  renderCalender();
};

/* ── Main Render ── */
function renderCalender() {
  if (!calState.loaded) return;

  document.querySelectorAll('#page-calender .tab-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.tab === calState.tab);
  });

  ['week', 'timeline', 'calendar', 'year'].forEach(function(v) {
    var el = document.getElementById('view-' + v);
    if (el) el.classList.toggle('active', v === calState.tab);
  });

  renderHeader();

  switch(calState.tab) {
    case 'week': renderWeekView(); break;
    case 'timeline': renderTimelineView(); break;
    case 'calendar': renderCalendarView(); break;
    case 'year': renderYearView(); break;
  }

  var legend = document.getElementById('calLegend');
  if (legend) legend.style.display = calState.tab === 'year' || calState.tab === 'timeline' ? 'none' : 'flex';
}

function renderHeader() {
  var el = document.getElementById('calHeader');
  if (!el) return;
  switch(calState.tab) {
    case 'week':
      var bounds = getCurrentWeekBounds();
      el.innerHTML = '<span class="year-title"></span>' + formatShortDate(bounds.start) + ' \u2013 ' + formatShortDate(bounds.end);
      break;
    case 'timeline':
      el.textContent = 'Timeline';
      break;
    case 'calendar':
      el.textContent = 'Calendar';
      break;
    case 'year':
      el.innerHTML = '<span class="year-title"></span>' + calState.year + ' Yearly Glance';
      break;
  }
}

function renderTimelineView() {
  var title = document.getElementById('calHeader');
  if (title) title.textContent = 'Timeline';
}

/* ── Week Logic ── */
function getCurrentWeekBounds() {
  var now = new Date();
  now.setDate(now.getDate() + calState.weekOffset * 7);
  var day = now.getDay();
  var diff = (day + 1) % 7;
  now.setDate(now.getDate() - diff);
  var start = new Date(now);
  var end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: start, end: end };
}

function getWeekDates() {
  var bounds = getCurrentWeekBounds();
  var dates = [];
  var cur = new Date(bounds.start);
  while (cur <= bounds.end) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function weekKeyStr() {
  var bounds = getCurrentWeekBounds();
  return toISODate(bounds.start);
}

/* ── Week Track Render ── */
function renderWeekView() {
  var title = document.getElementById('weekTitle');
  var row = document.getElementById('weekDaysRow');
  var preview = document.getElementById('weekNotePreview');
  var noteBtn = document.getElementById('weekNoteBtn');
  if (!title || !row) return;

  var dates = getWeekDates();
  var bounds = getCurrentWeekBounds();
  title.textContent = 'Week of ' + formatShortDate(bounds.start) + ' \u2013 ' + formatShortDate(bounds.end);

  var wk = weekKeyStr();
  var wkNote = calState.noteKeys['week:' + wk];
  if (wkNote) {
    if (preview) { preview.textContent = wkNote; preview.style.display = 'block'; }
    if (noteBtn) { noteBtn.style.display = 'inline-flex'; noteBtn.textContent = '\u{1F441} Edit Week Note'; }
  } else {
    if (preview) preview.style.display = 'none';
    if (noteBtn) { noteBtn.style.display = 'inline-flex'; noteBtn.textContent = '+ Week Note'; }
  }

  var html = '';
  var todayStr = toISODate(new Date());
  dates.forEach(function(date) {
    var key = toISODate(date);
    html += renderWeekDayCard(key, date, key === todayStr);
  });
  row.innerHTML = html;
}

function renderWeekDayCard(dateKey, date, isToday) {
  var dayTasks = calState.tasks.filter(function(t) {
    return (t.scheduledTime || t.createdAt || '').substring(0, 10) === dateKey;
  });
  var completedTasks = dayTasks.filter(function(t) { return t.completed; });
  var focusMinutes = getFocusMinutes(dateKey);
  var level = getActivityLevel(dateKey);
  var dayName = CAL_WEEKDAYS[date.getDay()];
  var fh = Math.floor(focusMinutes / 60);
  var fm = focusMinutes % 60;
  var focusText = fh > 0 ? fh + 'h ' + fm + 'm' : fm + 'm';

  var dayNote = calState.noteKeys['day:' + dateKey] || '';
  var dayNoteText = dayNote ? '\u{1F441}' : '+';
  var dayNoteClass = dayNote ? 'note-dot has-note' : 'note-dot';

  var html = '<div class="week-day-card' + (isToday ? ' today' : '') + '">';
  html += '<div class="week-day-top">';
  html += '<div><div class="week-day-name">' + dayName + '</div><div class="week-day-date">' + date.getDate() + '</div></div>';
  html += '<button class="' + dayNoteClass + '" onclick="openNoteModal(\'day\',\'' + dateKey + '\',\'Day Note: ' + formatDate(date) + '\')">' + dayNoteText + '</button>';
  html += '</div>';

  html += '<div class="week-focus-time">\u23F1 ' + focusText + ' focus</div>';

  html += '<div class="week-timeline-container">';
  for (var hour = 0; hour < 24; hour++) {
    var hourTasks = dayTasks.filter(function(t) {
      if (!t.scheduledTime) return false;
      var taskHour = parseInt((t.scheduledTime.split('T')[1] || '00:00').split(':')[0]);
      return taskHour === hour;
    });
    var ampm = hour === 0 ? '12am' : hour < 12 ? hour + 'am' : hour === 12 ? '12pm' : (hour - 12) + 'pm';
    html += '<div class="wt-hour-row">';
    html += '<div class="wt-time-label">' + ampm + '</div>';
    if (hourTasks.length > 0) {
      hourTasks.forEach(function(t) {
        var dotColor = t.priority === 'High' ? '#ef4444' : t.priority === 'Medium' ? '#10b981' : '#9ca3af';
        var taskTime = (t.scheduledTime.split('T')[1] || '').substring(0, 5);
        html += '<div class="wt-event" style="display:flex;align-items:center;gap:6px;padding:2px 0">';
        html += '<span class="wt-dot" style="background:' + dotColor + '"></span>';
        html += '<span class="wt-event-time" style="font-size:11px;color:rgba(45,45,45,0.4)">' + taskTime + '</span>';
        html += '<span class="wt-event-name" style="font-size:14px;color:#2d2d2d">' + escapeHtml(t.name) + '</span>';
        html += '</div>';
      });
    } else {
      html += '<div class="wt-free" style="color:#ddd;font-size:11px;font-style:italic;padding:2px 14px">— free —</div>';
    }
    html += '</div>';
  }
  html += '</div>';

  var unscheduledTasks = dayTasks.filter(function(t) { return !t.scheduledTime; });
  if (unscheduledTasks.length > 0) {
    html += '<div class="wt-todo-toggle" onclick="toggleUnscheduled(this, \'' + dateKey + '\')">';
    html += '<span class="wt-todo-icon">▶</span>';
    html += '<span class="wt-todo-label">' + unscheduledTasks.length + ' unscheduled</span>';
    html += '</div>';
    html += '<div class="wt-todo-list" id="wt-todo-' + dateKey + '" style="display:none">';
    unscheduledTasks.forEach(function(t) {
      var dotColor = t.priority === 'High' ? '#ef4444' : t.priority === 'Medium' ? '#f59e0b' : t.priority === 'Low' ? '#22c55e' : '#9ca3af';
      html += '<div class="wt-todo-item">';
      html += '<span class="wt-todo-dot" style="background:' + dotColor + '"></span>';
      html += '<span class="wt-todo-name' + (t.completed ? ' done' : '') + '">' + escapeHtml(t.name) + '</span>';
      html += '</div>';
    });
    html += '</div>';
  }

  html += '<button class="add-task-btn" onclick="showAddTaskInput(\'' + dateKey + '\')">+ Add Task</button>';

  html += '<div class="week-contribution">';
  var levelNames = ['No', 'Low', 'Medium', 'High'];
  html += '<div class="cell l' + level + '">';
  html += '<div class="tooltip">' + formatDate(date) + ': ' + completedTasks.length + ' tasks, ' + focusText + ' focus</div>';
  html += '</div>';
  html += '<span class="week-contribution-label">Activity</span>';
  html += '</div>';

  html += '</div>';
  return html;
}

window.toggleUnscheduled = function(el, dateKey) {
  var list = document.getElementById('wt-todo-' + dateKey);
  if (!list) return;
  var icon = el.querySelector('.wt-todo-icon');
  if (list.style.display === 'none') {
    list.style.display = 'block';
    if (icon) icon.textContent = '▼';
  } else {
    list.style.display = 'none';
    if (icon) icon.textContent = '▶';
  }
};

window.showAddTaskInput = function(dateKey) {
  removeTaskPopup();
  var overlay = document.createElement('div');
  overlay.className = 'task-popup-overlay';
  overlay.setAttribute('data-datekey', dateKey);
  overlay.innerHTML = '<div class="task-popup">' +
    '<input type="text" class="task-popup-input" placeholder="Task name..." autofocus>' +
    '<div class="task-popup-priority">' +
      '<span class="tp-prio-btn selected" data-prio="High"><span class="tp-dot" style="background:#ef4444"></span>High</span>' +
      '<span class="tp-prio-btn" data-prio="Medium"><span class="tp-dot" style="background:#f59e0b"></span>Medium</span>' +
      '<span class="tp-prio-btn" data-prio="Low"><span class="tp-dot" style="background:#22c55e"></span>Low</span>' +
    '</div>' +
    '<div class="task-popup-actions">' +
      '<button class="note-btn secondary" onclick="window.removeTaskPopup()">Cancel</button>' +
      '<button class="note-btn primary" onclick="window.confirmTaskPopup()">Add</button>' +
    '</div></div>';
  document.getElementById('page-calender').appendChild(overlay);

  overlay.querySelectorAll('.tp-prio-btn').forEach(function(el) {
    el.addEventListener('click', function() {
      overlay.querySelectorAll('.tp-prio-btn').forEach(function(b) { b.classList.remove('selected'); });
      this.classList.add('selected');
    });
  });

  overlay.querySelector('.task-popup-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') window.confirmTaskPopup();
  });

  setTimeout(function() {
    var inp = overlay.querySelector('.task-popup-input');
    if (inp) inp.focus();
  }, 50);
};

window.showYearTaskInput = function(dateKey) {
  window.showAddTaskInput(dateKey);
};

window.removeTaskPopup = function() {
  var existing = document.querySelector('.task-popup-overlay');
  if (existing) existing.remove();
};

window.confirmTaskPopup = function() {
  var overlay = document.querySelector('.task-popup-overlay');
  if (!overlay) return;
  var inp = overlay.querySelector('.task-popup-input');
  if (!inp || !inp.value.trim()) return;
  var name = inp.value.trim();
  var selectedPrio = overlay.querySelector('.tp-prio-btn.selected');
  var priority = selectedPrio ? selectedPrio.getAttribute('data-prio') : 'Medium';
  var dateKey = overlay.getAttribute('data-datekey');
  overlay.remove();

  var id = 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  window.db.createTask({ id: id, name: name, priority: priority, createdAt: dateKey + ' 00:00:00', scheduledTime: null }).then(async function(result) {
    if (result && result._error) { console.error('Task API error:', result); return; }
    if (result === false) { console.error('Task create returned false'); return; }
    logNotesState('before-create-task');
    await loadCalenderData();
    logNotesState('after-reload-after-task');
    renderCalender();
  });
};

window.toggleTaskComplete = async function(taskId) {
  await window.db.toggleTask(taskId);
  await loadCalenderData();
  renderCalender();
};

window.calDeleteTask = async function(taskId) {
  await window.db.deleteTask(taskId);
  await loadCalenderData();
  renderCalender();
};

/* ── Calendar View ── */
function renderCalendarView() {
  var grid = document.getElementById('calendarGrid');
  var label = document.getElementById('calRangeLabel');
  if (!grid) return;

  var year = new Date().getFullYear() + calState.calOffset;

  if (label) {
    label.textContent = year;
  }

  var html = '';
  for (var m = 0; m < 12; m++) {
    html += renderCalendarMonth(CAL_MONTH_NAMES[m], year, m);
  }
  grid.innerHTML = html;
}

function renderCalendarMonth(name, year, month) {
  var firstDay = new Date(year, month, 1).getDay();
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var firstCol = (firstDay + 1) % 7;

  var html = '<div class="cal-month">';
  html += '<div class="cal-month-title">' + name + ' ' + year + '</div>';
  html += '<div class="cal-weekdays">';
  CAL_SHORT_WEEKDAYS.forEach(function(w) {
    html += '<div class="cal-weekday">' + w + '</div>';
  });
  html += '</div>';
  html += '<div class="cal-days">';

  for (var e = 0; e < firstCol; e++) {
    html += '<div class="cal-day empty"></div>';
  }

  var todayStr = toISODate(new Date());
  var levelNames = ['No', 'Low', 'Medium', 'High'];
  for (var d = 1; d <= daysInMonth; d++) {
    var date = new Date(year, month, d);
    var key = toISODate(date);
    var isToday = key === todayStr;
    var level = getActivityLevel(key);
    var focusMinutes = getFocusMinutes(key);
    var dayTasks = calState.tasks.filter(function(t) {
      return t.completed && (t.scheduledTime || t.createdAt || '').substring(0, 10) === key;
    });
    var completedTasks = dayTasks.length;

    var bgColor = '';
    if (level === 0) { bgColor = ''; }
    else if (level === 1) { bgColor = 'var(--green-light)'; }
    else if (level === 2) { bgColor = 'var(--green-mid)'; }
    else if (level === 3) { bgColor = 'var(--green-dark)'; }

    var style = level > 0 ? ' style="background:' + bgColor + ';' + (level === 3 ? 'color:white;' : '') + '"' : '';

    html += '<div class="cal-day l' + level + (isToday ? ' today' : '') + '"' + style + '>';
    html += '<span class="cal-day-num">' + d + '</span>';
    html += '<div class="tooltip calendar-day-tooltip">';
    html += '<div class="tooltip-date">' + formatDate(date) + '</div>';
    html += '<div>\u23F1 Focus: ' + Math.floor(focusMinutes / 60) + 'h ' + (focusMinutes % 60) + 'm</div>';
    html += '<div>\u2713 Tasks: ' + completedTasks + '</div>';
    html += '<div class="tooltip-level">Activity: ' + levelNames[level] + '</div>';
    html += '</div>';
    html += '</div>';
  }

  html += '</div>'; // .cal-days
  html += renderCalendarMonthGoals(year, month);
  html += '</div>'; // .cal-month
  return html;
}

function renderCalendarMonthGoals(year, month) {
  var monthKey = year + '-' + String(month + 1).padStart(2, '0');
  var monthGoals = calState.goals.filter(function(g) {
    return g.startDate && g.startDate.substring(0, 7) === monthKey;
  });

  var html = '<div class="cal-goals-section">';
  html += '<div class="cal-goals-title">Goals</div>';
  if (monthGoals.length === 0) {
    html += '<div style="font-size:0.75rem;color:#999;margin-bottom:4px;">No goals this month</div>';
  }
  monthGoals.forEach(function(g) {
    html += '<div class="cal-goal-item">';
    html += '<span class="cal-goal-check">\u2713</span>';
    html += '<span>' + escapeHtml(g.name || g.title || 'Unnamed') + '</span>';
    html += '<span class="cal-goal-del" onclick="deleteCalGoal(\'' + g.id + '\')" title="Delete goal">\u00d7</span>';
    html += '</div>';
  });
  html += '<button class="cal-add-goal-btn" onclick="addGoal(\'' + year + '-' + String(month + 1).padStart(2, '0') + '\')">+ Add Goal</button>';
  html += '</div>';
  return html;
}

window.addGoal = async function(monthKey) {
  var overlay = document.createElement('div');
  overlay.className = 'goal-popup-overlay';
  overlay.innerHTML = '<div class="goal-popup"><h3>Add Goal</h3><input type="text" id="goalNameInput" placeholder="Goal name..." class="goal-popup-input"><div class="goal-popup-actions"><button class="note-btn secondary" onclick="this.closest(\'.goal-popup-overlay\').remove()">Cancel</button><button class="note-btn primary" id="goalConfirmBtn">Add Goal</button></div></div>';
  document.getElementById('page-calender').appendChild(overlay);
  var inp = overlay.querySelector('#goalNameInput');
  var confirmBtn = overlay.querySelector('#goalConfirmBtn');
  inp.focus();
  inp.onkeydown = function(e) { if (e.key === 'Enter') confirmBtn.click(); };
  confirmBtn.onclick = async function() {
    var name = inp.value.trim();
    if (!name) return;
    overlay.remove();
    var goal = {
      id: 'goal_' + Date.now(),
      name: name,
      color: '#3b82f6',
      startDate: monthKey + '-01',
      endDate: monthKey + '-28',
      duration: 28,
      durationType: 'days',
      durationValue: null,
      status: 'active',
      tasks: [],
      createdAt: new Date().toISOString()
    };
    try {
      var gResult = await window.db.createGoal(goal);
      if (!gResult) { alert('Goal creation failed - returned false'); return; }
      if (gResult._error) { alert('Goal API error (status ' + gResult.status + '): ' + gResult.body); return; }
      await loadCalenderData();
      renderCalender();
    } catch(e) {
      console.error('Add Goal error:', e);
      alert('Add Goal exception: ' + e.message);
    }
  };
};

window.deleteCalGoal = async function(id) {
  var result = await window.db.deleteGoal(id);
  if (result === false) { console.error('Delete goal failed'); return; }
  await loadCalenderData();
  renderCalender();
};

/* ── Year View ── */
function renderYearView() {
  renderTagFilters();

  var titleEl = document.getElementById('yearTitle');
  if (titleEl) titleEl.textContent = calState.year;

  var grid = document.getElementById('yearGrid');
  if (!grid) return;

  var html = '';
  for (var m = 0; m < 12; m++) {
    html += renderYearMonth(m);
  }
  grid.innerHTML = html;
}

function renderTagFilters() {
  var container = document.getElementById('yearFilters');
  if (!container) return;
  var html = '<button class="year-filter' + (calState.filter === 'all' ? ' active' : '') + '" onclick="setTagFilter(\'all\')">All</button>';
  calState.tags.forEach(function(tag) {
    var active = calState.filter === tag.id;
    html += '<button class="year-filter' + (active ? ' active' : '') + '" onclick="setTagFilter(\'' + escapeHtml(tag.id) + '\')" style="' + (active ? 'background:' + escapeHtml(tag.color) + ';color:white;border-color:' + escapeHtml(tag.color) + ';' : 'border-color:' + escapeHtml(tag.color) + ';') + '">';
    html += '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + escapeHtml(tag.color) + ';margin-right:4px;"></span>';
    html += escapeHtml(tag.name);
    html += '</button>';
  });
  html += '<button class="year-filter tag-edit-btn" onclick="showTagEditorPopup()">\u270F\uFE0F</button>';
  container.innerHTML = html;
}

window.setTagFilter = function(tagId) {
  calState.filter = tagId;
  renderYearView();
};

window.showTagEditorPopup = function() {
  var existing = document.querySelector('.tag-editor-overlay');
  if (existing) { existing.remove(); return; }

  var overlay = document.createElement('div');
  overlay.className = 'tag-editor-overlay';
  var listHtml = '';
  calState.tags.forEach(function(tag) {
    listHtml += '<div class="tag-editor-row" data-tag-id="' + escapeHtml(tag.id) + '">' +
      '<span class="tag-editor-dot" style="background:' + escapeHtml(tag.color) + '"></span>' +
      '<input class="tag-editor-name" value="' + escapeHtml(tag.name) + '" data-tag-id="' + escapeHtml(tag.id) + '">' +
      '<input class="tag-editor-color" type="color" value="' + escapeHtml(tag.color) + '" data-tag-id="' + escapeHtml(tag.id) + '">' +
      '<button class="tag-editor-del" data-tag-id="' + escapeHtml(tag.id) + '" title="Delete tag">\u00d7</button>' +
    '</div>';
  });

  overlay.innerHTML = '<div class="tag-editor-popup">' +
    '<div class="tag-editor-header">Manage Tags</div>' +
    '<div class="tag-editor-list">' + listHtml + '</div>' +
    '<div class="tag-editor-add">' +
      '<input class="tag-editor-add-name" id="tagEditorAddName" placeholder="New tag name...">' +
      '<input class="tag-editor-add-color" id="tagEditorAddColor" type="color" value="#3b82f6">' +
      '<button class="tag-editor-add-btn">+</button>' +
    '</div>' +
    '<button class="note-btn secondary" id="tagEditorCloseBtn" style="margin-top:10px;width:100%">Close</button>' +
  '</div>';

  document.getElementById('page-calender').appendChild(overlay);

  overlay.querySelector('.tag-editor-popup').addEventListener('click', function(e) { e.stopPropagation(); });
  overlay.addEventListener('click', function() { closeTagEditor(); });

  overlay.querySelector('.tag-editor-list').addEventListener('click', function(e) {
    var btn = e.target.closest('.tag-editor-del');
    if (btn) deleteTagFromEditor(btn.getAttribute('data-tag-id'));
  });

  overlay.querySelector('.tag-editor-add-btn').addEventListener('click', saveTagFromEditor);

  overlay.querySelector('#tagEditorCloseBtn').addEventListener('click', closeTagEditor);

  overlay.querySelectorAll('.tag-editor-name').forEach(function(inp) {
    inp.addEventListener('change', function() {
      var tid = inp.getAttribute('data-tag-id');
      var tag = calState.tags.find(function(t) { return t.id === tid; });
      if (tag) {
        tag.name = inp.value.trim() || tag.name;
        window.db.saveTag(tag);
      }
    });
  });

  overlay.querySelectorAll('.tag-editor-color').forEach(function(inp) {
    inp.addEventListener('input', function() {
      var tid = inp.getAttribute('data-tag-id');
      var tag = calState.tags.find(function(t) { return t.id === tid; });
      if (tag) {
        tag.color = inp.value;
        window.db.saveTag(tag);
      }
    });
  });

  setTimeout(function() { document.getElementById('tagEditorAddName').focus(); }, 100);
};

window.closeTagEditor = function() {
  var overlay = document.querySelector('.tag-editor-overlay');
  if (overlay) {
    overlay.remove();
    renderTagFilters();
    renderYearView();
  }
};

window.deleteTagFromEditor = function(id) {
  tagEditorLoading(true);
  window.db.deleteTag(id).then(function(result) {
    if (result === false) { console.error('Delete tag failed'); tagEditorLoading(false); alert('Failed to delete tag'); return; }
    var idx = calState.tags.findIndex(function(t) { return t.id === id; });
    if (idx !== -1) calState.tags.splice(idx, 1);
    if (calState.filter === id) calState.filter = 'all';
    tagEditorLoading(false);
    closeTagEditor();
    renderTagFilters();
    renderYearView();
  });
};

window.saveTagFromEditor = function() {
  var inp = document.getElementById('tagEditorAddName');
  if (!inp || !inp.value.trim()) return;
  var name = inp.value.trim();
  var color = document.getElementById('tagEditorAddColor').value;
  var id = 'tag_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  var tag = { id: id, name: name, color: color, createdAt: Date.now() };
  tagEditorLoading(true);
  window.db.saveTag(tag).then(function(result) {
    if (result === false) { console.error('Save tag failed'); tagEditorLoading(false); alert('Failed to save tag'); return; }
    calState.tags.push(tag);
    inp.value = '';
    tagEditorLoading(false);
    closeTagEditor();
    renderTagFilters();
    renderYearView();
  });
};

function tagEditorLoading(on) {
  var btn = document.querySelector('.tag-editor-add-btn');
  if (btn) btn.textContent = on ? '...' : '+';
}

function renderYearMonth(monthIdx) {
  var daysInMonth = new Date(calState.year, monthIdx + 1, 0).getDate();
  var monthKey = calState.year + '-' + String(monthIdx + 1).padStart(2, '0');

  var weeks = [];
  var currentWeek = [];
  for (var day = 1; day <= daysInMonth; day++) {
    var date = new Date(calState.year, monthIdx, day);
    var dayOfWeek = date.getDay();
    var col = (dayOfWeek + 1) % 7;

    if (col === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
    if (col === 6 || day === daysInMonth) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  var monthNote = calState.noteKeys['month:' + monthKey] || '';
  var monthNoteText = monthNote ? '\u{1F441}' : '+';
  var monthNoteClass = monthNote ? 'note-dot has-note' : 'note-dot';

  var html = '<div class="year-month-card">';
  html += '<div class="year-month-title">';
  html += CAL_MONTH_NAMES[monthIdx];
  html += '<button class="' + monthNoteClass + '" onclick="openNoteModal(\'month\',\'' + monthKey + '\',\'Month Note: ' + CAL_MONTH_NAMES[monthIdx] + ' ' + calState.year + '\')">' + monthNoteText + '</button>';
  html += '</div>';

  if (monthNote) {
    html += '<div class="month-note-preview">' + escapeHtml(monthNote) + '</div>';
  }

  html += '<div class="year-day-list">';

  weeks.forEach(function(weekDays) {
    var weekStart = new Date(calState.year, monthIdx, weekDays[0]);
    var saturday = new Date(weekStart);
    var wd = saturday.getDay();
    var diff = (wd + 1) % 7;
    saturday.setDate(saturday.getDate() - diff);
    var wkKey = toISODate(saturday);

    html += '<div class="year-week-block">';

    weekDays.forEach(function(d) {
      var date = new Date(calState.year, monthIdx, d);
      var key = toISODate(date);
      var weekday = CAL_WEEKDAYS[date.getDay()];

      var dayTasks = calState.tasks.filter(function(t) {
        if ((t.scheduledTime || t.createdAt || '').substring(0, 10) !== key) return false;
        if (calState.filter === 'all') return true;
        return t.tagId === calState.filter;
      });

      var dayNote = calState.noteKeys['day:' + key] || '';
      var dayNoteText = dayNote ? '\u{1F441}' : '+';
      var dayNoteClass = dayNote ? 'note-dot has-note' : 'note-dot';

      html += '<div class="year-day year-day-cell" onclick="openDayPopup(\'' + key + '\')" style="cursor:pointer">';
      html += '<div class="year-day-header">';
      html += '<span class="year-day-number">' + d + '</span>';
      html += '<span class="year-day-weekday">' + weekday + '.</span>';
      html += '<button class="' + dayNoteClass + '" onclick="openNoteModal(\'day\',\'' + key + '\',\'Day Note: ' + formatDate(date) + '\')">' + dayNoteText + '</button>';
      html += '<button class="year-add-task-btn" onclick="showYearTaskInput(\'' + key + '\')">+</button>';
      html += '</div>';

      if (dayNote) {
        html += '<div class="day-note-preview year-day-note">' + escapeHtml(dayNote) + '</div>';
      }

      html += '<div class="year-day-events" id="yearDayEvents-' + key + '">';
      if (dayTasks.length > 0) {
        dayTasks.forEach(function(t) {
          var tagColor = '#e5e7eb';
          var foundTag = calState.tags.find(function(tag) { return tag.id === t.tagId; });
          if (foundTag) tagColor = foundTag.color;
          html += '<div class="year-event" style="background:' + tagColor + '22;border-color:' + tagColor + '44;">';
          html += '<span class="year-event-icon">' + (t.completed ? '\u2713' : '\u25CB') + '</span>';
          html += '<span class="year-event-title">' + escapeHtml(t.name) + '</span>';
          html += '</div>';
        });
      }
      html += '</div>';

      html += '</div>'; // .year-day
    });

    // Week note button after each week
    html += '<div class="year-week-note-row">';
    var weekNote = calState.noteKeys['week:' + wkKey] || '';
    html += '<button class="year-week-note-btn" onclick="openNoteModal(\'week\',\'' + wkKey + '\',\'Week Note: ' + CAL_MONTH_NAMES[monthIdx] + ' ' + weekDays[0] + ' \u2013 ' + weekDays[weekDays.length - 1] + ', ' + calState.year + '\')">';
    html += weekNote ? '\u{1F441} Edit Week Note' : '+ Week Note';
    html += '</button>';
    html += '</div>';

    html += '</div>'; // .year-week-block
  });

  html += '</div>'; // .year-day-list
  html += renderYearMonthGoals(monthIdx);
  html += '</div>'; // .year-month-card
  return html;
}

function renderYearMonthGoals(monthIdx) {
  var monthKey = calState.year + '-' + String(monthIdx + 1).padStart(2, '0');
  var monthGoals = calState.goals.filter(function(g) {
    return g.startDate && g.startDate.substring(0, 7) === monthKey;
  });

  var html = '<div class="year-goals-section">';
  html += '<div class="year-goals-title">Goals</div>';
  if (monthGoals.length === 0) {
    html += '<div style="font-size:0.75rem;color:#999;margin-bottom:4px;">No goals this month</div>';
  }
  monthGoals.forEach(function(g) {
    html += '<div class="year-goal-item">';
    html += '<span class="year-goal-check">\u2713</span>';
    html += '<span>' + escapeHtml(g.name || g.title || 'Unnamed') + '</span>';
    html += '<span class="year-goal-del" onclick="deleteCalGoal(\'' + g.id + '\')" title="Delete goal">\u00d7</span>';
    html += '</div>';
  });
  html += '<button class="year-add-goal-btn" onclick="addGoal(\'' + calState.year + '-' + String(monthIdx + 1).padStart(2, '0') + '\')">+ Add Goal</button>';
  html += '</div>';
  return html;
}

/* ── Note Modal ── */
window.openNoteModal = async function(type, id, label) {
  calState.modal = { type: type, id: id, label: label };
  var modal = document.getElementById('noteModal');
  var title = document.getElementById('noteModalTitle');
  var text = document.getElementById('noteModalText');
  if (title) title.textContent = label;
  if (text) {
    var content = await readNoteFile(type, id);
    var key = type + ':' + id;
    calState.noteKeys[key] = content;
    text.value = content;
  }
  if (modal) modal.style.display = 'flex';
};

window.openWeekNote = function() {
  var key = weekKeyStr();
  openNoteModal('week', key, 'Week Note');
};

window.saveNoteModal = async function() {
  if (!calState.modal) return;
  var text = document.getElementById('noteModalText');
  if (!text) return;
  var key = calState.modal.type + ':' + calState.modal.id;
  var clean = text.value.trim();
  if (clean) {
    calState.noteKeys[key] = clean;
    await writeNoteFile(calState.modal.type, calState.modal.id, clean);
  } else {
    delete calState.noteKeys[key];
    await deleteNoteFile(calState.modal.type, calState.modal.id);
  }
  closeNoteModal();
  renderCalender();
};

window.deleteNoteModal = async function() {
  if (!calState.modal) return;
  var key = calState.modal.type + ':' + calState.modal.id;
  delete calState.noteKeys[key];
  await deleteNoteFile(calState.modal.type, calState.modal.id);
  closeNoteModal();
  renderCalender();
};

window.closeNoteModal = function() {
  var modal = document.getElementById('noteModal');
  if (modal) modal.style.display = 'none';
  calState.modal = null;
};

/* ── Utility ── */
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

/* ── Day Popup ── */
window.openDayPopup = async function(dateKey) {
  var d = new Date(dateKey + 'T00:00:00');
  var titleEl = document.getElementById('dayPopupTitle');
  if (titleEl) titleEl.textContent = formatDate(d);

  var contentEl = document.getElementById('dayPopupContent');
  if (!contentEl) return;

  var tasks = calState.tasks.filter(function(t) {
    var td = (t.scheduledTime || t.createdAt || '').substring(0, 10);
    return td === dateKey && !t.parentTaskId;
  });
  var sessions = calState.sessions[dateKey] || [];

  var html = '';

  // Timeline section
  html += '<div class="day-popup-timeline">';
  for (var hour = 0; hour < 24; hour++) {
    var hourTasks = tasks.filter(function(t) {
      if (!t.scheduledTime) return false;
      var taskHour = parseInt((t.scheduledTime.split('T')[1] || '00:00').split(':')[0]);
      return taskHour === hour;
    });
    var hourSessions = sessions.filter(function(s) {
      var sd = new Date(s.startTime);
      return sd.getHours() === hour;
    });
    var ampm = hour === 0 ? '12am' : hour < 12 ? hour + 'am' : hour === 12 ? '12pm' : (hour - 12) + 'pm';

    html += '<div class="dp-hour-row">';
    html += '<div class="dp-time-label">' + ampm + '</div>';

    if (hourTasks.length > 0 || hourSessions.length > 0) {
      html += '<div class="dp-dot"></div>';
      html += '<div class="dp-items">';
      hourTasks.forEach(function(t) {
        var dotColor = t.priority === 'High' ? '#ef4444' : t.priority === 'Medium' ? '#f59e0b' : t.priority === 'Low' ? '#22c55e' : '#9ca3af';
        var taskTime = (t.scheduledTime.split('T')[1] || '').substring(0, 5);
        html += '<div class="dp-item" style="display:flex;align-items:center;gap:6px;padding:2px 0">';
        html += '<span class="dp-dot-small" style="background:' + dotColor + '"></span>';
        html += '<span class="dp-item-time" style="font-size:11px;color:rgba(45,45,45,0.4)">' + taskTime + '</span>';
        html += '<span class="dp-item-name">' + escapeHtml(t.name) + '</span>';
        if (t.completed) html += '<span style="color:#10b981;font-size:12px">✓</span>';
        html += '</div>';
      });
      hourSessions.forEach(function(s) {
        var sd = new Date(s.startTime);
        var ed = s.endTime ? new Date(s.endTime) : sd;
        var sTime = sd.getHours() + ':' + String(sd.getMinutes()).padStart(2, '0');
        var eTime = ed.getHours() + ':' + String(ed.getMinutes()).padStart(2, '0');
        html += '<div class="dp-item" style="display:flex;align-items:center;gap:6px;padding:2px 0">';
        html += '<span class="dp-dot-small" style="background:#8b5cf6"></span>';
        html += '<span class="dp-item-time" style="font-size:11px;color:rgba(45,45,45,0.4)">' + sTime + '</span>';
        html += '<span class="dp-item-name" style="font-style:italic">' + escapeHtml(s.taskName || 'Session') + '</span>';
        html += '<span style="font-size:11px;color:rgba(45,45,45,0.3)">' + Math.round(s.focusMinutes) + 'm</span>';
        html += '</div>';
      });
      html += '</div>';
    } else {
      html += '<div class="dp-free">— free —</div>';
    }
    html += '</div>';
  }
  html += '</div>';

  // To Do section (unscheduled tasks)
  var unscheduledTasks = tasks.filter(function(t) { return !t.scheduledTime; });
  if (unscheduledTasks.length > 0) {
    html += '<div style="margin-top:16px;padding-top:12px;border-top:2px dashed #e5e7eb">';
    html += '<div style="font-size:13px;font-weight:600;color:#6b7280;margin-bottom:8px">📋 To Do</div>';
    unscheduledTasks.forEach(function(t) {
      html += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0">';
      html += '<span style="width:8px;height:8px;border-radius:50%;background:' + (t.priority === 'High' ? '#ef4444' : t.priority === 'Medium' ? '#f59e0b' : '#9ca3af') + '"></span>';
      html += '<span style="font-size:14px;' + (t.completed ? 'text-decoration:line-through;opacity:0.4' : '') + '">' + escapeHtml(t.name) + '</span>';
      html += '</div>';
    });
    html += '</div>';
  }

  contentEl.innerHTML = html;
  var modal = document.getElementById('dayPopupModal');
  if (modal) modal.classList.remove('hidden');
};

window.closeDayPopup = function(e) {
  if (!e || e.target === e.currentTarget) {
    var modal = document.getElementById('dayPopupModal');
    if (modal) modal.classList.add('hidden');
  }
};

/* ── Midnight Refresh ── */
function scheduleMidnightRefresh() {
  var now = new Date();
  var next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  var ms = next.getTime() - now.getTime();
  setTimeout(function() {
    renderCalender();
    scheduleMidnightRefresh();
  }, ms);
}

/* ── Init ── */
(function initCalender() {
  if (window._dbInitPromise) {
    window._dbInitPromise.then(function() {
      loadCalenderData().then(function() {
        if (calState.loaded) renderCalender();
        scheduleMidnightRefresh();
      });
    });
  } else {
    loadCalenderData().then(function() {
      if (calState.loaded) renderCalender();
      scheduleMidnightRefresh();
    });
  }
  window.renderCalender = renderCalender;
})();
