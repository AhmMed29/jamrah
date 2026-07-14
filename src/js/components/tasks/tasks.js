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

window.showTaskDetails = function(id) {
  Promise.all([window.db.getTasks(), window.db.getGoals()]).then(function(results) {
    var tasks = results[0];
    var goals = results[1];
    if (!tasks || !tasks.length) return;
    var task = null;
    for (var si = 0; si < tasks.length; si++) {
      if (tasks[si].id === id) { task = tasks[si]; break; }
    }
    if (!task) return;

    var subtasks = [];
    for (var si = 0; si < tasks.length; si++) {
      if (tasks[si].parentTaskId === id) subtasks.push(tasks[si]);
    }

    var goalName = '';
    if (task.goalId && goals) {
      for (var gi = 0; gi < goals.length; gi++) {
        if (goals[gi].id === task.goalId) { goalName = goals[gi].name; break; }
      }
    }

    var dateStr = task.createdAt || '';
    var formattedDate = dateStr;
    if (dateStr) {
      var parts = dateStr.split(' ');
      if (parts.length >= 1) {
        var dateParts = parts[0].split('-');
        if (dateParts.length === 3) {
          var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          formattedDate = months[parseInt(dateParts[1]) - 1] + ' ' + parseInt(dateParts[2]) + ', ' + dateParts[0];
        }
      }
    }

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.parentNode.removeChild(overlay); });

    var card = document.createElement('div');
    card.style.cssText = 'background:#fff;border-radius:20px;padding:28px;width:100%;max-width:440px;box-shadow:0 20px 60px rgba(0,0,0,0.15);position:relative;animation:modalIn 0.2s ease-out;font-family:\'Manrope\',sans-serif;';

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#9ca3af;cursor:pointer;border:none;background:#f3f4f6;font-size:20px;line-height:1;';
    closeBtn.addEventListener('click', function() { overlay.parentNode.removeChild(overlay); });
    card.appendChild(closeBtn);

    // Title / Name
    var title = document.createElement('h2');
    title.textContent = task.name;
    title.style.cssText = 'font-size:18px;font-weight:700;color:#1F2937;margin:0 0 16px 0;padding-right:36px;word-break:break-word;';
    card.appendChild(title);

    // Priority Dot & Tags Row
    var metaRow = document.createElement('div');
    metaRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:20px;flex-wrap:wrap;';
    
    var dotColor = '#cbd5e1';
    if (task.priority === 'High') dotColor = '#ef4444';
    else if (task.priority === 'Medium') dotColor = '#f59e0b';
    else if (task.priority === 'Low') dotColor = '#10b981';

    var dotBadge = document.createElement('span');
    dotBadge.style.cssText = 'display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#374151;background:#f3f4f6;padding:4px 10px;border-radius:8px;';
    dotBadge.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:' + dotColor + ';"></span> ' + (task.priority || 'None');
    metaRow.appendChild(dotBadge);

    if (goalName) {
      var goalBadge = document.createElement('span');
      goalBadge.style.cssText = 'font-size:12px;font-weight:600;color:#3b82f6;background:#eff6ff;padding:4px 10px;border-radius:8px;';
      goalBadge.textContent = goalName;
      metaRow.appendChild(goalBadge);
    }

    if (task.completed) {
      var doneBadge = document.createElement('span');
      doneBadge.style.cssText = 'font-size:12px;font-weight:600;color:#10b981;background:#ecfdf5;padding:4px 10px;border-radius:8px;';
      doneBadge.textContent = 'Completed';
      metaRow.appendChild(doneBadge);
    }
    card.appendChild(metaRow);

    // Date display
    var dateEl = document.createElement('div');
    dateEl.style.cssText = 'font-size:12px;color:#9ca3af;margin-bottom:20px;display:flex;align-items:center;gap:6px;';
    dateEl.innerHTML = '<svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> Created on ' + formattedDate;
    card.appendChild(dateEl);

    // Subtasks Section
    var subtasksTitle = document.createElement('h3');
    subtasksTitle.textContent = 'Subtasks';
    subtasksTitle.style.cssText = 'font-size:13px;font-weight:700;color:#4b5563;text-transform:uppercase;margin:0 0 8px 0;letter-spacing:0.05em;';
    card.appendChild(subtasksTitle);

    var subList = document.createElement('div');
    subList.style.cssText = 'display:flex;flex-direction:column;gap:8px;max-height:160px;overflow-y:auto;margin-bottom:16px;';
    
    if (subtasks.length === 0) {
      subList.innerHTML = '<div style="font-size:12px;color:#9ca3af;padding:8px 0;">No subtasks yet.</div>';
    } else {
      subtasks.forEach(function(st) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;';
        
        var left = document.createElement('div');
        left.style.cssText = 'display:flex;align-items:center;gap:8px;';
        if (st.completed) {
          left.innerHTML = '<span style="color:#10b981;font-size:14px;">✓</span> <span style="text-decoration:line-through;color:#9ca3af;font-size:13px;">' + escapeHtml(st.name) + '</span>';
        } else {
          left.innerHTML = '<span style="color:#cbd5e1;font-size:14px;">○</span> <span style="color:#374151;font-size:13px;">' + escapeHtml(st.name) + '</span>';
        }
        row.appendChild(left);
        subList.appendChild(row);
      });
    }
    card.appendChild(subList);

    // Add subtask input field inside details popup!
    var addSubBox = document.createElement('div');
    addSubBox.style.cssText = 'display:flex;gap:8px;margin-bottom:20px;';
    var addSubInput = document.createElement('input');
    addSubInput.type = 'text';
    addSubInput.placeholder = 'Add subtask name...';
    addSubInput.style.cssText = 'flex:1;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;outline:none;font-family:inherit;';
    var addSubBtn = document.createElement('button');
    addSubBtn.textContent = 'Add';
    addSubBtn.style.cssText = 'background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;';
    
    async function handleAddSub() {
      var name = addSubInput.value.trim();
      if (!name) return;
      var task = { id: newTaskId(), name: name, parentTaskId: id, priority: 'Medium' };
      var success = await window.db.createTask(task);
      if (success) {
        overlay.parentNode.removeChild(overlay);
        window.showTaskDetails(id);
        renderTasks();
      }
    }
    addSubBtn.addEventListener('click', handleAddSub);
    addSubInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') handleAddSub(); });
    
    addSubBox.appendChild(addSubInput);
    addSubBox.appendChild(addSubBtn);
    card.appendChild(addSubBox);

    // Actions Row
    var actionRow = document.createElement('div');
    actionRow.style.cssText = 'display:flex;gap:12px;border-top:1px solid #f1f5f9;padding-top:16px;';
    
    var editBtn = document.createElement('button');
    editBtn.textContent = 'Edit Task';
    editBtn.style.cssText = 'flex:1;padding:10px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;';
    editBtn.addEventListener('click', function() { overlay.parentNode.removeChild(overlay); window.editTask(id); });
    
    var deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.style.cssText = 'padding:10px 16px;background:#fef2f2;color:#ef4444;border:1px solid #fca5a5;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;';
    deleteBtn.addEventListener('click', function() { overlay.parentNode.removeChild(overlay); window.deleteTask(id); });
    
    actionRow.appendChild(editBtn);
    actionRow.appendChild(deleteBtn);
    card.appendChild(actionRow);

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  });
};

window.editTask = function(id) {
  window.db.getTasks().then(function(tasks) {
    if (!tasks || !tasks.length) return;
    var task = null;
    for (var ei = 0; ei < tasks.length; ei++) {
      if (tasks[ei].id === id) { task = tasks[ei]; break; }
    }
    if (!task) return;
    var _localPriority = task.priority || 'Medium';
    
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;padding:20px';
    
    var card = document.createElement('div');
    card.style.cssText = 'background:#fff;border-radius:16px;padding:24px;width:100%;max-width:400px;box-shadow:0 8px 30px rgba(0,0,0,0.15);font-family:\'Manrope\',sans-serif;';
    
    var h = document.createElement('h3');
    h.textContent = 'Edit Task';
    h.style.cssText = 'font-size:16px;font-weight:700;color:#1F2937;margin-bottom:16px;margin-top:0';
    card.appendChild(h);
    
    var input = document.createElement('input');
    input.type = 'text'; input.value = task.name;
    input.style.cssText = 'width:100%;padding:10px 14px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;color:#374151;outline:none;box-sizing:border-box;font-family:inherit;margin-bottom:16px;';
    card.appendChild(input);
    
    var pLabel = document.createElement('label');
    pLabel.textContent = 'Priority';
    pLabel.style.cssText = 'display:block;font-size:12px;font-weight:600;color:#6B7280;margin-bottom:8px;text-transform:uppercase;';
    card.appendChild(pLabel);
    
    var pWrap = document.createElement('div');
    pWrap.style.cssText = 'display:flex;gap:12px;margin-bottom:20px;';
    
    var priorities = ['Low', 'Medium', 'High'];
    var pColors = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444' };
    
    priorities.forEach(function(pv) {
      var btn = document.createElement('button');
      btn.style.cssText = 'width:28px;height:28px;border-radius:50%;background:' + pColors[pv] + ';border:2px solid transparent;cursor:pointer;transition:all 0.15s;outline:none;position:relative;';
      btn.title = pv;
      
      if (pv === _localPriority) {
        btn.style.borderColor = '#0b1c30';
        btn.style.transform = 'scale(1.15)';
      }
      
      btn.addEventListener('click', function() {
        pWrap.querySelectorAll('button').forEach(function(b) {
          b.style.borderColor = 'transparent';
          b.style.transform = 'none';
        });
        btn.style.borderColor = '#0b1c30';
        btn.style.transform = 'scale(1.15)';
        _localPriority = pv;
      });
      pWrap.appendChild(btn);
    });
    card.appendChild(pWrap);
    
    var btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';
    
    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:8px 16px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;color:#4b5563;background:#fff;cursor:pointer;font-weight:500;font-family:inherit;';
    cancelBtn.addEventListener('click', removeModal);
    
    var saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.cssText = 'padding:8px 16px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600;font-family:inherit;';
    saveBtn.addEventListener('click', function() {
      var n = input.value.trim();
      if (n) {
        window.db.updateTask(id, { name: n, priority: _localPriority }).then(function() { removeModal(); renderTasks(); });
      } else {
        removeModal();
      }
    });
    
    btnWrap.appendChild(cancelBtn);
    btnWrap.appendChild(saveBtn);
    card.appendChild(btnWrap);
    
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    
    function removeModal() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    overlay.addEventListener('click', function(e) { if (e.target === overlay) removeModal(); });
    
    setTimeout(function() { input.focus(); input.select(); }, 50);
  });
};

var _taskRenderTimeout = null;
window.toggleTask = function(id) {
  var el = document.getElementById('task-checkbox-' + id);
  var wasDone = el ? !el.checked : false;
  if (window.AudioManager) window.AudioManager.playSound(wasDone ? 'checkbox-uncheck.mp3' : 'checkbox-check.mp3');
  
  var nameSpan = document.querySelector('#task-item-' + id + ' .task-name');
  if (nameSpan) {
    if (!wasDone) nameSpan.classList.add('done');
    else nameSpan.classList.remove('done');
  }

  window.db.toggleTask(id).then(function() { 
    if (_taskRenderTimeout) clearTimeout(_taskRenderTimeout);
    _taskRenderTimeout = setTimeout(function() {
      renderTasks(); 
    }, 600);
  });
};

window.deleteTask = function(id) {
  showConfirmModal('Delete Task', 'Are you sure you want to delete this task?', 'Delete', function() {
    window.db.deleteTask(id).then(function() { renderTasks(); });
  });
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
