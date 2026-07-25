// sessions.js - sessions and tags management (SQLite-based)

var activeSession = null;
var editingSessionId = null;
var editingTagForSession = null;
var editingGoalForSession = null;
var _editingSessionNote = '';

var selectedTagColor = '#3B82F6';
var _rightPanelSession = null;
var _noteSaveTimer = null;
var _rightPanelOriginalNote = '';

async function getTags() {
  try { return await window.db.getTags() || []; } catch(e) { return []; }
}

async function getTagsWithGoals() {
  try { return await window.db.getTagsWithGoals() || { tags: [], goals: [] }; } catch(e) { return { tags: [], goals: [] }; }
}

async function saveTags(tags) {
  for (var i = 0; i < tags.length; i++) {
    await window.db.saveTag(tags[i]);
  }
}

async function getSessions() {
  try { return await window.db.getSessionsGrouped() || {}; } catch(e) { return {}; }
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

async function renderTimeline() {
  // Timeline removed in redesign
}

function formatDateLabel(dateStr) {
  var d = new Date(dateStr + 'T00:00:00');
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[d.getMonth()] + ' ' + d.getDate();
}

// Session event hooks
function onSessionStart() {
  activeSession = {
    id: 's_' + Date.now(),
    startTime: Date.now(),
    accumulatedMs: 0,
    lastResumeTime: Date.now(),
    taskName: '',
    tagId: null,
    goalId: null,
    note: '',
    status: 'running',
    phase: phase
  };
  renderTimeline();
  renderSessionTimeline();
  renderSessionSideBox();
}

function onSessionPause() {
  if (!activeSession || !activeSession.lastResumeTime) return;
  activeSession.accumulatedMs += Date.now() - activeSession.lastResumeTime;
  activeSession.lastResumeTime = null;
  activeSession.status = 'paused';
  renderTimeline();
  renderSessionTimeline();
  renderSessionSideBox();
}

function onSessionResume() {
  if (!activeSession) return;
  activeSession.lastResumeTime = Date.now();
  activeSession.status = 'running';
  renderTimeline();
  renderSessionTimeline();
  renderSessionSideBox();
}

async function onSessionComplete(focusMinutes, plannedMinutes) {
  if (!activeSession) return;
  if (activeSession.lastResumeTime) {
    activeSession.accumulatedMs += Date.now() - activeSession.lastResumeTime;
  }
  if (focusMinutes === undefined) {
    focusMinutes = Math.round(activeSession.accumulatedMs / 60000);
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
    goalId: activeSession.goalId || null,
    phase: activeSession.phase || 'work'
  };
  await window.db.saveSession(session);
  activeSession = null;
  await renderTimeline();
  await renderSessionTimeline();
  await renderSessionSideBox();
}

function onSessionCancel() {
  if (!activeSession) return;
  activeSession = null;
  renderTimeline();
  renderSessionTimeline();
  renderSessionSideBox();
}

var _baseToggleTimer = window.toggleTimer;
window.toggleTimer = function() {
  if (remainingSeconds <= 0) return;
  if (isRunning) {
    _baseToggleTimer();
    onSessionPause();
  } else {
    var isFresh = remainingSeconds === totalSeconds;
    _baseToggleTimer();
    if (isFresh) onSessionStart(); else onSessionResume();
  }
};

var _origCompleteTimer = completeTimer;
completeTimer = async function() {
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
  if (activeSession) activeSession.phase = phase;
  await _origCompleteTimer();
  await onSessionComplete(elapsedSec / 60, plannedMinutes);
};

var _origConfirmEnd = window.confirmEnd;
window.confirmEnd = async function() {
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
  if (activeSession) activeSession.phase = phase;
  await _origConfirmEnd();
  await onSessionComplete(elapsedSec / 60, plannedMinutes);
};

var _origResetTimer = window.resetTimer;
window.resetTimer = async function() {
  onSessionCancel();
  await _origResetTimer();
};

var _origSkipPhase = window.skipPhase;
window.skipPhase = async function() {
  if (phase === 'work' && activeSession) {
    if (activeSession.lastResumeTime) {
      activeSession.accumulatedMs += Date.now() - activeSession.lastResumeTime;
      activeSession.lastResumeTime = null;
    }
    if (activeSession.accumulatedMs === 0) {
      if (activeSession) activeSession.phase = phase;
      onSessionCancel();
    } else {
      if (activeSession) activeSession.phase = phase;
      var elapsedSec = activeSession.accumulatedMs / 1000;
      var plannedMinutes = totalSeconds / 60;
      await onSessionComplete(elapsedSec / 60, plannedMinutes);
    }
  } else {
    if (activeSession) activeSession.phase = phase;
    onSessionCancel();
  }
  await _origSkipPhase();
};

window.cancelSessionNow = async function() {
  if (phase === 'idle') return;
  if (activeSession) activeSession.phase = phase;
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
  stopTimer();
  phase = 'idle';
  recalcRemaining();
  updateUI();
  await onSessionComplete(elapsedSec / 60, plannedMinutes);
  if (window.AudioManager) window.AudioManager.playSound('pomo-end.mp3');
};

// Tag selection functions
window.selectSessionTag = async function(tagId) {
  editingTagForSession = tagId;
  await renderSessionTagDisplay();
  var td = document.getElementById('tagDropdown');
  if (td) td.classList.add('hidden');
};

window.selectSessionGoal = async function(goalId) {
  editingGoalForSession = goalId;
  await renderSessionTagDisplay();
  var td = document.getElementById('tagDropdown');
  if (td) td.classList.add('hidden');
};

async function renderTagList(listId) {
  var container = document.getElementById(listId);
  if (!container) return;
  var data = await getTagsWithGoals();
  var tags = data.tags || [];
  var goals = data.goals || [];
  var html = '';
  for (var i = 0; i < tags.length; i++) {
    var t = tags[i];
    html += '<div class="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer text-sm" onclick="window.selectSessionTag(\'' + t.id + '\')">';
    html += '<span class="w-3 h-3 rounded-full" style="background:' + t.color + '"></span>';
    html += '<span class="text-gray-700">' + t.name + '</span>';
    html += '</div>';
  }
  if (goals.length > 0) {
    html += '<div class="text-xs text-gray-400 px-3 py-1.5 border-t border-gray-100 mt-1 pt-1.5">Goals</div>';
    for (var j = 0; j < goals.length; j++) {
      var g = goals[j];
      html += '<div class="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer text-sm" onclick="window.selectSessionGoal(\'' + g.goalId + '\')">';
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

window.toggleTagDropdown = async function(e) {
  e.stopPropagation();
  var dd = document.getElementById('tagDropdown');
  if (!dd) return;
  dd.classList.toggle('hidden');
  if (!dd.classList.contains('hidden')) {
    await renderTagList('tagList');
  }
};

window.openSessionPopup = async function(sessionId) {
  editingSessionId = sessionId;
  var session = null;
  if (activeSession && activeSession.id === sessionId) {
    session = activeSession;
  } else {
    var sessions = await getSessions();
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
  _editingSessionNote = session.note || '';
  await renderSessionTagDisplay();
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

window.saveSessionEdit = async function() {
  var taskName = (document.getElementById('sessionTaskInput').value || '').trim();
  if (activeSession && activeSession.id === editingSessionId) {
    activeSession.taskName = taskName;
    activeSession.tagId = editingTagForSession;
    activeSession.goalId = editingGoalForSession;
    await renderTimeline();
    await renderSessionTimeline();
    await renderSessionSideBox();
    var popup = document.getElementById('sessionPopup');
    if (popup) popup.classList.add('hidden');
    return;
  }
  await window.db.updateSession(editingSessionId, { taskName: taskName, tagId: editingTagForSession, note: _editingSessionNote, goalId: editingGoalForSession });
  await renderTimeline();
  await renderSessionTimeline();
  await renderSessionSideBox();
  var popup = document.getElementById('sessionPopup');
  if (popup) popup.classList.add('hidden');
};

async function renderSessionTagDisplay() {
  var container = document.getElementById('sessionTagDisplay');
  if (!container) return;
  var parts = [];
  if (editingTagForSession) {
    var tags = await getTags();
    var tag = tags.find(function(t) { return t.id === editingTagForSession; });
    if (tag) {
      parts.push('<span class="tag-bubble" style="background:rgba(' + hexToRgb(tag.color) + ',0.12);color:' + tag.color + ';border:1px solid rgba(' + hexToRgb(tag.color) + ',0.25)">#' + tag.name + ' <span style="cursor:pointer;margin-left:4px" onclick="window.clearSessionTag()">✕</span></span>');
    }
  }
  if (editingGoalForSession) {
    var gw = await getTagsWithGoals();
    var goal = (gw.goals || []).find(function(g) { return g.goalId === editingGoalForSession; });
    if (goal) {
      parts.push('<span class="tag-bubble" style="background:rgba(' + hexToRgb(goal.color) + ',0.12);color:' + goal.color + ';border:1px solid rgba(' + hexToRgb(goal.color) + ',0.25)">' + goal.name + ' <span style="cursor:pointer;margin-left:4px" onclick="window.clearSessionGoal()">✕</span></span>');
    }
  }
  container.innerHTML = parts.length > 0 ? parts.join(' ') : '<span class="text-xs text-gray-400">None selected</span>';
}

window.clearSessionTag = async function() {
  editingTagForSession = null;
  await renderSessionTagDisplay();
  var td = document.getElementById('tagDropdown');
  if (td) td.classList.add('hidden');
};

window.clearSessionGoal = async function() {
  editingGoalForSession = null;
  await renderSessionTagDisplay();
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

window.saveNewTag = async function() {
  var name = (document.getElementById('newTagNameInput').value || '').trim();
  if (!name) return;
  var tags = await getTags();
  var newTag = { id: 'tag_' + Date.now(), name: name, color: selectedTagColor };
  tags.push(newTag);
  await saveTags(tags);
  var popup = document.getElementById('newTagPopup');
  if (popup) popup.classList.add('hidden');
};

/* ═══════════════════════════════════════
   Task dropdown for session editing
*/
async function getTaskList() {
  try { return await window.db.getTasks() || []; } catch(e) { return []; }
}

function getGoalName(goalId, goals) {
  if (!goalId || !goals) return '';
  for (var gi = 0; gi < goals.length; gi++) {
    if (goals[gi].id === goalId || goals[gi].goalId === goalId) return goals[gi].name;
  }
  return '';
}

async function renderTaskList(taskListEl, inputEl, goalVarSetter) {
  var tasks = await getTaskList();
  var gw = await getTagsWithGoals();
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

window.toggleSessionTaskDropdown = async function(e) {
  if (e) e.stopPropagation();
  var dd = document.getElementById('sessionTaskDropdown');
  var list = document.getElementById('sessionTaskList');
  if (!dd || !list) return;
  if (dd.classList.contains('hidden')) {
    await renderTaskList(list, document.getElementById('sessionTaskInput'), function(goalId) { editingGoalForSession = goalId; });
    dd.classList.remove('hidden');
  } else {
    dd.classList.add('hidden');
  }
};

window.selectTaskFromList = async function(taskName, goalId, goalName) {
  var sessionDd = document.getElementById('sessionTaskDropdown');
  if (sessionDd && !sessionDd.classList.contains('hidden')) {
    document.getElementById('sessionTaskInput').value = taskName;
    if (goalId) {
      editingGoalForSession = goalId;
      await renderSessionTagDisplay();
    }
    sessionDd.classList.add('hidden');
  }
};

// Close dropdowns on outside click
document.addEventListener('click', function(e) {
  var sessionDd = document.getElementById('sessionTaskDropdown');
  if (sessionDd && !sessionDd.classList.contains('hidden') && !e.target.closest('#sessionTaskDropdown') && !e.target.closest('[onclick*="toggleSessionTaskDropdown"]')) {
    sessionDd.classList.add('hidden');
  }
});

/* ═══════════════════════════════════════
   🎯 Session Timeline (Horizontal Flow)
   ═══════════════════════════════════════ */

function formatDuration(minutes) {
  if (minutes < 1) return Math.round(minutes * 60) + 's';
  if (minutes < 60) return Math.round(minutes) + 'm';
  var h = Math.floor(minutes / 60);
  var m = Math.round(minutes % 60);
  return h + 'h ' + m + 'm';
}

function formatDurationShort(minutes) {
  if (minutes < 1) return Math.round(minutes * 60) + 's';
  if (minutes < 60) return Math.round(minutes) + 'm';
  var h = Math.floor(minutes / 60);
  var rm = Math.round(minutes % 60);
  return h + (rm > 0 ? '.' + Math.round(rm / 6) : '') + 'h';
}

async function getTodaySessions() {
  try {
    var grouped = await window.db.getSessionsGrouped() || {};
    var key = todayKey();
    var list = grouped[key] || [];
    return list.sort(function(a, b) { return a.startTime - b.startTime; });
  } catch(e) { return []; }
}

async function renderSessionTimeline() {
  // Timeline removed in redesign
  return;
}

var sessionTimelineEditId = null;
var _sessionTimelineEditNote = '';
var _sessionTimelineEditGoalId = null;

window.openSessionTimelineModal = async function(sessionId) {
  sessionTimelineEditId = sessionId;
  var modal = document.getElementById('sessionTimelineModal');
  var input = document.getElementById('sessionTimelineTaskInput');
  if (!modal || !input) return;

  if (sessionId) {
    var session = null;
    if (activeSession && activeSession.id === sessionId) {
      session = activeSession;
    } else {
      var todaySessions = await getTodaySessions();
      for (var i = 0; i < todaySessions.length; i++) {
        if (todaySessions[i].id === sessionId) { session = todaySessions[i]; break; }
      }
    }
    input.value = session ? (session.taskName || '') : '';
    _sessionTimelineEditNote = session ? (session.note || '') : '';
    _sessionTimelineEditGoalId = session ? (session.goalId || null) : null;
  } else {
    input.value = '';
    _sessionTimelineEditNote = '';
    _sessionTimelineEditGoalId = null;
  }

  modal.classList.add('open');
  setTimeout(function() { input.focus(); }, 100);
};

window.closeSessionTimelineModal = function() {
  var modal = document.getElementById('sessionTimelineModal');
  if (modal) modal.classList.remove('open');
};

window.saveSessionTimeline = async function() {
  var taskName = (document.getElementById('sessionTimelineTaskInput').value || '').trim();

  if (sessionTimelineEditId && activeSession && activeSession.id === sessionTimelineEditId) {
    activeSession.taskName = taskName;
  } else if (sessionTimelineEditId) {
    await window.db.updateSession(sessionTimelineEditId, { taskName: taskName, tagId: null, note: _sessionTimelineEditNote, goalId: _sessionTimelineEditGoalId });
  }

  window.closeSessionTimelineModal();
  renderSessionSideBox();
};

document.addEventListener('click', function(e) {
  var modal = document.getElementById('sessionTimelineModal');
  if (modal && e.target === modal) {
    modal.classList.remove('open');
  }
});

/* ── Session History Dropdown / Left side box ── */
var _sideBoxDate = todayKey();

window.pomoPrevDay = function() {
  var parts = _sideBoxDate.split('-');
  var d = new Date(+parts[0], +parts[1] - 1, +parts[2] - 1);
  _sideBoxDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  renderSessionSideBox();
};

window.pomoNextDay = function() {
  var today = todayKey();
  if (_sideBoxDate >= today) return;
  var parts = _sideBoxDate.split('-');
  var d = new Date(+parts[0], +parts[1] - 1, +parts[2] + 1);
  _sideBoxDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  renderSessionSideBox();
};

function formatTimeHMShort2(ts) {
  var d = new Date(ts);
  var h = d.getHours(), m = d.getMinutes();
  var ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str || '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function getSessionsForDate(dateStr) {
  try {
    var grouped = await window.db.getSessionsGrouped() || {};
    var list = grouped[dateStr] || [];
    return list.sort(function(a, b) { return b.startTime - a.startTime; });
  } catch(e) { return []; }
}

/* ── Inline Edit Session Name ── */
window.startInlineEditSessionName = function(event, sessionId) {
  event.stopPropagation();
  var el = event.currentTarget;
  var currentName = el.dataset.name || '';
  
  var rect = el.getBoundingClientRect();
  var editPopup = document.createElement('div');
  editPopup.className = 'inline-edit-popup';
  editPopup.style.position = 'fixed';
  editPopup.style.top = (rect.top + window.scrollY) + 'px';
  editPopup.style.left = (rect.left + window.scrollX) + 'px';
  editPopup.style.width = rect.width + 'px';
  editPopup.style.height = rect.height + 'px';
  editPopup.style.zIndex = '1000';
  
  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'inline-edit-input';
  input.value = currentName;
  input.style.width = '100%';
  input.style.height = '100%';
  input.style.border = '2px solid #3b82f6';
  input.style.borderRadius = '6px';
  input.style.padding = '0 8px';
  input.style.fontSize = '12px';
  input.style.outline = 'none';
  input.style.fontFamily = 'inherit';
  input.style.boxSizing = 'border-box';
  
  editPopup.appendChild(input);
  document.body.appendChild(editPopup);
  input.focus();
  input.select();
  
  var finished = false;
  async function finishEdit() {
    if (finished) return;
    finished = true;
    var newName = input.value.trim();
    document.body.removeChild(editPopup);
    if (newName && newName !== currentName) {
      if (activeSession && activeSession.id === sessionId) {
        activeSession.taskName = newName;
      } else {
        var sessions = await getSessions();
        var session = null;
        var keys = Object.keys(sessions);
        for (var k = 0; k < keys.length; k++) {
          var list = sessions[keys[k]] || [];
          var found = list.find(function(s) { return s.id === sessionId; });
          if (found) { session = found; break; }
        }
        if (session) {
          await window.db.updateSession(sessionId, { taskName: newName, tagId: session.tagId, note: session.note, goalId: session.goalId });
        }
      }
      renderSessionSideBox();
    }
  }
  
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      finishEdit();
    } else if (e.key === 'Escape') {
      finished = true;
      document.body.removeChild(editPopup);
    }
  });
  
  setTimeout(function() {
    document.addEventListener('click', function onClickOutside(e) {
      if (!editPopup.contains(e.target)) {
        document.removeEventListener('click', onClickOutside);
        finishEdit();
      }
    });
  }, 10);
};

async function renderSessionSideBox() {
  var container = document.getElementById('pomoSideTimeline');
  var dateLabel = document.getElementById('pomoSideDateLabel');
  var navLabel = document.getElementById('pomoSideNavLabel');
  var fwdBtn = document.querySelector('.pomo-timeline-panel-nav button:last-child');
  if (!container) return;

  var today = todayKey();
  var displayDate = _sideBoxDate === today ? 'Today' : formatDateLabel(_sideBoxDate);
  if (dateLabel) dateLabel.textContent = displayDate;
  if (navLabel) navLabel.textContent = displayDate;
  if (fwdBtn) {
    if (_sideBoxDate === today) fwdBtn.setAttribute('disabled', 'true');
    else fwdBtn.removeAttribute('disabled');
  }

  var sessions = await getSessionsForDate(_sideBoxDate);
  var activeOnDate = _sideBoxDate === today ? activeSession : null;

  if (sessions.length === 0 && !activeOnDate) {
    container.innerHTML = '<div style="color:#9ca3af;font-size:13px;text-align:center;padding:40px 0;">No focus sessions</div>';
    return;
  }

  var allSessions = sessions.slice();
  if (activeOnDate) allSessions.unshift(activeOnDate);

  var tags = await getTags();
  var gw = await getTagsWithGoals();
  var goals = gw.goals || [];

  // Sort sessions by startTime ascending for hour-grouping
  allSessions.sort(function(a, b) { return a.startTime - b.startTime; });

  // Group sessions by hour
  var byHour = {};
  for (var h = 0; h < 24; h++) byHour[h] = [];
  allSessions.forEach(function(s) {
    var d = new Date(s.startTime);
    var hour = d.getHours();
    if (!byHour[hour]) byHour[hour] = [];
    byHour[hour].push(s);
  });

  var html = '<div class="pomo-timeline-hour-grid">';

  for (var hour = 0; hour < 24; hour++) {
    var hourSessions = byHour[hour];
    var ampm = hour === 0 ? '12am' : hour < 12 ? hour + 'am' : hour === 12 ? '12pm' : (hour - 12) + 'pm';

    html += '<div class="pomo-tl-hour-row">';
    html += '<div class="pomo-tl-time-label">' + ampm + '</div>';

    if (hourSessions.length > 0) {
      // Sort sessions within hour by startTime
      hourSessions.sort(function(a, b) { return a.startTime - b.startTime; });
      var first = hourSessions[0];
      var isRunning = activeOnDate && first.id === activeSession.id;

      // Dot on the line — color by tag
      var tagColor = '#faf9f6';
      if (first.tagId) {
        var foundTag = tags.find(function(t) { return t.id === first.tagId; });
        if (foundTag) tagColor = foundTag.color;
      } else if (first.goalId) {
        var foundGoal = goals.find(function(g) { return g.goalId === first.goalId; });
        if (foundGoal) tagColor = foundGoal.color;
      }

      html += '<div class="pomo-tl-session-dot' + (isRunning ? ' active' : '') + '" style="background:' + tagColor + '"></div>';

      // Vertical arrow label (time range)
      var endT = isRunning ? Date.now() + remainingSeconds * 1000 : first.endTime;
      var timeRange = formatTimeHMShort2(first.startTime) + ' ↓ ' + formatTimeHMShort2(endT);
      html += '<div class="pomo-tl-time-arrow">' + timeRange + '</div>';

      // Session items
      html += '<div class="pomo-tl-session-items">';
      hourSessions.forEach(function(s) {
        var isSessActive = activeOnDate && s.id === activeSession.id;
        var durMin = isSessActive
          ? (activeSession.accumulatedMs + (activeSession.lastResumeTime ? Date.now() - activeSession.lastResumeTime : 0)) / 60000
          : s.focusMinutes;
        var durNum = Math.round(durMin);
        var name = s.taskName || 'Focus Session';

        // Tag badge
        var tagBadge = '';
        if (s.tagId) {
          var foundTag2 = tags.find(function(t) { return t.id === s.tagId; });
          if (foundTag2) {
            tagBadge = '<span class="pomo-tl-tag" style="background:' + foundTag2.color + ';color:#fff">' + escapeHtml(foundTag2.name) + '</span>';
          }
        } else if (s.goalId) {
          var foundGoal2 = goals.find(function(g) { return g.goalId === s.goalId; });
          if (foundGoal2) {
            tagBadge = '<span class="pomo-tl-tag" style="background:' + foundGoal2.color + ';color:#fff">' + escapeHtml(foundGoal2.name) + '</span>';
          }
        }

        // Duration
        var durDisplay = durNum < 60 ? durNum + '<span class="pomo-tl-dur-unit">min</span>' : Math.floor(durNum / 60) + '<span class="pomo-tl-dur-unit">h</span> ' + (durNum % 60) + '<span class="pomo-tl-dur-unit">m</span>';

        html += '<div class="pomo-tl-session-item' + (isSessActive ? ' active' : '') + '" onclick="window.openPomoSideNoteModal(\'' + s.id + '\')">';
        html += '<span class="pomo-tl-sess-name" data-name="' + escapeHtml(name) + '" onclick="event.stopPropagation();window.startInlineEditSessionName(event,\'' + s.id + '\')">' + escapeHtml(name) + '</span>';
        if (tagBadge) html += tagBadge;
        html += '<span class="pomo-tl-sess-dur">' + durDisplay + '</span>';
        html += '</div>';
      });
      html += '</div>';
    } else {
      html += '<div class="pomo-tl-free">— free —</div>';
    }
    html += '</div>';
  }
  html += '</div>';

  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

window.toggleTimelineNote = function(id) {
  var el = document.getElementById(id);
  if (!el) return;
  var btn = el.parentElement.querySelector('.pomo-timeline-show-more');
  if (el.classList.contains('expanded')) {
    el.classList.remove('expanded');
    if (btn) btn.textContent = 'Show more';
  } else {
    el.classList.add('expanded');
    if (btn) btn.textContent = 'Show less';
  }
};

window.deleteSession = async function(id) {
  await window.db.deleteSession(id);
  if (window.renderStats) await window.renderStats();
  if (typeof renderSessionTimeline === 'function') await renderSessionTimeline();
  await renderSessionSideBox();
};

/* ── Toggle history dropdown ── */
window.toggleHistoryDropdown = async function() {
  // Toggle the side box visibility explicitly if needed, but the dock item was removed.
  // We keep it as a fallback.
  var sideBox = document.getElementById('pomoTimelinePanel');
  if (sideBox) {
    sideBox.classList.toggle('hidden-fade');
  }
};

function saveRightPanelSession() {
  if (!_rightPanelSession) return;
  var noteInput = document.getElementById('pomoNoteArea');
  var noteVal = noteInput ? noteInput.value.trim() : '';
  _rightPanelSession.note = noteVal;
  if (activeSession && _rightPanelSession.id === activeSession.id) {
    activeSession.note = noteVal;
  } else {
    window.db.updateSession(_rightPanelSession.id, {
      taskName: _rightPanelSession.taskName || '',
      tagId: _rightPanelSession.tagId || null,
      note: noteVal,
      goalId: _rightPanelSession.goalId || null
    });
  }
}

window.editSessionName = async function(sessionId) {
  var newName = prompt('Enter session name:', '');
  if (newName === null) return;
  if (!newName.trim()) newName = 'Session';
  if (activeSession && activeSession.id === sessionId) {
    activeSession.taskName = newName.trim();
  }
  try { await window.db.updateSession(sessionId, { taskName: newName.trim() }); } catch(e) {}
  renderSessionSideBox();
};

(async function() {
  if (window._dbInitPromise) await window._dbInitPromise;
  await renderTimeline();
  await renderSessionTimeline();
  await renderSessionSideBox();
})();

/* ═══════════════════════════════════════
   Session Note Modal Logic
*/

var _currentNoteSessionId = null;
var _currentNoteSession = null;

window.openPomoSideNoteModal = async function(sessionId) {
  saveRightPanelSession();
  
  var session = null;
  if (activeSession && activeSession.id === sessionId) {
    session = activeSession;
  } else {
    session = await window.db.getSession(sessionId);
  }
  if (!session) return;
  
  _rightPanelSession = session;
  
  var taskInput = document.getElementById('pomoActiveTaskName');
  if (taskInput) taskInput.value = session.taskName || '';
  
  var noteArea = document.getElementById('pomoNoteArea');
  if (noteArea) noteArea.value = session.note || '';
  _rightPanelOriginalNote = session.note || '';
  
  var tags = await getTags();
  var tagBtnText = document.getElementById('pomoTagBtnText');
  if (tagBtnText && session.tagId) {
    var foundTag = tags.find(function(t) { return t.id === session.tagId; });
    tagBtnText.textContent = foundTag ? foundTag.name : 'Add Tag';
  } else if (tagBtnText) {
    tagBtnText.textContent = 'Add Tag';
  }
  
  if (typeof togglePomoRightPanel === 'function') togglePomoRightPanel(true);
};

window.closePomoSideNoteModal = function(e) {
  if (e && e.target !== e.currentTarget) return;
  var modal = document.getElementById('pomoSideNoteModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  _currentNoteSessionId = null;
  _currentNoteSession = null;
};

window.savePomoSideNote = async function() {
  if (!_currentNoteSessionId) return;
  var input = document.getElementById('pomoSideNoteInput');
  var newNote = input.value.trim();
  
  if (_currentNoteSessionId === activeSession?.id) {
    activeSession.note = newNote;
  }
  
  if (_currentNoteSession) {
    await window.db.updateSession(_currentNoteSessionId, { taskName: _currentNoteSession.taskName || '', tagId: _currentNoteSession.tagId || null, note: newNote, goalId: _currentNoteSession.goalId || null });
  } else {
    await window.db.updateSession(_currentNoteSessionId, { note: newNote });
  }
  window.closePomoSideNoteModal();
  await renderSessionSideBox();
};

window.deletePomoSideNote = async function() {
  if (!_currentNoteSessionId) return;
  
  if (_currentNoteSessionId === activeSession?.id) {
    activeSession.note = '';
  }
  
  if (_currentNoteSession) {
    await window.db.updateSession(_currentNoteSessionId, { taskName: _currentNoteSession.taskName || '', tagId: _currentNoteSession.tagId || null, note: '', goalId: _currentNoteSession.goalId || null });
  } else {
    await window.db.updateSession(_currentNoteSessionId, { note: '' });
  }
  window.closePomoSideNoteModal();
  await renderSessionSideBox();
};

window.togglePomoSideBox = function() {
  var box = document.getElementById('pomoTimelinePanel');
  if (box.classList.contains('collapsed')) {
    box.classList.remove('collapsed');
  } else {
    box.classList.add('collapsed');
  }
};

var _pomoTimelinePanel = document.getElementById('pomoTimelinePanel');
if (_pomoTimelinePanel) {
  _pomoTimelinePanel.addEventListener('click', function(e) {
    if (this.classList.contains('collapsed')) {
      window.togglePomoSideBox();
    }
  });
}
