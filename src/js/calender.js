/* ═══════════════════════════════════════
   Calender Page — Vanilla JS + Database
   ═══════════════════════════════════════ */

var calState = {
  tab: 'week',
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

var CAL_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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

    // Tasks split into scheduled/todo
    var scheduled = dayTasks.filter(function(t) { return t.scheduledTime && t.scheduledTime.indexOf('T') >= 0 && t.scheduledTime.split('T')[1]; });
    var unscheduled = dayTasks.filter(function(t) { return !t.scheduledTime || t.scheduledTime.indexOf('T') < 0 || !t.scheduledTime.split('T')[1]; });
    scheduled.sort(function(a,b) { return ((a.scheduledTime||'').split('T')[1]||'').localeCompare((b.scheduledTime||'').split('T')[1]||''); });

    var taskHtml = '';
    if (scheduled.length) {
      taskHtml += '<div style="font-size:12px;font-weight:600;color:rgba(45,45,45,0.4);text-transform:uppercase;letter-spacing:0.06em;padding:8px 0 4px">Scheduled</div>';
      scheduled.forEach(function(t) {
        var time = (t.scheduledTime||'').split('T')[1] || '';
        var pColor = t.priority === 'High' ? '#ef4444' : t.priority === 'Medium' ? '#10b981' : '#9ca3af';
        taskHtml += '<div style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:13px">' +
          '<span style="width:6px;height:6px;border-radius:50%;background:' + pColor + ';flex-shrink:0"></span>' +
          '<span style="color:rgba(45,45,45,0.45);min-width:36px;font-size:12px">' + time.substring(0,5) + '</span>' +
          '<span' + (t.completed ? ' style="text-decoration:line-through;color:rgba(45,45,45,0.35)"' : '') + '>' + escapeHtml(t.name) + '</span>' +
          (t.completed ? '<span style="color:#10b981;margin-left:auto;font-size:12px">✓</span>' : '') +
        '</div>';
      });
    }
    if (unscheduled.length) {
      taskHtml += '<div style="font-size:12px;font-weight:600;color:rgba(45,45,45,0.4);text-transform:uppercase;letter-spacing:0.06em;padding:8px 0 4px">To Do</div>';
      unscheduled.forEach(function(t) {
        var pColor = t.priority === 'High' ? '#ef4444' : t.priority === 'Medium' ? '#10b981' : '#9ca3af';
        taskHtml += '<div style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:13px">' +
          '<span style="width:6px;height:6px;border-radius:50%;background:' + pColor + ';flex-shrink:0"></span>' +
          '<span' + (t.completed ? ' style="text-decoration:line-through;color:rgba(45,45,45,0.35)"' : '') + '>' + escapeHtml(t.name) + '</span>' +
          (t.completed ? '<span style="color:#10b981;margin-left:auto;font-size:12px">✓</span>' : '') +
        '</div>';
      });
    }
    if (!scheduled.length && !unscheduled.length) {
      taskHtml += '<div style="color:rgba(45,45,45,0.25);font-size:13px;padding:8px 0;text-align:center">No tasks</div>';
    }
    html += taskHtml;

  var dayNoteClass = dayNote ? 'note-dot has-note' : 'note-dot';

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
  var firstCol = firstDay;

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

    var cellDateKey = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    html += '<div class="cal-day l' + level + (isToday ? ' today' : '') + '"' + style + ' onclick="openDayPopup(\'' + cellDateKey + '\')" style="cursor:pointer">';
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
  var popup = document.getElementById('dayPopupModal');
  var title = document.getElementById('dayPopupTitle');
  var content = document.getElementById('dayPopupContent');
  if (!popup || !content) return;

  var d = new Date(dateKey + 'T00:00:00');
  var dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  if (title) title.textContent = dayNames[d.getDay()] + ', ' + monthNames[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();

  // Gather data
  var dayTasks = (calState.tasks || []).filter(function(t) {
    if (t.parentTaskId) return false;
    var td = (t.scheduledTime || t.createdAt || '').substring(0, 10);
    return td === dateKey;
  });
  var sessions = calState.sessions[dateKey] || [];
  var totalFocus = 0;
  sessions.forEach(function(s) { totalFocus += (s.durationMinutes || 0); });

  var completedCount = 0, uncheckedCount = 0;
  dayTasks.forEach(function(t) { if (t.completed) completedCount++; else uncheckedCount++; });

  // Fetch habits
  var habitsChecked = 0;
  try {
    var habits = await window.db.getHabits();
    var logs = await window.db.getHabitLogs();
    if (habits && logs) {
      habits.forEach(function(h) {
        var dayLog = logs.find(function(l) { return l.habitId === h.id && l.date === dateKey; });
        if (dayLog && dayLog.checked) habitsChecked++;
      });
    }
  } catch(e) {}

  // Build HTML
  var html = '<div style="font-family:\'Patrick Hand\',cursive;color:#2d2d2d;padding:8px 0">';

  // Stats summary
  html += '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px">';
  html += '<div style="flex:1;min-width:100px;text-align:center;padding:12px;border-radius:12px;border:2px solid rgba(45,45,45,0.1);background:rgba(45,45,45,0.02)">' +
    '<div style="font-size:28px;font-weight:600">' + (totalFocus >= 60 ? Math.floor(totalFocus/60) + 'h ' + (totalFocus%60) + 'm' : totalFocus + 'm') + '</div>' +
    '<div style="font-size:13px;color:rgba(45,45,45,0.5)">Focus Time</div></div>';
  html += '<div style="flex:1;min-width:100px;text-align:center;padding:12px;border-radius:12px;border:2px solid rgba(16,185,129,0.2);background:rgba(16,185,129,0.04)">' +
    '<div style="font-size:28px;font-weight:600;color:#10b981">' + completedCount + '</div>' +
    '<div style="font-size:13px;color:rgba(45,45,45,0.5)">Tasks Done</div></div>';
  html += '<div style="flex:1;min-width:100px;text-align:center;padding:12px;border-radius:12px;border:2px solid rgba(239,68,68,0.2);background:rgba(239,68,68,0.04)">' +
    '<div style="font-size:28px;font-weight:600;color:#ef4444">' + uncheckedCount + '</div>' +
    '<div style="font-size:13px;color:rgba(45,45,45,0.5)">Unchecked</div></div>';
  html += '<div style="flex:1;min-width:100px;text-align:center;padding:12px;border-radius:12px;border:2px solid rgba(139,92,246,0.2);background:rgba(139,92,246,0.04)">' +
    '<div style="font-size:28px;font-weight:600;color:#8b5cf6">' + habitsChecked + '</div>' +
    '<div style="font-size:13px;color:rgba(45,45,45,0.5)">Habits</div></div>';
  html += '</div>';

  // Tasks sections
  var scheduled = dayTasks.filter(function(t) { return t.scheduledTime && t.scheduledTime.indexOf('T') >= 0 && t.scheduledTime.split('T')[1]; });
  var todo = dayTasks.filter(function(t) { return !t.scheduledTime || t.scheduledTime.indexOf('T') < 0 || !t.scheduledTime.split('T')[1]; });
  scheduled.sort(function(a,b) { return ((a.scheduledTime||'').split('T')[1]||'').localeCompare((b.scheduledTime||'').split('T')[1]||''); });

  if (scheduled.length) {
    html += '<div style="font-size:15px;font-weight:600;color:rgba(45,45,45,0.5);text-transform:uppercase;letter-spacing:0.08em;margin:16px 0 8px;display:flex;align-items:center;gap:6px">' +
      '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Scheduled</div>';
    scheduled.forEach(function(t) {
      var time = (t.scheduledTime||'').split('T')[1] || '';
      var pColor = t.priority === 'High' ? '#ef4444' : t.priority === 'Medium' ? '#10b981' : '#d1d5db';
      html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;margin-bottom:4px;background:rgba(45,45,45,0.02)">' +
        '<span style="width:8px;height:8px;border-radius:50%;background:' + pColor + ';flex-shrink:0"></span>' +
        '<span style="font-size:13px;color:rgba(45,45,45,0.5);min-width:40px">' + time.substring(0,5) + '</span>' +
        '<span style="font-size:15px' + (t.completed ? ';text-decoration:line-through;color:rgba(45,45,45,0.4)' : '') + '">' + escapeHtml(t.name) + '</span>' +
        (t.completed ? '<span style="color:#10b981;margin-left:auto">✓</span>' : '') +
      '</div>';
    });
  }

  if (todo.length) {
    html += '<div style="font-size:15px;font-weight:600;color:rgba(45,45,45,0.5);text-transform:uppercase;letter-spacing:0.08em;margin:16px 0 8px;display:flex;align-items:center;gap:6px">' +
      '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> To Do</div>';
    todo.forEach(function(t) {
      var pColor = t.priority === 'High' ? '#ef4444' : t.priority === 'Medium' ? '#10b981' : '#d1d5db';
      html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;margin-bottom:4px;background:rgba(45,45,45,0.02)">' +
        '<span style="width:8px;height:8px;border-radius:50%;background:' + pColor + ';flex-shrink:0"></span>' +
        '<span style="font-size:15px' + (t.completed ? ';text-decoration:line-through;color:rgba(45,45,45,0.4)' : '') + '">' + escapeHtml(t.name) + '</span>' +
        (t.completed ? '<span style="color:#10b981;margin-left:auto">✓</span>' : '') +
      '</div>';
    });
  }

  if (!dayTasks.length) {
    html += '<div style="text-align:center;color:rgba(45,45,45,0.3);padding:16px;font-size:16px">No tasks for this day.</div>';
  }

  // PIE CHART — Focus time by task (hand-drawn SVG)
  if (sessions.length > 0) {
    var taskFocus = {};
    sessions.forEach(function(s) {
      var name = s.taskName || s.name || 'Unnamed';
      taskFocus[name] = (taskFocus[name] || 0) + (s.durationMinutes || 0);
    });
    var pieColors = ['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899','#6366f1','#14b8a6'];
    var entries = Object.keys(taskFocus).map(function(k,i) { return { name: k, value: taskFocus[k], color: pieColors[i % pieColors.length] }; });
    var pieTotal = 0;
    entries.forEach(function(e) { pieTotal += e.value; });

    if (pieTotal > 0) {
      html += '<div style="margin-top:24px">';
      html += '<div style="font-size:15px;font-weight:600;color:rgba(45,45,45,0.5);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px">Focus by Task</div>';
      html += '<div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">';
      // SVG pie
      var svgSize = 140, cx = 70, cy = 70, r = 60;
      html += '<svg width="' + svgSize + '" height="' + svgSize + '" viewBox="0 0 ' + svgSize + ' ' + svgSize + '">';
      var startAngle = -Math.PI / 2;
      entries.forEach(function(e) {
        var sliceAngle = (e.value / pieTotal) * 2 * Math.PI;
        var endAngle = startAngle + sliceAngle;
        var largeArc = sliceAngle > Math.PI ? 1 : 0;
        var x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
        var x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
        if (entries.length === 1) {
          html += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + e.color + '" stroke="#faf9f7" stroke-width="2"/>';
        } else {
          html += '<path d="M' + cx + ',' + cy + ' L' + x1.toFixed(2) + ',' + y1.toFixed(2) + ' A' + r + ',' + r + ' 0 ' + largeArc + ',1 ' + x2.toFixed(2) + ',' + y2.toFixed(2) + ' Z" fill="' + e.color + '" stroke="#faf9f7" stroke-width="2" stroke-linejoin="round"/>';
        }
        startAngle = endAngle;
      });
      html += '</svg>';
      // Legend
      html += '<div style="display:flex;flex-direction:column;gap:6px">';
      entries.forEach(function(e) {
        html += '<div style="display:flex;align-items:center;gap:8px;font-size:14px">' +
          '<span style="width:10px;height:10px;border-radius:50%;background:' + e.color + ';flex-shrink:0"></span>' +
          '<span>' + escapeHtml(e.name) + '</span>' +
          '<span style="color:rgba(45,45,45,0.4)">' + e.value + 'm</span>' +
        '</div>';
      });
      html += '</div></div></div>';
    }
  }

  // LINE CHART — Focus & tasks per day across the month (hand-drawn SVG)
  var year = d.getFullYear(), month = d.getMonth();
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var dailyFocus = [], dailyTasks = [];
  for (var di = 1; di <= daysInMonth; di++) {
    var dk = year + '-' + String(month+1).padStart(2,'0') + '-' + String(di).padStart(2,'0');
    var dSessions = calState.sessions[dk] || [];
    var fm = 0;
    dSessions.forEach(function(s) { fm += (s.durationMinutes || 0); });
    dailyFocus.push(fm);
    var dTasks = (calState.tasks||[]).filter(function(t) {
      if (t.parentTaskId) return false;
      var td = (t.scheduledTime||t.createdAt||'').substring(0,10);
      return td === dk && t.completed;
    });
    dailyTasks.push(dTasks.length);
  }

  var maxFocus = Math.max.apply(null, dailyFocus) || 1;
  var maxTasks = Math.max.apply(null, dailyTasks) || 1;
  var chartW = 460, chartH = 120, padL = 30, padR = 10, padT = 10, padB = 20;
  var innerW = chartW - padL - padR, innerH = chartH - padT - padB;

  html += '<div style="margin-top:24px">';
  html += '<div style="font-size:15px;font-weight:600;color:rgba(45,45,45,0.5);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px">Monthly Overview</div>';
  html += '<svg width="100%" viewBox="0 0 ' + chartW + ' ' + chartH + '" style="max-width:' + chartW + 'px">';
  // Grid lines
  for (var gi = 0; gi <= 4; gi++) {
    var gy = padT + (innerH / 4) * gi;
    html += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (chartW-padR) + '" y2="' + gy + '" stroke="rgba(45,45,45,0.08)" stroke-width="1" stroke-dasharray="4,3"/>';
  }
  // Focus line (purple)
  var focusPoints = [];
  for (var fi = 0; fi < daysInMonth; fi++) {
    var fx = padL + (fi / (daysInMonth-1||1)) * innerW;
    var fy = padT + innerH - (dailyFocus[fi] / maxFocus) * innerH;
    focusPoints.push(fx.toFixed(1) + ',' + fy.toFixed(1));
  }
  html += '<polyline points="' + focusPoints.join(' ') + '" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>';
  // Tasks line (green)
  var taskPoints = [];
  for (var ti = 0; ti < daysInMonth; ti++) {
    var tx = padL + (ti / (daysInMonth-1||1)) * innerW;
    var ty = padT + innerH - (dailyTasks[ti] / maxTasks) * innerH;
    taskPoints.push(tx.toFixed(1) + ',' + ty.toFixed(1));
  }
  html += '<polyline points="' + taskPoints.join(' ') + '" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>';
  // Highlight current day
  var dayIdx = d.getDate() - 1;
  var hx = padL + (dayIdx / (daysInMonth-1||1)) * innerW;
  html += '<line x1="' + hx.toFixed(1) + '" y1="' + padT + '" x2="' + hx.toFixed(1) + '" y2="' + (padT+innerH) + '" stroke="rgba(45,45,45,0.15)" stroke-width="1" stroke-dasharray="3,2"/>';
  html += '<circle cx="' + hx.toFixed(1) + '" cy="' + (padT + innerH - (dailyFocus[dayIdx]/maxFocus)*innerH).toFixed(1) + '" r="4" fill="#8b5cf6" stroke="#faf9f7" stroke-width="2"/>';
  html += '<circle cx="' + hx.toFixed(1) + '" cy="' + (padT + innerH - (dailyTasks[dayIdx]/maxTasks)*innerH).toFixed(1) + '" r="4" fill="#10b981" stroke="#faf9f7" stroke-width="2"/>';
  // Day labels
  for (var li = 0; li < daysInMonth; li += Math.ceil(daysInMonth/10)) {
    var lx = padL + (li / (daysInMonth-1||1)) * innerW;
    html += '<text x="' + lx.toFixed(1) + '" y="' + (chartH-2) + '" text-anchor="middle" fill="rgba(45,45,45,0.35)" font-size="10" font-family="\'Patrick Hand\',cursive">' + (li+1) + '</text>';
  }
  html += '</svg>';
  // Legend
  html += '<div style="display:flex;gap:16px;margin-top:6px;font-size:13px;color:rgba(45,45,45,0.5)">' +
    '<span style="display:flex;align-items:center;gap:4px"><span style="width:12px;height:3px;background:#8b5cf6;border-radius:2px"></span> Focus</span>' +
    '<span style="display:flex;align-items:center;gap:4px"><span style="width:12px;height:3px;background:#10b981;border-radius:2px"></span> Tasks Done</span>' +
  '</div></div>';

  html += '</div>';
  content.innerHTML = html;
  popup.classList.remove('hidden');
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
