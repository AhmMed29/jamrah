/* â”€â”€ Page Router â”€â”€ */
var _pendingNav = null;

async function showPage(name) {
  var settingsPage = document.getElementById('page-settings');
  if (settingsPage && !settingsPage.classList.contains('hidden') && window.settingsDirty) {
    _pendingNav = name;
    document.getElementById('settingsConfirmModal').style.display = 'flex';
    return;
  }
  var pages = ['home', 'pomodoro', 'habits', 'calender', 'tasks', 'settings', 'stats'];
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
  
  var pomoTimelinePanel = document.getElementById('pomoTimelinePanel');
  if (pomoTimelinePanel) {
    pomoTimelinePanel.style.display = (name === 'pomodoro') ? 'flex' : 'none';
  }
  
  var pomoRightToggleBtn = document.getElementById('pomoRightToggleBtn');
  if (pomoRightToggleBtn) {
    pomoRightToggleBtn.style.display = (name === 'pomodoro') ? 'flex' : 'none';
  }
  
  var pomoRightPanelWrapper = document.getElementById('pomoRightPanelWrapper');
  if (pomoRightPanelWrapper) {
    pomoRightPanelWrapper.style.display = (name === 'pomodoro') ? 'flex' : 'none';
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

window.confirmSettingsSave = async function() {
  await window.saveSettings();
  document.getElementById('settingsConfirmModal').style.display = 'none';
  var target = _pendingNav;
  _pendingNav = null;
  showPage(target || 'pomodoro');
};

window.confirmSettingsDiscard = function() {
  window.cancelSettings();
  document.getElementById('settingsConfirmModal').style.display = 'none';
  var target = _pendingNav;
  _pendingNav = null;
  showPage(target || 'pomodoro');
};

window.closeSettingsConfirm = function(e) {
  if (!e || e.target === e.currentTarget) {
    document.getElementById('settingsConfirmModal').style.display = 'none';
    _pendingNav = null;
  }
};

/* â”€â”€ Keyboard Shortcuts â”€â”€ */
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && (e.key === '=' || e.key === '+')) { e.preventDefault(); window.electronAPI.zoomIn(); }
  if (e.ctrlKey && e.key === '-') { e.preventDefault(); window.electronAPI.zoomOut(); }
  if (e.ctrlKey && e.key === '0') { e.preventDefault(); window.electronAPI.zoomReset(); }
});
window.electronAPI.onShortcut(function(action) {
  switch (action) {
    case 'pomodoro': showPage('pomodoro'); break;
    case 'settings': if (window.openSettings) openSettings(); break;
    case 'new-task':
      var inp = document.getElementById('tasks-new-input');
      if (inp) { inp.focus(); showPage('tasks'); }
      break;
  }
});

/* â”€â”€ Clock â”€â”€ */
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

/* â”€â”€ Update system (electron-updater) â”€â”€ */
var APP_VERSION = '2.4.0';
var updateData = null;
var updateDownloaded = false;

function renderReleaseNotes(text) {
  if (!text) return '';
  return text
    .replace(/^### (.+)$/gm, '<div style="font-size:14px;font-weight:600;color:#374151;margin-top:12px;margin-bottom:6px">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="font-size:15px;font-weight:700;color:#1F2937;margin-top:14px;margin-bottom:8px">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="font-size:16px;font-weight:700;color:#111827;margin-top:16px;margin-bottom:8px">$1</div>')
    .replace(/^- (.+)$/gm, '<div style="display:flex;align-items:baseline;gap:8px;padding:2px 0"><span style="color:#3B82F6;flex-shrink:0">â€¢</span><span>$1</span></div>')
    .replace(/\n/g, '<br>');
}

window.electronAPI.onUpdateAvailable(function(data) {
  updateData = data;
  updateDownloaded = false;
  document.getElementById('updateVersion').textContent = data.version;
  // Show update size (bytes â†’ KB/MB)
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

/* â”€â”€ Manual update check (from settings) â”€â”€ */
window.checkForUpdates = function() {
  var btn = document.getElementById('checkUpdateBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Checking...'; }
  var statusEl = document.getElementById('updateSettingsStatus');
  if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = 'Checking for updates...'; }
  window.electronAPI.checkForUpdates().then(function(available) {
    if (btn) { btn.disabled = false; btn.textContent = 'Search for Updates'; }
    if (available) {
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

/* ── Backend error toast ── */
window.showAppToast = function(msg) {
  var el = document.getElementById('appToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'appToast';
    el.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;background:#ef4444;color:#fff;padding:14px 22px;border-radius:12px;font-size:14px;font-weight:500;box-shadow:0 6px 20px rgba(0,0,0,0.18);opacity:0;transform:translateY(16px);transition:all 0.35s;max-width:420px;line-height:1.4;font-family:Inter,sans-serif;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  el.style.transform = 'translateY(0)';
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(function() {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
  }, 6000);
};

window.electronAPI.onBackendError(function(msg) {
  window.showAppToast(msg);
});

/* ── Date change checker for habits (local date, not UTC) ── */
function _localDateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
var _lastDateStr = _localDateStr(new Date());
setInterval(function() {
  var nowStr = _localDateStr(new Date());
  if (nowStr !== _lastDateStr) {
    _lastDateStr = nowStr;
    if (window.renderHabits) window.renderHabits();
  }
}, 60000);

(async function() {
  var pathEl = document.getElementById('storagePathDisplay');
  if (pathEl) {
    var p = await window.db.getSetting('storagePath');
    pathEl.textContent = p || await window.db.getSetting('defaultStoragePath') || 'Default';
  }
})();

/* â”€â”€ Page change hook: render tasks/habits/stats when page becomes visible â”€â”€ */
var _origShowPage2 = showPage;
showPage = async function(name) {
  await _origShowPage2(name);
  if (name === 'calender' && typeof renderCalender === 'function') renderCalender();
  if (name === 'tasks' && typeof renderTasks === 'function') renderTasks();
  if (name === 'habits' && window.renderHabits) renderHabits();
  if (name === 'stats' && window.renderStats) renderStats();
  if (typeof updateAppSidebarActive === 'function') updateAppSidebarActive(name);
};

window.addEventListener('load', function() {
  var elapsed = performance.now() - window._splashStart;
  var delay = Math.max(0, 1500 - elapsed);
  setTimeout(function() {
    var splash = document.getElementById('app-splash');
    if (splash) { splash.style.opacity = '0'; splash.style.transition = 'opacity 0.6s'; setTimeout(function() { splash.style.display = 'none'; }, 600); }
  }, delay);
  window.electronAPI.checkFrontendUpdate().then(function(r) {
    if (r && r.updated) {
      var el = document.createElement('div')
      el.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#7C3AED;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;z-index:99999;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.2)'
      el.textContent = 'Update v' + r.version + ' ready \u2014 click to apply'
      el.onclick = function() { location.reload(true) }
      document.body.appendChild(el)
    }
  })
});

/* زرار الإعدادات في الـ dock */
document.addEventListener("DOMContentLoaded", () => {
  var settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', function() {
      if (typeof openSettings === 'function') openSettings();
      if (window.AudioManager?.playSound) {
        window.AudioManager.playSound('tab-swipping.mp3');
      }
    });
  }
});

