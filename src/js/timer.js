var SESSIONS_BEFORE_LONG_BREAK = 4;
var PHASE_LABELS = { idle: '', work: 'Focus', shortBreak: 'Short Break', longBreak: 'Long Break' };

var phase = 'idle';
var totalSeconds = 25 * 60;
var remainingSeconds = 25 * 60;
var accumulatedSeconds = 0;
var sessionCount = 0;
var isRunning = false;
var timerId = null;
var runStartTime = 0;

async function loadSettings() {
  var work = await window.db.getSetting('workMinutes')
  var sb = await window.db.getSetting('shortBreakMinutes')
  var lb = await window.db.getSetting('longBreakMinutes')
  return {
    workMinutes: parseInt(work) || 25,
    shortBreakMinutes: parseInt(sb) || 5,
    longBreakMinutes: parseInt(lb) || 15,
  };
}

function toDuration(s, p) {
  if (p === 'work') return s.workMinutes * 60;
  if (p === 'shortBreak') return s.shortBreakMinutes * 60;
  if (p === 'longBreak') return s.longBreakMinutes * 60;
  return s.workMinutes * 60;
}

function formatTime(secs) {
  var mm = Math.floor(secs / 60);
  var ss = Math.floor(secs % 60);
  return (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
}

async function setPhaseTime(p) {
  var s = await loadSettings();
  totalSeconds = toDuration(s, p);
  remainingSeconds = totalSeconds;
  accumulatedSeconds = 0;
}

function recalcRemaining() {
  if (!isRunning) return;
  var elapsed = (Date.now() - runStartTime) / 1000;
  var remaining = totalSeconds - accumulatedSeconds - elapsed;
  if (remaining < 0) remaining = 0;
  remainingSeconds = remaining;
}

function stopTimer() {
  if (isRunning && runStartTime > 0) {
    accumulatedSeconds += (Date.now() - runStartTime) / 1000;
  }
  isRunning = false;
  if (timerId) { clearTimeout(timerId); timerId = null; }
}

async function tick() {
  if (!isRunning) return;
  recalcRemaining();
  if (remainingSeconds <= 0) {
    remainingSeconds = 0;
    stopTimer();
    // Sidebar stats removed in redesign
    updateUI();
    await completeTimer();
    return;
  }
  updateUI();
  timerId = setTimeout(tick, 100);
}

function startTimer() {
  runStartTime = Date.now();
  isRunning = true;
  tick();
}

window.toggleTimer = function() {
  if (phase === 'idle') {
    phase = 'work';
    startTimer();
    if (window.AudioManager) window.AudioManager.playSound('pomo-start.mp3');
  } else if (isRunning) {
    stopTimer();
    recalcRemaining();
  } else {
    startTimer();
    if (window.AudioManager) window.AudioManager.playSound('pomo-start.mp3');
  }
  updateUI();
};

window.resetTimer = async function() {
  if (window._pendingSessionStart) {
    window._pendingSessionStart = false;
    if (window.onSessionCancel) window.onSessionCancel();
  }
  stopTimer();
  phase = 'idle';
  await setPhaseTime('work');
  sessionCount = 0;
  updateUI();
};

window.skipPhase = async function() {
  if (phase === 'idle') return;
  stopTimer();
  if (phase === 'work') sessionCount++;
  phase = nextPhase(phase, sessionCount);
  await setPhaseTime(phase);
  updateUI();
};

async function advancePhase() {
  if (phase === 'work') {
    sessionCount++;
    phase = sessionCount % SESSIONS_BEFORE_LONG_BREAK === 0 ? 'longBreak' : 'shortBreak';
  } else {
    phase = 'work';
  }
  await setPhaseTime(phase);
}

async function completeTimer() {
  await advancePhase();
  recalcRemaining();
  updateUI();
  if (window.AudioManager) window.AudioManager.playSound('pomo-end.mp3');
}

function nextPhase(current, count) {
  if (current === 'work') return (count + 1) % SESSIONS_BEFORE_LONG_BREAK === 0 ? 'longBreak' : 'shortBreak';
  return 'work';
}

function updateUI() {
  var text = document.getElementById('timerText');
  var label = document.getElementById('phaseLabel');
  var playBtn = document.getElementById('playBtn');

  if (text) text.textContent = formatTime(remainingSeconds);
  if (label) label.textContent = PHASE_LABELS[phase] || 'Focus';

  if (playBtn) {
    playBtn.innerHTML = isRunning
      ? '<svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor"><rect x="0" y="0" width="4" height="16" rx="1"/><rect x="10" y="0" width="4" height="16" rx="1"/></svg>'
      : '<svg width="14" height="16" viewBox="0 0 12 16" fill="currentColor" style="margin-left:2px"><polygon points="0,0 12,8 0,16"/></svg>';
  }

}

// Settings
window.openPomoSettings = async function() {
  if (window.openSettings) await window.openSettings();
  if (window.switchSettingsTab) window.switchSettingsTab('pomodoro');
};

window.savePomoSettings = async function() {
  var w = parseInt(document.getElementById('settingWork').value) || 25;
  var sb = parseInt(document.getElementById('settingShortBreak').value) || 5;
  var lb = parseInt(document.getElementById('settingLongBreak').value) || 15;
  if (w < 1) w = 1; if (w > 90) w = 90;
  if (sb < 1) sb = 1; if (sb > 30) sb = 30;
  if (lb < 1) lb = 1; if (lb > 60) lb = 60;
  await window.db.setSetting('workMinutes', w);
  await window.db.setSetting('shortBreakMinutes', sb);
  await window.db.setSetting('longBreakMinutes', lb);
  if (phase === 'idle') {
    await setPhaseTime('work');
  } else if (!isRunning) {
    await setPhaseTime(phase);
    updateUI();
  }
};

window.stepSetting = function(id, delta) {
  var inp = document.getElementById(id);
  if (!inp) return;
  var val = parseInt(inp.value) || 0;
  inp.value = Math.max(1, val + delta);
  markDirty();
};

// Preset & time adjustment
window.setPreset = async function(minutes) {
  if (phase !== 'idle') return; // Only allow preset changes when idle
  await window.db.setSetting('workMinutes', minutes);
  if (phase === 'idle') {
    await setPhaseTime('work');
    updateUI();
  }
};

window.adjustTime = function(delta) {
  if (phase === 'idle' && !window._pendingSessionStart) {
    // Allow adjustment in idle state
    var newMinutes = Math.max(1, Math.floor(remainingSeconds / 60) + delta);
    totalSeconds = newMinutes * 60;
    remainingSeconds = totalSeconds;
  } else {
    // During timer or pending start
    var adj = delta * 60;
    totalSeconds = Math.max(60, totalSeconds + adj);
    remainingSeconds = Math.max(0, remainingSeconds + adj);
  }
  updateUI();
};

// End popup
window.confirmEnd = async function() {
  stopTimer();
  phase = 'idle';
  await advancePhase();
  recalcRemaining();
  updateUI();
  var popup = document.getElementById('endPopup');
  if (popup) popup.classList.add('hidden');
  if (window.AudioManager) window.AudioManager.playSound('pomo-end.mp3');
};

window.cancelEnd = function() {
  var popup = document.getElementById('endPopup');
  if (popup) popup.classList.add('hidden');
};
window.closeEndPopup = function(e) {
  if (e && e.target !== e.currentTarget) return;
  window.cancelEnd();
};

window.openEndPopup = function() {
  if (phase === 'idle') return;
  var popup = document.getElementById('endPopup');
  if (popup) popup.classList.remove('hidden');
};

// Init
window.pomoSessionName = localStorage.getItem('pomoSessionName') || '';
(async function() {
  if (window._dbInitPromise) await window._dbInitPromise;
  await setPhaseTime('work');
  updateUI();
})();

document.getElementById('playBtn').addEventListener('click', function(e) {
  e.stopPropagation();
  window.toggleTimer();
  updateUI();
});

var timerCircle = document.getElementById('timerCircle');
if (timerCircle) {
  timerCircle.addEventListener('click', function(e) {
    if (e.target.closest('.pomo-play-btn')) return;
    window.toggleTimer();
    updateUI();
  });
}

(async function() {
  // Sidebar stats removed in redesign
})();
