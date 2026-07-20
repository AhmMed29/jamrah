function applyTheme() {
  document.body.style.backgroundColor = '#FAFAFA';
  var nav = document.getElementById('navSidebar');
  if (nav) nav.style.backgroundColor = '#3B82F6';
  var tb = document.getElementById('titlebar');
  if (tb) tb.style.backgroundColor = '#FFFFFF';
  var startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.style.backgroundColor = '#3B82F6';
  var endBtn = document.getElementById('endBtn');
  if (endBtn) endBtn.style.backgroundColor = '#EF4444';
  var main = document.getElementById('mainArea');
  if (main) main.style.backgroundColor = '#FFFFFF';
  var aside = document.getElementById('asideArea');
  if (aside) aside.style.backgroundColor = '#FFFFFF';
  document.querySelectorAll('#asideArea .grid > div').forEach(function(el) { el.style.backgroundColor = '#F5F6F8'; });
  var bg = document.getElementById('progressBg');
  if (bg) bg.style.stroke = '#F3F4F6';
}

async function openSettings() {
  showPage('settings');

  var pages = ['home', 'pomodoro', 'habits'];
  for (var i = 0; i < pages.length; i++) {
    var el = document.getElementById('page-' + pages[i]);
    if (el && !el.classList.contains('hidden')) {
      window.db.setSetting('lastPage', pages[i]);
      break;
    }
  }
  if (window.switchSettingsTab) {
    window.switchSettingsTab('general');
  }
  var spd = document.getElementById('storagePathDisplay');
  if (spd) {
    window.db.getSetting('storagePath').then(function(p) {
      spd.textContent = p || 'Default';
    });
  }
  window.settingsDirty = false;
  var row = document.getElementById('settingsBtnRow');
  if (row) row.style.display = 'none';
  var cancel = document.getElementById('settingsCancelBtn');
  if (cancel) cancel.style.display = '';
}

window.closeSettings = function(e) {
  if (e && e.target !== e.currentTarget) return;
  if (window.settingsDirty) {
    document.getElementById('settingsConfirmModal').style.display = 'flex';
    return;
  }
  showPage('pomodoro');
};

function openStorageFolder() {
  window.electronAPI.backupGetInfo().then(function(info) {
    if (info && info.storagePath) {
      window.electronAPI.backupOpenFolder(info.storagePath);
    }
  });
}

function selectBackupFolder() {
  window.electronAPI.backupSelectFolder().then(function(folder) {
    if (folder) {
      document.getElementById('backupPathDisplay').textContent = folder;
      window.db.setSetting('backupPath', folder);
    }
  });
}

function showBackupStatus(msg, isSuccess) {
  var el = document.getElementById('backupStatus');
  if (el) {
    el.style.display = 'block';
    el.style.background = isSuccess ? '#ecfdf5' : '#fef2f2';
    el.style.color = isSuccess ? '#065f46' : '#991b1b';
    el.style.border = '1px solid ' + (isSuccess ? '#a7f3d0' : '#fecaca');
    el.textContent = msg;
    setTimeout(function() { el.style.display = 'none' }, 5000);
  }
}

function doBackup() {
  var pathEl = document.getElementById('backupPathDisplay');
  var backupPath = pathEl ? pathEl.textContent : null;

  if (!backupPath || backupPath === 'Not set') {
    window.electronAPI.backupGetDefaultPath().then(function(defPath) {
      window.electronAPI.backupSelectFolder().then(function(folder) {
        if (folder) {
          document.getElementById('backupPathDisplay').textContent = folder;
          window.db.setSetting('backupPath', folder);
          runBackup(folder);
        }
      });
    });
    return;
  }
  runBackup(backupPath);
}

function runBackup(backupPath) {
  window.electronAPI.backupDo(backupPath).then(function(result) {
    if (result.success) {
      showBackupStatus('Backup saved to: ' + result.path, true);
    } else {
      showBackupStatus('Backup failed: ' + (result.error || 'Unknown error'), false);
    }
  });
}

function doRestore() {
  window.electronAPI.backupSelectFiles().then(function(files) {
    if (!files || files.length === 0) return;

    var logContainer = document.getElementById('restoreLogContent');
    if (logContainer) logContainer.innerHTML = 'Restoring...';

    document.getElementById('restoreLogModal').classList.remove('hidden');

    window.electronAPI.backupRestore(files).then(function(result) {
      if (!result || !result.log) {
        if (logContainer) logContainer.innerHTML = 'Restore failed: No response from server';
        return;
      }

      var html = '';
      result.log.forEach(function(entry) {
        if (entry.type === 'info') {
          html += '<div style="color:#4B5563;font-weight:500;margin-top:6px">' + escapeHtml(entry.message) + '</div>';
        } else if (entry.type === 'summary') {
          html += '<div style="color:#0e58c5;font-weight:600;margin-top:8px;padding-top:8px;border-top:1px solid #E5E7EB">' + escapeHtml(entry.message) + '</div>';
        } else {
          var icon = entry.status === 'added' ? '\u2713' : '\u26A0';
          var color = entry.status === 'added' ? '#065f46' : '#b45309';
          var itemType = entry.type.charAt(0).toUpperCase() + entry.type.slice(1);
          var label = entry.name || entry.id || '';
          var statusText = entry.status === 'added' ? 'Added' : 'Already exists';
          html += '<div style="color:' + color + ';padding-left:16px">' + icon + ' ' + escapeHtml(itemType) + ' "' + escapeHtml(label) + '" \u2192 ' + statusText + '</div>';
        }
      });
      if (logContainer) logContainer.innerHTML = html;
    });
  });
}

function closeRestoreLog() {
  document.getElementById('restoreLogModal').classList.add('hidden');
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str || '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

var _origOpenSettings = openSettings;
openSettings = function() {
  _origOpenSettings();

  var bpd = document.getElementById('backupPathDisplay');
  if (bpd) {
    window.db.getSetting('backupPath').then(function(saved) {
      if (saved) {
        bpd.textContent = saved;
      } else {
        window.electronAPI.backupGetDefaultPath().then(function(def) {
          bpd.textContent = def || 'Not set';
        });
      }
    });
  }
};



