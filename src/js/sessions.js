// sessions.js - sessions and tags management (SQLite-based)

var activeSession = null;
var editingSessionId = null;
var editingTagForSession = null;
var editingGoalForSession = null;
var addSessionTagId = null;
var addSessionGoalId = null;
var selectedTagColor = '#3B82F6';

function getTags() {
  try { return window.db.getTags() || []; } catch(e) { return []; }
}

function getTagsWithGoals() {
  try { return window.db.getTagsWithGoals() || { tags: [], goals: [] }; } catch(e) { return { tags: [], goals: [] }; }
}

function saveTags(tags) {
  for (var i = 0; i < tags.length; i++) {
    window.db.saveTag(tags[i]);
  }
}

function getSessions() {
  try { return window.db.getSessionsGrouped() || {}; } catch(e) { return {}; }
}

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function formatTimeHM(ts) {
  var d = new Date(ts);
  var h = d.getHours(), m = d.getMinutes();
  var ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
}

function hexToRgb(hex) {
  var r = parseInt(hex.slice(1,3), 16);
  var g = parseInt(hex.slice(3,5), 16);
  var b = parseInt(hex.slice(5,7), 16);
  return r + ',' + g + ',' + b;
}

function renderTimeline() {
  var container = document.getElementById('focusTimeline');
  if (!container) return;
  var sessions = getSessions();
  var html = '<div class="absolute left-4 top-2 bottom-0 w-px bg-gray-100"></div>';

  var activeSessionHtml = '';

  if (activeSession) {
    var now = Date.now();
    var elapsedInCurrentRun = activeSession.lastResumeTime ? now - activeSession.lastResumeTime : 0;
    var totalElapsed = activeSession.accumulatedMs + elapsedInCurrentRun;
    var totalFocusMin = totalElapsed / 60000;
    var estimatedEnd = now + remainingSeconds * 1000;
    var timeRange = formatTimeHM(activeSession.startTime) + ' - ' + formatTimeHM(estimatedEnd);
    var durationText = totalFocusMin < 1 ? (Math.round(totalFocusMin * 60) + 's') : totalFocusMin.toFixed(1) + 'm';
    var tagHtml = '';
    if (activeSession.tagId) {
      var allTags = getTags();
      var tag = allTags.find(function(t) { return t.id === activeSession.tagId; });
      if (tag) {
        tagHtml = '<span class="tag-bubble" style="background:' + 'rgba(' + hexToRgb(tag.color) + ',0.12);color:' + tag.color + ';border:1px solid rgba(' + hexToRgb(tag.color) + ',0.25)">#' + tag.name + '</span>';
      }
    }

    activeSessionHtml += '<div class="flex items-start mb-4 relative z-10 group cursor-pointer" data-sid="' + activeSession.id + '">';
    activeSessionHtml += '<div class="w-6 h-6 rounded-full bg-purple-light flex items-center justify-center text-purple-brand mt-0.5 border-2 border-white relative -ml-1.5 opacity-70">';
    activeSessionHtml += '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z"></path></svg>';
    activeSessionHtml += '</div>';
    activeSessionHtml += '<div class="ml-3 flex-1">';
    activeSessionHtml += '<div class="flex justify-between items-baseline">';
    activeSessionHtml += '<span class="text-xs text-gray-400">' + timeRange + '</span>';
    activeSessionHtml += '<span class="text-xs text-gray-400">' + durationText + '</span>';
    activeSessionHtml += '</div>';
    if (activeSession.taskName) {
      activeSessionHtml += '<p class="text-sm text-gray-600 mt-0.5">' + activeSession.taskName + '</p>';
    }
    if (tagHtml) {
      activeSessionHtml += '<div class="mt-1">' + tagHtml + '</div>';
    }
    activeSessionHtml += '</div></div>';
  }

  var dates = Object.keys(sessions).sort().reverse();
  var today = todayKey();
  var todayRendered = false;

  for (var di = 0; di < dates.length; di++) {
    var dateStr = dates[di];
    var entries = sessions[dateStr];
    if (!entries || entries.length === 0) continue;
    var label = dateStr === today ? 'Today' : formatDateLabel(dateStr);
    html += '<div class="mb-6 relative">';
    html += '<div class="text-sm font-medium text-gray-400 mb-3 bg-white inline-block pr-2 relative z-10 -ml-3">' + label + '</div>';
    if (label === 'Today' && activeSessionHtml) {
      html += activeSessionHtml;
      todayRendered = true;
    }
    for (var ei = 0; ei < entries.length; ei++) {
      var e = entries[ei];
      var timeRange2 = formatTimeHM(e.startTime) + ' - ' + formatTimeHM(e.endTime);
      var durMin = e.focusMinutes;
      var durText = durMin < 1 ? (Math.round(durMin * 60) + 's') : (durMin < 10 ? durMin.toFixed(1) : Math.round(durMin)) + 'm';
      var tagHtml2 = '';
      if (e.tagId) {
        var allTags2 = getTags();
        var tag2 = allTags2.find(function(t) { return t.id === e.tagId; });
        if (tag2) {
          tagHtml2 = '<span class="tag-bubble" style="background:' + tag2.color + '20;color:' + tag2.color + ';border:1px solid ' + tag2.color + '40">#' + tag2.name + '</span>';
        }
      }
      html += '<div class="flex items-start mb-4 relative z-10 group cursor-pointer" data-sid="' + e.id + '">';
      html += '<div class="w-6 h-6 rounded-full bg-purple-light flex items-center justify-center text-purple-brand mt-0.5 border-2 border-white relative -ml-1.5">';
      html += '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z"></path></svg>';
      html += '</div>';
      html += '<div class="ml-3 flex-1">';
      html += '<div class="flex justify-between items-baseline">';
      html += '<span class="text-xs text-gray-400">' + timeRange2 + '</span>';
      html += '<span class="text-xs text-gray-400">' + durText + '</span>';
      html += '</div>';
      if (e.taskName) {
        html += '<p class="text-sm text-gray-600 mt-0.5">' + e.taskName + '</p>';
      }
      if (tagHtml2) {
        html += '<div class="mt-1">' + tagHtml2 + '</div>';
      }
      html += '</div></div>';
    }
    html += '</div>';
  }

  if (activeSessionHtml && !todayRendered) {
    html += '<div class="mb-6 relative">';
    html += '<div class="text-sm font-medium text-gray-400 mb-3 bg-white inline-block pr-2 relative z-10 -ml-3">Today</div>';
    html += activeSessionHtml;
    html += '</div>';
  }

  if (!activeSession && dates.length === 0) {
    html += '<div class="text-sm text-gray-400 text-center py-8">No sessions yet</div>';
  }

  container.innerHTML = html;
}

function formatDateLabel(dateStr) {
  var d = new Date(dateStr + 'T00:00:00');
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[d.getMonth()] + ' ' + d.getDate();
}

// Session event hooks
function onSessionStart() {
  if (activeSession) {
    activeSession = null;
  }
  activeSession = {
    id: 's_' + Date.now(),
    startTime: Date.now(),
    accumulatedMs: 0,
    lastResumeTime: Date.now(),
    taskName: '',
    tagId: null,
    goalId: null,
    status: 'running'
  };
  renderTimeline();
  renderSessionTimeline();
}

function onSessionPause() {
  if (!activeSession || !activeSession.lastResumeTime) return;
  activeSession.accumulatedMs += Date.now() - activeSession.lastResumeTime;
  activeSession.lastResumeTime = null;
  activeSession.status = 'paused';
  renderTimeline();
  renderSessionTimeline();
}

function onSessionResume() {
  if (!activeSession) return;
  activeSession.lastResumeTime = Date.now();
  activeSession.status = 'running';
  renderTimeline();
  renderSessionTimeline();
}

function onSessionComplete(focusMinutes, plannedMinutes) {
  if (!activeSession) return;
  if (activeSession.lastResumeTime) {
    activeSession.accumulatedMs += Date.now() - activeSession.lastResumeTime;
  }
  if (focusMinutes === undefined) {
    focusMinutes = activeSession.accumulatedMs / 60000;
  }
  var endTime = Date.now();
  var session = {
    id: activeSession.id,
    startTime: activeSession.startTime,
    endTime: endTime,
    plannedMinutes: plannedMinutes || focusMinutes,
    focusMinutes: focusMinutes,
    taskName: activeSession.taskName || '',
    note: activeSession.note || '',
    tagId: activeSession.tagId || null,
    goalId: activeSession.goalId || null
  };
  window.db.saveSession(session);
  activeSession = null;
  renderTimeline();
  renderSessionTimeline();
}

function onSessionCancel() {
  if (!activeSession) return;
  activeSession = null;
  renderTimeline();
  renderSessionTimeline();
}

renderTimeline();
renderSessionTimeline();

// Event delegation for timeline entries
document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-sid]');
  if (el && document.getElementById('focusTimeline') && document.getElementById('focusTimeline').contains(el)) {
    var sid = el.getAttribute('data-sid');
    if (sid) window.openSessionPopup(sid);
  }
});

// Patch timer functions to hook into session tracking
var _origToggleTimer = window.toggleTimer;
window.toggleTimer = function() {
  if (remainingSeconds <= 0) { window.openTimePopup(); return; }
  if (isRunning) {
    _origToggleTimer();
    onSessionPause();
  } else {
    var isFresh = remainingSeconds === totalSeconds;
    _origToggleTimer();
    if (isFresh) onSessionStart(); else onSessionResume();
  }
};

var _origCompleteTimer = completeTimer;
completeTimer = function() {
  var sp = document.getElementById('sessionPopup');
  if (sp) sp.classList.add('hidden');
  var td = document.getElementById('tagDropdown');
  if (td) td.classList.add('hidden');
  var elapsedSec = totalSeconds - remainingSeconds;
  var plannedMinutes = totalSeconds / 60;
  if (activeSession && activeSession.lastResumeTime) {
    activeSession.accumulatedMs += Date.now() - activeSession.lastResumeTime;
    activeSession.lastResumeTime = null;
  }
  _origCompleteTimer();
  onSessionComplete(elapsedSec / 60, plannedMinutes);
};

var _origConfirmEnd = window.confirmEnd;
window.confirmEnd = function() {
  var sp = document.getElementById('sessionPopup');
  if (sp) sp.classList.add('hidden');
  var td = document.getElementById('tagDropdown');
  if (td) td.classList.add('hidden');
  var elapsedSec = totalSeconds - remainingSeconds;
  var plannedMinutes = totalSeconds / 60;
  if (activeSession && activeSession.lastResumeTime) {
    activeSession.accumulatedMs += Date.now() - activeSession.lastResumeTime;
    activeSession.lastResumeTime = null;
  }
  _origConfirmEnd();
  onSessionComplete(elapsedSec / 60, plannedMinutes);
};

var _origSetTimer = window.setTimer;
window.setTimer = function() {
  _origSetTimer();
  onSessionCancel();
};

// Tag selection functions
window.selectSessionTag = function(tagId) {
  editingTagForSession = tagId;
  renderSessionTagDisplay();
  var td = document.getElementById('tagDropdown');
  if (td) td.classList.add('hidden');
};

window.selectSessionGoal = function(goalId) {
  editingGoalForSession = goalId;
  renderSessionTagDisplay();
  var td = document.getElementById('tagDropdown');
  if (td) td.classList.add('hidden');
};

window.selectAddSessionTag = function(tagId) {
  addSessionTagId = tagId;
  renderAddSessionTagDisplay();
  var td = document.getElementById('addTagDropdown');
  if (td) td.classList.add('hidden');
};

window.selectAddSessionGoal = function(goalId) {
  addSessionGoalId = goalId;
  renderAddSessionTagDisplay();
  var td = document.getElementById('addTagDropdown');
  if (td) td.classList.add('hidden');
};

function renderTagList(listId, mode) {
  var container = document.getElementById(listId);
  if (!container) return;
  var data = getTagsWithGoals();
  var tags = data.tags || [];
  var goals = data.goals || [];
  var fn = mode === 'edit' ? 'selectSessionTag' : 'selectAddSessionTag';
  var goalFn = mode === 'edit' ? 'selectSessionGoal' : 'selectAddSessionGoal';
  var html = '';
  for (var i = 0; i < tags.length; i++) {
    var t = tags[i];
    html += '<div class="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer text-sm" onclick="window.' + fn + '(\'' + t.id + '\')">';
    html += '<span class="w-3 h-3 rounded-full" style="background:' + t.color + '"></span>';
    html += '<span class="text-gray-700">' + t.name + '</span>';
    html += '</div>';
  }
  if (goals.length > 0) {
    html += '<div class="text-xs text-gray-400 px-3 py-1.5 border-t border-gray-100 mt-1 pt-1.5">Goals</div>';
    for (var j = 0; j < goals.length; j++) {
      var g = goals[j];
      html += '<div class="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer text-sm" onclick="window.' + goalFn + '(\'' + g.goalId + '\')">';
      html += '<span class="w-3 h-3 rounded-full" style="background:' + g.color + '"></span>';
      html += '<span class="text-gray-700">' + g.name + '</span>';
      html += '</div>';
    }
  }
  if (tags.length === 0 && goals.length === 0) {
    html = '<div class="text-xs text-gray-400 px-3 py-2">No tags or goals yet</div>';
  }
  container.innerHTML = html;
}

window.toggleTagDropdown = function(e) {
  e.stopPropagation();
  var dd = document.getElementById('tagDropdown');
  if (!dd) return;
  dd.classList.toggle('hidden');
  if (!dd.classList.contains('hidden')) {
    renderTagList('tagList', 'edit');
  }
};

window.toggleAddTagDropdown = function(e) {
  e.stopPropagation();
  var dd = document.getElementById('addTagDropdown');
  if (!dd) return;
  dd.classList.toggle('hidden');
  if (!dd.classList.contains('hidden')) {
    renderTagList('addTagList', 'add');
  }
};

window.openSessionPopup = function(sessionId) {
  editingSessionId = sessionId;
  var session = null;
  if (activeSession && activeSession.id === sessionId) {
    session = activeSession;
  } else {
    var sessions = getSessions();
    var keys = Object.keys(sessions);
    for (var k = 0; k < keys.length; k++) {
      for (var e = 0; e < sessions[keys[k]].length; e++) {
        if (sessions[keys[k]][e].id === sessionId) {
          session = sessions[keys[k]][e];
          break;
        }
      }
      if (session) break;
    }
  }
  if (!session) return;
  var input = document.getElementById('sessionTaskInput');
  if (input) input.value = session.taskName || '';
  editingTagForSession = session.tagId || null;
  editingGoalForSession = session.goalId || null;
  renderSessionTagDisplay();
  var popup = document.getElementById('sessionPopup');
  if (popup) popup.classList.remove('hidden');
};

window.closeSessionPopup = function(e) {
  if (!e || e.target === e.currentTarget) {
    var popup = document.getElementById('sessionPopup');
    if (popup) popup.classList.add('hidden');
    var td = document.getElementById('tagDropdown');
    if (td) td.classList.add('hidden');
  }
};

window.saveSessionEdit = function() {
  var taskName = (document.getElementById('sessionTaskInput').value || '').trim();
  if (activeSession && activeSession.id === editingSessionId) {
    activeSession.taskName = taskName;
    activeSession.tagId = editingTagForSession;
    activeSession.goalId = editingGoalForSession;
    renderTimeline();
    renderSessionTimeline();
    var popup = document.getElementById('sessionPopup');
    if (popup) popup.classList.add('hidden');
    return;
  }
  window.db.updateSession(editingSessionId, taskName, editingTagForSession, '', editingGoalForSession);
  renderTimeline();
  renderSessionTimeline();
  var popup = document.getElementById('sessionPopup');
  if (popup) popup.classList.add('hidden');
};

function renderSessionTagDisplay() {
  var container = document.getElementById('sessionTagDisplay');
  if (!container) return;
  var parts = [];
  if (editingTagForSession) {
    var tags = getTags();
    var tag = tags.find(function(t) { return t.id === editingTagForSession; });
    if (tag) {
      parts.push('<span class="tag-bubble" style="background:rgba(' + hexToRgb(tag.color) + ',0.12);color:' + tag.color + ';border:1px solid rgba(' + hexToRgb(tag.color) + ',0.25)">#' + tag.name + ' <span style="cursor:pointer;margin-left:4px" onclick="window.clearSessionTag()">✕</span></span>');
    }
  }
  if (editingGoalForSession) {
    var gw = getTagsWithGoals();
    var goal = (gw.goals || []).find(function(g) { return g.goalId === editingGoalForSession; });
    if (goal) {
      parts.push('<span class="tag-bubble" style="background:rgba(' + hexToRgb(goal.color) + ',0.12);color:' + goal.color + ';border:1px solid rgba(' + hexToRgb(goal.color) + ',0.25)">' + goal.name + ' <span style="cursor:pointer;margin-left:4px" onclick="window.clearSessionGoal()">✕</span></span>');
    }
  }
  container.innerHTML = parts.length > 0 ? parts.join(' ') : '<span class="text-xs text-gray-400">None selected</span>';
}

window.clearSessionTag = function() {
  editingTagForSession = null;
  renderSessionTagDisplay();
  var td = document.getElementById('tagDropdown');
  if (td) td.classList.add('hidden');
};

window.clearSessionGoal = function() {
  editingGoalForSession = null;
  renderSessionTagDisplay();
  var td = document.getElementById('tagDropdown');
  if (td) td.classList.add('hidden');
};

// New Tag Popup
var PALETTE = ['#3B82F6','#8A7CFB','#EC4899','#EF4444','#F59E0B','#10B981','#14B8A6','#6366F1','#84CC16','#06B4D0'];

window.openNewTagPopup = function() {
  var td1 = document.getElementById('tagDropdown');
  if (td1) td1.classList.add('hidden');
  var td2 = document.getElementById('addTagDropdown');
  if (td2) td2.classList.add('hidden');
  var inp = document.getElementById('newTagNameInput');
  if (inp) inp.value = '';
  selectedTagColor = PALETTE[0];
  renderColorPalette();
  var popup = document.getElementById('newTagPopup');
  if (popup) popup.classList.remove('hidden');
  setTimeout(function() { var inp2 = document.getElementById('newTagNameInput'); if (inp2) inp2.focus(); }, 100);
};

window.closeNewTagPopup = function(e) {
  if (!e || e.target === e.currentTarget) {
    var popup = document.getElementById('newTagPopup');
    if (popup) popup.classList.add('hidden');
  }
};

function renderColorPalette() {
  var container = document.getElementById('colorPalette');
  if (!container) return;
  var html = '';
  for (var i = 0; i < PALETTE.length; i++) {
    html += '<div class="color-swatch' + (PALETTE[i] === selectedTagColor ? ' selected' : '') + '" style="background:' + PALETTE[i] + '" onclick="window.selectTagColor(\'' + PALETTE[i] + '\')"></div>';
  }
  container.innerHTML = html;
}

window.selectTagColor = function(color) {
  selectedTagColor = color;
  renderColorPalette();
};

window.saveNewTag = function() {
  var name = (document.getElementById('newTagNameInput').value || '').trim();
  if (!name) return;
  var tags = getTags();
  var newTag = { id: 'tag_' + Date.now(), name: name, color: selectedTagColor };
  tags.push(newTag);
  saveTags(tags);
  var popup = document.getElementById('newTagPopup');
  if (popup) popup.classList.add('hidden');
};

// Add Session Popup
window.openAddSessionPopup = function() {
  var inp1 = document.getElementById('addSessionTaskInput');
  var inp2 = document.getElementById('addSessionDurationInput');
  if (inp1) inp1.value = '';
  if (inp2) inp2.value = '25';
  addSessionTagId = null;
  addSessionGoalId = null;
  renderAddSessionTagDisplay();
  var popup = document.getElementById('addSessionPopup');
  if (popup) popup.classList.remove('hidden');
};

window.closeAddSessionPopup = function(e) {
  if (!e || e.target === e.currentTarget) {
    var popup = document.getElementById('addSessionPopup');
    if (popup) popup.classList.add('hidden');
    var td = document.getElementById('addTagDropdown');
    if (td) td.classList.add('hidden');
  }
};

window.saveAddSession = function() {
  var taskName = (document.getElementById('addSessionTaskInput').value || '').trim();
  var duration = parseFloat(document.getElementById('addSessionDurationInput').value) || 25;
  var now = Date.now();
  var session = {
    id: 's_' + now,
    startTime: now - duration * 60000,
    endTime: now,
    plannedMinutes: duration,
    focusMinutes: duration,
    taskName: taskName,
    note: '',
    tagId: addSessionTagId || null,
    goalId: addSessionGoalId || null
  };
  window.db.saveSession(session);
  renderTimeline();
  renderSessionTimeline();
  var popup = document.getElementById('addSessionPopup');
  if (popup) popup.classList.add('hidden');
};

function renderAddSessionTagDisplay() {
  var container = document.getElementById('addSessionTagDisplay');
  if (!container) return;
  var parts = [];
  if (addSessionTagId) {
    var tags = getTags();
    var tag = tags.find(function(t) { return t.id === addSessionTagId; });
    if (tag) {
      parts.push('<span class="tag-bubble" style="background:rgba(' + hexToRgb(tag.color) + ',0.12);color:' + tag.color + ';border:1px solid rgba(' + hexToRgb(tag.color) + ',0.25)">#' + tag.name + ' <span style="cursor:pointer;margin-left:4px" onclick="window.clearAddSessionTag()">✕</span></span>');
    }
  }
  if (addSessionGoalId) {
    var gw = getTagsWithGoals();
    var goal = (gw.goals || []).find(function(g) { return g.goalId === addSessionGoalId; });
    if (goal) {
      parts.push('<span class="tag-bubble" style="background:rgba(' + hexToRgb(goal.color) + ',0.12);color:' + goal.color + ';border:1px solid rgba(' + hexToRgb(goal.color) + ',0.25)">' + goal.name + ' <span style="cursor:pointer;margin-left:4px" onclick="window.clearAddSessionGoal()">✕</span></span>');
    }
  }
  container.innerHTML = parts.length > 0 ? parts.join(' ') : '<span class="text-xs text-gray-400">None selected</span>';
}

window.clearAddSessionTag = function() {
  addSessionTagId = null;
  renderAddSessionTagDisplay();
  var td = document.getElementById('addTagDropdown');
  if (td) td.classList.add('hidden');
};

window.clearAddSessionGoal = function() {
  addSessionGoalId = null;
  renderAddSessionTagDisplay();
  var td = document.getElementById('addTagDropdown');
  if (td) td.classList.add('hidden');
};

/* ═══════════════════════════════════════
   Task dropdown for session editing
*/
function getTaskList() {
  try { return window.db.getTasks() || []; } catch(e) { return []; }
}

function getGoalName(goalId, goals) {
  if (!goalId || !goals) return '';
  for (var gi = 0; gi < goals.length; gi++) {
    if (goals[gi].id === goalId || goals[gi].goalId === goalId) return goals[gi].name;
  }
  return '';
}

function renderTaskList(taskListEl, inputEl, goalVarSetter) {
  var tasks = getTaskList();
  var gw = getTagsWithGoals();
  var goals = gw.goals || [];
  if (tasks.length === 0) {
    taskListEl.innerHTML = '<div class="text-sm text-gray-400 text-center py-4">No tasks yet</div>';
    return;
  }
  var html = '';
  for (var ti = 0; ti < tasks.length; ti++) {
    var t = tasks[ti];
    var gName = getGoalName(t.goalId, goals);
    var safeName = (t.name || '').replace(/'/g, "\\'");
    var safeGoalId = (t.goalId || '').replace(/'/g, "\\'");
    var safeGName = gName.replace(/'/g, "\\'");
    html += '<div class="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center justify-between" onclick="selectTaskFromList(\'' + safeName + '\',\'' + safeGoalId + '\',\'' + safeGName + '\')">' +
      '<span>' + (t.name || '') + '</span>' +
      (gName ? '<span class="text-xs text-gray-400">' + gName + '</span>' : '') +
    '</div>';
  }
  taskListEl.innerHTML = html;
}

window.toggleSessionTaskDropdown = function(e) {
  if (e) e.stopPropagation();
  var dd = document.getElementById('sessionTaskDropdown');
  var list = document.getElementById('sessionTaskList');
  if (!dd || !list) return;
  if (dd.classList.contains('hidden')) {
    renderTaskList(list, document.getElementById('sessionTaskInput'), function(goalId) { editingGoalForSession = goalId; });
    dd.classList.remove('hidden');
  } else {
    dd.classList.add('hidden');
  }
};

window.toggleAddSessionTaskDropdown = function(e) {
  if (e) e.stopPropagation();
  var dd = document.getElementById('addSessionTaskDropdown');
  var list = document.getElementById('addSessionTaskList');
  if (!dd || !list) return;
  if (dd.classList.contains('hidden')) {
    renderTaskList(list, document.getElementById('addSessionTaskInput'), function(goalId) { addSessionGoalId = goalId; });
    dd.classList.remove('hidden');
  } else {
    dd.classList.add('hidden');
  }
};

window.selectTaskFromList = function(taskName, goalId, goalName) {
  var sessionDd = document.getElementById('sessionTaskDropdown');
  var addDd = document.getElementById('addSessionTaskDropdown');
  if (sessionDd && !sessionDd.classList.contains('hidden')) {
    document.getElementById('sessionTaskInput').value = taskName;
    if (goalId) {
      editingGoalForSession = goalId;
      renderSessionTagDisplay();
    }
    sessionDd.classList.add('hidden');
  } else if (addDd && !addDd.classList.contains('hidden')) {
    document.getElementById('addSessionTaskInput').value = taskName;
    if (goalId) {
      addSessionGoalId = goalId;
      renderAddSessionTagDisplay();
    }
    addDd.classList.add('hidden');
  }
};

// Close dropdowns on outside click
document.addEventListener('click', function(e) {
  var sessionDd = document.getElementById('sessionTaskDropdown');
  var addDd = document.getElementById('addSessionTaskDropdown');
  if (sessionDd && !sessionDd.classList.contains('hidden') && !e.target.closest('#sessionTaskDropdown') && !e.target.closest('[onclick*="toggleSessionTaskDropdown"]')) {
    sessionDd.classList.add('hidden');
  }
  if (addDd && !addDd.classList.contains('hidden') && !e.target.closest('#addSessionTaskDropdown') && !e.target.closest('[onclick*="toggleAddSessionTaskDropdown"]')) {
    addDd.classList.add('hidden');
  }
});

/* ═══════════════════════════════════════
   🎯 Session Timeline (Horizontal Flow)
   التايم لاين الأفقي للجلسات - مستوحى من
   Warm Focus design palette
   ═══════════════════════════════════════ */

/* ─── Helper: format duration (minutes → readable) ─── */
function formatDuration(minutes) {
  if (minutes < 1) return Math.round(minutes * 60) + 's';
  if (minutes < 60) return Math.round(minutes) + 'm';
  var h = Math.floor(minutes / 60);
  var m = Math.round(minutes % 60);
  return h + 'h ' + m + 'm';
}

/* ─── Helper: get today's sessions sorted by startTime ─── */
function getTodaySessions() {
  try {
    var grouped = window.db.getSessionsGrouped() || {};
    var key = todayKey();
    var list = grouped[key] || [];
    return list.sort(function(a, b) { return a.startTime - b.startTime; });
  } catch(e) { return []; }
}

/* ─── Main render: draws the horizontal session timeline ───
   كل نود في التايم لاين لها هيكل ثابت:
   الوقت (فوق) → الدائرة (وسط) → المدة (تحت)
   والـ connector خط رفيع بين كل نود والتانية
   ───────────────────────────────────────────────────────── */
function renderSessionTimeline() {
  var track = document.getElementById('sessionTimelineTrack');
  if (!track) return;

  var todaySessions = getTodaySessions();
  var connector = '<div class="flex-shrink-0" style="width:24px;height:1px;background:#E5E7EB"></div>';

  /* ── Empty state: no sessions today ── */
  if (todaySessions.length === 0 && !activeSession) {
    track.innerHTML = '<div class="flex items-center gap-3 py-4" style="min-width:100%">' +
      connector +
      '<div class="flex flex-col items-center flex-shrink-0 relative z-10" onclick="openSessionTimelineModal(null)" style="cursor:pointer">' +
        '<span style="font-size:11px;color:#9CA3AF;font-weight:500;white-space:nowrap;margin-bottom:8px;opacity:0">00:00</span>' +
        '<div style="width:32px;height:32px;border-radius:50%;border:2px dashed #D1D5DB;display:flex;align-items:center;justify-content:center">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>' +
        '</div>' +
        '<span style="font-size:11px;color:#9CA3AF;font-weight:500;margin-top:8px;white-space:nowrap">Start</span>' +
      '</div>' +
    '</div>';
    return;
  }

  /* ── Build node list: completed sessions + break + active + upcoming ── */
  var allNodes = [];

  for (var i = 0; i < todaySessions.length; i++) {
    var s = todaySessions[i];
    allNodes.push({ type: 'session', data: s, state: 'completed' });
    if (i < todaySessions.length - 1 || activeSession) {
      allNodes.push({ type: 'break' });
    }
  }

  if (activeSession) {
    allNodes.push({ type: 'session', data: activeSession, state: 'active' });
  }

  var futureCount = Math.max(2, 4 - allNodes.length);
  for (var f = 0; f < futureCount; f++) {
    if (f > 0 || (allNodes.length > 0 && allNodes[allNodes.length - 1].type === 'break')) {
    } else {
      allNodes.push({ type: 'break', upcoming: true });
    }
    allNodes.push({ type: 'session', state: 'upcoming' });
  }

  /* ── Generate HTML for all nodes ── */
  var html = '';
  for (var n = 0; n < allNodes.length; n++) {
    var node = allNodes[n];

    /* ─── BREAK node (نقطة الاستراحة - قابلة للضغط تفتح popup) ─── */
    if (node.type === 'break') {
      html += connector;
      var breakCls = node.upcoming ? '#F3F4F6' : '#D1D5DB';
      html += '<div class="flex flex-col items-center flex-shrink-0 relative z-10" onclick="openSessionTimelineModal(null)" style="cursor:pointer">';
      html += '<span style="font-size:11px;color:#9CA3AF;font-weight:500;white-space:nowrap;margin-bottom:8px;opacity:0">Break</span>';
      html += '<div style="width:14px;height:14px;border-radius:50%;background:' + breakCls + ';border:3px solid #fff;flex-shrink:0"></div>';
      html += '<span style="font-size:11px;color:#9CA3AF;font-weight:500;margin-top:8px;opacity:0">0m</span>';
      html += '</div>';
      continue;
    }

    /* ─── COMPLETED session (جلسة منتهية - قابلة للضغط) ─── */
    if (node.type === 'session' && node.state === 'completed') {
      var s = node.data;
      var timeLabel = formatTimeHM(s.startTime) + ' - ' + formatTimeHM(s.endTime);
      var durLabel = formatDuration(s.focusMinutes);
      html += connector;
      html += '<div class="flex flex-col items-center flex-shrink-0 relative z-10" data-sid="' + s.id + '" onclick="openSessionTimelineModal(\'' + s.id + '\')" style="cursor:pointer">';
      html += '<span style="font-size:11px;color:#6B7280;font-weight:500;white-space:nowrap;margin-bottom:8px">' + timeLabel + '</span>';
      html += '<div style="width:32px;height:32px;border-radius:50%;background:#DBEAFE;color:#3B82F6;display:flex;align-items:center;justify-content:center;border:4px solid #fff;flex-shrink:0">';
      html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
      html += '</div>';
      html += '<span style="font-size:11px;color:#6B7280;font-weight:500;margin-top:8px;white-space:nowrap">' + durLabel + '</span>';
      html += '</div>';
    }

    /* ─── ACTIVE session (الجلسة الحالية - قابلة للضغط) ─── */
    if (node.type === 'session' && node.state === 'active') {
      var now = Date.now();
      var elapsedInCurrentRun = activeSession.lastResumeTime ? now - activeSession.lastResumeTime : 0;
      var totalElapsed = activeSession.accumulatedMs + elapsedInCurrentRun;
      var estEnd = now + remainingSeconds * 1000;
      var timeLabel = formatTimeHM(activeSession.startTime) + ' - ' + formatTimeHM(estEnd);
      var durLabel = formatDuration(totalElapsed / 60000);
      html += connector;
      html += '<div class="flex flex-col items-center flex-shrink-0 relative z-10" data-sid="' + activeSession.id + '" onclick="openSessionTimelineModal(\'' + activeSession.id + '\')" style="cursor:pointer">';
      html += '<span style="font-size:11px;color:#3B82F6;font-weight:700;white-space:nowrap;margin-bottom:8px">' + timeLabel + '</span>';
      html += '<div style="width:32px;height:32px;border-radius:50%;background:#BFDBFE;color:#1D4ED8;display:flex;align-items:center;justify-content:center;border:4px solid #fff;flex-shrink:0;box-shadow:0 0 12px rgba(59,130,246,0.25)">';
      html += '<div style="width:6px;height:6px;border-radius:50%;background:#1D4ED8;animation:pulse-dot 1.5s ease-in-out infinite"></div>';
      html += '</div>';
      html += '<span style="font-size:11px;color:#3B82F6;font-weight:500;margin-top:8px;white-space:nowrap">' + durLabel + '</span>';
      html += '</div>';
    }

    /* ─── UPCOMING session (جلسة قادمة) ─── */
    if (node.type === 'session' && node.state === 'upcoming') {
      html += connector;
      html += '<div class="flex flex-col items-center flex-shrink-0 relative z-10" style="opacity:0.5">';
      html += '<span style="font-size:11px;color:#9CA3AF;font-weight:500;white-space:nowrap;margin-bottom:8px">--:--</span>';
      html += '<div style="width:32px;height:32px;border-radius:50%;background:#F3F4F6;border:4px solid #fff;flex-shrink:0"></div>';
      html += '<span style="font-size:11px;color:#9CA3AF;font-weight:500;margin-top:8px;white-space:nowrap">--m</span>';
      html += '</div>';
    }
  }

  html = html.replace(connector, ''); /* remove leading connector before first node */
  track.innerHTML = html;

  /* ── Auto-scroll to latest (rightmost) session ── */
  var scrollEl = document.getElementById('sessionTimelineScroll');
  if (scrollEl) {
    scrollEl.scrollLeft = scrollEl.scrollWidth;
  }
}

/* ─── Scroll behavior: vertical wheel → horizontal scroll ───
   عشان السكرول العمودي يشتغل أفقي جوه التايم لاين
   ──────────────────────────────────────────────────────────── */
(function() {
  var scrollEl = document.getElementById('sessionTimelineScroll');
  if (scrollEl) {
    scrollEl.addEventListener('wheel', function(e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        this.scrollBy({ left: e.deltaY, behavior: 'auto' });
        e.preventDefault();
      }
    }, { passive: false });
  }
})();

var sessionTimelineEditId = null;

window.openSessionTimelineModal = function(sessionId) {
  sessionTimelineEditId = sessionId;
  var modal = document.getElementById('sessionTimelineModal');
  var input = document.getElementById('sessionTimelineTaskInput');
  if (!modal || !input) return;

  if (sessionId) {
    var session = null;
    if (activeSession && activeSession.id === sessionId) {
      session = activeSession;
    } else {
      var todaySessions = getTodaySessions();
      for (var i = 0; i < todaySessions.length; i++) {
        if (todaySessions[i].id === sessionId) { session = todaySessions[i]; break; }
      }
    }
    input.value = session ? (session.taskName || '') : '';
  } else {
    input.value = '';
  }

  modal.classList.add('open');
  setTimeout(function() { input.focus(); }, 100);
};

window.closeSessionTimelineModal = function() {
  var modal = document.getElementById('sessionTimelineModal');
  if (modal) modal.classList.remove('open');
};

window.saveSessionTimeline = function() {
  var taskName = (document.getElementById('sessionTimelineTaskInput').value || '').trim();

  if (sessionTimelineEditId && activeSession && activeSession.id === sessionTimelineEditId) {
    activeSession.taskName = taskName;
  } else if (sessionTimelineEditId) {
    window.db.updateSession(sessionTimelineEditId, taskName, null, '');
  }

  renderTimeline();
  renderSessionTimeline();
  window.closeSessionTimelineModal();
};

window.toggleTaskPopup = function() {
  var toggle = document.getElementById('taskPopupToggle');
  if (!toggle) return;
  var currentlyOn = toggle.classList.contains('active');
  if (currentlyOn) {
    toggle.classList.remove('active');
    window.db.setSetting('showTaskPopupOnStart', 'false');
  } else {
    toggle.classList.add('active');
    window.db.setSetting('showTaskPopupOnStart', 'true');
  }
};

(function() {
  var setting = window.db.getSetting('showTaskPopupOnStart');
  var toggle = document.getElementById('taskPopupToggle');
  if (toggle && setting === 'false') {
    toggle.classList.remove('active');
  }
})();

document.addEventListener('click', function(e) {
  var modal = document.getElementById('sessionTimelineModal');
  if (modal && e.target === modal) {
    modal.classList.remove('open');
  }
});

renderTimeline();
renderSessionTimeline();
