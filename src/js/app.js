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

/* ── Update system ── */
var APP_VERSION = '1.1.1';
var updateData = null;

window.electronAPI.onUpdateAvailable(function(data) {
  updateData = data;
  document.getElementById('updateVersion').textContent = data.version;
  document.getElementById('updateReleaseNotes').textContent = data.releaseNotes || '';
  document.getElementById('updateModal').style.display = 'flex';
});

window.downloadUpdate = function() {
  if (updateData && updateData.downloadUrl) {
    window.electronAPI.openUrl(updateData.downloadUrl);
  }
  document.getElementById('updateModal').style.display = 'none';
};

window.closeUpdateModal = function(e) {
  if (!e || e.target === e.currentTarget) {
    document.getElementById('updateModal').style.display = 'none';
  }
};

/* ── Settings Page ── */
function selectStoragePath() {
  window.electronAPI.selectStoragePath().then(function(newPath) {
    if (newPath) {
      window.db.setSetting('storagePath', newPath);
      document.getElementById('storagePathDisplay').textContent = newPath;
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
};

showPage('pomodoro');
