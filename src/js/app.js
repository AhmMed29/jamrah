/* ── Page Router ── */
var _pendingNav = null;

async function showPage(name) {
  var settingsModal = document.getElementById('settingsModal');
  if (settingsModal && settingsModal.style.display === 'flex' && window.settingsDirty) {
    _pendingNav = name;
    document.getElementById('settingsConfirmModal').style.display = 'flex';
    return;
  }
  if (settingsModal) settingsModal.style.display = 'none';
  var pages = ['home', 'pomodoro', 'habits', 'goals', 'tasks'];
  pages.forEach(function(p) {
    var el = document.getElementById('page-' + p);
    if (el) {
      if (p === name) el.classList.remove('hidden'); else el.classList.add('hidden');
    }
  });
  if (name === 'pomodoro' && window.initPomoShader) {
    await window.initPomoShader();
  } else if (name !== 'pomodoro' && window.destroyPomoShader) {
    window.destroyPomoShader();
  }
  var buttons = document.querySelectorAll('#navDock .dock-item');
  buttons.forEach(function(btn) {
    btn.classList.remove('active');
    var dot = btn.querySelector('.dock-active-dot');
    if (dot) dot.remove();
  });
  var active = document.querySelector('#navDock .dock-item[data-page="' + name + '"]');
  if (active) {
    active.classList.add('active', 'relative');
    var div = document.createElement('div');
    div.className = 'dock-active-dot';
    active.appendChild(div);
  }
}

window.confirmSettingsSave = function() {
  window.saveSettings();
  document.getElementById('settingsConfirmModal').style.display = 'none';
  document.getElementById('settingsModal').style.display = 'none';
  var target = _pendingNav;
  _pendingNav = null;
  if (target) showPage(target);
};

window.confirmSettingsDiscard = function() {
  window.cancelSettings();
  document.getElementById('settingsConfirmModal').style.display = 'none';
  document.getElementById('settingsModal').style.display = 'none';
  var target = _pendingNav;
  _pendingNav = null;
  if (target) showPage(target);
};

window.closeSettingsConfirm = function(e) {
  if (!e || e.target === e.currentTarget) {
    document.getElementById('settingsConfirmModal').style.display = 'none';
    _pendingNav = null;
  }
};

/* ── Keyboard Shortcuts ── */
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && (e.key === '=' || e.key === '+')) { e.preventDefault(); window.electronAPI.zoomIn(); }
  if (e.ctrlKey && e.key === '-') { e.preventDefault(); window.electronAPI.zoomOut(); }
  if (e.ctrlKey && e.key === '0') { e.preventDefault(); window.electronAPI.zoomReset(); }
});

/* ── Clock ── */
function updateClock() {
  var now = new Date();
  var clk = document.getElementById('clockDisplay');
  if(clk) clk.textContent = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  var dateEl = document.getElementById('dateDisplay');
  if(dateEl) {
    var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    dateEl.textContent = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();
  }
}
updateClock();
setInterval(updateClock, 1000);

/* ── Update system (electron-updater) ── */
var APP_VERSION = '1.3.3';
var updateData = null;
var updateDownloaded = false;

function renderReleaseNotes(text) {
  if (!text) return '';
  return text
    .replace(/^### (.+)$/gm, '<div style="font-size:14px;font-weight:600;color:#374151;margin-top:12px;margin-bottom:6px">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="font-size:15px;font-weight:700;color:#1F2937;margin-top:14px;margin-bottom:8px">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="font-size:16px;font-weight:700;color:#111827;margin-top:16px;margin-bottom:8px">$1</div>')
    .replace(/^- (.+)$/gm, '<div style="display:flex;align-items:baseline;gap:8px;padding:2px 0"><span style="color:#3B82F6;flex-shrink:0">•</span><span>$1</span></div>')
    .replace(/\n/g, '<br>');
}

window.electronAPI.onUpdateAvailable(function(data) {
  updateData = data;
  updateDownloaded = false;
  document.getElementById('updateVersion').textContent = data.version;
  // Show update size (bytes → KB/MB)
  var sizeEl = document.getElementById('updateSize');
  if (sizeEl && data.files && data.files.length > 0) {
    var bytes = data.files[0].size;
    if (bytes) {
      sizeEl.textContent = bytes > 1048576 ? ' (' + (bytes / 1048576).toFixed(1) + ' MB)' : ' (' + (bytes / 1024).toFixed(1) + ' KB)';
    }
  }
  var notes = data.releaseNotes || data.releaseNotes;
  document.getElementById('updateReleaseNotes').innerHTML = renderReleaseNotes(typeof notes === 'string' ? notes : '');
  var btn = document.querySelector('#updateModal .flex.justify-end button:last-child');
  if (btn) { btn.textContent = 'Download'; btn.disabled = false; btn.onclick = startUpdateDownload; }
  document.getElementById('updateModal').style.display = 'flex';
});

window.startUpdateDownload = function() {
  var wrap = document.getElementById('updateProgressWrap');
  var bar = document.getElementById('updateProgressBar');
  var status = document.getElementById('updateStatus');
  var btn = document.querySelector('#updateModal .flex.justify-end button:last-child');
  if (wrap) wrap.style.display = 'block';
  if (status) { status.style.display = 'block'; status.textContent = 'Starting download...'; }
  if (btn) { btn.disabled = true; btn.textContent = 'Downloading...'; }
  window.electronAPI.startDownload().then(function(success) {
    if (success) {
      if (status) status.textContent = 'Download complete! Installing...';
      window.electronAPI.quitAndInstall();
    } else {
      if (status) status.textContent = 'Update failed. Please try again.';
      if (btn) { btn.disabled = false; btn.textContent = 'Retry'; }
    }
  });
};

window.electronAPI.onUpdateProgress(function(pct) {
  var bar = document.getElementById('updateProgressBar');
  var status = document.getElementById('updateStatus');
  if (bar) bar.style.width = pct + '%';
  if (status) status.textContent = pct < 100 ? 'Downloading... ' + pct + '%' : 'Download complete! Installing...';
});

window.electronAPI.onUpdateDownloaded(function() {
  updateDownloaded = true;
  var status = document.getElementById('updateStatus');
  var btn = document.querySelector('#updateModal .flex.justify-end button:last-child');
  if (status) status.textContent = 'Ready to install!';
  if (btn) { btn.disabled = false; btn.textContent = 'Install & Restart'; btn.onclick = function() { window.electronAPI.quitAndInstall(); }; }
});

window.downloadUpdate = window.startUpdateDownload;

window.closeUpdateModal = function(e) {
  if (!e || e.target === e.currentTarget) {
    document.getElementById('updateModal').style.display = 'none';
  }
};

/* ── Welcome popup (shown once, first launch only) ── */
(async function checkWelcome() {
  var shown = await window.db.getSetting('welcomeShown');
  if (shown === 'true') return;
  var modal = document.getElementById('welcomeModal');
  if (modal) modal.style.display = 'flex';
})();

window.closeWelcomeModal = async function() {
  await window.db.setSetting('welcomeShown', 'true');
  document.getElementById('welcomeModal').style.display = 'none';
};

/* ── Manual update check (from settings) ── */
window.checkForUpdates = function() {
  var btn = document.getElementById('checkUpdateBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Checking...'; }
  var statusEl = document.getElementById('updateStatus');
  if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = 'Checking for updates...'; }
  window.electronAPI.checkForUpdates().then(function(available) {
    if (btn) { btn.disabled = false; btn.textContent = 'Search for Updates'; }
    if (available) {
      // update-available event will fire automatically
    } else {
      if (statusEl) statusEl.textContent = 'You are up to date.';
      setTimeout(function() {
        if (statusEl) statusEl.style.display = 'none';
      }, 3000);
    }
  });
};

/* ── Settings Page ── */
function selectStoragePath() {
  window.electronAPI.selectFolder().then(function(newPath) {
    if (newPath) {
      window.db.setPath(newPath).then(function(result) {
        if (result) {
          document.getElementById('storagePathDisplay').textContent = result;
          if (window.markDirty) window.markDirty();
        }
      });
    }
  });
}
(async function() {
  var pathEl = document.getElementById('storagePathDisplay');
  if (pathEl) {
    var p = await window.db.getSetting('storagePath');
    pathEl.textContent = p || await window.db.getSetting('defaultStoragePath') || 'Default';
  }
})();

/* ── Page change hook: render goals/tasks when page becomes visible ── */
var _origShowPage2 = showPage;
showPage = async function(name) {
  await _origShowPage2(name);
  if (name === 'goals') renderGoals();
  if (name === 'tasks') renderTasks();
  if (name === 'habits' && window.renderHabits) renderHabits();
};

(async function() {
  await showPage('pomodoro');
})();
window.addEventListener('load', function() {
  var elapsed = performance.now() - window._splashStart;
  var delay = Math.max(0, 5000 - elapsed);
  setTimeout(function() {
    var splash = document.getElementById('app-splash');
    if (splash) { splash.style.opacity = '0'; splash.style.transition = 'opacity 0.6s'; setTimeout(function() { splash.style.display = 'none'; }, 600); }
  }, delay);
});
