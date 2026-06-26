/* ── Page Router ── */
function showPage(name) {
  var pages = ['home', 'pomodoro', 'habits', 'goals', 'tasks', 'settings'];
  pages.forEach(function(p) {
    var el = document.getElementById('page-' + p);
    if (el) {
      if (p === name) el.classList.remove('hidden'); else el.classList.add('hidden');
    }
  });
  if (name === 'pomodoro' && window.initPomoShader) {
    window.initPomoShader();
  } else if (name !== 'pomodoro' && window.destroyPomoShader) {
    window.destroyPomoShader();
  }
  var buttons = document.querySelectorAll('#navSidebar button[data-page]');
  buttons.forEach(function(btn) {
    btn.classList.remove('text-white', 'relative');
    btn.classList.add('text-white/70', 'hover:text-white');
    var indicator = btn.querySelector('.sidebar-active');
    if (indicator) indicator.remove();
  });
  var active = document.querySelector('#navSidebar button[data-page="' + name + '"]');
  if (active) {
    active.classList.remove('text-white/70', 'hover:text-white');
    active.classList.add('text-white', 'relative');
    var div = document.createElement('div');
    div.className = 'sidebar-active absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r';
    active.appendChild(div);
  }
}

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

/* ── Sidebar Hover ── */
(function() {
  var sidebarContainer = document.getElementById('sidebar-container');
  if (!sidebarContainer) return;
  sidebarContainer.addEventListener('mouseenter', function() {
    this.classList.remove('sidebar-collapsed');
    this.classList.add('sidebar-expanded');
  });
  sidebarContainer.addEventListener('mouseleave', function() {
    this.classList.remove('sidebar-expanded');
    this.classList.add('sidebar-collapsed');
  });
})();

/* ── Old Data Restore ── */
window.electronAPI.onOldDataFound(function(data) {
  document.getElementById('restoreModal').style.display = 'flex';
});

window.restoreOldData = function() {
  window.electronAPI.restoreOldData().then(function() {
    document.getElementById('restoreModal').style.display = 'none';
  });
};

window.skipOldData = function() {
  window.electronAPI.skipOldData().then(function() {
    document.getElementById('restoreModal').style.display = 'none';
  });
};

/* ── Update system (electron-updater) ── */
var APP_VERSION = '1.2.2';
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

/* ── Welcome popup (shown once after update) ── */
(function() {
  if (!localStorage.getItem('welcomeShown')) {
    var notes = document.getElementById('welcomeReleaseNotes');
    if (notes) {
      notes.innerHTML = renderReleaseNotes(
        '## ✨ Rebrand\n- New app name: **Jamrah** (جمرة) — ember of productivity\n- New icon (SVG)\n\n## 🎨 Improvements\n- Settings sheet now white theme with black borders\n- Removed progress ring from pomodoro timer\n- Smooth slide-up/down animation for settings sheet\n- Confirmation modals for delete habit, delete task, end session\n- Goal tasks with Added/Done labels\n- Session name input box\n- Pomodoro controls hide when timer running\n\n## 🐛 Bug Fixes\n- Fixed End button not working when timer paused\n- Fixed timer preset not updating when paused\n- Fixed progress ring position\n- Fixed dark text visibility in end popup'
      );
    }
    document.getElementById('welcomeModal').style.display = 'flex';
  }
})();

window.closeWelcomeModal = function() {
  localStorage.setItem('welcomeShown', 'true');
  document.getElementById('welcomeModal').style.display = 'none';
};

/* ── Settings Page ── */
function selectStoragePath() {
  window.electronAPI.selectFolder().then(function(newPath) {
    if (newPath) {
      window.db.setPath(newPath).then(function(result) {
        if (result) {
          document.getElementById('storagePathDisplay').textContent = result;
        }
      });
    }
  });
}
function cancelSettings() { showPage('pomodoro'); }
function saveSettings() { showPage('pomodoro'); }

(function() {
  var pathEl = document.getElementById('storagePathDisplay');
  if (pathEl) {
    var p = window.db.getSetting('storagePath');
    pathEl.textContent = p || window.db.getSetting('defaultStoragePath') || 'Default';
  }
})();

/* ── Page change hook: render goals/tasks when page becomes visible ── */
var _origShowPage2 = showPage;
showPage = function(name) {
  _origShowPage2(name);
  if (name === 'goals') renderGoals();
  if (name === 'tasks') renderTasks();
  if (name === 'habits' && window.renderHabits) renderHabits();
};

showPage('pomodoro');
