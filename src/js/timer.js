var DASHARRAY = 2 * Math.PI * 192;
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

function loadSettings() {
  return {
    workMinutes: parseInt(window.db.getSetting('workMinutes')) || 25,
    shortBreakMinutes: parseInt(window.db.getSetting('shortBreakMinutes')) || 5,
    longBreakMinutes: parseInt(window.db.getSetting('longBreakMinutes')) || 15,
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

function setPhaseTime(p) {
  var s = loadSettings();
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

function tick() {
  if (!isRunning) return;
  recalcRemaining();
  if (remainingSeconds <= 0) {
    remainingSeconds = 0;
    stopTimer();
    window.updateSidebar();
    updateUI();
    completeTimer();
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
    setPhaseTime('work');
    startTimer();
    if (window.shaderSetRunning) window.shaderSetRunning(true);
  } else {
    if (isRunning) {
      stopTimer();
      recalcRemaining();
      if (window.shaderSetRunning) window.shaderSetRunning(false);
    } else {
      startTimer();
      if (window.shaderSetRunning) window.shaderSetRunning(true);
    }
  }
  updateUI();
};

window.resetTimer = function() {
  stopTimer();
  if (window.shaderSetRunning) window.shaderSetRunning(false);
  phase = 'idle';
  setPhaseTime('work');
  sessionCount = 0;
  updateRingColor();
  updateUI();
};

window.skipPhase = function() {
  if (phase === 'idle') return;
  stopTimer();
  if (phase === 'work') sessionCount++;
  phase = nextPhase(phase, sessionCount);
  setPhaseTime(phase);
  updateUI();
};

function advancePhase() {
  if (phase === 'work') {
    sessionCount++;
    phase = sessionCount % SESSIONS_BEFORE_LONG_BREAK === 0 ? 'longBreak' : 'shortBreak';
  } else {
    phase = 'work';
  }
  setPhaseTime(phase);
}

function completeTimer() {
  if (window.shaderSetRunning) window.shaderSetRunning(false);
  var ring = document.getElementById('progressRing');
  if (ring) ring.setAttribute('stroke', '#3b82f6');
  advancePhase();
  recalcRemaining();
  updateUI();
}

function updateRingColor() {
  var ring = document.getElementById('progressRing');
  if (!ring) return;
  ring.setAttribute('stroke', 'rgba(255,255,255,0.15)');
}

function nextPhase(current, count) {
  if (current === 'work') return (count + 1) % SESSIONS_BEFORE_LONG_BREAK === 0 ? 'longBreak' : 'shortBreak';
  return 'work';
}

function updateUI() {
  var text = document.getElementById('timerText');
  var label = document.getElementById('phaseLabel');
  var playBtn = document.getElementById('playBtn');
  var ring = document.getElementById('progressRing');

  if (text) text.textContent = phase === 'idle' ? '' : formatTime(remainingSeconds);
  if (label) label.textContent = phase === 'idle' ? 'tap to start' : PHASE_LABELS[phase];

  if (playBtn) {
    playBtn.innerHTML = isRunning
      ? '<svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor"><rect x="0" y="0" width="4" height="16" rx="1"/><rect x="10" y="0" width="4" height="16" rx="1"/></svg>'
      : '<svg width="14" height="16" viewBox="0 0 12 16" fill="currentColor" style="margin-left:2px"><polygon points="0,0 12,8 0,16"/></svg>';
  }

  if (ring) {
    if (phase !== 'idle' && totalSeconds > 0) {
      ring.style.strokeDashoffset = DASHARRAY * (1 - remainingSeconds / totalSeconds);
    } else {
      ring.style.strokeDashoffset = DASHARRAY;
    }
  }

  updateSessionDots();
}

function updateSessionDots() {
  var container = document.getElementById('sessionDots');
  if (!container) return;
  var completed = phase === 'idle' ? 0 : sessionCount % SESSIONS_BEFORE_LONG_BREAK;
  var dots = '';
  for (var i = 0; i < SESSIONS_BEFORE_LONG_BREAK; i++) {
    var filled = i < completed;
    var current = i === completed && phase === 'work' && isRunning;
    dots += '<div style="width:6px;height:6px;border-radius:50%;background:' +
      (filled ? 'rgba(255,255,255,0.7)' : current ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)') +
      '"></div>';
  }
  container.innerHTML = dots;
  container.style.display = phase === 'idle' ? 'none' : 'flex';
}

// Settings
window.openPomoSettings = function() {
  var sheet = document.getElementById('pomoSettings');
  if (!sheet) return;
  var s = loadSettings();
  document.getElementById('settingWork').value = s.workMinutes;
  document.getElementById('settingShortBreak').value = s.shortBreakMinutes;
  document.getElementById('settingLongBreak').value = s.longBreakMinutes;
  sheet.classList.remove('hidden');
};

window.closePomoSettings = function(e) {
  if (e && e.target !== e.currentTarget) return;
  var sheet = document.getElementById('pomoSettings');
  if (sheet) sheet.classList.add('hidden');
};

window.savePomoSettings = function() {
  var w = parseInt(document.getElementById('settingWork').value) || 25;
  var sb = parseInt(document.getElementById('settingShortBreak').value) || 5;
  var lb = parseInt(document.getElementById('settingLongBreak').value) || 15;
  if (w < 1) w = 1; if (w > 90) w = 90;
  if (sb < 1) sb = 1; if (sb > 30) sb = 30;
  if (lb < 1) lb = 1; if (lb > 60) lb = 60;
  window.db.setSetting('workMinutes', w);
  window.db.setSetting('shortBreakMinutes', sb);
  window.db.setSetting('longBreakMinutes', lb);
  if (phase === 'idle') setPhaseTime('work');
  var sheet = document.getElementById('pomoSettings');
  if (sheet) sheet.classList.add('hidden');
};

window.stepSetting = function(id, delta) {
  var inp = document.getElementById(id);
  if (!inp) return;
  var val = parseInt(inp.value) || 0;
  inp.value = Math.max(1, val + delta);
};

window.setTimer = function() {};
window.openTimePopup = function() {};
window.closeTimePopup = function() {};

// End popup
window.confirmEnd = function() {
  stopTimer();
  phase = 'idle';
  advancePhase();
  recalcRemaining();
  updateUI();
};

window.cancelEnd = function() {
  var popup = document.getElementById('endPopup');
  if (popup) popup.classList.add('hidden');
};
window.closeEndPopup = window.cancelEnd;

window.openEndPopup = function() {
  if (!isRunning) return;
  var popup = document.getElementById('endPopup');
  if (popup) popup.classList.remove('hidden');
};

// Init
setPhaseTime('work');
updateUI();

document.getElementById('playBtn').addEventListener('click', function(e) {
  e.stopPropagation();
  window.toggleTimer();
});

var timerCircle = document.getElementById('timerCircle');
if (timerCircle) {
  timerCircle.addEventListener('click', function(e) {
    if (e.target.closest('.pomo-btn, .pomo-play-btn, .pomo-gear-btn')) return;
    window.toggleTimer();
  });
}

initStats();
updateSidebar();
