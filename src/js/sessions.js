// sessions.js - sessions and tags management (SQLite-based)

var activeSession = null;
var editingSessionId = null;
var editingTagForSession = null;
var editingGoalForSession = null;
var addSessionTagId = null;
var addSessionGoalId = null;
var selectedTagColor = '#3B82F6';

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
  hideSessionNamePopup();
  if (activeSession) {
    activeSession = null;
  }
  var name = _taskPopupEnabled ? (window.pomoSessionName || '') : '';
  activeSession = {
    id: 's_' + Date.now(),
    startTime: Date.now(),
    accumulatedMs: 0,
    lastResumeTime: null,
    taskName: name,
    tagId: null,
    goalId: null,
    status: 'running'
  };
  renderTimeline();
  renderSessionTimeline();
  renderSessionSideBox();
  if (window._pendingSessionStart) {
    showSessionNamePopup();
  }
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
  window._pendingSessionStart = false;
  window.pomoSessionName = '';
  try { localStorage.removeItem('pomoSessionName'); } catch(e) {}
  hideSessionNamePopup();
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
  await window.db.saveSession(session);
  activeSession = null;
  await renderTimeline();
  await renderSessionTimeline();
}

function onSessionCancel() {
  if (!activeSession) return;
  window._pendingSessionStart = false;
  hideSessionNamePopup();
  activeSession = null;
  renderTimeline();
  renderSessionTimeline();
}

// Timeline rendering removed in redesign
// Event delegation for timeline entries also removed

// Patch timer functions to hook into session tracking
var _origToggleTimer = window.toggleTimer;
window.toggleTimer = function() {
  if (remainingSeconds <= 0) return;
  if (window._pendingSessionStart) return;
  if (isRunning) {
    _origToggleTimer();
    onSessionPause();
  } else {
    var isFresh = remainingSeconds === totalSeconds;
    if (isFresh && _taskPopupEnabled) {
      window._pendingSessionStart = true;
      onSessionStart();
      return;
    }
    _origToggleTimer();
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
  await _origConfirmEnd();
  await onSessionComplete(elapsedSec / 60, plannedMinutes);
};

var _origResetTimer = window.resetTimer;
window.resetTimer = async function() {
  // Clean up session FIRST to preserve state
  onSessionCancel();
  
  // Then reset timer
  await _origResetTimer();
};

var _origSkipPhase = window.skipPhase;
window.skipPhase = async function() {
  if (window._pendingSessionStart) {
    // Don't save if not started yet
    window._pendingSessionStart = false;
    onSessionCancel();
  } else if (phase === 'work' && activeSession && activeSession.lastResumeTime) {
    // Save current session when skipping work phase
    activeSession.accumulatedMs += Date.now() - activeSession.lastResumeTime;
    activeSession.lastResumeTime = null;
    var elapsedSec = activeSession.accumulatedMs / 1000;
    var plannedMinutes = totalSeconds / 60;
    await onSessionComplete(elapsedSec / 60, plannedMinutes);
  } else {
    onSessionCancel();
  }
  await _origSkipPhase();
};

window.cancelSessionNow = async function() {
  if (phase === 'idle') return;
  var sp = document.getElementById('sessionPopup');
  if (sp) sp.classList.add('hidden');
  var td = document.getElementById('tagDropdown');
  if (td) td.classList.add('hidden');
  if (window._pendingSessionStart) {
    window._pendingSessionStart = false;
    onSessionCancel();
    stopTimer();
    phase = 'idle';
    await setPhaseTime('work');
    updateUI();
    return;
  }
  var elapsedSec = totalSeconds - remainingSeconds;
  var plannedMinutes = totalSeconds / 60;
  if (activeSession && activeSession.lastResumeTime) {
    activeSession.accumulatedMs += Date.now() - activeSession.lastResumeTime;
    activeSession.lastResumeTime = null;
  }
  stopTimer();
  phase = 'idle';
  await advancePhase();
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

window.selectAddSessionTag = async function(tagId) {
  addSessionTagId = tagId;
  await renderAddSessionTagDisplay();
  var td = document.getElementById('addTagDropdown');
  if (td) td.classList.add('hidden');
};

window.selectAddSessionGoal = async function(goalId) {
  addSessionGoalId = goalId;
  await renderAddSessionTagDisplay();
  var td = document.getElementById('addTagDropdown');
  if (td) td.classList.add('hidden');
};

async function renderTagList(listId, mode) {
  var container = document.getElementById(listId);
  if (!container) return;
  var data = await getTagsWithGoals();
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

window.toggleTagDropdown = async function(e) {
  e.stopPropagation();
  var dd = document.getElementById('tagDropdown');
  if (!dd) return;
  dd.classList.toggle('hidden');
  if (!dd.classList.contains('hidden')) {
    await renderTagList('tagList', 'edit');
  }
};

window.toggleAddTagDropdown = async function(e) {
  e.stopPropagation();
  var dd = document.getElementById('addTagDropdown');
  if (!dd) return;
  dd.classList.toggle('hidden');
  if (!dd.classList.contains('hidden')) {
    await renderTagList('addTagList', 'add');
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
  await window.db.updateSession(editingSessionId, taskName, editingTagForSession, '', editingGoalForSession);
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

// Add Session Popup
window.openAddSessionPopup = async function() {
  var inp1 = document.getElementById('addSessionTaskInput');
  var inp2 = document.getElementById('addSessionDurationInput');
  if (inp1) inp1.value = '';
  if (inp2) inp2.value = '25';
  addSessionTagId = null;
  addSessionGoalId = null;
  await renderAddSessionTagDisplay();
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

window.saveAddSession = async function() {
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
  await window.db.saveSession(session);
  await renderTimeline();
  await renderSessionTimeline();
  var popup = document.getElementById('addSessionPopup');
  if (popup) popup.classList.add('hidden');
};

async function renderAddSessionTagDisplay() {
  var container = document.getElementById('addSessionTagDisplay');
  if (!container) return;
  var parts = [];
  if (addSessionTagId) {
    var tags = await getTags();
    var tag = tags.find(function(t) { return t.id === addSessionTagId; });
    if (tag) {
      parts.push('<span class="tag-bubble" style="background:rgba(' + hexToRgb(tag.color) + ',0.12);color:' + tag.color + ';border:1px solid rgba(' + hexToRgb(tag.color) + ',0.25)">#' + tag.name + ' <span style="cursor:pointer;margin-left:4px" onclick="window.clearAddSessionTag()">✕</span></span>');
    }
  }
  if (addSessionGoalId) {
    var gw = await getTagsWithGoals();
    var goal = (gw.goals || []).find(function(g) { return g.goalId === addSessionGoalId; });
    if (goal) {
      parts.push('<span class="tag-bubble" style="background:rgba(' + hexToRgb(goal.color) + ',0.12);color:' + goal.color + ';border:1px solid rgba(' + hexToRgb(goal.color) + ',0.25)">' + goal.name + ' <span style="cursor:pointer;margin-left:4px" onclick="window.clearAddSessionGoal()">✕</span></span>');
    }
  }
  container.innerHTML = parts.length > 0 ? parts.join(' ') : '<span class="text-xs text-gray-400">None selected</span>';
}

window.clearAddSessionTag = async function() {
  addSessionTagId = null;
  await renderAddSessionTagDisplay();
  var td = document.getElementById('addTagDropdown');
  if (td) td.classList.add('hidden');
};

window.clearAddSessionGoal = async function() {
  addSessionGoalId = null;
  await renderAddSessionTagDisplay();
  var td = document.getElementById('addTagDropdown');
  if (td) td.classList.add('hidden');
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

window.toggleAddSessionTaskDropdown = async function(e) {
  if (e) e.stopPropagation();
  var dd = document.getElementById('addSessionTaskDropdown');
  var list = document.getElementById('addSessionTaskList');
  if (!dd || !list) return;
  if (dd.classList.contains('hidden')) {
    await renderTaskList(list, document.getElementById('addSessionTaskInput'), function(goalId) { addSessionGoalId = goalId; });
    dd.classList.remove('hidden');
  } else {
    dd.classList.add('hidden');
  }
};

window.selectTaskFromList = async function(taskName, goalId, goalName) {
  var sessionDd = document.getElementById('sessionTaskDropdown');
  var addDd = document.getElementById('addSessionTaskDropdown');
  if (sessionDd && !sessionDd.classList.contains('hidden')) {
    document.getElementById('sessionTaskInput').value = taskName;
    if (goalId) {
      editingGoalForSession = goalId;
      await renderSessionTagDisplay();
    }
    sessionDd.classList.add('hidden');
  } else if (addDd && !addDd.classList.contains('hidden')) {
    document.getElementById('addSessionTaskInput').value = taskName;
    if (goalId) {
      addSessionGoalId = goalId;
      await renderAddSessionTagDisplay();
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
async function getTodaySessions() {
  try {
    var grouped = await window.db.getSessionsGrouped() || {};
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
async function renderSessionTimeline() {
  // Timeline removed in redesign
  return;
}



var sessionTimelineEditId = null;

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

window.saveSessionTimeline = async function() {
  var taskName = (document.getElementById('sessionTimelineTaskInput').value || '').trim();

  if (sessionTimelineEditId && activeSession && activeSession.id === sessionTimelineEditId) {
    activeSession.taskName = taskName;
  } else if (sessionTimelineEditId) {
    await window.db.updateSession(sessionTimelineEditId, taskName, null, '');
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

/* ── Session History Dropdown ── */
var _sideBoxDate = todayKey();

function histPrevDay() {
  var parts = _sideBoxDate.split('-');
  var d = new Date(+parts[0], +parts[1] - 1, +parts[2] - 1);
  _sideBoxDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  renderSessionSideBox();
};

function histNextDay() {
  var today = todayKey();
  if (_sideBoxDate >= today) return;
  var parts = _sideBoxDate.split('-');
  var d = new Date(+parts[0], +parts[1] - 1, +parts[2] + 1);
  _sideBoxDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  renderSessionSideBox();
};

function formatTimeHMShort(ts) {
  var d = new Date(ts);
  var h = d.getHours(), m = d.getMinutes();
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

function formatDurationLong(minutes) {
  if (minutes < 1) return Math.round(minutes * 60) + ' seconds';
  if (minutes < 60) return Math.round(minutes) + ' minutes';
  var h = Math.floor(minutes / 60);
  var rm = Math.round(minutes % 60);
  return h + (rm > 0 ? '.' + Math.round(rm * 10 / 6) : '') + ' hours';
}

async function getSessionsForDate(dateStr) {
  try {
    var grouped = await window.db.getSessionsGrouped() || {};
    var list = grouped[dateStr] || [];
    return list.sort(function(a, b) { return a.startTime - b.startTime; });
  } catch(e) { return []; }
}

async function renderSessionSideBox() {
  var container = document.getElementById('sessionHistoryBody');
  var dateLabel = document.getElementById('histDateLabel');
  var navLabel = document.getElementById('histNavLabel');
  var fwdBtn = document.querySelector('.session-history-nav button:last-child');
  if (!container) return;

  var today = todayKey();
  var displayDate = _sideBoxDate === today ? 'Today' : formatDateLabel(_sideBoxDate);
  if (dateLabel) dateLabel.textContent = displayDate;
  if (navLabel) navLabel.textContent = displayDate;
  if (fwdBtn) fwdBtn.style.display = _sideBoxDate === today ? 'none' : '';

  var sessions = await getSessionsForDate(_sideBoxDate);
  var activeOnDate = _sideBoxDate === today ? activeSession : null;

  if (sessions.length === 0 && !activeOnDate) {
    container.innerHTML = '';
    return;
  }

  var allSessions = sessions.slice();
  if (activeOnDate) allSessions.push(activeOnDate);

  var showName = _taskPopupEnabled;

  var html = '<table class="pomo-side-table">';
  html += '<thead><tr><th>الوقت</th><th>المدة</th><th>الاسم</th><th>الحالة</th></tr></thead><tbody>';
  for (var i = 0; i < allSessions.length; i++) {
    var s = allSessions[i];
    var isActive = activeOnDate && i === allSessions.length - 1;
    var endT = isActive ? Date.now() + remainingSeconds * 1000 : s.endTime;
    var timeRange = formatTimeHMShort(s.startTime) + ' → ' + formatTimeHMShort(endT);

    var durMin = isActive
      ? (activeSession.accumulatedMs + (activeSession.lastResumeTime ? Date.now() - activeSession.lastResumeTime : 0)) / 60000
      : s.focusMinutes;
    var durText = formatDurationLong(durMin);

    var name = s.taskName || '';
    var statusText = isActive ? 'جاري' : 'تم';

    html += '<tr class="' + (isActive ? 'pomo-side-row-active' : '') + '">';
    html += '<td class="pomo-side-td-time"><span class="pomo-side-time-range">' + timeRange + '</span></td>';
    html += '<td class="pomo-side-td-dur"><span class="pomo-side-time-desc">' + durText + '</span></td>';
    html += '<td class="pomo-side-td-name">' + (showName ? name : '') + '</td>';
    html += '<td class="pomo-side-td-status"><span class="pomo-side-status-badge' + (isActive ? ' active' : '') + '">' + statusText + '</span></td>';
    html += '</tr>';
  }
  html += '</tbody></table>';

  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

/* ── Toggle history dropdown ── */
window.toggleHistoryDropdown = async function() {
  var dd = document.getElementById('sessionHistoryDropdown');
  if (!dd) return;
  var isHidden = dd.classList.contains('hidden');
  // Close all other dropdowns
  document.querySelectorAll('.session-history-dropdown').forEach(function(el) { el.classList.add('hidden'); });
  if (isHidden) {
    await renderSessionSideBox();
    dd.classList.remove('hidden');
  }
};

document.addEventListener('click', function(e) {
  var dd = document.getElementById('sessionHistoryDropdown');
  if (dd && !dd.classList.contains('hidden') && !dd.contains(e.target) && !e.target.closest('[onclick*="toggleHistoryDropdown"]')) {
    dd.classList.add('hidden');
  }
});

/* ── Session name popup ── */
var _taskPopupEnabled = false;

window.showSessionNamePopup = function() {
  var popup = document.getElementById('pomoNamePopup');
  var input = document.getElementById('pomoNamePopupInput');
  if (!popup || !input) return;
  
  // Pre-fill from localStorage
  var saved = localStorage.getItem('pomoSessionName');
  input.value = saved || '';
  
  popup.classList.remove('hidden');
  setTimeout(function() { input.focus(); }, 50);
}

window.hideSessionNamePopup = function() {
  var popup = document.getElementById('pomoNamePopup');
  if (popup) popup.classList.add('hidden');
  var input = document.getElementById('pomoNamePopupInput');
  if (input) input.value = '';
}

window.confirmSessionName = function() {
  var input = document.getElementById('pomoNamePopupInput');
  if (!input) return;
  var name = input.value.trim();
  
  // Ensure both pomoSessionName and localStorage are updated atomically
  window.pomoSessionName = name;
  try { localStorage.setItem('pomoSessionName', name); } catch(e) {}
  
  if (activeSession) {
    activeSession.taskName = name;
  }
  
  hideSessionNamePopup();
  if (window._pendingSessionStart) {
    window._pendingSessionStart = false;
    if (activeSession) {
      activeSession.lastResumeTime = Date.now();
    }
    startTimer();
  }
  
  updateUI();
  renderTimeline();
  renderSessionTimeline();
  renderSessionSideBox();
};

document.addEventListener('click', function(e) {
  var popup = document.getElementById('pomoNamePopup');
  if (!popup || popup.classList.contains('hidden')) return;
  if (!popup.contains(e.target)) {
    confirmSessionName();
  }
});

async function updateTaskPopupCache() {
  var val = await window.db.getSetting('taskPopup');
  _taskPopupEnabled = val !== 'false';
}

(async function() {
  if (window._dbInitPromise) await window._dbInitPromise;
  await updateTaskPopupCache();
  await renderTimeline();
  await renderSessionTimeline();
  await renderSessionSideBox();
})();


