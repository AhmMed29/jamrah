function newTaskId() {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

/* ── State ── */
var _currentDate = new Date();
var _filterMode = 'all'; // all | active | completed
var _viewMode = 'daily'; // daily | archive
var _selectedId = null;
var _showNewOptions = false;
var _newCustomDays = [];
var _expandedTasks = {};

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

function closeOnOutsideClick(refEl, closeFn) {
  function handler(e) {
    if (refEl && !refEl.contains(e.target)) { closeFn(); document.removeEventListener('mousedown', handler); }
  }
  setTimeout(function() { document.addEventListener('mousedown', handler); }, 0);
}

function renderCustomDaysPanel(days, onChange, idSuffix) {
  var idS = idSuffix || '';
  var html = '<div class="custom-days-panel" id="customDaysPanel' + idS + '">';
  for (var i = 0; i < 7; i++) {
    var active = days.indexOf(i) >= 0;
    html += '<div class="custom-day-btn' + (active ? ' active' : '') + '" data-day="' + i + '" onclick="event.stopPropagation();window._toggleCustomDayBtn(' + i + ',\'' + idS + '\')">' + DAY_NAMES[i][0] + '</div>';
  }
  html += '</div>';
  return html;
}

window._toggleCustomDayBtn = function(day, idS) {
  var panel = document.getElementById('customDaysPanel' + idS);
  if (!panel) return;
  var btns = panel.querySelectorAll('.custom-day-btn');
  var days = [];
  btns.forEach(function(b) {
    var d = parseInt(b.getAttribute('data-day'));
    if (d === day) b.classList.toggle('active');
    if (b.classList.contains('active')) days.push(d);
  });
  days.sort(function(a,b){return a-b});
  if (idS === '_new') {
    _newCustomDays = days;
  } else if (idS === '_detail' && _selectedId) {
    window.db.updateTask(_selectedId, { customDays: JSON.stringify(days) }).then(function() { window.renderTasks(); });
  }
};

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

/* ── Render ── */
window.renderTasks = function() {
  window.db.getTasks().then(function(tasks) {
    if (!tasks || !tasks.length) { tasks = []; }
    renderHeaderDate();
    renderTaskList(tasks);
    if (_selectedId) {
      var t = tasks.find(function(x) { return x.id === _selectedId; });
      if (t) renderDetailPanel(t, tasks);
      else { _selectedId = null; renderDetailEmpty(); }
    } else {
      renderDetailEmpty();
    }
  });
};

function renderHeaderDate() {
  var dnEl = document.getElementById('tasks-day-name');
  var ddEl = document.getElementById('tasks-date-display');
  var todayBtn = document.getElementById('tasks-today-btn');
  if (!dnEl || !ddEl) return;
  if (_viewMode === 'archive') {
    dnEl.textContent = 'Archive';
    ddEl.textContent = '';
    if (todayBtn) todayBtn.style.display = 'none';
    return;
  }
  var day = _currentDate.getDate();
  var month = MONTH_NAMES[_currentDate.getMonth()];
  var year = _currentDate.getFullYear();
  dnEl.textContent = DAY_NAMES[_currentDate.getDay()];
  ddEl.textContent = month + ' ' + day + ', ' + year;
  if (todayBtn) {
    todayBtn.style.display = isToday(_currentDate) ? 'none' : 'inline';
  }
}

function renderTaskList(tasks) {
  var listEl = document.getElementById('tasks-list');
  if (!listEl) return;

  var dayKey = dateKey(_currentDate);
  var filtered = tasks;

  if (_viewMode === 'daily') {
    filtered = tasks.filter(function(t) {
      var taskDate = t.scheduledTime || t.createdAt;
      return taskDate ? taskDate.substring(0, 10) === dayKey : dayKey === dateKey(new Date());
    });
    if (_filterMode === 'active') filtered = filtered.filter(function(t) { return !t.completed; });
    else if (_filterMode === 'completed') filtered = filtered.filter(function(t) { return t.completed; });
  }

  if (_viewMode === 'archive') {
    var groups = {};
    tasks.forEach(function(t) {
      var dk = (t.scheduledTime || t.createdAt || '').substring(0, 10);
      if (!dk) dk = dateKey(new Date());
      if (!groups[dk]) groups[dk] = [];
      groups[dk].push(t);
    });
    var sortedDates = Object.keys(groups).sort().reverse();
    var html = '';
    sortedDates.forEach(function(dk) {
      html += '<div class="archive-date-header">' + formatArchiveDate(dk) + '</div>';
      groups[dk].forEach(function(t) {
        html += renderTaskItem(t, tasks);
      });
    });
    if (!sortedDates.length) html = '<div class="no-tasks-msg">No tasks.</div>';
    listEl.innerHTML = html;
    return;
  }

  if (!filtered.length) {
    listEl.innerHTML = '<div class="no-tasks-msg">No tasks.</div>';
    return;
  }
  var html = '';
  filtered.forEach(function(t) { html += renderTaskItem(t, tasks); });
  listEl.innerHTML = html;
}

function formatArchiveDate(dk) {
  var parts = dk.split('-');
  if (parts.length !== 3) return dk;
  var d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
  return DAY_NAMES[d.getDay()] + ', ' + MONTH_NAMES[d.getMonth()] + ' ' + parseInt(parts[2]);
}

function renderTaskItem(t, allTasks) {
  var isSelected = t.id === _selectedId;
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
  var isExpanded = _expandedTasks[t.id];

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
        html += '<div style="padding-left:36px">' + renderTaskItem(st, allTasks) + '</div>';
      }
    });
  }

  return html;
}

window.toggleExpanded = function(id) {
  if (_expandedTasks[id]) { delete _expandedTasks[id]; }
  else { _expandedTasks[id] = true; }
  window.renderTasks();
};

/* ── Detail Panel ── */
window.selectTask = function(id) {
  _selectedId = id;
  document.querySelectorAll('.task-item').forEach(function(el) {
    el.classList.toggle('selected', el.getAttribute('data-task-id') === id);
  });
  window.db.getTasks().then(function(tasks) {
    var t = tasks.find(function(x) { return x.id === id; });
    if (t) renderDetailPanel(t, tasks);
  });
};

function renderDetailEmpty() {
  var panel = document.getElementById('task-detail-panel');
  if (!panel) return;
  panel.innerHTML = '<div class="task-detail-empty">Select a task to view and edit</div>';
}

function renderDetailPanel(task, allTasks) {
  var panel = document.getElementById('task-detail-panel');
  if (!panel) return;

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

    /* Priority selector */
    '<div class="detail-field-label">Priority</div>' +
    '<div class="detail-priority-row" id="detail-priority-row">' +
      '<button class="detail-prio-btn' + ((!task.priority || task.priority === 'none' || task.priority === 'None') ? ' active' : '') + '" onclick="changePriority(\'' + escapeHtml(task.id) + '\',\'none\')"><span class="detail-prio-dot" style="background:#d1d5db"></span> None</button>' +
      '<button class="detail-prio-btn' + (task.priority === 'Low' ? ' active' : '') + '" onclick="changePriority(\'' + escapeHtml(task.id) + '\',\'Low\')"><span class="detail-prio-dot" style="background:#9ca3af"></span> Low</button>' +
      '<button class="detail-prio-btn' + (task.priority === 'Medium' ? ' active' : '') + '" onclick="changePriority(\'' + escapeHtml(task.id) + '\',\'Medium\')"><span class="detail-prio-dot" style="background:#10b981"></span> Medium</button>' +
      '<button class="detail-prio-btn' + (task.priority === 'High' ? ' active' : '') + '" onclick="changePriority(\'' + escapeHtml(task.id) + '\',\'High\')"><span class="detail-prio-dot" style="background:#ef4444"></span> High</button>' +
    '</div>' +

    '<div style="margin-top:24px">' +
    '<div class="detail-grid-2">' +
      /* Schedule */
      '<div><div class="detail-field-label">Schedule</div>' +
        '<input type="time" class="detail-input" value="' + ((task.scheduledTime || '').split('T')[1] || '') + '" onblur="saveDetailField(\'' + escapeHtml(task.id) + '\',\'time\',this.value)" />' +
      '</div>' +
      /* Repeat */
      '<div class="detail-repeat-wrap" style="position:relative"><div class="detail-field-label">Repeat</div>' +
        '<select class="detail-input" onchange="detailRepeatChange(\'' + escapeHtml(task.id) + '\',this.value)" style="cursor:pointer">' +
          '<option value="none"' + ((!task.recurrence || task.recurrence === 'none') ? ' selected' : '') + '>None</option>' +
          '<option value="daily"' + (task.recurrence === 'daily' ? ' selected' : '') + '>Daily</option>' +
          '<option value="weekly"' + (task.recurrence === 'weekly' ? ' selected' : '') + '>Weekly</option>' +
          '<option value="monthly"' + (task.recurrence === 'monthly' ? ' selected' : '') + '>Monthly</option>' +
          '<option value="custom"' + (task.recurrence === 'custom' ? ' selected' : '') + '>Custom</option>' +
        '</select>' +
        (task.recurrence === 'custom' ? renderCustomDaysPanel(parseCustomDays(task.customDays), null, '_detail') : '') +
      '</div>' +
    '</div>' +
    '</div>' +

    /* Duration */
    '<div style="margin-top:24px">' +
    '<div class="detail-field-label">Duration</div>' +
    '<div class="detail-grid-2">' +
      '<input type="date" class="detail-input" value="' + (task.durationStart || '') + '" placeholder="Start" onblur="saveDetailField(\'' + escapeHtml(task.id) + '\',\'durationStart\',this.value)" />' +
      '<input type="date" class="detail-input" value="' + (task.durationEnd || '') + '" placeholder="End" onblur="saveDetailField(\'' + escapeHtml(task.id) + '\',\'durationEnd\',this.value)" />' +
    '</div>' +
    '</div>' +

    /* Notes */
    '<div style="margin-top:24px">' +
    '<div class="detail-field-label">Notes</div>' +
    '<textarea class="detail-input detail-textarea" placeholder="Write notes here..." onblur="saveDetailNote(\'' + escapeHtml(task.id) + '\',this.value)">' + escapeHtml(task.notes || '') + '</textarea>' +
    '</div>' +

    /* Subtasks */
    '<div class="detail-subtasks-section">' +
    '<div class="detail-field-label">Subtasks</div>' +
    (subHtml || '<div style="color:rgba(45,45,45,0.4);font-size:14px;margin-bottom:8px">No subtasks.</div>') +
    '<div style="display:flex;gap:8px">' +
      '<input type="text" id="detail-sub-input" class="detail-input" placeholder="Add subtask..." style="padding:8px 12px;font-size:16px" onkeydown="if(event.key===\'Enter\')addDetailSubtask(\'' + escapeHtml(task.id) + '\')" />' +
      '<button onclick="addDetailSubtask(\'' + escapeHtml(task.id) + '\')" style="border-radius:8px;background:#2d2d2d;color:#fff;padding:6px 16px;font-size:16px;border:none;cursor:pointer;font-family:\'Patrick Hand\',cursive">+ Add</button>' +
    '</div>' +
    '</div>' +

    /* Delete */
    '<div style="margin-top:32px">' +
    '<button class="detail-delete-btn" onclick="window.deleteTask(\'' + escapeHtml(task.id) + '\')">' +
      '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>' +
      ' Delete task' +
    '</button>' +
    '</div>' +

  '</div>';

  panel.innerHTML = panelHtml;
}

/* ── Detail Save Helpers ── */
window.saveDetailField = function(id, field, value) {
  var updates = {};
  if (field === 'name') { updates.name = value.trim() || 'Untitled'; }
  else if (field === 'time') {
    window.db.getTasks().then(function(tasks) {
      var t = tasks.find(function(x) { return x.id === id; });
      if (!t) return;
      var sched = t.scheduledTime || dateKey(_currentDate) + 'T00:00';
      if (value) { sched = sched.split('T')[0] + 'T' + value; }
      else { sched = sched.split('T')[0]; }
      window.db.updateTask(id, { scheduledTime: sched }).then(function() { window.renderTasks(); });
    });
    return;
  }
  else if (field === 'recurrence') { updates.recurrence = value; }
  else if (field === 'durationStart') { updates.durationStart = value; }
  else if (field === 'durationEnd') { updates.durationEnd = value; }
  else if (field === 'customDays') { updates.customDays = value; }
  window.db.updateTask(id, updates).then(function() { window.renderTasks(); });
};

window.saveDetailNote = function(id, val) {
  var clean = val.trim();
  window.db.getTasks().then(function(tasks) {
    var t = tasks.find(function(x) { return x.id === id; });
    if (!t) return;
    window.db.updateTask(id, { notes: clean }).then(function() {});
    // Also save to .md file
    try {
      window.db.getPath().then(function(p) {
        if (!p) return;
        var notePath = p + '/notes/task_' + id + '.md';
        window.electronAPI.writeFile(notePath, clean);
      });
    } catch(e) {}
  });
};

window.changePriority = function(id, prio) {
  window.db.updateTask(id, { priority: prio }).then(function() { window.renderTasks(); });
};

window.detailRepeatChange = function(id, val) {
  window.db.getTasks().then(function(tasks) {
    var t = tasks.find(function(x) { return x.id === id; });
    if (!t) return;
    var customDays = (val === 'custom') ? (parseCustomDays(t.customDays).length ? t.customDays : JSON.stringify([0,1,2,3,4,5,6])) : '';
    window.db.updateTask(id, { recurrence: val, customDays: customDays }).then(function() { window.renderTasks(); });
  });
};

window.closeDetail = function() {
  _selectedId = null;
  document.querySelectorAll('.task-item').forEach(function(el) { el.classList.remove('selected'); });
  renderDetailEmpty();
};

window.addDetailSubtask = function(parentId) {
  var input = document.getElementById('detail-sub-input');
  if (!input || !input.value.trim()) return;
  var name = input.value.trim();
  var task = { id: newTaskId(), name: name, parentTaskId: parentId, priority: 'Medium' };
  window.db.createTask(task).then(function() {
    input.value = '';
    window.renderTasks();
    window.selectTask(parentId);
  });
};

/* ── Toggle / Delete ── */
window.toggleTask = function(current, id) {
  window.db.toggleTask(id).then(function() { window.renderTasks(); });
};

window.deleteTask = function(id) {
  window.db.deleteTask(id).then(function() {
    if (_selectedId === id) { _selectedId = null; }
    delete _expandedTasks[id];
    window.renderTasks();
  });
};

/* ── New Task (inline) ── */
function initNewTaskEvents() {
  var toggleBtn = document.getElementById('tasks-new-toggle');
  var addBtn = document.getElementById('tasks-new-add');
  var input = document.getElementById('tasks-new-input');
  var recSelect = document.getElementById('tasks-new-recurrence');
  if (toggleBtn) toggleBtn.addEventListener('click', function() {
    _showNewOptions = !_showNewOptions;
    var opts = document.getElementById('tasks-new-options');
    if (opts) opts.style.display = _showNewOptions ? 'block' : 'none';
    toggleBtn.style.background = _showNewOptions ? '#2d2d2d' : '#faf9f7';
    toggleBtn.querySelector('svg').style.stroke = _showNewOptions ? '#fff' : '#2d2d2d';
  });
  if (addBtn) addBtn.addEventListener('click', addNewTask);
  if (input) input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') addNewTask();
  });
  if (recSelect) recSelect.addEventListener('change', function() {
    var customPanel = document.getElementById('customDaysPanel_new');
    var existing = document.querySelector('.custom-days-panel');
    if (existing && existing.id !== 'customDaysPanel_new') existing.remove();
    if (this.value === 'custom') {
      if (customPanel) customPanel.remove();
      _newCustomDays = [];
      var wrap = document.getElementById('tasks-new-recurrence').parentNode;
      if (wrap) {
        var div = document.createElement('div');
        div.innerHTML = renderCustomDaysPanel(_newCustomDays, null, '_new');
        wrap.appendChild(div.firstElementChild);
        closeOnOutsideClick(div.firstElementChild, function() {
          var p = document.getElementById('customDaysPanel_new');
          if (p) p.remove();
        });
      }
    } else {
      if (customPanel) customPanel.remove();
      _newCustomDays = [];
    }
  });
}

function addNewTask() {
  var input = document.getElementById('tasks-new-input');
  if (!input || !input.value.trim()) return;
  var name = input.value.trim();
  var id = newTaskId();
  var dateStr = dateKey(_currentDate);
  var timeVal = document.getElementById('tasks-new-time') ? document.getElementById('tasks-new-time').value : '';
  var recVal = document.getElementById('tasks-new-recurrence') ? document.getElementById('tasks-new-recurrence').value : 'none';
  var scheduledTime = dateStr + (timeVal ? 'T' + timeVal : '');
  var customDays = (recVal === 'custom' && _newCustomDays.length) ? JSON.stringify(_newCustomDays) : '';

  var task = {
    id: id,
    name: name,
    priority: document.getElementById('tasks-new-priority') ? document.getElementById('tasks-new-priority').value : 'none',
    scheduledTime: (timeVal || recVal !== 'none') ? scheduledTime : dateStr,
    recurrence: recVal,
    customDays: customDays,
    createdAt: new Date().toISOString()
  };

  input.value = '';
  _newCustomDays = [];
  var optEl = document.getElementById('tasks-new-options');
  if (optEl) optEl.style.display = 'none';
  _showNewOptions = false;

  window.db.createTask(task).then(function(result) {
    if (result === false) { alert('Failed to save task'); return; }
    if (_viewMode === 'archive') { _viewMode = 'daily'; }
    window.renderTasks();
    _selectedId = id;
  });
}

/* ── Header Events ── */
function initHeaderEvents() {
  var prevBtn = document.getElementById('tasks-prev-day');
  var nextBtn = document.getElementById('tasks-next-day');
  var todayBtn = document.getElementById('tasks-today-btn');
  var filterBtn = document.getElementById('tasks-filter-btn');
  var archiveBtn = document.getElementById('tasks-archive-btn');

  if (prevBtn) prevBtn.addEventListener('click', function() {
    if (_viewMode === 'archive') return;
    _currentDate.setDate(_currentDate.getDate() - 1);
    window.renderTasks();
  });
  if (nextBtn) nextBtn.addEventListener('click', function() {
    if (_viewMode === 'archive') return;
    _currentDate.setDate(_currentDate.getDate() + 1);
    window.renderTasks();
  });
  if (todayBtn) todayBtn.addEventListener('click', function() {
    _currentDate = new Date();
    window.renderTasks();
  });
  if (filterBtn) filterBtn.addEventListener('click', function() {
    if (_viewMode === 'daily') {
      if (_filterMode === 'all') _filterMode = 'active';
      else if (_filterMode === 'active') _filterMode = 'completed';
      else _filterMode = 'all';
      filterBtn.textContent = _filterMode;
      window.renderTasks();
    }
  });
  if (archiveBtn) archiveBtn.addEventListener('click', function() {
    if (_viewMode === 'daily') {
      _viewMode = 'archive';
      archiveBtn.querySelector('span').textContent = 'Daily';
      window.renderTasks();
    } else {
      _viewMode = 'daily';
      archiveBtn.querySelector('span').textContent = 'Archive';
      window.renderTasks();
    }
  });
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', function() {
  initNewTaskEvents();
  initHeaderEvents();
});

/* ── 5-min OS Reminders ── */
var _notifiedTasks = new Set();
setInterval(function() {
  if (!window.db || !window.db.getTasks) return;
  window.db.getTasks().then(function(tasks) {
    if (!tasks) return;
    var now = Date.now();
    tasks.forEach(function(t) {
      if (!t.completed && t.scheduledTime && !_notifiedTasks.has(t.id)) {
        var sched = new Date(t.scheduledTime).getTime();
        if (sched > now - 60000 && sched <= now + 300000) {
          _notifiedTasks.add(t.id);
          if (Notification.permission === 'granted') {
            new Notification('Task Reminder', { body: 'Upcoming in 5 mins: ' + t.name });
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(function(p) {
              if (p === 'granted') new Notification('Task Reminder', { body: 'Upcoming in 5 mins: ' + t.name });
            });
          }
        }
      }
    });
  });
}, 60000);

if (typeof Notification !== 'undefined' && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
  Notification.requestPermission();
}

/* ── Goal Tasks Popup (kept) ── */
window.openGoalsTaskPopup = function() {
  var popup = document.getElementById('goals-task-popup');
  popup.style.display = 'flex';
  var tree = document.getElementById('goals-task-tree');
  tree.innerHTML = '<div class="text-center py-8 text-gray-400">Loading...</div>';
  Promise.all([window.db.getGoals(), window.db.getTasks()]).then(function(results) {
    var goals = results[0] || [];
    var allTasks = results[1] || [];
    var childMap = {};
    var taskMap = {};
    for (var ogi = 0; ogi < goals.length; ogi++) {
      if (goals[ogi].parentGoalId) {
        if (!childMap[goals[ogi].parentGoalId]) childMap[goals[ogi].parentGoalId] = [];
        childMap[goals[ogi].parentGoalId].push(goals[ogi]);
      }
    }
    for (var oti = 0; oti < allTasks.length; oti++) {
      if (allTasks[oti].goalId) {
        if (!taskMap[allTasks[oti].goalId]) taskMap[allTasks[oti].goalId] = [];
        taskMap[allTasks[oti].goalId].push(allTasks[oti]);
      }
    }
    var pgCache = {};
    function nodeProgress(id) {
      if (window.computeGoalProgress) {
        return Math.round(window.computeGoalProgress(id, childMap, taskMap, pgCache) * 100);
      }
      return 0;
    }
    function renderNode(g, depth) {
      var kids = childMap[g.id] || [];
      var myTasks = taskMap[g.id] || [];
      var hasKids = kids.length > 0;
      var hasTasks = myTasks.length > 0;
      var h = '<div class="gt-node" data-id="' + g.id + '">';
      h += '<div class="gt-row" style="padding-left:' + (depth * 20 + 8) + 'px" onclick="window.toggleGoalsTaskNode(event,\'' + g.id + '\')">';
      if (hasKids || hasTasks) {
        h += '<span class="gt-chevron" id="gt-cv-' + g.id + '"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="M9 6l6 6-6 6"/></svg></span>';
      } else {
        h += '<span class="gt-chevron gt-chevron-empty"></span>';
      }
      h += '<span class="gt-dot" style="background:' + g.color + '"></span>';
      h += '<span class="gt-name">' + escapeHtml(g.name) + '</span>';
      h += '<span class="gt-progress" style="color:' + g.color + '">' + nodeProgress(g.id) + '%</span>';
      h += '</div>';
      h += '<div class="gt-children" id="gt-ch-' + g.id + '" style="display:none">';
      for (var oki = 0; oki < kids.length; oki++) {
        h += renderNode(kids[oki], depth + 1);
      }
      for (var oti2 = 0; oti2 < myTasks.length; oti2++) {
        var t = myTasks[oti2];
        var lbl = '';
        if (t.completed) { lbl = '<span class="gt-label gt-label-done">&#10003; Done</span>'; }
        else { lbl = '<span class="gt-label gt-label-added">&#10003; Added</span>'; }
        h += '<div class="gt-task" data-task-id="' + t.id + '" style="padding-left:' + ((depth + 1) * 20 + 28) + 'px">';
        h += '<span class="gt-task-dot"></span>';
        h += '<span class="gt-task-name">' + escapeHtml(t.name) + '</span>';
        h += lbl;
        h += '</div>';
      }
      h += '</div></div>';
      return h;
    }
    var goalHtml = '';
    for (var ogi2 = 0; ogi2 < goals.length; ogi2++) {
      if (!goals[ogi2].parentGoalId) {
        goalHtml += renderNode(goals[ogi2], 0);
      }
    }
    tree.innerHTML = goalHtml || '<div class="text-center py-8 text-gray-400">No goals yet. Create goals first!</div>';
  });
};

window.closeGoalsTaskPopup = function(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('goals-task-popup').style.display = 'none';
};

window.toggleGoalsTaskNode = function(e, id) {
  if (e) e.stopPropagation();
  var ch = document.getElementById('gt-ch-' + id);
  if (!ch) return;
  ch.style.display = ch.style.display === 'none' ? 'block' : 'none';
};