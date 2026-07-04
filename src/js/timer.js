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
    await window.updateSidebar();
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

window.toggleTimer = async function() {
  if (phase === 'idle') {
    phase = 'work';
    await setPhaseTime('work');
    startTimer();
    if (window.AudioManager) window.AudioManager.playSound('pomo-start.mp3');
  } else {
    if (isRunning) {
      stopTimer();
      recalcRemaining();
    } else {
      startTimer();
      if (window.AudioManager) window.AudioManager.playSound('pomo-start.mp3');
    }
  }
  updateUI();
};

window.resetTimer = async function() {
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

  var show = phase === 'idle' || !isRunning;
  var ctrlArea = document.getElementById('pomoControlsArea');
  if (ctrlArea) {
    if (show) ctrlArea.classList.add('controls-visible');
    else ctrlArea.classList.remove('controls-visible');
  }
  var pres = document.getElementById('pomoPresets');
  var nmBox = document.getElementById('pomoNameBox');
  if (pres) pres.style.display = show ? 'flex' : 'none';
  if (nmBox) nmBox.style.display = show ? 'block' : 'none';

  var counter = document.getElementById('sessionCounter');
  if (counter) {
    if (!isRunning) {
      var count = sessionCount % SESSIONS_BEFORE_LONG_BREAK + 1;
      counter.textContent = count + '/' + SESSIONS_BEFORE_LONG_BREAK;
      counter.style.display = '';
    } else {
      counter.style.display = 'none';
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
window.openPomoSettings = async function() {
  if (window.openSettings) await window.openSettings();
  if (window.switchSettingsTab) window.switchSettingsTab('pomodoro');
};

window.savePomoSettings = async function() {
  var w = parseInt(document.getElementById('settingWork').value) || 25;
  var sb = parseInt(document.getElementById('settingShortBreak').value) || 5;
  var lb = parseInt(document.getElementById('settingLongBreak').value) || 90;
  if (w < 1) w = 1; if (w > 90) w = 90;
  if (sb < 1) sb = 1; if (sb > 30) sb = 30;
  if (lb < 1) lb = 1; if (lb > 60) lb = 60;
  await window.db.setSetting('workMinutes', w);
  await window.db.setSetting('shortBreakMinutes', sb);
  await window.db.setSetting('longBreakMinutes', lb);
  if (phase === 'idle') await setPhaseTime('work');
  else if (!isRunning) { await setPhaseTime(phase); updateUI(); }
  var sheet = document.getElementById('pomoSettings');
  if (!sheet) return;
  sheet.classList.add('closing');
  setTimeout(function() {
    sheet.classList.add('hidden');
    sheet.classList.remove('closing');
  }, 300);
};

window.stepSetting = function(id, delta) {
  var inp = document.getElementById(id);
  if (!inp) return;
  var val = parseInt(inp.value) || 0;
  inp.value = Math.max(1, val + delta);
  markDirty();
};

window.setTimer = function() {};
window.openTimePopup = function() {};
window.closeTimePopup = function() {};

// Preset & time adjustment
window.setPreset = async function(minutes) {
  await window.db.setSetting('workMinutes', minutes);
  if (phase === 'idle') {
    await setPhaseTime('work');
  } else if (phase === 'work') {
    var newTotal = minutes * 60;
    var progress = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
    totalSeconds = newTotal;
    remainingSeconds = Math.max(0, Math.round(newTotal * (1 - progress)));
  }
  updateUI();
};

window.adjustTime = function(delta) {
  if (phase === 'idle') return;
  var adj = delta * 60;
  totalSeconds = Math.max(60, totalSeconds + adj);
  remainingSeconds = Math.max(0, remainingSeconds + adj);
  updateUI();
};

// End popup
window.confirmEnd = async function() {
  stopTimer();
  phase = 'idle';
  await advancePhase();
  recalcRemaining();
  updateUI();
  if (window.AudioManager) window.AudioManager.playSound('pomo-end.mp3');
};

window.cancelEnd = function() {
  var popup = document.getElementById('endPopup');
  if (popup) popup.classList.add('hidden');
};
window.closeEndPopup = window.cancelEnd;

window.openEndPopup = function() {
  if (phase === 'idle') return;
  var popup = document.getElementById('endPopup');
  if (popup) popup.classList.remove('hidden');
};

// Init
window.pomoSessionName = localStorage.getItem('pomoSessionName') || '';
var nameInput = document.getElementById('pomoNameInput');
if (nameInput) {
  nameInput.value = window.pomoSessionName;
  nameInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      window.pomoSessionName = this.value.trim();
      localStorage.setItem('pomoSessionName', window.pomoSessionName);
      this.blur();
    }
  });
}
(async function() {
  await setPhaseTime('work');
  updateUI();
})();

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

(async function() {
  await initStats();
  await updateSidebar();
})();
