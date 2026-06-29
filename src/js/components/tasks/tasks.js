var _selectedTaskGoalId = null;

function renderTasks() {
  var list = document.getElementById('tasks-list');
  if (!list) return;
  window.db.getTasks().then(function(tasks) {
    if (!tasks || tasks.length === 0) {
      list.innerHTML = '<div class="text-center py-16"><div class="text-gray-300 text-5xl mb-4"><svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></div><p class="text-gray-400 text-sm">No tasks yet. Tap + to add one.</p></div>';
      return;
    }
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
  return (
    '<div class="task-item' + subClass + '" data-task-id="' + t.id + '" id="' + itemId + '">' +
      '<div class="task-check ' + checkClass + '" onclick="toggleTask(\'' + t.id + '\')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg></div>' +
      '<span class="task-name ' + doneClass + '">' + t.name + '</span>' +
      badge +
      '<div class="task-menu-wrap">' +
        '<button class="task-menu-btn" onclick="toggleTaskMenu(\'' + t.id + '\')"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg></button>' +
        '<div class="task-menu-dropdown" id="menu-' + t.id + '">' +
          '<div class="task-menu-item" onclick="editTask(\'' + t.id + '\')">Edit</div>' +
          '<div class="task-menu-item task-menu-item-danger" onclick="deleteTask(\'' + t.id + '\')">Delete</div>' +
          '<div class="task-menu-item" onclick="addSubtask(\'' + t.id + '\')">Add Subtask</div>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

function toggleTaskMenu(id) {
  closeTaskMenus(id);
  var menu = document.getElementById('menu-' + id);
  if (menu) menu.classList.toggle('open');
}

function closeTaskMenus(exceptId) {
  var all = document.querySelectorAll('.task-menu-dropdown.open');
  for (var mi = 0; mi < all.length; mi++) {
    var menuId = all[mi].id.replace('menu-', '');
    if (menuId !== exceptId) all[mi].classList.remove('open');
  }
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.task-menu-btn') && !e.target.closest('.task-menu-dropdown')) {
    closeTaskMenus();
  }
});

function editTask(id) {
  closeTaskMenus();
  window.db.getTasks().then(function(tasks) {
    if (!tasks || !tasks.length) return;
    var task = null;
    for (var ei = 0; ei < tasks.length; ei++) {
      if (tasks[ei].id === id) { task = tasks[ei]; break; }
    }
    if (!task) return;
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
    var btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'display:flex;gap:10px;margin-top:20px;justify-content:flex-end';
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
      if (n && n !== task.name) { window.db.updateTask(id, n).then(function() { removeModal(); renderTasks(); }); }
      else { removeModal(); }
    });
    card.appendChild(h); card.appendChild(input); btnWrap.appendChild(cancelBtn); btnWrap.appendChild(saveBtn);
    card.appendChild(btnWrap); overlay.appendChild(card); document.body.appendChild(overlay);
    setTimeout(function() { input.focus(); input.select(); }, 50);
  });
}

function addSubtask(parentId) {
  closeTaskMenus();
  window.db.getTasks().then(function(tasks) {
    var parentName = '';
    for (var ai = 0; ai < tasks.length; ai++) {
      if (tasks[ai].id === parentId) { parentName = tasks[ai].name; break; }
    }
    try {
      var name = prompt('Add subtask under "' + parentName + '":');
      if (name && name.trim()) {
        var task = { id: 'task_' + Date.now(), name: name.trim(), parentTaskId: parentId };
        window.db.createTask(task).then(function(result) {
          if (result === true) renderTasks();
        });
      }
    } catch (e) {}
  });
}

function toggleTask(id) {
  var el = document.querySelector('#task-item-' + id + ' .task-check');
  var wasDone = el && el.classList.contains('done');
  if (window.AudioManager) window.AudioManager.playSound(wasDone ? 'checkbox-uncheck.mp3' : 'checkbox-check.mp3');
  window.db.toggleTask(id).then(function() { renderTasks(); });
}

function deleteTask(id) {
  closeTaskMenus();
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
  var task = { id: 'task_' + Date.now(), name: name, goalId: _selectedTaskGoalId };
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
