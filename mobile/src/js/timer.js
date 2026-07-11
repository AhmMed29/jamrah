// timer.js - pomodoro timer logic (SQLite-based)

var DASHARRAY = 2 * Math.PI * 192 + 8;
var savedMinutes = window.db.getSetting('timerMinutes');
var totalSeconds = (parseInt(savedMinutes) || 50) * 60;
var remainingSeconds = totalSeconds;
var isRunning = false;
var timerId = null;
var expectedNext = 0;

var timerText = document.getElementById('timerText');
var progressRing = document.getElementById('progressRing');
var startBtn = document.getElementById('startBtn');
var endBtn = document.getElementById('endBtn');
if (timerText) timerText.textContent = formatTime(remainingSeconds);

function formatTime(secs) {
  var mm = Math.floor(secs / 60);
  var ss = secs % 60;
  return (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
}

function updateRing() {
  if (!progressRing) return;
  progressRing.style.strokeDashoffset = DASHARRAY * (remainingSeconds / totalSeconds);
}

function stopTimer() {
  isRunning = false;
  if (timerId) { clearTimeout(timerId); timerId = null; }
}

function tick() {
  if (!isRunning) return;
  remainingSeconds--;
  if (timerText) timerText.textContent = formatTime(remainingSeconds);
  updateRing();
  if (remainingSeconds <= 0) {
    completeTimer();
    return;
  }
  expectedNext += 1000;
  var delay = expectedNext - Date.now();
  timerId = setTimeout(tick, Math.max(0, delay));
}

window.openTimePopup = function() {
  if (isRunning) return;
  var inp = document.getElementById('timeInput');
  if (!inp) return;
  inp.value = Math.ceil(totalSeconds / 60);
  var popup = document.getElementById('timePopup');
  if (popup) popup.classList.remove('hidden');
  inp.focus();
  inp.select();
};

window.closeTimePopup = function(e) {
  if (e.target === e.currentTarget) {
    var popup = document.getElementById('timePopup');
    if (popup) popup.classList.add('hidden');
  }
};

window.setTimer = function() {
  stopTimer();
  if (startBtn) startBtn.textContent = 'Start';
  if (endBtn) endBtn.classList.add('hidden');
  var minutes = parseInt(document.getElementById('timeInput').value) || 50;
  totalSeconds = minutes * 60;
  remainingSeconds = totalSeconds;
  if (timerText) timerText.textContent = formatTime(remainingSeconds);
  var popup = document.getElementById('timePopup');
  if (popup) popup.classList.add('hidden');
};

window.toggleTimer = function() {
  if (remainingSeconds <= 0) { window.openTimePopup(); return; }
  if (isRunning) {
    stopTimer();
    if (startBtn) startBtn.textContent = 'Continue';
  } else {
    startTimer();
  }
};

function startTimer() {
  if (remainingSeconds <= 0) return;
  var isFresh = remainingSeconds === totalSeconds;
  isRunning = true;
  if (startBtn) startBtn.textContent = 'Pause';
  if (endBtn) endBtn.classList.remove('hidden');
  if (isFresh) {
    if (progressRing) {
      progressRing.style.transition = 'none';
      progressRing.style.strokeDashoffset = DASHARRAY;
      void progressRing.offsetHeight;
      progressRing.style.transition = '';
    }
    expectedNext = Date.now();
    tick();
  } else {
    expectedNext = Date.now();
    timerId = setTimeout(function() {
      expectedNext = Date.now();
      tick();
    }, 1000);
  }
}

function saveFocusMinutes(mins) {
  if (mins < 0.01) return;
  window.updateSidebar();
}

function completeTimer() {
  stopTimer();
  if (startBtn) startBtn.textContent = 'Start';
  if (endBtn) endBtn.classList.add('hidden');
  saveFocusMinutes(totalSeconds / 60);
}

window.openEndPopup = function() {
  if (!isRunning) return;
  var popup = document.getElementById('endPopup');
  if (popup) popup.classList.remove('hidden');
};

window.closeEndPopup = function(e) {
  if (e.target === e.currentTarget) {
    var popup = document.getElementById('endPopup');
    if (popup) popup.classList.add('hidden');
  }
};

window.confirmEnd = function() {
  var elapsedMinutes = (totalSeconds - remainingSeconds) / 60;
  stopTimer();
  if (startBtn) startBtn.textContent = 'Start';
  if (endBtn) endBtn.classList.add('hidden');
  saveFocusMinutes(elapsedMinutes);
  remainingSeconds = totalSeconds;
  if (timerText) timerText.textContent = formatTime(remainingSeconds);
  var popup = document.getElementById('endPopup');
  if (popup) popup.classList.add('hidden');
};

window.cancelEnd = function() {
  var popup = document.getElementById('endPopup');
  if (popup) popup.classList.add('hidden');
};

window.adjustTime = function(delta) {
  if (phase === 'idle' && !window._pendingSessionStart) return;
  var adj = delta * 60;
  totalSeconds = Math.max(60, totalSeconds + adj);
  remainingSeconds = Math.max(0, remainingSeconds + adj);
  updateUI();
};

initStats();
updateSidebar();
