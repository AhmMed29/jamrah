var _selectedTaskGoalId = null;
var _selectedPriority = 'Medium';
var _sortBy = 'date-desc';

function selectPriority(value) {
  _selectedPriority = value;
  var all = document.querySelectorAll('#priority-selector .priority-btn');
  for (var pi = 0; pi < all.length; pi++) all[pi].classList.remove('selected');
  var btn = document.querySelector('#priority-selector .priority-btn[data-value="' + value + '"]');
  if (btn) btn.classList.add('selected');
}

function sortTasks(tasks) {
  tasks.sort(function(a, b) {
    if (_sortBy === 'priority') {
      var order = { high: 3, medium: 2, low: 1, none: 0 };
      var pa = order[(a.priority || 'none').toLowerCase()] || 0;
      var pb = order[(b.priority || 'none').toLowerCase()] || 0;
      return pb - pa;
    }
    var cmp = (b.createdAt || '').localeCompare(a.createdAt || '');
    return _sortBy === 'date-asc' ? -cmp : cmp;
  });
}

function toggleSortDropdown(e) {
  if (e) e.stopPropagation();
  var dd = document.getElementById('sort-dropdown');
  if (!dd) return;
  dd.classList.toggle('hidden');
  if (!dd.classList.contains('hidden')) {
    var opts = dd.querySelectorAll('.sort-option');
    for (var si = 0; si < opts.length; si++) {
      if (opts[si].dataset.value === _sortBy) opts[si].classList.add('active');
      else opts[si].classList.remove('active');
    }
  }
}

function setSortBy(value) {
  _sortBy = value;
  window.db.setSetting('taskSortBy', value);
  var dd = document.getElementById('sort-dropdown');
  if (dd) dd.classList.add('hidden');
  renderTasks();
}

function renderTasks() {
  var list = document.getElementById('tasks-list');
  if (!list) return;
  window.db.getTasks().then(function(tasks) {
    if (!tasks || tasks.length === 0) {
      list.innerHTML = '<div class="text-center py-16"><div class="text-gray-300 text-5xl mb-4"><svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></div><p class="text-gray-400 text-sm">No tasks yet. Tap + to add one.</p></div>';
      return;
    }
    sortTasks(tasks);
    var childMap = {};
    var topLevel = [];
    for (var ti = 0; ti < tasks.length; ti++) {
      var t = tasks[ti];
      if (t.parentTaskId) {
        if (!childMap[t.parentTaskId]) childMap[t.parentTaskId] = [];
        childMap[t.parentTaskId].push(t);
      } else {
        topLevel.push(t);
      }
    }
    for (var cid in childMap) sortTasks(childMap[cid]);
    var html = '';
    for (var tti = 0; tti < topLevel.length; tti++) {
      html += renderTaskItem(topLevel[tti]);
      var subs = childMap[topLevel[tti].id] || [];
      for (var si = 0; si < subs.length; si++) {
        html += renderTaskItem(subs[si], true);
      }
    }
    list.innerHTML = html;
  });
}

function renderTaskItem(t, isSub) {
  var doneClass = t.completed ? 'done' : '';
  var checkClass = t.completed ? 'done' : '';
  var badge = t.goalId ? '<span class="task-goal-badge">Goal</span>' : '';
  var subClass = isSub ? ' task-sub' : '';
  var itemId = 'task-item-' + t.id;
  var priorityBadge = (t.priority && t.priority !== 'none') ? '<span class="task-priority-badge ' + t.priority.toLowerCase() + '">' + t.priority + '</span>' : '';
  return (
    '<div class="task-item' + subClass + '" onclick="showTaskDetails(\'' + t.id + '\')" data-task-id="' + t.id + '" id="' + itemId + '">' +
      '<div class="task-check ' + checkClass + '" onclick="event.stopPropagation();toggleTask(\'' + t.id + '\')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg></div>' +
      '<span class="task-name ' + doneClass + '">' + t.name + '</span>' +
      priorityBadge +
      badge +
    '</div>'
  );
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('#sort-wrap')) {
    var dd = document.getElementById('sort-dropdown');
    if (dd && !dd.classList.contains('hidden')) dd.classList.add('hidden');
  }
});

function showTaskDetails(id) {
  window.db.getTasks().then(function(tasks) {
    if (!tasks || !tasks.length) return;
    var task = null;
    for (var si = 0; si < tasks.length; si++) {
      if (tasks[si].id === id) { task = tasks[si]; break; }
    }
    if (!task) return;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.parentNode.removeChild(overlay); });
    var card = document.createElement('div');
    card.style.cssText = 'background:#fff;border-radius:16px;padding:28px;width:100%;max-width:420px;box-shadow:0 8px 30px rgba(0,0,0,0.15);position:relative';
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'position:absolute;top:12px;right:16px;font-size:22px;color:#9ca3af;background:none;border:none;cursor:pointer;padding:4px;line-height:1';
    closeBtn.addEventListener('click', function() { overlay.parentNode.removeChild(overlay); });
    var nameEl = document.createElement('h2');
    nameEl.textContent = task.name;
    nameEl.style.cssText = 'font-size:20px;font-weight:700;color:#1F2937;margin-bottom:14px;margin-top:0;word-break:break-word';
    var badgesHtml = '';
    if (task.priority && task.priority !== 'none') {
      var pc = task.priority === 'Low' ? '#059669' : task.priority === 'High' ? '#dc2626' : '#d97706';
      var pb = task.priority === 'Low' ? '#d1fae5' : task.priority === 'High' ? '#fee2e2' : '#fef3c7';
      badgesHtml += '<span style="display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:6px;text-transform:uppercase;letter-spacing:0.5px;color:' + pc + ';background:' + pb + ';margin-right:6px;margin-bottom:4px">' + task.priority + '</span>';
    }
    if (task.goalId) badgesHtml += '<span style="display:inline-block;font-size:11px;color:#6B7280;background:#F3F4F6;padding:3px 10px;border-radius:10px;margin-right:6px;margin-bottom:4px">Goal</span>';
    badgesHtml += task.completed ? '<span style="display:inline-block;font-size:11px;color:#059669;background:#d1fae5;padding:3px 10px;border-radius:10px;margin-bottom:4px">Done</span>' : '';
    var badgesDiv = document.createElement('div');
    badgesDiv.style.cssText = 'margin-bottom:24px';
    badgesDiv.innerHTML = badgesHtml;
    var divider = document.createElement('hr');
    divider.style.cssText = 'border:none;border-top:1px solid #e5e7eb;margin-bottom:20px';
    var btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'display:flex;gap:10px';
    var editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.style.cssText = 'flex:1;padding:12px 20px;background:#3b82f6;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit';
    editBtn.addEventListener('click', function() { overlay.parentNode.removeChild(overlay); editTask(id); });
    var deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.style.cssText = 'flex:1;padding:12px 20px;background:#fff;color:#EF4444;border:2px solid #FCA5A5;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit';
    deleteBtn.addEventListener('click', function() { overlay.parentNode.removeChild(overlay); deleteTask(id); });
    btnWrap.appendChild(editBtn); btnWrap.appendChild(deleteBtn);
    card.appendChild(closeBtn); card.appendChild(nameEl); card.appendChild(badgesDiv); card.appendChild(divider); card.appendChild(btnWrap);
    overlay.appendChild(card); document.body.appendChild(overlay);
  });
}

function editTask(id) {
  window.db.getTasks().then(function(tasks) {
    if (!tasks || !tasks.length) return;
    var task = null;
    for (var ei = 0; ei < tasks.length; ei++) {
      if (tasks[ei].id === id) { task = tasks[ei]; break; }
    }
    if (!task) return;
    var _localPriority = task.priority || 'Medium';
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;padding:20px';
    var card = document.createElement('div');
    card.style.cssText = 'background:#fff;border-radius:16px;padding:24px;width:100%;max-width:400px;box-shadow:0 8px 30px rgba(0,0,0,0.15)';
    var h = document.createElement('h3');
    h.textContent = 'Edit Task';
    h.style.cssText = 'font-size:18px;font-weight:700;color:#1F2937;margin-bottom:16px;margin-top:0';
    var input = document.createElement('input');
    input.type = 'text'; input.value = task.name;
    input.style.cssText = 'width:100%;padding:12px 16px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;color:#374151;outline:none;box-sizing:border-box;font-family:inherit';
    input.addEventListener('keydown', function(e) { if (e.key === 'Enter') saveBtn.click(); if (e.key === 'Escape') overlay.click(); });
    var pLabel = document.createElement('label');
    pLabel.textContent = 'Priority';
    pLabel.style.cssText = 'display:block;font-size:13px;font-weight:600;color:#6B7280;margin-top:16px;margin-bottom:8px';
    var pWrap = document.createElement('div');
    pWrap.style.cssText = 'display:flex;gap:8px;margin-bottom:20px';
    var priorities = ['Low', 'Medium', 'High'];
    var pColors = { Low: { c: '#059669', b: '#d1fae5' }, Medium: { c: '#d97706', b: '#fef3c7' }, High: { c: '#dc2626', b: '#fee2e2' } };
    for (var pi = 0; pi < priorities.length; pi++) {
      var pv = priorities[pi];
      var pb = document.createElement('button');
      pb.textContent = pv; pb.dataset.value = pv;
      pb.style.cssText = 'flex:1;padding:8px 12px;border-radius:10px;font-size:13px;font-weight:600;border:2px solid transparent;cursor:pointer;transition:all 0.15s;color:' + pColors[pv].c + ';background:' + pColors[pv].b;
      if (pv === _localPriority) { pb.style.borderColor = pColors[pv].c; pb.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; }
      pb.addEventListener('click', function() {
        var all = pWrap.querySelectorAll('button');
        for (var xi = 0; xi < all.length; xi++) { all[xi].style.borderColor = 'transparent'; all[xi].style.boxShadow = 'none'; }
        this.style.borderColor = pColors[this.dataset.value].c;
        this.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
        _localPriority = this.dataset.value;
      });
      pWrap.appendChild(pb);
    }
    var btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'display:flex;gap:10px;margin-top:4px;justify-content:flex-end';
    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:10px 24px;border:1px solid #D1D5DB;border-radius:10px;font-size:13px;color:#6B7280;background:#fff;cursor:pointer;font-weight:500;font-family:inherit';
    var saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.cssText = 'padding:10px 24px;background:#3b82f6;color:#fff;border:none;border-radius:10px;font-size:13px;cursor:pointer;font-weight:600;font-family:inherit';
    function removeModal() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    cancelBtn.addEventListener('click', removeModal);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) removeModal(); });
    saveBtn.addEventListener('click', function() {
      var n = input.value.trim();
      if (n) { window.db.updateTask(id, { name: n, priority: _localPriority }).then(function() { removeModal(); renderTasks(); }); }
      else { removeModal(); }
    });
    card.appendChild(h); card.appendChild(input); card.appendChild(pLabel); card.appendChild(pWrap); btnWrap.appendChild(cancelBtn); btnWrap.appendChild(saveBtn);
    card.appendChild(btnWrap); overlay.appendChild(card); document.body.appendChild(overlay);
    setTimeout(function() { input.focus(); input.select(); }, 50);
  });
}

function addSubtask(parentId) {
  var _localPriority = 'Medium';
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;padding:20px';
  var card = document.createElement('div');
  card.style.cssText = 'background:#fff;border-radius:16px;padding:24px;width:100%;max-width:400px;box-shadow:0 8px 30px rgba(0,0,0,0.15)';
  var h = document.createElement('h3');
  h.textContent = 'Add Subtask';
  h.style.cssText = 'font-size:18px;font-weight:700;color:#1F2937;margin-bottom:16px;margin-top:0';
  var input = document.createElement('input');
  input.type = 'text'; input.placeholder = 'e.g. Read 20 pages';
  input.style.cssText = 'width:100%;padding:12px 16px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;color:#374151;outline:none;box-sizing:border-box;font-family:inherit';
  input.addEventListener('keydown', function(e) { if (e.key === 'Enter') saveBtn.click(); if (e.key === 'Escape') overlay.click(); });
  var pLabel = document.createElement('label');
  pLabel.textContent = 'Priority';
  pLabel.style.cssText = 'display:block;font-size:13px;font-weight:600;color:#6B7280;margin-top:16px;margin-bottom:8px';
  var pWrap = document.createElement('div');
  pWrap.style.cssText = 'display:flex;gap:8px;margin-bottom:20px';
  var priorities = ['Low', 'Medium', 'High'];
  var pColors = { Low: { c: '#059669', b: '#d1fae5' }, Medium: { c: '#d97706', b: '#fef3c7' }, High: { c: '#dc2626', b: '#fee2e2' } };
  for (var pi = 0; pi < priorities.length; pi++) {
    var pv = priorities[pi];
    var pb = document.createElement('button');
    pb.textContent = pv; pb.dataset.value = pv;
    pb.style.cssText = 'flex:1;padding:8px 12px;border-radius:10px;font-size:13px;font-weight:600;border:2px solid transparent;cursor:pointer;transition:all 0.15s;color:' + pColors[pv].c + ';background:' + pColors[pv].b;
    if (pv === 'Medium') { pb.style.borderColor = pColors[pv].c; pb.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; }
    pb.addEventListener('click', function() {
      var all = pWrap.querySelectorAll('button');
      for (var xi = 0; xi < all.length; xi++) { all[xi].style.borderColor = 'transparent'; all[xi].style.boxShadow = 'none'; }
      this.style.borderColor = pColors[this.dataset.value].c;
      this.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)';
      _localPriority = this.dataset.value;
    });
    pWrap.appendChild(pb);
  }
  var btnWrap = document.createElement('div');
  btnWrap.style.cssText = 'display:flex;gap:10px;margin-top:4px;justify-content:flex-end';
  var cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = 'padding:10px 24px;border:1px solid #D1D5DB;border-radius:10px;font-size:13px;color:#6B7280;background:#fff;cursor:pointer;font-weight:500;font-family:inherit';
  var saveBtn = document.createElement('button');
  saveBtn.textContent = 'Add';
  saveBtn.style.cssText = 'padding:10px 24px;background:#3b82f6;color:#fff;border:none;border-radius:10px;font-size:13px;cursor:pointer;font-weight:600;font-family:inherit';
  function removeModal() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
  cancelBtn.addEventListener('click', removeModal);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) removeModal(); });
  saveBtn.addEventListener('click', function() {
    var n = input.value.trim();
    if (n) {
      var task = { id: 'task_' + Date.now(), name: n, parentTaskId: parentId, priority: _localPriority };
      window.db.createTask(task).then(function(result) { if (result) { removeModal(); renderTasks(); } });
    }
  });
  card.appendChild(h); card.appendChild(input); card.appendChild(pLabel); card.appendChild(pWrap); btnWrap.appendChild(cancelBtn); btnWrap.appendChild(saveBtn);
  card.appendChild(btnWrap); overlay.appendChild(card); document.body.appendChild(overlay);
  setTimeout(function() { input.focus(); }, 100);
}

function toggleTask(id) {
  var el = document.querySelector('#task-item-' + id + ' .task-check');
  var wasDone = el && el.classList.contains('done');
  if (window.AudioManager) window.AudioManager.playSound(wasDone ? 'checkbox-uncheck.mp3' : 'checkbox-check.mp3');
  window.db.toggleTask(id).then(function() { renderTasks(); });
}

function deleteTask(id) {
  showConfirmModal('Delete Task', 'Are you sure you want to delete this task?', 'Delete', function() {
    window.db.deleteTask(id).then(function() { renderTasks(); });
  });
}

function openAddTaskPopup() {
  _selectedTaskGoalId = null;
  document.getElementById('task-name-input').value = '';
  var tagContainer = document.getElementById('task-goal-tags');
  window.db.getGoals().then(function(goals) {
    var html = '<div class="goal-tag selected" data-id="" onclick="selectTaskGoal(this)">None</div>';
    for (var tgi = 0; tgi < goals.length; tgi++) {
      html += '<div class="goal-tag" style="background:' + goals[tgi].color + '22;color:' + goals[tgi].color + '" data-id="' + goals[tgi].id + '" onclick="selectTaskGoal(this)">' + goals[tgi].name + '</div>';
    }
    tagContainer.innerHTML = html;
    document.getElementById('add-task-popup').style.display = 'flex';
    setTimeout(function() { document.getElementById('task-name-input').focus(); }, 100);
  });
}

function closeAddTaskPopup(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('add-task-popup').style.display = 'none';
}

function selectTaskGoal(el) {
  var all = document.querySelectorAll('#task-goal-tags .goal-tag');
  for (var sgi = 0; sgi < all.length; sgi++) all[sgi].classList.remove('selected');
  el.classList.add('selected');
  _selectedTaskGoalId = el.dataset.id || null;
}

function saveTask() {
  var name = document.getElementById('task-name-input').value.trim();
  if (!name) return;
  var task = { id: 'task_' + Date.now(), name: name, goalId: _selectedTaskGoalId, priority: _selectedPriority };
  window.db.createTask(task).then(function(result) {
    if (result === true) {
      document.getElementById('task-name-input').value = '';
      _selectedTaskGoalId = null;
      closeAddTaskPopup();
      renderTasks();
    }
  });
}

function openGoalsTaskPopup() {
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
      return Math.round(computeGoalProgress(id, childMap, taskMap, pgCache) * 100);
    }
    function renderNode(g, depth) {
      var kids = childMap[g.id] || [];
      var myTasks = taskMap[g.id] || [];
      var hasKids = kids.length > 0;
      var hasTasks = myTasks.length > 0;
      var h = '<div class="gt-node" data-id="' + g.id + '">';
      h += '<div class="gt-row" style="padding-left:' + (depth * 20 + 8) + 'px" onclick="toggleGoalsTaskNode(event,\'' + g.id + '\')">';
      if (hasKids || hasTasks) {
        h += '<span class="gt-chevron" id="gt-cv-' + g.id + '"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="M9 6l6 6-6 6"/></svg></span>';
      } else {
        h += '<span class="gt-chevron gt-chevron-empty"></span>';
      }
      h += '<span class="gt-dot" style="background:' + g.color + '"></span>';
      h += '<span class="gt-name">' + esc(g.name) + '</span>';
      h += '<span class="gt-progress" style="color:' + g.color + '">' + nodeProgress(g.id) + '%</span>';
      h += '</div>';
      h += '<div class="gt-children" id="gt-ch-' + g.id + '" style="display:none">';
      for (var oki = 0; oki < kids.length; oki++) {
        h += renderNode(kids[oki], depth + 1);
      }
      for (var oti2 = 0; oti2 < myTasks.length; oti2++) {
        var t = myTasks[oti2];
        var lbl = '';
        if (t.completed) {
          lbl = '<span class="gt-label gt-label-done">&#10003; Done</span>';
        } else {
          lbl = '<span class="gt-label gt-label-added">&#10003; Added</span>';
        }
        h += '<div class="gt-task" data-task-id="' + t.id + '" style="padding-left:' + ((depth + 1) * 20 + 28) + 'px">';
        h += '<span class="gt-task-dot"></span>';
        h += '<span class="gt-task-name">' + esc(t.name) + '</span>';
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
}

function closeGoalsTaskPopup(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('goals-task-popup').style.display = 'none';
}

function toggleGoalsTaskNode(e, id) {
  if (e) e.stopPropagation();
  var ch = document.getElementById('gt-ch-' + id);
  if (!ch) return;
  ch.style.display = ch.style.display === 'none' ? 'block' : 'none';
}

function addTaskFromGoal(name, goalId) {
  var task = { id: 'task_' + Date.now(), name: name, goalId: goalId };
  window.db.createTask(task).then(function(result) {
    if (result === true) { renderTasks(); openGoalsTaskPopup(); }
  });
}

window.db.getSetting('taskSortBy').then(function(val) {
  if (val) {
    _sortBy = val;
    if (typeof renderTasks === 'function') renderTasks();
  }
});
