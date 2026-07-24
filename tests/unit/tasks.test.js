/**
 * Unit tests for tasks.js pure functions.
 * Replicated locally — no DOM or Electron dependencies.
 */

/* ── Replicated pure functions from tasks.js ── */

function newTaskId() {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

var DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
var MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function recLabel(r, customDays) {
  if (!r || r === 'none') return '';
  if (r === 'custom' && customDays && customDays.length) {
    var days = customDays;
    if (typeof customDays === 'string') { try { days = JSON.parse(customDays); } catch(e) { days = []; } }
    return 'Custom (' + days.map(function(d) { return DAY_NAMES[d]; }).join(', ') + ')';
  }
  if (r === 'daily') return 'Daily';
  if (r === 'weekly') return 'Weekly';
  if (r === 'monthly') return 'Monthly';
  return r;
}

function toggleCustomDay(list, day) {
  var idx = list.indexOf(day);
  if (idx >= 0) { var c = list.slice(); c.splice(idx,1); return c; }
  var c = list.slice(); c.push(day); c.sort(function(a,b){return a-b});
  return c;
}

function parseCustomDays(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch(e) { return []; }
}

function fmtDate(d) {
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function dateKey(d) { return fmtDate(d); }

function isToday(d) {
  var t = new Date(); t.setHours(0,0,0,0);
  var d2 = new Date(d); d2.setHours(0,0,0,0);
  return d2.getTime() === t.getTime();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function prioColor(p) {
  if (p === 'High') return '#ef4444';
  if (p === 'Medium') return '#10b981';
  return '#d1d5db';
}

function formatArchiveDate(dk) {
  var parts = dk.split('-');
  if (parts.length !== 3) return dk;
  var d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
  return DAY_NAMES[d.getDay()] + ', ' + MONTH_NAMES[d.getMonth()] + ' ' + parseInt(parts[2]);
}

function getGoalName(goalId, goals) {
  if (!goalId || !goals) return '';
  for (var gi = 0; gi < goals.length; gi++) {
    if (goals[gi].id === goalId || goals[gi].goalId === goalId) return goals[gi].name;
  }
  return '';
}

/* ── Additional helpers replicated for filtering tests ── */

function filterDailyTasks(tasks, currentDate, filterMode) {
  var dayKey = dateKey(currentDate);
  var filtered = tasks.filter(function(t) {
    var taskDate = t.scheduledTime || t.createdAt;
    return taskDate ? taskDate.substring(0, 10) === dayKey : dayKey === dateKey(new Date());
  });
  if (filterMode === 'active') filtered = filtered.filter(function(t) { return !t.completed; });
  else if (filterMode === 'completed') filtered = filtered.filter(function(t) { return t.completed; });
  return filtered;
}

function groupArchiveTasks(tasks) {
  var groups = {};
  tasks.forEach(function(t) {
    var dk = (t.scheduledTime || t.createdAt || '').substring(0, 10);
    if (!dk) dk = dateKey(new Date());
    if (!groups[dk]) groups[dk] = [];
    groups[dk].push(t);
  });
  return groups;
}

/* ── Render helpers (pure HTML output, no DOM) ── */

function renderTaskItem(t, allTasks, selectedId, expandedTasks) {
  var isSelected = t.id === selectedId;
  var doneClass = t.completed ? 'completed' : '';
  var selClass = isSelected ? ' selected' : '';
  var dotColor = prioColor(t.priority);
  var metaParts = [];
  if (t.scheduledTime) {
    var timeStr = t.scheduledTime.split('T')[1] || '';
    if (timeStr) metaParts.push(timeStr.substring(0, 5));
  }
  if (t.recurrence && t.recurrence !== 'none') {
    metaParts.push(recLabel(t.recurrence, t.customDays));
  }
  var metaHtml = metaParts.length ? '<div class="task-meta">' + metaParts.join(' &middot; ') + '</div>' : '';

  var subtaskCount = 0;
  if (allTasks) {
    allTasks.forEach(function(st) { if (st.parentTaskId === t.id) subtaskCount++; });
  }
  var isExpanded = expandedTasks && expandedTasks[t.id];

  var clickHandler = subtaskCount > 0
    ? 'ondblclick="selectTask(\'' + escapeHtml(t.id) + '\')" onclick="event.stopPropagation();toggleExpanded(\'' + escapeHtml(t.id) + '\')"'
    : 'onclick="selectTask(\'' + escapeHtml(t.id) + '\')"';

  var html = '<div class="task-item' + (doneClass ? ' ' + doneClass : '') + selClass + '" data-task-id="' + escapeHtml(t.id) + '" ' + clickHandler + '>' +
    '<div class="task-checkbox' + (t.completed ? ' checked' : '') + '" onclick="event.stopPropagation();toggleTask(' + t.completed + ', \'' + escapeHtml(t.id) + '\')">' +
      (t.completed ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>' : '') +
    '</div>' +
    '<span class="task-priority-dot" style="background:' + dotColor + '"></span>' +
    '<div class="task-content">' +
      '<div class="task-title' + (t.completed ? ' done' : '') + '">' + escapeHtml(t.name) + '</div>' +
      metaHtml +
    '</div>' +
    '<button class="task-delete-btn" onclick="event.stopPropagation();window.deleteTask(\'' + escapeHtml(t.id) + '\')">' +
      '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>' +
    '</button></div>';

  if (subtaskCount > 0 && isExpanded) {
    allTasks.forEach(function(st) {
      if (st.parentTaskId === t.id) {
        html += '<div style="padding-left:36px">' + renderTaskItem(st, allTasks, selectedId, expandedTasks) + '</div>';
      }
    });
  }

  return html;
}

function renderDetailEmpty() {
  return '<div class="task-detail-empty">Select a task to view and edit</div>';
}

function renderDetailPanel(task, allTasks) {
  var subtasks = allTasks ? allTasks.filter(function(t) { return t.parentTaskId === task.id; }) : [];
  var dotColor = prioColor(task.priority);
  var metaHtml = '';
  var pLabel = (task.priority && task.priority !== 'none') ? task.priority : 'None';
  metaHtml += '<span class="task-detail-meta-item"><span class="task-priority-dot" style="background:' + dotColor + ';width:10px;height:10px"></span>' + pLabel + '</span>';
  if (task.scheduledTime) {
    var t = task.scheduledTime.split('T')[1];
    if (t) metaHtml += '<span class="task-detail-meta-item"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' + t.substring(0,5) + '</span>';
  }
  if (task.recurrence && task.recurrence !== 'none') {
    metaHtml += '<span class="task-detail-meta-item"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 5v14l4-3 4 3 4-3 4 3V5l-4 3-4-3-4 3-4-3z"/></svg>' + recLabel(task.recurrence, task.customDays) + '</span>';
  }
  var taskDate = (task.scheduledTime || task.createdAt || '').substring(0, 10);
  if (taskDate) {
    var parts = taskDate.split('-');
    if (parts.length === 3) metaHtml += '<span class="task-detail-meta-item">' + MONTH_NAMES[parseInt(parts[1])-1] + ' ' + parseInt(parts[2]) + '</span>';
  }

  var subHtml = '';
  subtasks.forEach(function(st) {
    subHtml += '<div class="detail-subtask-item">' +
      '<div style="display:flex;align-items:center;gap:8px">' +
        (st.completed ? '<span style="color:#10b981">&#10003;</span><span style="text-decoration:line-through;color:rgba(45,45,45,0.4)">' : '<span style="color:rgba(45,45,45,0.3)">&#9675;</span><span>') + escapeHtml(st.name) + '</span>' +
      '</div>' +
      '<button onclick="event.stopPropagation();window.deleteTask(\'' + escapeHtml(st.id) + '\')" style="border:none;background:none;cursor:pointer;color:#ef4444;padding:4px">' +
        '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>' +
      '</button></div>';
  });

  var panelHtml = '<div class="task-detail-editor">' +
    '<div class="task-detail-title-row">' +
      '<div class="task-detail-title-checkbox' + (task.completed ? ' checked' : '') + '" onclick="toggleTask(' + (task.completed ? 1 : 0) + ', \'' + escapeHtml(task.id) + '\');event.stopPropagation()">' +
        (task.completed ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>' : '') +
      '</div>' +
      '<input type="text" class="task-detail-title-input' + (task.completed ? ' done' : '') + '" value="' + escapeHtml(task.name) + '" onblur="saveDetailField(\'' + escapeHtml(task.id) + '\',\'name\',this.value)" placeholder="Task title..." />' +
      '<button class="task-detail-close-btn" onclick="closeDetail()"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg></button>' +
    '</div>' +
    '<div class="task-detail-meta">' + metaHtml + '</div>' +

    '<div class="detail-field-label">Priority</div>' +
    '<div class="detail-priority-row" id="detail-priority-row">' +
      '<button class="detail-prio-btn' + ((!task.priority || task.priority === 'none' || task.priority === 'None') ? ' active' : '') + '" onclick="changePriority(\'' + escapeHtml(task.id) + '\',\'none\')"><span class="detail-prio-dot" style="background:#d1d5db"></span> None</button>' +
      '<button class="detail-prio-btn' + (task.priority === 'Low' ? ' active' : '') + '" onclick="changePriority(\'' + escapeHtml(task.id) + '\',\'Low\')"><span class="detail-prio-dot" style="background:#9ca3af"></span> Low</button>' +
      '<button class="detail-prio-btn' + (task.priority === 'Medium' ? ' active' : '') + '" onclick="changePriority(\'' + escapeHtml(task.id) + '\',\'Medium\')"><span class="detail-prio-dot" style="background:#10b981"></span> Medium</button>' +
      '<button class="detail-prio-btn' + (task.priority === 'High' ? ' active' : '') + '" onclick="changePriority(\'' + escapeHtml(task.id) + '\',\'High\')"><span class="detail-prio-dot" style="background:#ef4444"></span> High</button>' +
    '</div>' +

    '<div style="margin-top:24px">' +
    '<div class="detail-grid-2">' +
      '<div><div class="detail-field-label">Schedule</div>' +
        '<input type="time" class="detail-input" value="' + ((task.scheduledTime || '').split('T')[1] || '') + '" onblur="saveDetailField(\'' + escapeHtml(task.id) + '\',\'time\',this.value)" />' +
      '</div>' +
      '<div class="detail-repeat-wrap" style="position:relative"><div class="detail-field-label">Repeat</div>' +
        '<select class="detail-input" onchange="detailRepeatChange(\'' + escapeHtml(task.id) + '\',this.value)" style="cursor:pointer">' +
          '<option value="none"' + ((!task.recurrence || task.recurrence === 'none') ? ' selected' : '') + '>None</option>' +
          '<option value="daily"' + (task.recurrence === 'daily' ? ' selected' : '') + '>Daily</option>' +
          '<option value="weekly"' + (task.recurrence === 'weekly' ? ' selected' : '') + '>Weekly</option>' +
          '<option value="monthly"' + (task.recurrence === 'monthly' ? ' selected' : '') + '>Monthly</option>' +
          '<option value="custom"' + (task.recurrence === 'custom' ? ' selected' : '') + '>Custom</option>' +
        '</select>' +
      '</div>' +
    '</div>' +
    '</div>' +

    '<div style="margin-top:24px">' +
    '<div class="detail-field-label">Duration</div>' +
    '<div class="detail-grid-2">' +
      '<input type="date" class="detail-input" value="' + (task.durationStart || '') + '" placeholder="Start" onblur="saveDetailField(\'' + escapeHtml(task.id) + '\',\'durationStart\',this.value)" />' +
      '<input type="date" class="detail-input" value="' + (task.durationEnd || '') + '" placeholder="End" onblur="saveDetailField(\'' + escapeHtml(task.id) + '\',\'durationEnd\',this.value)" />' +
    '</div>' +
    '</div>' +

    '<div style="margin-top:24px">' +
    '<div class="detail-field-label">Notes</div>' +
    '<textarea class="detail-input detail-textarea" placeholder="Write notes here..." onblur="saveDetailNote(\'' + escapeHtml(task.id) + '\',this.value)">' + escapeHtml(task.notes || '') + '</textarea>' +
    '</div>' +

    '<div class="detail-subtasks-section">' +
    '<div class="detail-field-label">Subtasks</div>' +
    (subHtml || '<div style="color:rgba(45,45,45,0.4);font-size:14px;margin-bottom:8px">No subtasks.</div>') +
    '<div style="display:flex;gap:8px">' +
      '<input type="text" id="detail-sub-input" class="detail-input" placeholder="Add subtask..." style="padding:8px 12px;font-size:16px" onkeydown="if(event.key===\'Enter\')addDetailSubtask(\'' + escapeHtml(task.id) + '\')" />' +
      '<button onclick="addDetailSubtask(\'' + escapeHtml(task.id) + '\')" style="border-radius:8px;background:#2d2d2d;color:#fff;padding:6px 16px;font-size:16px;border:none;cursor:pointer;font-family:\'Patrick Hand\',cursive">+ Add</button>' +
    '</div>' +
    '</div>' +

    '<div style="margin-top:32px">' +
    '<button class="detail-delete-btn" onclick="window.deleteTask(\'' + escapeHtml(task.id) + '\')">' +
      '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>' +
      ' Delete task' +
    '</button>' +
    '</div>' +

  '</div>';

  return panelHtml;
}

/* ── saveDetailField logic (pure update object) ── */

function buildSaveUpdates(id, field, value, currentDate) {
  var updates = {};
  if (field === 'name') { updates.name = value.trim() || 'Untitled'; }
  else if (field === 'recurrence') { updates.recurrence = value; }
  else if (field === 'durationStart') { updates.durationStart = value; }
  else if (field === 'durationEnd') { updates.durationEnd = value; }
  else if (field === 'customDays') { updates.customDays = value; }
  return updates;
}

function buildTimeUpdate(task, value, currentDate) {
  var sched = task.scheduledTime || dateKey(currentDate) + 'T00:00';
  if (value) { sched = sched.split('T')[0] + 'T' + value; }
  else { sched = sched.split('T')[0]; }
  return { scheduledTime: sched };
}

/* ════════════════════════════════════════════════════════ */
/*  TESTS                                                   */
/* ════════════════════════════════════════════════════════ */

describe('newTaskId', function() {

  test('returns string starting with task_', function() {
    var id = newTaskId();
    expect(id.startsWith('task_')).toBe(true);
  });

  test('contains timestamp', function() {
    var id = newTaskId();
    var parts = id.split('_');
    expect(parts.length).toBe(3);
    var ts = parseInt(parts[1], 10);
    expect(Number.isNaN(ts)).toBe(false);
    expect(ts).toBeGreaterThan(0);
  });

  test('unique on each call', function() {
    var ids = {};
    for (var i = 0; i < 100; i++) {
      var id = newTaskId();
      expect(ids[id]).toBeUndefined();
      ids[id] = true;
    }
  });

  test('contains random segment', function() {
    var id = newTaskId();
    var parts = id.split('_');
    expect(parts[2].length).toBeGreaterThanOrEqual(4);
    expect(parts[2].length).toBeLessThanOrEqual(8);
  });

});

describe('recLabel', function() {

  test('null returns empty string', function() {
    expect(recLabel(null)).toBe('');
  });

  test('undefined returns empty string', function() {
    expect(recLabel(undefined)).toBe('');
  });

  test('none returns empty string', function() {
    expect(recLabel('none')).toBe('');
  });

  test('daily returns Daily', function() {
    expect(recLabel('daily')).toBe('Daily');
  });

  test('weekly returns Weekly', function() {
    expect(recLabel('weekly')).toBe('Weekly');
  });

  test('monthly returns Monthly', function() {
    expect(recLabel('monthly')).toBe('Monthly');
  });

  test('custom with empty array returns "custom" (falsy length)', function() {
    expect(recLabel('custom', [])).toBe('custom');
  });

  test('custom with 0 and 6 returns Custom (Sun, Sat)', function() {
    expect(recLabel('custom', [0, 6])).toBe('Custom (Sun, Sat)');
  });

  test('custom with all 7 days returns full list', function() {
    var all = [0, 1, 2, 3, 4, 5, 6];
    expect(recLabel('custom', all)).toBe('Custom (Sun, Mon, Tue, Wed, Thu, Fri, Sat)');
  });

  test('custom with string JSON parses correctly', function() {
    expect(recLabel('custom', '[0,6]')).toBe('Custom (Sun, Sat)');
  });

  test('custom with invalid JSON returns empty string', function() {
    expect(recLabel('custom', 'not-json')).toBe('Custom ()');
  });

  test('unknown recurrence value returns the value itself', function() {
    expect(recLabel('foobar')).toBe('foobar');
  });

  test('custom with single day returns single day label', function() {
    expect(recLabel('custom', [1])).toBe('Custom (Mon)');
  });

});

describe('toggleCustomDay', function() {

  test('add day to empty list returns [day]', function() {
    expect(toggleCustomDay([], 2)).toEqual([2]);
  });

  test('add day to existing list returns sorted', function() {
    expect(toggleCustomDay([1, 5], 3)).toEqual([1, 3, 5]);
  });

  test('remove existing day', function() {
    expect(toggleCustomDay([0, 2, 4], 2)).toEqual([0, 4]);
  });

  test('toggle same day twice removes it', function() {
    var list = toggleCustomDay([], 3);
    expect(list).toEqual([3]);
    var list2 = toggleCustomDay(list, 3);
    expect(list2).toEqual([]);
  });

  test('toggle preserves order', function() {
    var list = toggleCustomDay([5, 1], 3);
    expect(list).toEqual([1, 3, 5]);
  });

  test('multiple toggles work sequentially', function() {
    var list = [];
    list = toggleCustomDay(list, 0);
    list = toggleCustomDay(list, 2);
    list = toggleCustomDay(list, 4);
    expect(list).toEqual([0, 2, 4]);
    list = toggleCustomDay(list, 2);
    expect(list).toEqual([0, 4]);
  });

  test('add day 6 then day 0 yields [0, 6]', function() {
    var list = toggleCustomDay([], 6);
    list = toggleCustomDay(list, 0);
    expect(list).toEqual([0, 6]);
  });

  test('toggle non-existent day adds it', function() {
    expect(toggleCustomDay([1, 2], 5)).toEqual([1, 2, 5]);
  });

});

describe('parseCustomDays', function() {

  test('null returns []', function() {
    expect(parseCustomDays(null)).toEqual([]);
  });

  test('undefined returns []', function() {
    expect(parseCustomDays(undefined)).toEqual([]);
  });

  test('empty string returns []', function() {
    expect(parseCustomDays('')).toEqual([]);
  });

  test('valid JSON array returns parsed array', function() {
    expect(parseCustomDays('[0,2,4]')).toEqual([0, 2, 4]);
  });

  test('invalid JSON returns []', function() {
    expect(parseCustomDays('{bad')).toEqual([]);
  });

  test('already an array returns as-is', function() {
    var arr = [1, 3, 5];
    expect(parseCustomDays(arr)).toBe(arr);
  });

});

describe('fmtDate / dateKey', function() {

  test('specific date 2026-07-21', function() {
    var d = new Date(2026, 6, 21);
    expect(fmtDate(d)).toBe('2026-07-21');
  });

  test('handles single digit month', function() {
    var d = new Date(2026, 0, 5);
    expect(fmtDate(d)).toBe('2026-01-05');
  });

  test('handles single digit day', function() {
    var d = new Date(2026, 11, 1);
    expect(fmtDate(d)).toBe('2026-12-01');
  });

  test('new Year boundary', function() {
    var d = new Date(2027, 0, 1);
    expect(fmtDate(d)).toBe('2027-01-01');
  });

  test('dateKey is alias of fmtDate', function() {
    var d = new Date(2026, 6, 21);
    expect(dateKey(d)).toBe(fmtDate(d));
  });

  test('Feb 29 on leap year 2028', function() {
    var d = new Date(2028, 1, 29);
    expect(fmtDate(d)).toBe('2028-02-29');
  });

});

describe('isToday', function() {

  test('today returns true', function() {
    expect(isToday(new Date())).toBe(true);
  });

  test('yesterday returns false', function() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    expect(isToday(d)).toBe(false);
  });

  test('tomorrow returns false', function() {
    var d = new Date();
    d.setDate(d.getDate() + 1);
    expect(isToday(d)).toBe(false);
  });

  test('different month returns false', function() {
    var d = new Date(2020, 0, 1);
    expect(isToday(d)).toBe(false);
  });

});

describe('escapeHtml', function() {

  test('plain text unchanged', function() {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  test('& becomes &amp;', function() {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  test('< becomes &lt;', function() {
    expect(escapeHtml('<tag>')).toBe('&lt;tag&gt;');
  });

  test('> becomes &gt;', function() {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  test('" becomes &quot;', function() {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  test('null and undefined return empty string', function() {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

});

describe('prioColor', function() {

  test('High returns #ef4444', function() {
    expect(prioColor('High')).toBe('#ef4444');
  });

  test('Medium returns #10b981', function() {
    expect(prioColor('Medium')).toBe('#10b981');
  });

  test('Low returns #d1d5db', function() {
    expect(prioColor('Low')).toBe('#d1d5db');
  });

  test('none returns #d1d5db', function() {
    expect(prioColor('none')).toBe('#d1d5db');
  });

  test('null returns #d1d5db', function() {
    expect(prioColor(null)).toBe('#d1d5db');
  });

  test('undefined returns #d1d5db', function() {
    expect(prioColor(undefined)).toBe('#d1d5db');
  });

});

describe('formatArchiveDate', function() {

  test('2026-07-21 returns appropriate date string', function() {
    var result = formatArchiveDate('2026-07-21');
    expect(result).toMatch(/^Tue, Jul 21$/);
  });

  test('2026-01-01 returns appropriate date string', function() {
    var result = formatArchiveDate('2026-01-01');
    expect(result).toMatch(/^Thu, Jan 1$/);
  });

  test('invalid date parts render with NaN labels', function() {
    var result = formatArchiveDate('not-a-date');
    expect(result).toMatch(/^undefined,/);
  });

  test('handles month boundary', function() {
    var result = formatArchiveDate('2026-04-30');
    expect(result).toMatch(/Thu, Apr 30/);
  });

  test('handles year boundary', function() {
    var result = formatArchiveDate('2026-12-31');
    expect(result).toMatch(/Thu, Dec 31/);
  });

  test('single digit month and day', function() {
    var result = formatArchiveDate('2026-03-05');
    expect(result).toMatch(/Thu, Mar 5/);
  });

});

describe('getGoalName', function() {

  var goals = [
    { id: 'g1', goalId: null, name: 'Goal One' },
    { id: 'g2', goalId: null, name: 'Goal Two' },
    { id: 'g3', goalId: null, name: 'Goal Three' }
  ];

  test('matches by id returns name', function() {
    expect(getGoalName('g1', goals)).toBe('Goal One');
  });

  test('matches by goalId returns name', function() {
    var goalsWithGoalId = [
      { id: 'x', goalId: 'g1', name: 'Alias Goal' }
    ];
    expect(getGoalName('g1', goalsWithGoalId)).toBe('Alias Goal');
  });

  test('no match returns empty string', function() {
    expect(getGoalName('nonexistent', goals)).toBe('');
  });

  test('null goalId returns empty string', function() {
    expect(getGoalName(null, goals)).toBe('');
  });

  test('null goals returns empty string', function() {
    expect(getGoalName('g1', null)).toBe('');
  });

  test('empty goals array returns empty string', function() {
    expect(getGoalName('g1', [])).toBe('');
  });

  test('multiple goals, finds correct one', function() {
    var many = [
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
      { id: 'c', name: 'Gamma' }
    ];
    expect(getGoalName('c', many)).toBe('Gamma');
  });

  test('case sensitivity', function() {
    expect(getGoalName('G1', goals)).toBe('');
  });

});

describe('Task filtering logic', function() {

  var todayStr = (function() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  })();

  function makeTask(overrides) {
    return {
      id: 't_' + Math.random().toString(36).substring(2, 8),
      name: 'Test task',
      completed: false,
      scheduledTime: null,
      createdAt: todayStr + 'T10:00:00.000Z',
      priority: 'Medium',
      recurrence: 'none',
      customDays: '',
      notes: '',
      parentTaskId: null,
      ...overrides
    };
  }

  test('daily view filters by dateKey from scheduledTime', function() {
    var tasks = [
      makeTask({ id: 'a', scheduledTime: todayStr + 'T14:00' }),
      makeTask({ id: 'b', scheduledTime: '2025-01-01T12:00' })
    ];
    var result = filterDailyTasks(tasks, new Date(), 'all');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('a');
  });

  test('daily view filters by dateKey from createdAt if no scheduledTime', function() {
    var tasks = [
      makeTask({ id: 'a', scheduledTime: null, createdAt: todayStr + 'T09:00' }),
      makeTask({ id: 'b', scheduledTime: null, createdAt: '2025-06-01T09:00' })
    ];
    var result = filterDailyTasks(tasks, new Date(), 'all');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('a');
  });

  test('no tasks returns empty array', function() {
    expect(filterDailyTasks([], new Date(), 'all')).toEqual([]);
  });

  test('active filter excludes completed tasks', function() {
    var tasks = [
      makeTask({ id: 'a', completed: false, scheduledTime: todayStr + 'T10:00' }),
      makeTask({ id: 'b', completed: true, scheduledTime: todayStr + 'T11:00' })
    ];
    var result = filterDailyTasks(tasks, new Date(), 'active');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('a');
  });

  test('completed filter shows only completed', function() {
    var tasks = [
      makeTask({ id: 'a', completed: false, scheduledTime: todayStr + 'T10:00' }),
      makeTask({ id: 'b', completed: true, scheduledTime: todayStr + 'T11:00' })
    ];
    var result = filterDailyTasks(tasks, new Date(), 'completed');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('b');
  });

  test('all filter shows everything', function() {
    var tasks = [
      makeTask({ id: 'a', completed: false, scheduledTime: todayStr + 'T10:00' }),
      makeTask({ id: 'b', completed: true, scheduledTime: todayStr + 'T11:00' })
    ];
    var result = filterDailyTasks(tasks, new Date(), 'all');
    expect(result.length).toBe(2);
  });

  test('dateKey comparison works across months', function() {
    var tasks = [
      makeTask({ id: 'a', scheduledTime: '2026-01-31T12:00' }),
      makeTask({ id: 'b', scheduledTime: '2026-02-01T12:00' })
    ];
    var feb1 = new Date(2026, 1, 1);
    var result = filterDailyTasks(tasks, feb1, 'all');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('b');
  });

  test('tasks with different dates filtered out', function() {
    var tasks = [
      makeTask({ id: 'a', scheduledTime: '2026-07-15T10:00' }),
      makeTask({ id: 'b', scheduledTime: '2026-07-16T10:00' })
    ];
    var july15 = new Date(2026, 6, 15);
    var result = filterDailyTasks(tasks, july15, 'all');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('a');
  });

  test('archive view groups by date', function() {
    var tasks = [
      makeTask({ id: 'a', scheduledTime: '2026-07-10T10:00' }),
      makeTask({ id: 'b', scheduledTime: '2026-07-11T10:00' }),
      makeTask({ id: 'c', scheduledTime: '2026-07-10T12:00' })
    ];
    var groups = groupArchiveTasks(tasks);
    expect(Object.keys(groups).length).toBe(2);
    expect(groups['2026-07-10'].length).toBe(2);
    expect(groups['2026-07-11'].length).toBe(1);
  });

  test('archive view sorts dates reverse', function() {
    var tasks = [
      makeTask({ id: 'a', scheduledTime: '2026-07-10T10:00' }),
      makeTask({ id: 'b', scheduledTime: '2026-07-12T10:00' }),
      makeTask({ id: 'c', scheduledTime: '2026-07-11T10:00' })
    ];
    var groups = groupArchiveTasks(tasks);
    var sorted = Object.keys(groups).sort().reverse();
    expect(sorted).toEqual(['2026-07-12', '2026-07-11', '2026-07-10']);
  });

  test('archive view empty groups', function() {
    expect(groupArchiveTasks([])).toEqual({});
  });

  test('daily view empty returns empty array', function() {
    expect(filterDailyTasks([], new Date(), 'all')).toEqual([]);
  });

});

describe('renderTaskItem HTML output', function() {

  function makeTask(overrides) {
    return {
      id: 'task_test123',
      name: 'Test Task',
      completed: false,
      scheduledTime: null,
      createdAt: '2026-07-21T10:00:00.000Z',
      priority: 'Medium',
      recurrence: 'none',
      customDays: '',
      notes: '',
      parentTaskId: null,
      ...overrides
    };
  }

  test('basic task structure contains expected classes', function() {
    var t = makeTask();
    var html = renderTaskItem(t, [], null, {});
    expect(html).toContain('task-item');
    expect(html).toContain('task-checkbox');
    expect(html).toContain('task-priority-dot');
    expect(html).toContain('task-content');
    expect(html).toContain('task-delete-btn');
  });

  test('completed task gets completed class and checked checkbox', function() {
    var t = makeTask({ completed: true });
    var html = renderTaskItem(t, [], null, {});
    expect(html).toContain('completed');
    expect(html).toContain('checked');
    expect(html).toContain('task-title done');
  });

  test('selected task gets selected class', function() {
    var t = makeTask({ id: 'task_selected' });
    var html = renderTaskItem(t, [], 'task_selected', {});
    expect(html).toContain('selected');
  });

  test('priority dot color from prioColor for High', function() {
    var t = makeTask({ priority: 'High' });
    var html = renderTaskItem(t, [], null, {});
    expect(html).toContain('background:#ef4444');
  });

  test('priority dot color from prioColor for Medium', function() {
    var t = makeTask({ priority: 'Medium' });
    var html = renderTaskItem(t, [], null, {});
    expect(html).toContain('background:#10b981');
  });

  test('meta shows scheduled time', function() {
    var t = makeTask({ scheduledTime: '2026-07-21T14:30' });
    var html = renderTaskItem(t, [], null, {});
    expect(html).toContain('task-meta');
    expect(html).toContain('14:30');
  });

  test('meta shows recurrence label', function() {
    var t = makeTask({ recurrence: 'daily' });
    var html = renderTaskItem(t, [], null, {});
    expect(html).toContain('task-meta');
    expect(html).toContain('Daily');
  });

  test('subtask count shown with double-click', function() {
    var t1 = makeTask({ id: 'parent' });
    var t2 = makeTask({ id: 'child', parentTaskId: 'parent' });
    var html = renderTaskItem(t1, [t1, t2], null, {});
    expect(html).toContain('ondblclick');
    expect(html).toContain('toggleExpanded');
  });

  test('expanded subtasks rendered', function() {
    var t1 = makeTask({ id: 'parent' });
    var t2 = makeTask({ id: 'child', parentTaskId: 'parent', name: 'Subtask' });
    var html = renderTaskItem(t1, [t1, t2], null, { parent: true });
    expect(html).toContain('padding-left:36px');
    expect(html).toContain('Subtask');
  });

  test('delete button included', function() {
    var t = makeTask();
    var html = renderTaskItem(t, [], null, {});
    expect(html).toContain('window.deleteTask');
    expect(html).toContain('task-delete-btn');
  });

});

describe('renderDetailPanel content', function() {

  function makeTask(overrides) {
    return {
      id: 'task_detail',
      name: 'Detail Task',
      completed: false,
      scheduledTime: null,
      createdAt: '2026-07-21T10:00:00.000Z',
      priority: 'Medium',
      recurrence: 'none',
      customDays: '',
      notes: '',
      parentTaskId: null,
      ...overrides
    };
  }

  test('empty renders select message', function() {
    expect(renderDetailEmpty()).toBe('<div class="task-detail-empty">Select a task to view and edit</div>');
  });

  test('task details shown with editor wrapper', function() {
    var t = makeTask();
    var html = renderDetailPanel(t, [t]);
    expect(html).toContain('task-detail-editor');
    expect(html).toContain('Detail Task');
  });

  test('priority buttons match task priority', function() {
    var t = makeTask({ priority: 'High' });
    var html = renderDetailPanel(t, [t]);
    expect(html).toContain('detail-prio-btn active');
    expect(html).toContain('#ef4444');
  });

  test('schedule input shows time value', function() {
    var t = makeTask({ scheduledTime: '2026-07-21T09:15' });
    var html = renderDetailPanel(t, [t]);
    expect(html).toContain('value="09:15"');
  });

  test('recurrence selector shows correct option selected', function() {
    var t = makeTask({ recurrence: 'weekly' });
    var html = renderDetailPanel(t, [t]);
    expect(html).toContain('value="weekly" selected');
  });

  test('subtasks section renders subtask items', function() {
    var t = makeTask({ id: 'parent' });
    var st = makeTask({ id: 'child', name: 'Sub Item', parentTaskId: 'parent' });
    var html = renderDetailPanel(t, [t, st]);
    expect(html).toContain('detail-subtask-item');
    expect(html).toContain('Sub Item');
  });

});

describe('saveDetailField logic', function() {

  var currentDate = new Date(2026, 6, 21);

  test('name field updates name', function() {
    var updates = buildSaveUpdates('t1', 'name', '  New Name  ', currentDate);
    expect(updates.name).toBe('New Name');
  });

  test('name field trims whitespace, defaults to Untitled', function() {
    var updates = buildSaveUpdates('t1', 'name', '   ', currentDate);
    expect(updates.name).toBe('Untitled');
  });

  test('time field builds scheduledTime update', function() {
    var task = { id: 't1', scheduledTime: null };
    var update = buildTimeUpdate(task, '14:30', currentDate);
    expect(update.scheduledTime).toBe('2026-07-21T14:30');
  });

  test('time field removes time when value empty', function() {
    var task = { id: 't1', scheduledTime: '2026-07-21T14:30' };
    var update = buildTimeUpdate(task, '', currentDate);
    expect(update.scheduledTime).toBe('2026-07-21');
  });

  test('recurrence field updates recurrence', function() {
    var updates = buildSaveUpdates('t1', 'recurrence', 'daily', currentDate);
    expect(updates.recurrence).toBe('daily');
  });

  test('durationStart field updates durationStart', function() {
    var updates = buildSaveUpdates('t1', 'durationStart', '2026-08-01', currentDate);
    expect(updates.durationStart).toBe('2026-08-01');
  });

  test('durationEnd field updates durationEnd', function() {
    var updates = buildSaveUpdates('t1', 'durationEnd', '2026-08-15', currentDate);
    expect(updates.durationEnd).toBe('2026-08-15');
  });

});
