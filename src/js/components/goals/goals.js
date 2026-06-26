var _editingGoalId = null;
var _deleteGoalId = null;

function initGoalColorPicker() {
  var container = document.getElementById('goal-color-picker');
  if (!container) return;
  var html = '';
  for (var ci = 0; ci < GOAL_COLORS.length; ci++) {
    var c = GOAL_COLORS[ci];
    var selected = c === '#3B82F6' ? ' ring-2 ring-offset-2 ring-blue-400' : '';
    html += '<div class="w-7 h-7 rounded-full cursor-pointer transition-all hover:scale-110 color-swatch' + selected + '" style="background:' + c + '" data-color="' + c + '"></div>';
  }
  container.innerHTML = html;
  var swatches = container.querySelectorAll('.color-swatch');
  for (var si = 0; si < swatches.length; si++) {
    swatches[si].addEventListener('click', function() {
      for (var sj = 0; sj < swatches.length; sj++) {
        swatches[sj].classList.remove('ring-2', 'ring-offset-2', 'ring-blue-400');
      }
      this.classList.add('ring-2', 'ring-offset-2', 'ring-blue-400');
    });
  }
}

function calculateEndDate() {
  var startVal = document.getElementById('goal-start-date').value;
  if (!startVal) return;
  var durationVal = parseInt(document.getElementById('goal-duration-value').value) || 1;
  var durationType = document.getElementById('goal-duration-type').value;
  var sp2 = startVal.split('-');
  var start = new Date(+sp2[0], +sp2[1] - 1, +sp2[2]);
  var end = new Date(start);
  if (durationType === 'days') end.setDate(end.getDate() + durationVal);
  else if (durationType === 'weeks') end.setDate(end.getDate() + durationVal * 7);
  else if (durationType === 'months') end.setMonth(end.getMonth() + durationVal);
  document.getElementById('goal-end-date').value = end.toISOString().split('T')[0];
}

function openAddGoalModal(editingTitle, editColor, editId) {
  initGoalColorPicker();
  document.getElementById('goal-name-input').value = '';
  document.getElementById('goal-desc-input').value = '';
  document.getElementById('goal-duration-value').value = 3;
  document.getElementById('goal-duration-type').value = 'months';
  var dd = new Date();
  var today = dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0');
  document.getElementById('goal-start-date').value = today;
  calculateEndDate();
  var parentSelect = document.getElementById('goal-parent-select');
  parentSelect.innerHTML = '<option value="">None</option>';
  window.db.getGoals().then(function(allGoals) {
    var excludeIds = {};
    if (editId) {
      excludeIds[editId] = true;
      for (var ei = 0; ei < allGoals.length; ei++) {
        if (allGoals[ei].parentGoalId === editId) excludeIds[allGoals[ei].id] = true;
      }
    }
    for (var pi = 0; pi < allGoals.length; pi++) {
      if (!excludeIds[allGoals[pi].id]) {
        var opt = document.createElement('option');
        opt.value = allGoals[pi].id;
        opt.textContent = allGoals[pi].name;
        parentSelect.appendChild(opt);
      }
    }
  });
  if (editColor) {
    var swatches = document.querySelectorAll('#goal-color-picker .color-swatch');
    for (var sci = 0; sci < swatches.length; sci++) {
      swatches[sci].classList.remove('ring-2', 'ring-offset-2', 'ring-blue-400');
      if (swatches[sci].dataset.color === editColor) {
        swatches[sci].classList.add('ring-2', 'ring-offset-2', 'ring-blue-400');
      }
    }
  }
  var titleEl = document.querySelector('#add-goal-modal h2');
  if (titleEl) titleEl.textContent = editingTitle || 'Add New Goal';
  document.getElementById('add-goal-modal').classList.add('open');
  setTimeout(function() { document.getElementById('goal-name-input').focus(); }, 100);
}

function closeAddGoalModal() {
  _editingGoalId = null;
  document.getElementById('add-goal-modal').classList.remove('open');
}

document.addEventListener('change', function(e) {
  if (e.target.id === 'goal-duration-value' || e.target.id === 'goal-duration-type' || e.target.id === 'goal-start-date') {
    calculateEndDate();
  }
});

function saveGoal() {
  var name = document.getElementById('goal-name-input').value.trim();
  if (!name) { document.getElementById('goal-name-input').focus(); return; }
  var description = document.getElementById('goal-desc-input').value.trim();
  var selColor = document.querySelector('#goal-color-picker .color-swatch.ring-2');
  if (!selColor) selColor = document.querySelector('#goal-color-picker .color-swatch');
  var color = '#3B82F6';
  if (selColor && selColor.dataset) color = selColor.dataset.color || '#3B82F6';
  var startDate = document.getElementById('goal-start-date').value;
  var endDate = document.getElementById('goal-end-date').value;
  var durationVal = parseInt(document.getElementById('goal-duration-value').value) || 1;
  var durationType = document.getElementById('goal-duration-type').value;
  var durationDays = durationType === 'days' ? durationVal : durationType === 'weeks' ? durationVal * 7 : durationVal * 30;
  var parentGoalId = document.getElementById('goal-parent-select').value || null;
  if (_editingGoalId) {
    var goalData = { name: name, description: description, color: color, startDate: startDate, endDate: endDate, duration: durationDays, parentGoalId: parentGoalId };
    window.db.updateGoal(_editingGoalId, goalData).then(function(result) {
      if (result === true) {
        _editingGoalId = null;
        closeAddGoalModal();
        renderGoals();
      }
    });
  } else {
    var goal = {
      id: 'goal_' + Date.now(),
      name: name,
      description: description,
      color: color,
      startDate: startDate,
      endDate: endDate,
      duration: durationDays,
      parentGoalId: parentGoalId
    };
    window.db.createGoal(goal).then(function(result) {
      if (result === true) {
        closeAddGoalModal();
        renderGoals();
      }
    }).catch(function(err) {
      console.error('createGoal error:', err);
    });
  }
}

function getGoalProgress(g) {
  try {
    if (!g || !g.startDate || !g.endDate) return 0;
    var sp = g.startDate.split('-');
    var ep = g.endDate.split('-');
    if (sp.length < 3 || ep.length < 3) return 0;
    var start = new Date(+sp[0], +sp[1] - 1, +sp[2]);
    var end = new Date(+ep[0], +ep[1] - 1, +ep[2]);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    var td = new Date();
    var today = new Date(td.getFullYear(), td.getMonth(), td.getDate());
    var totalDays = (end - start) / 86400000;
    if (totalDays <= 0) return today >= start ? 100 : 0;
    return Math.round(Math.max(0, Math.min((today - start) / (end - start), 1)) * 100);
  } catch (e) { return 0; }
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

function goalCardHtml(g, progress) {
  var circumference = 2 * Math.PI * 30;
  var offset = circumference * (1 - (progress || 0) / 100);
  var sd = g.startDate ? new Date(g.startDate).toLocaleDateString() : '';
  var ed = g.endDate ? new Date(g.endDate).toLocaleDateString() : '';
  return '<div class="goal-card" style="border-left-color:' + g.color + '" data-goal-id="' + g.id + '">' +
    '<div class="goal-card-header">' +
      '<h3 class="goal-name">' + g.name + '</h3>' +
      '<div class="goal-actions">' +
        '<button onclick="event.stopPropagation();deleteGoal(\'' + g.id + '\')" title="Delete">' +
          '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>' +
        '</button>' +
      '</div>' +
    '</div>' +
    '<div class="goal-progress-wrap">' +
      '<div class="goal-progress-circle">' +
        '<svg viewBox="0 0 68 68">' +
          '<g transform="rotate(-90 34 34)">' +
            '<circle class="progress-bg" cx="34" cy="34" r="30"/>' +
            '<circle class="progress-fill" cx="34" cy="34" r="30" stroke="' + g.color + '" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '"/>' +
          '</g>' +
          '<text x="34" y="34" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="700" fill="#1F2937">' + (progress || 0) + '%</text>' +
        '</svg>' +
      '</div>' +
      '<div class="goal-progress-text">' +
        '<span>' + sd + ' - ' + ed + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="goal-dates">' +
      '<span>' + (g.duration || 0) + ' days</span>' +
      '<span>' + (g.endDate ? 'Ends: ' + ed : '') + '</span>' +
    '</div>' +
  '</div>';
}

function renderGoals() {
  var grid = document.getElementById('goals-grid');
  if (!grid) return;
  Promise.all([window.db.getGoals(), window.db.getTasks()]).then(function(results) {
    var goals = results[0];
    var tasks = results[1] || [];
    if (!goals || goals.length === 0) {
      grid.innerHTML = '<div class="col-span-full text-center py-16"><div class="text-gray-300 text-6xl mb-4">🎯</div><p class="text-gray-400 text-lg">No goals yet. Create your first goal!</p></div>';
      return;
    }
    var childMap = {};
    var taskMap = {};
    for (var rgi = 0; rgi < goals.length; rgi++) {
      if (goals[rgi].parentGoalId) {
        if (!childMap[goals[rgi].parentGoalId]) childMap[goals[rgi].parentGoalId] = [];
        childMap[goals[rgi].parentGoalId].push(goals[rgi]);
      }
    }
    for (var rgi2 = 0; rgi2 < tasks.length; rgi2++) {
      if (tasks[rgi2].goalId) {
        if (!taskMap[tasks[rgi2].goalId]) taskMap[tasks[rgi2].goalId] = [];
        taskMap[tasks[rgi2].goalId].push(tasks[rgi2]);
      }
    }
    var cache = {};
    var progressMap = {};
    for (var rgi3 = 0; rgi3 < goals.length; rgi3++) {
      progressMap[goals[rgi3].id] = Math.round(computeGoalProgress(goals[rgi3].id, childMap, taskMap, cache) * 100);
    }
    grid.innerHTML = '';
    for (var rgi4 = 0; rgi4 < goals.length; rgi4++) {
      var g = goals[rgi4];
      if (g.parentGoalId) continue;
      grid.insertAdjacentHTML('beforeend', goalCardHtml(g, progressMap[g.id]));
    }
  });
}

function deleteGoal(id) {
  _deleteGoalId = id;
  document.getElementById('delete-confirm-msg').textContent = 'Are you sure you want to delete this goal?';
  document.getElementById('delete-confirm-modal').classList.add('open');
}

function closeDeleteConfirmModal() {
  _deleteGoalId = null;
  document.getElementById('delete-confirm-modal').classList.remove('open');
}

document.getElementById('btn-confirm-delete-yes').addEventListener('click', function() {
  if (_deleteGoalId) {
    var id = _deleteGoalId;
    _deleteGoalId = null;
    closeDeleteConfirmModal();
    window.db.deleteGoal(id).then(function() { renderGoals(); closeGoalDetailModal(); });
  }
});

document.addEventListener('click', function(e) {
  var card = e.target.closest('.goal-card');
  if (card && card.dataset && card.dataset.goalId) {
    openGoalDetailModal(card.dataset.goalId);
  }
});

function openGoalDetailModal(goalId) {
  Promise.all([window.db.getGoals(), window.db.getTasks(), window.db.getSessionsByGoal(goalId)]).then(function(results) {
    var goals = results[0];
    var tasks = results[1] || [];
    var sessions = results[2] || [];
    var childMap = {};
    var taskMap = {};
    for (var dgi = 0; dgi < goals.length; dgi++) {
      if (goals[dgi].parentGoalId) {
        if (!childMap[goals[dgi].parentGoalId]) childMap[goals[dgi].parentGoalId] = [];
        childMap[goals[dgi].parentGoalId].push(goals[dgi]);
      }
    }
    for (var dgiT = 0; dgiT < tasks.length; dgiT++) {
      if (tasks[dgiT].goalId) {
        if (!taskMap[tasks[dgiT].goalId]) taskMap[tasks[dgiT].goalId] = [];
        taskMap[tasks[dgiT].goalId].push(tasks[dgiT]);
      }
    }
    var progressCache = {};
    function getProgress(id) {
      return Math.round(computeGoalProgress(id, childMap, taskMap, progressCache) * 100);
    }
    for (var dgi2 = 0; dgi2 < goals.length; dgi2++) {
      if (goals[dgi2].id === goalId) {
        var g = goals[dgi2];
        var progress = getProgress(g.id);
        var circumference = 2 * Math.PI * 34;
        var offset = circumference * (1 - progress / 100);
        var sd = g.startDate ? new Date(g.startDate).toLocaleDateString() : '-';
        var ed = g.endDate ? new Date(g.endDate).toLocaleDateString() : '-';
        var durText = g.duration ? g.duration + ' days' : '-';
        function renderChildTree(parentId, depth) {
          var kids = childMap[parentId] || [];
          if (kids.length === 0) return '';
          var html = '<div class="detail-children-list">';
          for (var dci = 0; dci < kids.length; dci++) {
            var cpp = getProgress(kids[dci].id);
            html +=
              '<div class="detail-child-item" onclick="openGoalDetailModal(\'' + kids[dci].id + '\')" style="margin-left:' + (depth * 20) + 'px;border-left:3px solid ' + kids[dci].color + '">' +
                '<div class="detail-child-name">' + kids[dci].name + '</div>' +
                '<div class="detail-child-progress" style="color:' + kids[dci].color + '">' + cpp + '%</div>' +
              '</div>' +
              renderChildTree(kids[dci].id, depth + 1);
          }
          html += '</div>';
          return html;
        }
        var childrenHtml = renderChildTree(g.id, 0);
        if (childrenHtml) {
          childrenHtml = '<div class="detail-children"><div class="detail-children-title">Sub-Goals</div>' + childrenHtml + '</div>';
        }
        var pomoHtml = '';
        if (sessions.length > 0) {
          var totalPomos = sessions.length;
          var listHtml = '';
          for (var psi = 0; psi < sessions.length; psi++) {
            var s = sessions[psi];
            var mins = Math.round(s.focusMinutes || 0);
            listHtml += '<div class="detail-pomo-item">' +
              '<span class="detail-pomo-name">' + (s.taskName || 'Pomodoro') + '</span>' +
              '<span class="detail-pomo-duration">' + mins + ' min</span>' +
            '</div>';
          }
          pomoHtml = '<div class="detail-pomodoros">' +
            '<div class="detail-pomodoros-header"><span class="detail-pomodoros-title">Pomodoros</span><span class="detail-pomodoros-total">Total: ' + totalPomos + '</span></div>' +
            '<div class="detail-pomodoros-list">' + listHtml + '</div>' +
          '</div>';
        }
        document.getElementById('goal-detail-card').style.borderTopColor = g.color;
        document.getElementById('goal-detail-content').innerHTML =
          '<div class="goal-detail-name">' + g.name + '</div>' +
          (g.description ? '<div class="goal-detail-desc">' + g.description + '</div>' : '') +
          '<div class="goal-detail-stats">' +
            '<div class="goal-detail-stat"><span class="label">Start Date</span><span class="value">' + sd + '</span></div>' +
            '<div class="goal-detail-stat"><span class="label">End Date</span><span class="value">' + ed + '</span></div>' +
            '<div class="goal-detail-stat"><span class="label">Duration</span><span class="value">' + durText + '</span></div>' +
            '<div class="goal-detail-stat"><span class="label">Progress</span><span class="value">' + progress + '%</span></div>' +
          '</div>' +
          '<div class="goal-detail-progress">' +
            '<svg viewBox="0 0 72 72"><g transform="rotate(-90 36 36)"><circle cx="36" cy="36" r="34" fill="none" stroke="#F3F4F6" stroke-width="4"/><circle cx="36" cy="36" r="34" fill="none" stroke="' + g.color + '" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '" style="transition: stroke-dashoffset 1s ease"/></g><text x="36" y="36" text-anchor="middle" dominant-baseline="central" font-size="18" font-weight="700" fill="#1F2937">' + progress + '%</text></svg>' +
          '</div>' +
          childrenHtml +
          pomoHtml +
          '<div class="goal-detail-actions">' +
            '<button class="btn-edit-goal" onclick="editGoalFromDetail(\'' + g.id + '\')">Edit Goal</button>' +
            '<button class="btn-delete-goal" onclick="deleteGoal(\'' + g.id + '\')">Delete Goal</button>' +
          '</div>';
        document.getElementById('goal-detail-modal').classList.add('open');
        return;
      }
    }
  });
}

function closeGoalDetailModal() {
  document.getElementById('goal-detail-modal').classList.remove('open');
}

function editGoalFromDetail(goalId) {
  _editingGoalId = goalId;
  closeGoalDetailModal();
  window.db.getGoals().then(function(goals) {
    for (var gi = 0; gi < goals.length; gi++) {
      if (goals[gi].id === goalId) {
        var g = goals[gi];
        openAddGoalModal('Edit Goal', g.color, g.id);
        document.getElementById('goal-name-input').value = g.name;
        document.getElementById('goal-desc-input').value = g.description || '';
        if (g.startDate) document.getElementById('goal-start-date').value = g.startDate;
        if (g.endDate) document.getElementById('goal-end-date').value = g.endDate;
        var totalDays = g.duration || 0;
        if (totalDays >= 30 && totalDays % 30 === 0) {
          document.getElementById('goal-duration-value').value = totalDays / 30;
          document.getElementById('goal-duration-type').value = 'months';
        } else if (totalDays >= 7 && totalDays % 7 === 0) {
          document.getElementById('goal-duration-value').value = totalDays / 7;
          document.getElementById('goal-duration-type').value = 'weeks';
        } else {
          document.getElementById('goal-duration-value').value = totalDays || 1;
          document.getElementById('goal-duration-type').value = 'days';
        }
        if (g.parentGoalId) {
          document.getElementById('goal-parent-select').value = g.parentGoalId;
        }
        return;
      }
    }
  });
}

document.addEventListener('click', function(e) {
  if (e.target === document.getElementById('goal-detail-modal')) {
    closeGoalDetailModal();
  }
});

document.addEventListener('click', function(e) {
  if (e.target === document.getElementById('add-goal-modal')) {
    closeAddGoalModal();
  }
});
