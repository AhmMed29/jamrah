var _selectedTaskGoalId = null;

function renderTasks() {
  var list = document.getElementById('tasks-list');
  if (!list) return;
  window.db.getTasks().then(function(tasks) {
    if (!tasks || tasks.length === 0) {
      list.innerHTML = '<div class="text-center py-16"><div class="text-gray-300 text-5xl mb-4"><svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></div><p class="text-gray-400 text-sm">No tasks yet. Tap + to add one.</p></div>';
      return;
    }
    var html = '';
    for (var ti = 0; ti < tasks.length; ti++) {
      var t = tasks[ti];
      var doneClass = t.completed ? 'done' : '';
      var checkClass = t.completed ? 'done' : '';
      var badge = t.goalId ? '<span class="task-goal-badge">Goal</span>' : '';
      html +=
        '<div class="task-item" data-task-id="' + t.id + '">' +
          '<div class="task-check ' + checkClass + '" onclick="toggleTask(\'' + t.id + '\')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg></div>' +
          '<span class="task-name ' + doneClass + '">' + t.name + '</span>' +
          badge +
          '<button class="task-delete" onclick="deleteTask(\'' + t.id + '\')"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>' +
        '</div>';
    }
    list.innerHTML = html;
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

function toggleTask(id) {
  window.db.toggleTask(id).then(function() { renderTasks(); });
}

function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  window.db.deleteTask(id).then(function() { renderTasks(); });
}

function openGoalsTaskPopup() {
  var popup = document.getElementById('goals-task-popup');
  popup.style.display = 'flex';
  var tree = document.getElementById('goals-task-tree');
  tree.innerHTML = '<div class="text-center py-8 text-gray-400">Loading...</div>';
  Promise.all([window.db.getGoals(), window.db.getTasks()]).then(function(results) {
    var goals = results[0] || [];
    var tasks = results[1] || [];
    var childMap = {};
    var taskMap = {};
    for (var ogi = 0; ogi < goals.length; ogi++) {
      if (goals[ogi].parentGoalId) {
        if (!childMap[goals[ogi].parentGoalId]) childMap[goals[ogi].parentGoalId] = [];
        childMap[goals[ogi].parentGoalId].push(goals[ogi]);
      }
    }
    for (var oti = 0; oti < tasks.length; oti++) {
      if (tasks[oti].goalId) {
        if (!taskMap[tasks[oti].goalId]) taskMap[tasks[oti].goalId] = [];
        taskMap[tasks[oti].goalId].push(tasks[oti]);
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
      var html = '<div class="gt-node" data-id="' + g.id + '">';
      html += '<div class="gt-row" style="padding-left:' + (depth * 20 + 8) + 'px" onclick="event.stopPropagation();toggleGoalsTaskNode(\'' + g.id + '\')">';
      if (hasKids || hasTasks) {
        html += '<span class="gt-chevron" id="gt-cv-' + g.id + '"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="M9 6l6 6-6 6"/></svg></span>';
      } else {
        html += '<span class="gt-chevron gt-chevron-empty"></span>';
      }
      html += '<span class="gt-dot" style="background:' + g.color + '"></span>';
      html += '<span class="gt-name">' + esc(g.name) + '</span>';
      html += '<span class="gt-progress" style="color:' + g.color + '">' + nodeProgress(g.id) + '%</span>';
      html += '</div>';
      html += '<div class="gt-children" id="gt-ch-' + g.id + '" style="display:none">';
      for (var oki = 0; oki < kids.length; oki++) {
        html += renderNode(kids[oki], depth + 1);
      }
      for (var oti2 = 0; oti2 < myTasks.length; oti2++) {
        html += '<div class="gt-task" data-task-name="' + esc(myTasks[oti2].name) + '" data-task-goal="' + g.id + '" onclick="event.stopPropagation();addTaskFromGoal(this.dataset.taskName, this.dataset.taskGoal)" style="padding-left:' + ((depth + 1) * 20 + 28) + 'px">';
        html += '<span class="gt-task-dot"></span>';
        html += '<span class="gt-task-name">' + esc(myTasks[oti2].name) + '</span>';
        html += '<span class="gt-task-add">+</span>';
        html += '</div>';
      }
      html += '</div></div>';
      return html;
    }
    var html = '';
    for (var ogi2 = 0; ogi2 < goals.length; ogi2++) {
      if (!goals[ogi2].parentGoalId) {
        html += renderNode(goals[ogi2], 0);
      }
    }
    tree.innerHTML = html || '<div class="text-center py-8 text-gray-400">No goals yet. Create goals first!</div>';
  });
}

function closeGoalsTaskPopup(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('goals-task-popup').style.display = 'none';
}

function toggleGoalsTaskNode(id) {
  var ch = document.getElementById('gt-ch-' + id);
  if (!ch) return;
  ch.style.display = ch.style.display === 'none' ? 'block' : 'none';
}

function addTaskFromGoal(name, goalId) {
  var task = { id: 'task_' + Date.now(), name: name, goalId: goalId };
  window.db.createTask(task).then(function(result) {
    if (result === true) { renderTasks(); }
  });
}
