/* ── Goals Table ── */

var goalsData = [];
var tasksData = [];
var expandedGoalId = null;
var editingGoalId = null;
var isAddingGoal = false;
var _deleteGoalId = null;

/* ── LocalStorage helpers for goal tasks (backend ignores tasks field) ── */
function getGoalTasksKey(goalId) { return 'goalTasks_' + goalId; }

function loadGoalTasks(goalId) {
  try { return JSON.parse(localStorage.getItem(getGoalTasksKey(goalId))) || []; }
  catch(e) { return []; }
}

function saveGoalTasks(goalId, tasks) {
  try { localStorage.setItem(getGoalTasksKey(goalId), JSON.stringify(tasks)); } catch(e) {}
}

function formatGoalDate(dateStr) {
  if (!dateStr) return '-';
  var parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' });
}

function todayISO() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

async function loadGoalsData() {
  var results = await Promise.all([window.db.getGoals(), window.db.getTasks()]);
  goalsData = results[0] || [];
  tasksData = results[1] || [];
  // Merge tasks from localStorage
  for (var gi = 0; gi < goalsData.length; gi++) {
    var g = goalsData[gi];
    var stored = loadGoalTasks(g.id);
    if (stored.length > 0) g.tasks = stored;
    else if (!g.tasks) g.tasks = [];
  }
}

function computeGoalProgress(goalId, childMap, taskMap, cache) {
  if (cache[goalId] !== undefined) return cache[goalId];
  var myTasks = taskMap[goalId] || [];
  var myChildren = childMap[goalId] || [];
  var taskDone = myTasks.filter(function(t) { return t.completed; }).length;
  var taskRatio = myTasks.length > 0 ? taskDone / myTasks.length : -1;
  var childRatios = [];
  for (var cgi = 0; cgi < myChildren.length; cgi++) {
    childRatios.push(computeGoalProgress(myChildren[cgi].id, childMap, taskMap, cache));
  }
  var childAvg = childRatios.length > 0 ? childRatios.reduce(function(a,b){return a+b;}, 0) / childRatios.length : -1;
  var result;
  if (taskRatio >= 0 && childAvg >= 0) result = (taskRatio + childAvg) / 2;
  else if (taskRatio >= 0) result = taskRatio;
  else if (childAvg >= 0) result = childAvg;
  else result = 0;
  cache[goalId] = result;
  return result;
}

function getStatusLabel(status) {
  if (status === 'done') return 'تم';
  if (status === 'cancelled') return 'ملغي';
  return 'جاري';
}

function getStatusClass(status) {
  if (status === 'done') return 'goal-status-done';
  if (status === 'cancelled') return 'goal-status-cancelled';
  return 'goal-status-active';
}

function formatDuration(g) {
  var type = g.durationType || 'months';
  var val = g.durationValue || 1;
  if (type === 'days') return val + ' أيام';
  if (type === 'weeks') return val + ' أسبوع';
  if (type === 'months') return val + ' شهر';
  if (type === 'custom') return val + ' يوم';
  return '-';
}

/* ── Render ── */

window.renderGoals = async function() {
  await loadGoalsData();
  var tbody = document.getElementById('goalsTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (goalsData.length === 0 && !isAddingGoal) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#9ca3af;font-size:14px">لا توجد أهداف. اضغط + لإضافة هدف</td></tr>';
    return;
  }

  // Build child/task maps for progress
  var childMap = {};
  var taskMap = {};
  for (var rgi = 0; rgi < goalsData.length; rgi++) {
    var pg = goalsData[rgi];
    if (pg.parentGoalId) {
      if (!childMap[pg.parentGoalId]) childMap[pg.parentGoalId] = [];
      childMap[pg.parentGoalId].push(pg);
    }
  }
  for (var rgi2 = 0; rgi2 < tasksData.length; rgi2++) {
    var pt = tasksData[rgi2];
    if (pt.goalId) {
      if (!taskMap[pt.goalId]) taskMap[pt.goalId] = [];
      taskMap[pt.goalId].push(pt);
    }
  }
  var cache = {};
  var progressMap = {};
  for (var rgi3 = 0; rgi3 < goalsData.length; rgi3++) {
    progressMap[goalsData[rgi3].id] = Math.round(computeGoalProgress(goalsData[rgi3].id, childMap, taskMap, cache) * 100);
  }

  // Add row (if adding)
  if (isAddingGoal) {
    tbody.appendChild(createAddRow());
  }

  // Goal rows
  for (var i = 0; i < goalsData.length; i++) {
    var g = goalsData[i];
    if (g.parentGoalId) continue; // only top-level goals
    var progress = progressMap[g.id] || 0;
    var isExpanded = expandedGoalId === g.id;
    var isEditing = editingGoalId === g.id;

    if (isEditing) {
      tbody.appendChild(createEditRow(g));
    } else {
      tbody.appendChild(createDisplayRow(g, progress));
    }

    if (isExpanded) {
      tbody.appendChild(createTasksRow(g));
    }
  }
};

function createDisplayRow(g, progress) {
  var tr = document.createElement('tr');
  tr.className = expandedGoalId === g.id ? 'goal-row-expanded' : '';

  var statusClass = getStatusClass(g.status || 'active');

  tr.innerHTML =
    '<td><span style="cursor:pointer;font-weight:500" onclick="toggleGoalExpand(\'' + g.id + '\')">' + escapeHtml(g.name) + '</span></td>' +
    '<td>' + formatDuration(g) + '</td>' +
    '<td>' + formatGoalDate(g.startDate) + '</td>' +
    '<td>' + formatGoalDate(g.endDate) + '</td>' +
    '<td><span style="display:flex;align-items:center;gap:6px"><span class="goal-progress-text">' + progress + '%</span><span class="goal-progress-bar"><span class="goal-progress-fill" style="width:' + progress + '%;background:' + (g.color || '#3b82f6') + '"></span></span></span></td>' +
    '<td><span class="goal-status-badge ' + statusClass + '">' + getStatusLabel(g.status) + '</span></td>' +
    '<td><span class="goal-action-btn" onclick="event.stopPropagation();editGoal(\'' + g.id + '\')" title="تعديل"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span></td>' +
    '<td><span class="goal-action-btn goal-action-del" onclick="event.stopPropagation();deleteGoal(\'' + g.id + '\')" title="حذف"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></span></td>';

  return tr;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function createAddRow() {
  var tr = document.createElement('tr');
  tr.innerHTML =
    '<td><input class="goal-inline-input" id="goalAddName" placeholder="اسم الهدف" style="width:140px"></td>' +
    '<td>' +
      '<select class="goal-inline-select" id="goalAddDurationType" onchange="onAddDurationChange()" style="width:90px">' +
        '<option value="weeks">أسبوع</option>' +
        '<option value="months">شهر</option>' +
        '<option value="days">أيام</option>' +
        '<option value="custom">مخصص</option>' +
      '</select>' +
      '<input class="goal-inline-input" id="goalAddDurationVal" type="number" min="1" value="1" style="width:50px;display:none;margin-top:4px">' +
    '</td>' +
    '<td><input class="goal-inline-input" id="goalAddStart" type="date" value="' + todayISO() + '" onchange="onAddDateChange()"></td>' +
    '<td><input class="goal-inline-input" id="goalAddEnd" type="date"></td>' +
    '<td colspan="4" style="display:flex;gap:8px;align-items:center">' +
      '<button class="goal-save-btn" onclick="saveNewGoal()">حفظ</button>' +
      '<button class="goal-cancel-btn" onclick="cancelAddGoal()">إلغاء</button>' +
    '</td>';
  return tr;
}

function createEditRow(g) {
  var durType = g.durationType || 'months';
  var durVal = g.durationValue || 1;
  var tr = document.createElement('tr');
  tr.innerHTML =
    '<td><input class="goal-inline-input" id="goalEditName" value="' + escapeHtml(g.name) + '" style="width:140px"></td>' +
    '<td>' +
      '<select class="goal-inline-select" id="goalEditDurationType" onchange="onEditDurationChange()" style="width:90px">' +
        '<option value="weeks"' + (durType === 'weeks' ? ' selected' : '') + '>أسبوع</option>' +
        '<option value="months"' + (durType === 'months' ? ' selected' : '') + '>شهر</option>' +
        '<option value="days"' + (durType === 'days' ? ' selected' : '') + '>أيام</option>' +
        '<option value="custom"' + (durType === 'custom' ? ' selected' : '') + '>مخصص</option>' +
      '</select>' +
      '<input class="goal-inline-input" id="goalEditDurationVal" type="number" min="1" value="' + durVal + '" style="width:50px;display:' + (durType === 'custom' ? 'inline-block' : 'none') + ';margin-top:4px">' +
    '</td>' +
    '<td><input class="goal-inline-input" id="goalEditStart" type="date" value="' + (g.startDate || '') + '"></td>' +
    '<td><input class="goal-inline-input" id="goalEditEnd" type="date" value="' + (g.endDate || '') + '"></td>' +
    '<td colspan="4" style="display:flex;gap:8px;align-items:center">' +
      '<button class="goal-save-btn" onclick="saveEditGoal(\'' + g.id + '\')">حفظ</button>' +
      '<button class="goal-cancel-btn" onclick="cancelEditGoal()">إلغاء</button>' +
    '</td>';
  return tr;
}

function createTasksRow(g) {
  var tr = document.createElement('tr');
  tr.className = 'goal-tasks-row';
  var td = document.createElement('td');
  td.colSpan = 8;

  var html = '<div class="goal-tasks-inner">';

  var tasks = g.tasks || [];
  for (var i = 0; i < tasks.length; i++) {
    var t = tasks[i];
    var name = t.name || '';
    html += '<div class="goal-task-item">';
    html += '<span class="goal-task-star' + (t.starred ? ' starred' : '') + '" onclick="toggleGoalTaskStar(\'' + g.id + '\',' + i + ')" title="أضف للمهام">';
    html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="' + (t.starred ? '#f59e0b' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    html += '</span>';
    if (!name) {
      html += '<input class="goal-inline-input goal-task-name-input" placeholder="اسم المهمة" onblur="saveGoalTaskName(\'' + g.id + '\',' + i + ',this.value)" autofocus>';
    } else {
      html += '<span>' + escapeHtml(name) + '</span>';
    }
    html += '<span class="goal-task-del" onclick="deleteGoalTask(\'' + g.id + '\',' + i + ')" title="حذف">';
    html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    html += '</span>';
    html += '</div>';
  }

  html += '<button class="goal-add-task-btn" onclick="addGoalTask(\'' + g.id + '\')">';
  html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>';
  html += '<span>إضافة مهمة</span>';
  html += '</button>';

  html += '</div>';
  td.innerHTML = html;
  tr.appendChild(td);
  return tr;
}

/* ── Duration helpers ── */

function computeDurationDays(type, value) {
  if (type === 'days') return value;
  if (type === 'weeks') return value * 7;
  if (type === 'months') return value * 30;
  if (type === 'custom') return value;
  return 1;
}

window.onAddDurationChange = function() {
  var type = document.getElementById('goalAddDurationType').value;
  var valInput = document.getElementById('goalAddDurationVal');
  var endInput = document.getElementById('goalAddEnd');
  var startInput = document.getElementById('goalAddStart');
  valInput.style.display = type === 'custom' ? 'inline-block' : 'none';
  if (type !== 'custom' && startInput.value) {
    var start = new Date(startInput.value);
    var n = parseInt(valInput.value) || 1;
    if (type === 'days') start.setDate(start.getDate() + n);
    else if (type === 'weeks') start.setDate(start.getDate() + n * 7);
    else if (type === 'months') start.setMonth(start.getMonth() + n);
    endInput.value = start.toISOString().split('T')[0];
  }
};

window.onAddDateChange = function() {
  onAddDurationChange();
};

window.onEditDurationChange = function() {
  var type = document.getElementById('goalEditDurationType').value;
  var valInput = document.getElementById('goalEditDurationVal');
  valInput.style.display = type === 'custom' ? 'inline-block' : 'none';
};

/* ── Actions ── */

window.openAddGoalRow = function() {
  isAddingGoal = true;
  editingGoalId = null;
  renderGoals();
  setTimeout(function() {
    var inp = document.getElementById('goalAddName');
    if (inp) inp.focus();
  }, 50);
};

window.cancelAddGoal = function() {
  isAddingGoal = false;
  renderGoals();
};

window.saveNewGoal = async function() {
  var name = document.getElementById('goalAddName').value.trim();
  if (!name) { document.getElementById('goalAddName').focus(); return; }

  var durationType = document.getElementById('goalAddDurationType').value;
  var durationVal = parseInt(document.getElementById('goalAddDurationVal').value) || 1;
  var startDate = document.getElementById('goalAddStart').value;
  var endDate = document.getElementById('goalAddEnd').value;

  if (!endDate && startDate) {
    var start = new Date(startDate);
    start.setDate(start.getDate() + computeDurationDays(durationType, durationVal));
    endDate = start.toISOString().split('T')[0];
  }

  var goal = {
    id: 'goal_' + Date.now(),
    name: name,
    color: '#3b82f6',
    startDate: startDate,
    endDate: endDate,
    duration: computeDurationDays(durationType, durationVal),
    durationType: durationType,
    durationValue: durationType === 'custom' ? durationVal : null,
    status: 'active',
    tasks: [],
    createdAt: new Date().toISOString()
  };

  var result = await window.db.createGoal(goal);
  if (result === false) { alert('فشل حفظ الهدف'); return; }
  isAddingGoal = false;
  renderGoals();
};

window.editGoal = function(id) {
  editingGoalId = id;
  isAddingGoal = false;
  renderGoals();
};

window.cancelEditGoal = function() {
  editingGoalId = null;
  renderGoals();
};

window.saveEditGoal = async function(id) {
  var name = document.getElementById('goalEditName').value.trim();
  if (!name) { document.getElementById('goalEditName').focus(); return; }

  var durationType = document.getElementById('goalEditDurationType').value;
  var durationVal = parseInt(document.getElementById('goalEditDurationVal').value) || 1;
  var startDate = document.getElementById('goalEditStart').value;
  var endDate = document.getElementById('goalEditEnd').value;

  // Get current goal for color
  var curGoal = null;
  for (var ci = 0; ci < goalsData.length; ci++) {
    if (goalsData[ci].id === id) { curGoal = goalsData[ci]; break; }
  }

  var updates = {
    name: name,
    color: (curGoal && curGoal.color) || '#3b82f6',
    duration: computeDurationDays(durationType, durationVal),
    startDate: startDate,
    endDate: endDate
  };

  var result = await window.db.updateGoal(id, updates);
  if (result === false) { alert('فشل تعديل الهدف'); return; }
  editingGoalId = null;
  renderGoals();
};

window.deleteGoal = function(id) {
  _deleteGoalId = id;
  var msgEl = document.getElementById('delete-confirm-msg');
  if (msgEl) msgEl.textContent = 'هل أنت متأكد من حذف هذا الهدف؟';
  var modal = document.getElementById('delete-confirm-modal');
  if (modal) modal.classList.add('open');
};

window.closeDeleteConfirmModal = function() {
  _deleteGoalId = null;
  var modal = document.getElementById('delete-confirm-modal');
  if (modal) modal.classList.remove('open');
};

/* ── Expand / Tasks ── */

window.toggleGoalExpand = function(id) {
  expandedGoalId = expandedGoalId === id ? null : id;
  renderGoals();
};

window.addGoalTask = function(goalId) {
  for (var i = 0; i < goalsData.length; i++) {
    if (goalsData[i].id === goalId) {
      if (!goalsData[i].tasks) goalsData[i].tasks = [];
      goalsData[i].tasks.push({ name: '', starred: false });
      saveGoalTasks(goalId, goalsData[i].tasks);
      expandedGoalId = goalId;
      renderGoals();
      setTimeout(function() {
        var inputs = document.querySelectorAll('.goal-task-name-input');
        if (inputs.length > 0) inputs[inputs.length - 1].focus();
      }, 50);
      return;
    }
  }
};

window.deleteGoalTask = function(goalId, taskIndex) {
  for (var i = 0; i < goalsData.length; i++) {
    if (goalsData[i].id === goalId && goalsData[i].tasks) {
      goalsData[i].tasks.splice(taskIndex, 1);
      saveGoalTasks(goalId, goalsData[i].tasks);
      renderGoals();
      return;
    }
  }
};

window.toggleGoalTaskStar = function(goalId, taskIndex) {
  for (var i = 0; i < goalsData.length; i++) {
    if (goalsData[i].id === goalId && goalsData[i].tasks) {
      goalsData[i].tasks[taskIndex].starred = !goalsData[i].tasks[taskIndex].starred;
      saveGoalTasks(goalId, goalsData[i].tasks);
      renderGoals();
      return;
    }
  }
};

window.saveGoalTaskName = function(goalId, taskIndex, name) {
  for (var i = 0; i < goalsData.length; i++) {
    if (goalsData[i].id === goalId && goalsData[i].tasks) {
      goalsData[i].tasks[taskIndex].name = name.trim();
      saveGoalTasks(goalId, goalsData[i].tasks);
      renderGoals();
      return;
    }
  }
};

/* ── Direct delete handler (called from onclick on modal button) ── */
window.confirmDeleteGoal = async function() {
  if (!_deleteGoalId) return;
  var id = _deleteGoalId;
  _deleteGoalId = null;
  closeDeleteConfirmModal();
  var result = await window.db.deleteGoal(id);
  if (result === false) { alert('فشل حذف الهدف'); }
  renderGoals();
};

/* ── Event handlers ── */

// Delete confirmation
document.addEventListener('click', function(e) {
  var cancelBtn = e.target.closest('.btn-confirm-cancel');
  if (cancelBtn) {
    closeDeleteConfirmModal();
    return;
  }
});

// Click outside to cancel add/edit
document.addEventListener('click', function(e) {
  if (isAddingGoal || editingGoalId) {
    var table = document.getElementById('goalsTable');
    if (table && !table.contains(e.target)) {
      isAddingGoal = false;
      editingGoalId = null;
      renderGoals();
    }
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (isAddingGoal || editingGoalId) {
      isAddingGoal = false;
      editingGoalId = null;
      renderGoals();
    }
  }
  if (e.key === 'Enter') {
    if (isAddingGoal) { e.preventDefault(); saveNewGoal(); }
    else if (editingGoalId) { e.preventDefault(); saveEditGoal(editingGoalId); }
  }
});
