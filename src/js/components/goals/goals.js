/* ── Goals Table ── */

var goalsData = [];
var tasksData = [];
var expandedGoalId = null;
var editingGoalId = null;
var isAddingGoal = false;
var _deleteGoalId = null;

function checkRtl(str) {
  var rtlRegex = /[\u0600-\u06FF]/;
  return rtlRegex.test(str || '');
}

/* ── DB helpers for goal tasks ── */

function formatGoalDate(dateStr) {
  if (!dateStr) return '-';
  var parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function todayISO() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

var goalsProgressData = {};

async function loadGoalsData() {
  var results = await Promise.all([window.db.getGoals(), window.db.getTasks()]);
  goalsData = results[0] || [];
  tasksData = results[1] || [];
  goalsProgressData = {};
  for (var i = 0; i < goalsData.length; i++) {
    var p = await window.db.getGoalProgress(goalsData[i].id);
    goalsProgressData[goalsData[i].id] = p || [];
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
  if (status === 'done') return 'Done';
  if (status === 'cancelled') return 'Cancelled';
  return 'Active';
}

function getStatusClass(status) {
  if (status === 'done') return 'goal-status-done';
  if (status === 'cancelled') return 'goal-status-cancelled';
  return 'goal-status-active';
}

function formatDuration(g) {
  var type = g.durationType || 'months';
  var val = g.durationValue || 1;
  if (type === 'days') return val + (val === 1 ? ' day' : ' days');
  if (type === 'weeks') return val + (val === 1 ? ' week' : ' weeks');
  if (type === 'months') return val + (val === 1 ? ' month' : ' months');
  if (type === 'custom') return val + (val === 1 ? ' day' : ' days');
  return '-';
}

function renderGoalHeatmap(g) {
  // Generate last 28 days
  var days = [];
  var today = new Date();
  today.setHours(0,0,0,0);
  for (var i = 27; i >= 0; i--) {
    var d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'));
  }
  
  var progMap = {};
  var records = goalsProgressData[g.id] || [];
  records.forEach(function(r) {
    if (r.date) progMap[r.date.split('T')[0]] = r.progressValue || r.focusMinutes; // simple presence
  });
  
  var html = '<div class="goal-heatmap" style="display:grid; grid-template-rows:repeat(7, 1fr); grid-auto-flow:column; gap:2px; height:44px; margin-top:8px;">';
  // To align days properly, GitHub heatmap starts on Sunday. For simplicity we just flow 4 columns of 7 days.
  days.forEach(function(d) {
    var hasProgress = progMap[d];
    var bg = hasProgress ? (g.color || '#3b82f6') : '#ebedf0';
    var op = hasProgress ? 'opacity: 1;' : 'opacity: 0.6;';
    html += '<div title="' + d + '" style="width:6px; height:6px; border-radius:1px; background:' + bg + '; ' + op + '"></div>';
  });
  html += '</div>';
  return html;
}

/* ── Render ── */

window.renderGoals = async function() {
  await loadGoalsData();
  var grid = document.getElementById('goalsGrid');
  if (!grid) return;

  grid.innerHTML = '';

  if (goalsData.length === 0 && !isAddingGoal) {
    grid.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding:40px; color:#9ca3af; font-size:14px">No goals yet. Click + to add a goal.</div>';
    return;
  }

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

  if (isAddingGoal) {
    grid.appendChild(createAddCard());
  }

  for (var i = 0; i < goalsData.length; i++) {
    var g = goalsData[i];
    if (g.parentGoalId) continue;
    var progress = progressMap[g.id] || 0;
    var isEditing = editingGoalId === g.id;

    if (isEditing) {
      grid.appendChild(createEditCard(g));
    } else {
      grid.appendChild(createDisplayCard(g, progress));
    }
  }
};

function createDisplayCard(g, progress) {
  var card = document.createElement('div');
  card.className = 'goal-card';
  
  var statusClass = getStatusClass(g.status || 'active');
  var dirAttr = checkRtl(g.name) ? ' dir="rtl" style="text-align:right;"' : ' dir="ltr" style="text-align:left;"';

  var html = '<div class="goal-card-header">';
  html += '<div class="goal-card-title-wrap" ' + dirAttr + '>';
  html += '<div class="goal-card-color-dot" style="background:' + (g.color || '#3b82f6') + '"></div>';
  html += '<div class="goal-card-title">' + escapeHtml(g.name) + '</div>';
  html += '</div>';
  html += '<div class="goal-card-actions">';
  html += '<button class="goal-card-btn" onclick="editGoal(\'' + g.id + '\')" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>';
  html += '<button class="goal-card-btn delete-btn" onclick="deleteGoal(\'' + g.id + '\')" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>';
  html += '</div>';
  html += '</div>';

  html += '<div class="goal-card-progress-wrap">';
  html += '<div class="goal-card-progress-header">';
  html += '<span class="goal-status-badge ' + statusClass + '">' + getStatusLabel(g.status) + '</span>';
  html += '<span>' + progress + '%</span>';
  html += '</div>';
  html += '<div class="goal-card-progress-bar"><div class="goal-card-progress-fill" style="width:' + progress + '%; background:' + (g.color || '#3b82f6') + '"></div></div>';
  html += renderGoalHeatmap(g);
  html += '</div>';

  html += '<div class="goal-card-meta">';
  html += '<div class="goal-card-meta-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' + formatGoalDate(g.startDate) + ' &rarr; ' + formatGoalDate(g.endDate) + '</div>';
  html += '<div class="goal-card-meta-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' + formatDuration(g) + '</div>';
  html += '</div>';

  html += '<div class="goal-card-tasks">';
  html += '<div class="goal-card-tasks-header">Tasks <button class="goal-add-task-inline" onclick="addGoalTask(\'' + g.id + '\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg> Add</button></div>';
  html += '<div class="goal-task-list">';
  
  var tasks = tasksData.filter(function(t) { return t.goalId === g.id && !t.parentTaskId; });
  if (tasks.length === 0) {
    html += '<div style="font-size:12px; color:#9ca3af; padding: 4px;">No tasks yet</div>';
  } else {
    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      var name = t.name || '';
      var isStarred = t.priority === 'high';
      var isCompleted = t.completed === 1;
      var tDirAttr = checkRtl(name) ? ' dir="rtl" style="text-align:right;"' : ' dir="ltr" style="text-align:left;"';
      
      html += '<div class="goal-task-item" ' + tDirAttr + '>';
      html += '<input type="checkbox" ' + (isCompleted ? 'checked' : '') + ' onchange="toggleGoalTaskCompletion(\'' + t.id + '\')" title="Toggle completion" style="cursor:pointer; width:14px; height:14px;">';
      html += '<span class="goal-task-star' + (isStarred ? ' starred' : '') + '" onclick="toggleGoalTaskStar(\'' + t.id + '\', \'' + t.priority + '\')" title="Toggle star">';
      html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="' + (isStarred ? '#f59e0b' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
      html += '</span>';
      
      // The task name input should directly update the task.
      html += '<input class="goal-task-name-input' + (isCompleted ? ' done' : '') + '" value="' + escapeHtml(name) + '" placeholder="Task name..." onblur="saveGoalTaskName(\'' + t.id + '\',this.value)">';
      
      html += '<span class="goal-task-del" onclick="deleteGoalTask(\'' + t.id + '\')" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></span>';
      html += '</div>';
    }
  }
  html += '</div></div>';

  card.innerHTML = html;
  return card;
}

function createAddCard() {
  var card = document.createElement('div');
  card.className = 'goal-card-form';
  card.innerHTML =
    '<div class="goal-form-field"><label class="goal-form-label">Goal Name</label><input class="goal-form-input" id="goalAddName" placeholder="What do you want to achieve?"></div>' +
    '<div class="goal-form-row">' +
      '<div class="goal-form-field"><label class="goal-form-label">Duration Type</label>' +
        '<select class="goal-form-select" id="goalAddDurationType" onchange="onAddDurationChange()">' +
          '<option value="weeks">Weeks</option>' +
          '<option value="months" selected>Months</option>' +
          '<option value="days">Days</option>' +
          '<option value="custom">Custom (Days)</option>' +
        '</select>' +
      '</div>' +
      '<div class="goal-form-field" id="goalAddDurationValWrap" style="display:none;"><label class="goal-form-label">Value</label><input class="goal-form-input" id="goalAddDurationVal" type="number" min="1" value="1"></div>' +
    '</div>' +
    '<div class="goal-form-row">' +
      '<div class="goal-form-field"><label class="goal-form-label">Start Date</label><input class="goal-form-input" id="goalAddStart" type="date" value="' + todayISO() + '" onchange="onAddDateChange()"></div>' +
      '<div class="goal-form-field"><label class="goal-form-label">End Date</label><input class="goal-form-input" id="goalAddEnd" type="date"></div>' +
    '</div>' +
    '<div class="goal-form-actions">' +
      '<button class="goal-cancel-btn" onclick="cancelAddGoal()">Cancel</button>' +
      '<button class="goal-save-btn" onclick="saveNewGoal()">Save Goal</button>' +
    '</div>';
  return card;
}

function createEditCard(g) {
  var durType = g.durationType || 'months';
  var durVal = g.durationValue || 1;
  var card = document.createElement('div');
  card.className = 'goal-card-form';
  card.innerHTML =
    '<div class="goal-form-field"><label class="goal-form-label">Goal Name</label><input class="goal-form-input" id="goalEditName" value="' + escapeHtml(g.name) + '"></div>' +
    '<div class="goal-form-row">' +
      '<div class="goal-form-field"><label class="goal-form-label">Duration Type</label>' +
        '<select class="goal-form-select" id="goalEditDurationType" onchange="onEditDurationChange()">' +
          '<option value="weeks"' + (durType === 'weeks' ? ' selected' : '') + '>Weeks</option>' +
          '<option value="months"' + (durType === 'months' ? ' selected' : '') + '>Months</option>' +
          '<option value="days"' + (durType === 'days' ? ' selected' : '') + '>Days</option>' +
          '<option value="custom"' + (durType === 'custom' ? ' selected' : '') + '>Custom (Days)</option>' +
        '</select>' +
      '</div>' +
      '<div class="goal-form-field" id="goalEditDurationValWrap" style="' + (durType === 'custom' ? '' : 'display:none;') + '"><label class="goal-form-label">Value</label><input class="goal-form-input" id="goalEditDurationVal" type="number" min="1" value="' + durVal + '"></div>' +
    '</div>' +
    '<div class="goal-form-row">' +
      '<div class="goal-form-field"><label class="goal-form-label">Start Date</label><input class="goal-form-input" id="goalEditStart" type="date" value="' + (g.startDate || '') + '"></div>' +
      '<div class="goal-form-field"><label class="goal-form-label">End Date</label><input class="goal-form-input" id="goalEditEnd" type="date" value="' + (g.endDate || '') + '"></div>' +
    '</div>' +
    '<div class="goal-form-actions">' +
      '<button class="goal-cancel-btn" onclick="cancelEditGoal()">Cancel</button>' +
      '<button class="goal-save-btn" onclick="saveEditGoal(\'' + g.id + '\')">Save Changes</button>' +
    '</div>';
  return card;
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
  var valWrap = document.getElementById('goalAddDurationValWrap');
  var valInput = document.getElementById('goalAddDurationVal');
  var endInput = document.getElementById('goalAddEnd');
  var startInput = document.getElementById('goalAddStart');
  if (valWrap) valWrap.style.display = type === 'custom' ? 'flex' : 'none';
  if (valInput) valInput.style.display = type === 'custom' ? 'inline-block' : 'none';
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
  var valWrap = document.getElementById('goalEditDurationValWrap');
  var valInput = document.getElementById('goalEditDurationVal');
  if (valWrap) valWrap.style.display = type === 'custom' ? 'flex' : 'none';
  if (valInput) valInput.style.display = type === 'custom' ? 'inline-block' : 'none';
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
  if (result === false) { alert('Failed to save goal'); return; }
  try {
    localStorage.setItem('goalDurationType_' + goal.id, durationType);
    localStorage.setItem('goalDurationValue_' + goal.id, String(durationVal));
  } catch(e) {}
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

  var curGoal = null;
  for (var ci = 0; ci < goalsData.length; ci++) {
    if (goalsData[ci].id === id) { curGoal = goalsData[ci]; break; }
  }

  var updates = {
    name: name,
    description: (curGoal && curGoal.description) || '',
    color: (curGoal && curGoal.color) || '#3b82f6',
    tagId: (curGoal && curGoal.tagId) || null,
    startDate: startDate,
    endDate: endDate,
    duration: computeDurationDays(durationType, durationVal),
    durationType: durationType,
    durationValue: durationType === 'custom' ? durationVal : null,
    parentGoalId: (curGoal && curGoal.parentGoalId) || null
  };

  var result = await window.db.updateGoal(id, updates);
  if (result === false) { alert('Failed to edit goal'); return; }

  try {
    localStorage.setItem('goalDurationType_' + id, durationType);
    localStorage.setItem('goalDurationValue_' + id, String(durationVal));
  } catch(e) {}

  editingGoalId = null;
  renderGoals();
};

window.deleteGoal = function(id) {
  _deleteGoalId = id;
  var msgEl = document.getElementById('delete-confirm-msg');
  if (msgEl) msgEl.textContent = 'Are you sure you want to delete this goal?';
  var modal = document.getElementById('delete-confirm-modal');
  if (modal) modal.classList.add('open');
};

window.closeDeleteConfirmModal = function() {
  _deleteGoalId = null;
  var modal = document.getElementById('delete-confirm-modal');
  if (modal) modal.classList.remove('open');
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.addGoalTask = async function(goalId) {
  var existingEmpty = tasksData.filter(function(t) {
    return t.goalId === goalId && (!t.name || t.name.trim() === '');
  });
  if (existingEmpty.length > 0) {
    expandedGoalId = goalId;
    await renderGoals();
    setTimeout(function() {
      var inputs = document.querySelectorAll('.goal-task-name-input');
      if (inputs.length > 0) inputs[inputs.length - 1].focus();
    }, 50);
    return;
  }
  var id = 'task_' + Date.now();
  await window.db.createTask({
    id: id,
    name: '',
    goalId: goalId
  });
  expandedGoalId = goalId;
  await renderGoals();
  setTimeout(function() {
    var inputs = document.querySelectorAll('.goal-task-name-input');
    if (inputs.length > 0) inputs[inputs.length - 1].focus();
  }, 50);
};

window.deleteGoalTask = async function(taskId) {
  await window.db.deleteTask(taskId);
  renderGoals();
};

window.toggleGoalTaskStar = async function(taskId, currentPriority) {
  var newPriority = currentPriority === 'high' ? 'none' : 'high';
  var t = tasksData.find(function(x) { return x.id === taskId; });
  if (t) {
    await window.db.updateTask(taskId, { name: t.name, priority: newPriority });
    renderGoals();
  }
};

window.toggleGoalTaskCompletion = async function(taskId) {
  await window.db.toggleTask(taskId);
  renderGoals();
};

window.saveGoalTaskName = async function(taskId, name) {
  var t = tasksData.find(function(x) { return x.id === taskId; });
  if (t) {
    if (!name.trim()) {
      await window.db.deleteTask(taskId);
    } else {
      await window.db.updateTask(taskId, { name: name.trim() });
    }
    renderGoals();
  }
};

/* ── Direct delete handler ── */
window.confirmDeleteGoal = async function() {
  if (!_deleteGoalId) return;
  var id = _deleteGoalId;
  _deleteGoalId = null;
  closeDeleteConfirmModal();
  var result = await window.db.deleteGoal(id);
  if (result === false) { alert('Failed to delete goal'); }
  renderGoals();
};

document.addEventListener('click', function(e) {
  var cancelBtn = e.target.closest('.btn-confirm-cancel');
  if (cancelBtn) {
    closeDeleteConfirmModal();
    return;
  }
});

document.addEventListener('click', function(e) {
  if (isAddingGoal || editingGoalId) {
    var grid = document.getElementById('goalsGrid');
    if (grid && !grid.contains(e.target) && !e.target.closest('.goals-add-btn')) {
      isAddingGoal = false;
      editingGoalId = null;
      renderGoals();
    }
  }
});

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
