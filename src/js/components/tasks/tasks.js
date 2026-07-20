function newTaskId() {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

var _selectedTaskGoalId = null;
var _selectedPriority = 'Medium';
var _sortBy = 'date-desc';

window.selectPriority = function(value) {
  _selectedPriority = value;
  var all = document.querySelectorAll('#priority-selector .priority-dot-btn');
  all.forEach(function(btn) {
    if (btn.dataset.value === value) {
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
    }
  });
};

function sortTasks(tasks) {
  tasks.sort(function(a, b) {
    if (_sortBy === 'priority') {
      var order = { High: 3, Medium: 2, Low: 1, none: 0 };
      var pa = order[a.priority] || 0;
      var pb = order[b.priority] || 0;
      return pb - pa;
    }
    var cmp = (b.createdAt || '').localeCompare(a.createdAt || '');
    return _sortBy === 'date-asc' ? -cmp : cmp;
  });
}

window.toggleSortDropdown = function(e) {
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
};

window.setSortBy = function(value) {
  _sortBy = value;
  window.db.setSetting('taskSortBy', value);
  var dd = document.getElementById('sort-dropdown');
  if (dd) dd.classList.add('hidden');
  renderTasks();
};

window.renderTasks = function() {
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
};

function renderTaskItem(t, isSub) {
  var doneClass = t.completed ? 'done' : '';
  var checkClass = t.completed ? 'done' : '';
  var badge = t.goalId ? '<span class="task-goal-badge">Goal</span>' : '';
  var subClass = isSub ? ' task-sub' : '';
  var itemId = 'task-item-' + t.id;
  
  var dotColor = '#cbd5e1'; // fallback gray
  if (t.priority === 'High') dotColor = '#ef4444'; // Red
  else if (t.priority === 'Medium') dotColor = '#f59e0b'; // Yellow
  else if (t.priority === 'Low') dotColor = '#10b981'; // Green
  
  var priorityDot = '<span class="task-priority-dot" style="background:' + dotColor + ';"></span>';

  return (
    '<div class="task-item' + subClass + '" onclick="window.showTaskDetails(\'' + t.id + '\')" data-task-id="' + t.id + '" id="' + itemId + '">' +
      '<div class="uv-checkbox-wrapper" onclick="event.stopPropagation()">' +
        '<input type="checkbox" id="task-checkbox-' + t.id + '" class="uv-checkbox" style="display: none !important;" ' + (t.completed ? 'checked' : '') + ' onchange="window.toggleTask(\'' + t.id + '\')" />' +
        '<label for="task-checkbox-' + t.id + '" class="uv-checkbox-label">' +
          '<div class="uv-checkbox-icon">' +
            '<svg viewBox="0 0 24 24" class="uv-checkmark">' +
              '<path d="M4.1,12.7 9,17.6 20.3,6.3" fill="none"></path>' +
            '</svg>' +
          '</div>' +
        '</label>' +
      '</div>' +
      priorityDot +
      '<span class="task-name ' + doneClass + '">' + escapeHtml(t.name) + '</span>' +
      badge +
      (t.scheduledTime ? '<span class="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded ml-2 font-semibold flex items-center gap-1"><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' + t.scheduledTime.split('T')[0] + '</span>' : '') +
      '<button class="task-delete-btn ml-2" onclick="event.stopPropagation(); window.deleteTask(\'' + t.id + '\')"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>' +
    '</div>'
  );
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('#sort-wrap')) {
    var dd = document.getElementById('sort-dropdown');
    if (dd && !dd.classList.contains('hidden')) dd.classList.add('hidden');
  }
});

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.showTaskDetails = async function(id) {
  var results = await Promise.all([window.db.getTasks(), window.db.getGoals()]);
  var tasks = results[0];
  var goals = results[1];
  if (!tasks || !tasks.length) return;
  var task = tasks.find(t => t.id === id);
  if (!task) return;

  var subtasks = tasks.filter(t => t.parentTaskId === id);
  var goalName = '';
  if (task.goalId && goals) {
    var g = goals.find(x => x.id === task.goalId);
    if (g) goalName = g.name;
  }

  // Highlight selected task
  document.querySelectorAll('.task-item').forEach(el => el.classList.remove('selected'));
  var el = document.getElementById('task-item-' + id);
  if (el) el.classList.add('selected');

  var formattedDate = task.createdAt || '';
  if (formattedDate) {
    var parts = formattedDate.split(' ')[0].split('-');
    if (parts.length === 3) {
      var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      formattedDate = months[parseInt(parts[1]) - 1] + ' ' + parseInt(parts[2]) + ', ' + parts[0];
    }
  }

  var panel = document.getElementById('task-detail-panel');
  if (!panel) return;
  
  var dotColor = '#cbd5e1';
  if (task.priority === 'High') dotColor = '#ef4444';
  else if (task.priority === 'Medium') dotColor = '#f59e0b';
  else if (task.priority === 'Low') dotColor = '#10b981';

  var schedValue = task.scheduledTime ? task.scheduledTime.split('T')[0] : '';
  
  // Create layout
  var html = '<div class="p-8 flex flex-col h-full">';
  
  // Header
  html += '<div class="flex items-start justify-between gap-4 mb-4">';
  html += '<input type="text" id="td-name" value="' + escapeHtml(task.name) + '" class="text-2xl font-bold text-gray-800 bg-transparent border-none outline-none w-full" placeholder="Task Name" onblur="window.saveTaskDetail(\'' + id + '\')">';
  html += '<button onclick="window.closeTaskDetails()" class="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 w-8 h-8 rounded-full flex items-center justify-center shrink-0">&times;</button>';
  html += '</div>';

  // Meta row
  html += '<div class="flex items-center gap-2 mb-6 flex-wrap">';
  html += '<span class="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-lg"><span style="width:8px;height:8px;border-radius:50%;background:' + dotColor + ';"></span>' + (task.priority || 'None') + '</span>';
  if (goalName) html += '<span class="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">' + escapeHtml(goalName) + '</span>';
  if (task.completed) html += '<span class="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">Completed</span>';
  html += '<span class="text-xs text-gray-400 flex items-center gap-1"><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' + formattedDate + '</span>';
  html += '</div>';

  // Scheduling
  html += '<div class="mb-6 flex gap-4">';
  html += '<div class="flex-1"><label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Scheduled Time</label><input type="datetime-local" id="td-sched" value="' + (task.scheduledTime || '') + '" onblur="window.saveTaskDetail(\'' + id + '\')" class="w-full text-sm p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white"></div>';
  html += '</div>';

  // Notes (.md)
  html += '<div class="mb-6 flex-1 flex flex-col min-h-[200px]">';
  html += '<label class="block text-xs font-semibold text-gray-500 uppercase mb-1 flex justify-between">Markdown Note <span id="td-note-status" class="text-emerald-500 font-normal"></span></label>';
  html += '<textarea id="td-note" placeholder="Write markdown notes here..." onblur="window.saveTaskNote(\'' + id + '\')" class="w-full flex-1 p-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-500 resize-none font-mono bg-gray-50 text-gray-800"></textarea>';
  html += '</div>';

  // Subtasks
  html += '<div class="mb-6">';
  html += '<h3 class="text-xs font-semibold text-gray-500 uppercase mb-2">Subtasks</h3>';
  html += '<div class="flex flex-col gap-2 max-h-48 overflow-y-auto mb-2 border border-gray-100 rounded-lg p-2 bg-gray-50">';
  if (subtasks.length === 0) {
    html += '<div class="text-xs text-gray-400 p-2">No subtasks yet.</div>';
  } else {
    subtasks.forEach(function(st) {
      html += '<div class="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-md">';
      html += '<div class="flex items-center gap-2">';
      html += st.completed ? '<span class="text-emerald-500 text-sm">✓</span> <span class="line-through text-gray-400 text-sm">' + escapeHtml(st.name) + '</span>' 
                           : '<span class="text-gray-300 text-sm">○</span> <span class="text-gray-700 text-sm">' + escapeHtml(st.name) + '</span>';
      html += '</div>';
      html += '<button onclick="window.deleteTask(\'' + st.id + '\')" class="text-gray-300 hover:text-red-500"><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>';
      html += '</div>';
    });
  }
  html += '</div>';
  html += '<div class="flex gap-2"><input type="text" id="td-sub-name" placeholder="Add subtask..." class="flex-1 p-2 text-sm border border-gray-200 rounded-md outline-none focus:border-blue-500" onkeydown="if(event.key===\'Enter\') window.addSubtask(\'' + id + '\')"><button onclick="window.addSubtask(\'' + id + '\')" class="px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded-md">Add</button></div>';
  html += '</div>';

  html += '</div>';
  panel.innerHTML = html;

  // Load Note
  try {
    var p = await window.db.getPath();
    var notePath = p + '/notes/task_' + id + '.md';
    var noteContent = await window.electronAPI.readFile(notePath);
    if (noteContent !== null && noteContent !== undefined) {
      document.getElementById('td-note').value = noteContent;
    }
  } catch(e) {}
};

window.closeTaskDetails = function() {
  document.querySelectorAll('.task-item').forEach(el => el.classList.remove('selected'));
  var panel = document.getElementById('task-detail-panel');
  if (panel) panel.innerHTML = '<div class="h-full flex items-center justify-center text-gray-400">Select a task to view details</div>';
};

window.saveTaskDetail = async function(id) {
  var name = document.getElementById('td-name').value.trim();
  var sched = document.getElementById('td-sched').value;
  if (!name) return;
  await window.db.updateTask(id, { name: name, scheduledTime: sched || null });
  renderTasks();
  if (document.getElementById('task-item-' + id) && document.getElementById('task-item-' + id).classList.contains('selected')) {
    // Already updating
  }
};

window.saveTaskNote = async function(id) {
  var val = document.getElementById('td-note').value;
  try {
    var p = await window.db.getPath();
    var notePath = p + '/notes/task_' + id + '.md';
    await window.electronAPI.writeFile(notePath, val);
    var status = document.getElementById('td-note-status');
    if (status) {
      status.textContent = 'Saved!';
      setTimeout(() => { status.textContent = ''; }, 2000);
    }
  } catch(e) {
    console.error(e);
  }
};

window.addSubtask = async function(parentId) {
  var input = document.getElementById('td-sub-name');
  if (!input || !input.value.trim()) return;
  var name = input.value.trim();
  var task = { id: newTaskId(), name: name, parentTaskId: parentId, priority: 'Medium' };
  await window.db.createTask(task);
  renderTasks();
  window.showTaskDetails(parentId);
};

window.deleteTask = async function(id) {
  await window.db.deleteTask(id);
  var panel = document.getElementById('task-detail-panel');
  if (panel && panel.innerHTML.includes("window.saveTaskDetail('" + id + "')")) {
    window.closeTaskDetails();
  }
  renderTasks();
};

window.toggleTask = async function(id) {
  await window.db.toggleTask(id);
  renderTasks();
};

window.openAddTaskPopup = function() {
  _selectedTaskGoalId = null;
  document.getElementById('task-name-input').value = '';
  var tagContainer = document.getElementById('task-goal-tags');
  window.db.getGoals().then(function(goals) {
    var html = '<div class="goal-tag selected" data-id="" onclick="selectTaskGoal(this)">None</div>';
    for (var tgi = 0; tgi < goals.length; tgi++) {
      html += '<div class="goal-tag" style="background:' + goals[tgi].color + '22;color:' + goals[tgi].color + '" data-id="' + goals[tgi].id + '" onclick="selectTaskGoal(this)">' + goals[tgi].name + '</div>';
    }
    tagContainer.innerHTML = html;
    
    // Set default priority selection to Medium dot
    window.selectPriority('Medium');
    
    document.getElementById('add-task-popup').style.display = 'flex';
    setTimeout(function() { document.getElementById('task-name-input').focus(); }, 100);
  });
};

window.closeAddTaskPopup = function(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('add-task-popup').style.display = 'none';
};

window.selectTaskGoal = function(el) {
  var all = document.querySelectorAll('#task-goal-tags .goal-tag');
  all.forEach(function(tag) { tag.classList.remove('selected'); });
  el.classList.add('selected');
  _selectedTaskGoalId = el.dataset.id || null;
};

window.saveTask = function() {
  var name = document.getElementById('task-name-input').value.trim();
  if (!name) return;
  var task = { id: newTaskId(), name: name, goalId: _selectedTaskGoalId, priority: _selectedPriority };
  window.db.createTask(task).then(function(result) {
    if (result) {
      document.getElementById('task-name-input').value = '';
      _selectedTaskGoalId = null;
      window.closeAddTaskPopup();
      renderTasks();
    }
  }).catch(function(err) {
    /* Failed to save task */
  });
};

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
      // Helper function imported / loaded globally
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
        if (t.completed) {
          lbl = '<span class="gt-label gt-label-done">&#10003; Done</span>';
        } else {
          lbl = '<span class="gt-label gt-label-added">&#10003; Added</span>';
        }
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

window.db.getSetting('taskSortBy').then(function(val) {
  if (val) {
    _sortBy = val;
    if (typeof renderTasks === 'function') renderTasks();
  }
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

/* Panel resizer */
(function initPanelResizer() {
  var resizer = document.getElementById('panel-resizer');
  var panel = document.getElementById('tasks-list-panel');
  if (!resizer || !panel) return;
  var startX, startW;
  resizer.addEventListener('mousedown', function(e) {
    startX = e.clientX;
    startW = panel.offsetWidth;
    resizer.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  function onMove(e) {
    var w = startW + e.clientX - startX;
    if (w < 200) w = 200;
    if (w > 600) w = 600;
    panel.style.width = w + 'px';
  }
  function onUp() {
    resizer.classList.remove('resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
})();
