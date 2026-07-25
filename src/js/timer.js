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
    remainingSeconds = Math.max(0, totalSeconds - accumulatedSeconds);
  } else {
    startTimer();
    if (window.AudioManager) window.AudioManager.playSound('pomo-start.mp3');
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
  var lbiVal = parseInt(await window.db.getSetting('longBreakInterval')) || 4;
  if (phase === 'work') {
    phase = sessionCount % lbiVal === 0 ? 'longBreak' : 'shortBreak';
  } else {
    phase = 'work';
  }
  await setPhaseTime(phase);
  updateUI();
};

async function advancePhase() {
  var lbiVal = parseInt(await window.db.getSetting('longBreakInterval')) || 4;
  if (phase === 'work') {
    sessionCount++;
    phase = sessionCount % lbiVal === 0 ? 'longBreak' : 'shortBreak';
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

  // Desktop notification
  var dn = await window.db.getSetting('desktopNotifications');
  if (dn !== 'false' && window.Notification) {
    if (Notification.permission === 'granted') {
      new Notification('Focus Timer', { body: phase === 'work' ? 'Break finished! Time to focus.' : 'Focus session finished! Take a break.' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }

  // Auto-start next phase
  if (phase === 'work') {
    var asf = await window.db.getSetting('autoStartFocus');
    if (asf === 'true') {
      startTimer();
      if (window.AudioManager) window.AudioManager.playSound('pomo-start.mp3');
    }
  } else {
    var asb = await window.db.getSetting('autoStartBreak');
    if (asb === 'true') {
      startTimer();
      if (window.AudioManager) window.AudioManager.playSound('pomo-start.mp3');
    }
  }
}

function updateUI() {
  var text = document.getElementById('timerText');
  var label = document.getElementById('phaseLabel');
  if (text) text.textContent = formatTime(remainingSeconds);
  if (label) label.textContent = PHASE_LABELS[phase] || 'Focus';

  // Toggle timeline panel visibility when timer runs
  var sideBox = document.getElementById('pomoTimelinePanel');
  if (sideBox) {
    if (isRunning) {
      sideBox.classList.add('hidden-fade');
    } else {
      sideBox.classList.remove('hidden-fade');
    }
  }

  // Toggle active session info visibility
  var activeInfo = document.getElementById('pomoActiveSessionInfo');
  if (activeInfo) {
    activeInfo.classList.remove('hidden');
    var activeName = document.getElementById('pomoActiveTaskName');
    if (activeName && document.activeElement !== activeName) {
      if (typeof _rightPanelSession !== 'undefined' && _rightPanelSession && _rightPanelSession !== activeSession) {
        // Keep the past session name, don't override
      } else {
        activeName.value = window.pomoSessionName || '';
      }
    }
  }

  // Toggle note panel visibility
  var notePanel = document.getElementById('pomoNotePanel');
  if (notePanel) {
    if (phase !== 'idle') {
      notePanel.classList.remove('hidden');
    } else if (typeof _pomoRightPanelOpen !== 'undefined' && _pomoRightPanelOpen) {
      notePanel.classList.remove('hidden');
    } else {
      notePanel.classList.add('hidden');
    }
  }

  // Toggle timer-running on circle wrapper for hover buttons
  var wrapper = document.getElementById('timerCircle');
  if (wrapper) {
    if (isRunning) {
      wrapper.classList.add('timer-running');
    } else {
      wrapper.classList.remove('timer-running');
    }
  }

  // Update session count display
  var sCount = document.getElementById('sessionCountDisplay');
  if (sCount) {
    window.db.getSetting('showSessionCount').then(function(ssc) {
      if (ssc !== 'false' && phase !== 'idle') {
        sCount.style.display = 'block';
        sCount.textContent = 'Session #' + (sessionCount + 1);
      } else {
        sCount.style.display = 'none';
      }
    });
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
  await window.refreshTimerSettings();
};

window.refreshTimerSettings = async function() {
  if (phase === 'idle') {
    await setPhaseTime('work');
  } else if (!isRunning) {
    await setPhaseTime(phase);
  }
  updateUI();
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

window.adjustTime = async function(delta) {
  if (phase === 'idle') {
    var newMinutes = Math.max(1, Math.floor(remainingSeconds / 60) + delta);
    totalSeconds = newMinutes * 60;
    remainingSeconds = totalSeconds;
    await window.db.setSetting('workMinutes', newMinutes);
  } else {
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

  // Desktop notification
  var dn = await window.db.getSetting('desktopNotifications');
  if (dn !== 'false' && window.Notification && Notification.permission === 'granted') {
    new Notification('Focus Timer', { body: 'Session ended early.' });
  }

  // Auto-start next phase
  if (phase === 'work') {
    var asf = await window.db.getSetting('autoStartFocus');
    if (asf === 'true') {
      startTimer();
      if (window.AudioManager) window.AudioManager.playSound('pomo-start.mp3');
    }
  } else {
    var asb = await window.db.getSetting('autoStartBreak');
    if (asb === 'true') {
      startTimer();
      if (window.AudioManager) window.AudioManager.playSound('pomo-start.mp3');
    }
  }
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

window.setPomoPhase = async function(p) {
  if (phase === 'idle' || !isRunning) {
    phase = p;
    await setPhaseTime(p);
    document.querySelectorAll('.pomo-phase-word').forEach(function(el) { el.classList.remove('active'); });
    var el = document.getElementById('pomoPhase' + p.charAt(0).toUpperCase() + p.slice(1));
    if (el) el.classList.add('active');
    updateUI();
  }
};

// Init
window.pomoSessionName = localStorage.getItem('pomoSessionName') || '';
(async function() {
  if (window._dbInitPromise) await window._dbInitPromise;
  await setPhaseTime('work');
  updateUI();
  
  // Request notification permission if not asked
  if (window.Notification && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  
  // Show release notes welcome popup once
  try {
    var seen = await window.db.getSetting('seenReleaseNotesV3');
    if (seen !== 'true') {
      var modal = document.getElementById('releaseNotesModal');
      if (modal) {
        modal.classList.remove('hidden');
        await window.db.setSetting('seenReleaseNotesV3', 'true');
      }
    }
  } catch(e) {
    // Silently fail if DB not available
  }
})();

window.closeReleaseNotes = function(e) {
  if (e && e.target !== e.currentTarget) return;
  var modal = document.getElementById('releaseNotesModal');
  if (modal) modal.classList.add('hidden');
};

