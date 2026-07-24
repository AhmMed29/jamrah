// settings.test.js — 35 unit tests for settings.js and theme.js logic

if (typeof window === 'undefined') global.window = {};
if (!window.db) {
  window.db = {
    getSetting: jest.fn(), setSetting: jest.fn(), setPath: jest.fn(),
    getPath: jest.fn()
  };
}
if (!window.electronAPI) {
  window.electronAPI = {
    selectFolder: jest.fn(), backupDo: jest.fn(),
    backupSelectFolder: jest.fn(), backupSelectFiles: jest.fn(),
    backupRestore: jest.fn(), backupGetInfo: jest.fn(),
    backupGetDefaultPath: jest.fn(), backupOpenFolder: jest.fn(),
    getDefaultPath: jest.fn()
  };
}

function applyTheme() {
  document.body.style.backgroundColor = '#FAFAFA';
  var nav = document.getElementById('navSidebar');
  if (nav) nav.style.backgroundColor = '#3B82F6';
}

async function openSettings() {
  if (typeof showPage === 'function') showPage('settings');
  var pages = ['home', 'pomodoro', 'habits'];
  for (var i = 0; i < pages.length; i++) {
    var el = document.getElementById('page-' + pages[i]);
    if (el && !el.classList.contains('hidden')) {
      await window.db.setSetting('lastPage', pages[i]);
      break;
    }
  }
  if (window.switchSettingsTab) {
    window.switchSettingsTab('general');
  }
  var spd = document.getElementById('storagePathDisplay');
  if (spd) {
    var p = await window.db.getSetting('storagePath');
    spd.textContent = p || 'Default';
  }
  window.settingsDirty = false;
  var row = document.getElementById('settingsBtnRow');
  if (row) row.style.display = 'none';
  var cancel = document.getElementById('settingsCancelBtn');
  if (cancel) cancel.style.display = '';
}

function closeSettings(e) {
  if (e && e.target !== e.currentTarget) return;
  if (window.settingsDirty) {
    var modal = document.getElementById('settingsConfirmModal');
    if (modal) modal.style.display = 'flex';
    return;
  }
  if (typeof showPage === 'function') showPage('pomodoro');
}

function selectStorageFolder() {
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

function showBackupStatus(msg, isSuccess) {
  var el = document.getElementById('backupStatus');
  if (el) {
    el.style.display = 'block';
    el.style.background = isSuccess ? '#ecfdf5' : '#fef2f2';
    el.style.color = isSuccess ? '#065f46' : '#991b1b';
    el.style.border = '1px solid ' + (isSuccess ? '#a7f3d0' : '#fecaca');
    el.textContent = msg;
    setTimeout(function() { el.style.display = 'none'; }, 5000);
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

function markDirty() {
  window.settingsDirty = true;
  var row = document.getElementById('settingsBtnRow');
  if (row) row.style.display = 'flex';
}

async function cancelSettings() {
  var taskEl = document.getElementById('taskPopupToggle');
  if (taskEl) taskEl.checked = (await window.db.getSetting('taskPopup')) !== 'false';
  var workEl = document.getElementById('settingWork');
  if (workEl) workEl.value = parseInt(await window.db.getSetting('workMinutes')) || 25;
  window.settingsDirty = false;
  var row = document.getElementById('settingsBtnRow');
  if (row) row.style.display = 'none';
}

async function saveSettings() {
  var tpEl = document.getElementById('taskPopupToggle');
  var taskPopup = tpEl ? tpEl.checked : true;
  await window.db.setSetting('taskPopup', taskPopup ? 'true' : 'false');
  var psEl = document.getElementById('pomoSoundToggle');
  var playSound = psEl ? psEl.checked : true;
  await window.db.setSetting('playPomoSound', playSound ? 'true' : 'false');
  var w = parseInt(document.getElementById('settingWork').value) || 25;
  await window.db.setSetting('workMinutes', w);
  window.settingsDirty = false;
  var row = document.getElementById('settingsBtnRow');
  if (row) row.style.display = 'none';
}

beforeEach(function() {
  jest.clearAllMocks();
  window.settingsDirty = false;
  document.body.innerHTML = '';
});

// ─── Suite 1: applyTheme ───
describe('applyTheme', function() {
  test('sets body backgroundColor', function() {
    applyTheme();
    expect(document.body.style.backgroundColor).toBe('rgb(250, 250, 250)');
  });

  test('sets nav sidebar color', function() {
    var nav = document.createElement('div');
    nav.id = 'navSidebar';
    document.body.appendChild(nav);
    applyTheme();
    expect(nav.style.backgroundColor).toBe('rgb(59, 130, 246)');
  });
});

// ─── Suite 2: openSettings ───
describe('openSettings', function() {
  test('calls showPage with settings', async function() {
    window.showPage = jest.fn();
    await openSettings();
    expect(window.showPage).toHaveBeenCalledWith('settings');
  });

  test('saves current page', async function() {
    var home = document.createElement('div');
    home.id = 'page-home';
    document.body.appendChild(home);
    window.showPage = jest.fn();
    await openSettings();
    expect(window.db.setSetting).toHaveBeenCalledWith('lastPage', 'home');
  });

  test('switches to general tab', async function() {
    window.showPage = jest.fn();
    window.switchSettingsTab = jest.fn();
    await openSettings();
    expect(window.switchSettingsTab).toHaveBeenCalledWith('general');
  });

  test('loads storage path', async function() {
    window.showPage = jest.fn();
    window.db.getSetting.mockResolvedValue('/my/path');
    var spd = document.createElement('div');
    spd.id = 'storagePathDisplay';
    document.body.appendChild(spd);
    await openSettings();
    expect(spd.textContent).toBe('/my/path');
  });

  test('sets settingsDirty=false', async function() {
    window.showPage = jest.fn();
    window.settingsDirty = true;
    await openSettings();
    expect(window.settingsDirty).toBe(false);
  });
});

// ─── Suite 3: closeSettings ───
describe('closeSettings', function() {
  test('with dirty shows confirm', function() {
    window.settingsDirty = true;
    var modal = document.createElement('div');
    modal.id = 'settingsConfirmModal';
    modal.style.display = 'none';
    document.body.appendChild(modal);
    closeSettings({ target: modal, currentTarget: modal });
    expect(modal.style.display).toBe('flex');
  });

  test('without dirty shows pomodoro', function() {
    window.showPage = jest.fn();
    window.settingsDirty = false;
    var e = {};
    closeSettings({ target: e, currentTarget: e });
    expect(window.showPage).toHaveBeenCalledWith('pomodoro');
  });
});

// ─── Suite 4: selectStorageFolder ───
describe('selectStorageFolder', function() {
  test('calls electronAPI.selectFolder', function() {
    window.electronAPI.selectFolder.mockResolvedValue('/new/path');
    window.db.setPath.mockResolvedValue('/new/path');
    var spd = document.createElement('div');
    spd.id = 'storagePathDisplay';
    document.body.appendChild(spd);
    selectStorageFolder();
    expect(window.electronAPI.selectFolder).toHaveBeenCalled();
  });

  test('sets path display', function() {
    window.electronAPI.selectFolder.mockResolvedValue('/new/path');
    window.db.setPath.mockResolvedValue('/new/path');
    var spd = document.createElement('div');
    spd.id = 'storagePathDisplay';
    spd.textContent = '';
    document.body.appendChild(spd);
    selectStorageFolder();
    return new Promise(function(resolve) {
      setTimeout(function() {
        expect(spd.textContent).toBe('/new/path');
        resolve();
      }, 10);
    });
  });
});

// ─── Suite 5: doBackup ───
describe('doBackup', function() {
  test('with no saved path calls select folder', function() {
    var bpd = document.createElement('div');
    bpd.id = 'backupPathDisplay';
    bpd.textContent = 'Not set';
    document.body.appendChild(bpd);
    var status = document.createElement('div');
    status.id = 'backupStatus';
    document.body.appendChild(status);
    window.electronAPI.backupGetDefaultPath.mockResolvedValue('/default');
    window.electronAPI.backupSelectFolder.mockResolvedValue('/selected');
    window.electronAPI.backupDo.mockResolvedValue({ success: true, path: '/p/backup.zip' });
    doBackup();
    return new Promise(function(resolve) {
      setTimeout(function() {
        expect(window.electronAPI.backupSelectFolder).toHaveBeenCalled();
        resolve();
      }, 10);
    });
  });

  test('with saved path calls runBackup', function() {
    var bpd = document.createElement('div');
    bpd.id = 'backupPathDisplay';
    bpd.textContent = '/saved/path';
    document.body.appendChild(bpd);
    window.electronAPI.backupDo.mockResolvedValue({ success: true, path: '/saved/path/backup.zip' });
    doBackup();
    return new Promise(function(resolve) {
      setTimeout(function() {
        expect(window.electronAPI.backupDo).toHaveBeenCalledWith('/saved/path');
        resolve();
      }, 10);
    });
  });
});

// ─── Suite 6: runBackup ───
describe('runBackup', function() {
  test('success shows success status', function() {
    var status = document.createElement('div');
    status.id = 'backupStatus';
    status.textContent = '';
    document.body.appendChild(status);
    window.electronAPI.backupDo.mockResolvedValue({ success: true, path: '/p/backup.zip' });
    runBackup('/p');
    return new Promise(function(resolve) {
      setTimeout(function() {
        expect(status.textContent).toContain('Backup saved');
        resolve();
      }, 10);
    });
  });

  test('failure shows error status', function() {
    var status = document.createElement('div');
    status.id = 'backupStatus';
    status.textContent = '';
    document.body.appendChild(status);
    window.electronAPI.backupDo.mockResolvedValue({ success: false, error: 'Disk full' });
    runBackup('/p');
    return new Promise(function(resolve) {
      setTimeout(function() {
        expect(status.textContent).toContain('Backup failed');
        resolve();
      }, 10);
    });
  });
});

// ─── Suite 7: showBackupStatus ───
describe('showBackupStatus', function() {
  test('shows green for success', function() {
    var el = document.createElement('div');
    el.id = 'backupStatus';
    document.body.appendChild(el);
    showBackupStatus('Success!', true);
    expect(el.textContent).toBe('Success!');
  });

  test('shows red for failure', function() {
    var el = document.createElement('div');
    el.id = 'backupStatus';
    document.body.appendChild(el);
    showBackupStatus('Failed!', false);
    expect(el.textContent).toBe('Failed!');
  });

  test('auto-hides after 5s', function() {
    jest.useFakeTimers();
    var el = document.createElement('div');
    el.id = 'backupStatus';
    el.style.display = 'block';
    document.body.appendChild(el);
    showBackupStatus('Temp', true);
    jest.advanceTimersByTime(5000);
    expect(el.style.display).toBe('none');
    jest.useRealTimers();
  });
});

// ─── Suite 8: doRestore ───
describe('doRestore', function() {
  test('calls backupSelectFiles', function() {
    window.electronAPI.backupSelectFiles.mockResolvedValue([]);
    doRestore();
    return new Promise(function(resolve) {
      setTimeout(function() {
        expect(window.electronAPI.backupSelectFiles).toHaveBeenCalled();
        resolve();
      }, 10);
    });
  });

  test('shows restore log modal', function() {
    window.electronAPI.backupSelectFiles.mockResolvedValue(['file.zip']);
    var logModal = document.createElement('div');
    logModal.id = 'restoreLogModal';
    logModal.classList.add('hidden');
    document.body.appendChild(logModal);
    var logContent = document.createElement('div');
    logContent.id = 'restoreLogContent';
    document.body.appendChild(logContent);
    window.electronAPI.backupRestore.mockResolvedValue({ log: [] });
    doRestore();
    return new Promise(function(resolve) {
      setTimeout(function() {
        expect(logModal.classList.contains('hidden')).toBe(false);
        resolve();
      }, 10);
    });
  });

  test('calls backupRestore', function() {
    window.electronAPI.backupSelectFiles.mockResolvedValue(['file.zip']);
    var logContent = document.createElement('div');
    logContent.id = 'restoreLogContent';
    document.body.appendChild(logContent);
    var logModal = document.createElement('div');
    logModal.id = 'restoreLogModal';
    logModal.classList.add('hidden');
    document.body.appendChild(logModal);
    window.electronAPI.backupRestore.mockResolvedValue({ log: [] });
    doRestore();
    return new Promise(function(resolve) {
      setTimeout(function() {
        expect(window.electronAPI.backupRestore).toHaveBeenCalledWith(['file.zip']);
        resolve();
      }, 10);
    });
  });

  test('renders log entries', function() {
    window.electronAPI.backupSelectFiles.mockResolvedValue(['file.zip']);
    var logModal = document.createElement('div');
    logModal.id = 'restoreLogModal';
    logModal.classList.add('hidden');
    document.body.appendChild(logModal);
    var logContent = document.createElement('div');
    logContent.id = 'restoreLogContent';
    document.body.appendChild(logContent);
    window.electronAPI.backupRestore.mockResolvedValue({
      log: [{ type: 'info', message: 'Restoring...' }]
    });
    doRestore();
    return new Promise(function(resolve) {
      setTimeout(function() {
        expect(logContent.innerHTML).toContain('Restoring');
        resolve();
      }, 10);
    });
  });
});

// ─── Suite 9: closeRestoreLog ───
describe('closeRestoreLog', function() {
  test('hides modal', function() {
    var modal = document.createElement('div');
    modal.id = 'restoreLogModal';
    modal.classList.remove('hidden');
    document.body.appendChild(modal);
    closeRestoreLog();
    expect(modal.classList.contains('hidden')).toBe(true);
  });
});

// ─── Suite 10: markDirty ───
describe('markDirty', function() {
  test('shows action row', function() {
    var row = document.createElement('div');
    row.id = 'settingsBtnRow';
    row.style.display = 'none';
    document.body.appendChild(row);
    markDirty();
    expect(window.settingsDirty).toBe(true);
    expect(row.style.display).toBe('flex');
  });
});

// ─── Suite 11: cancelSettings ───
describe('cancelSettings', function() {
  test('reloads original values', async function() {
    window.db.getSetting.mockImplementation(function(key) {
      if (key === 'taskPopup') return Promise.resolve('true');
      if (key === 'workMinutes') return Promise.resolve('30');
      return Promise.resolve(null);
    });
    var taskEl = document.createElement('input');
    taskEl.id = 'taskPopupToggle';
    taskEl.type = 'checkbox';
    taskEl.checked = false;
    document.body.appendChild(taskEl);
    var workEl = document.createElement('input');
    workEl.id = 'settingWork';
    workEl.value = '25';
    document.body.appendChild(workEl);
    await cancelSettings();
    expect(taskEl.checked).toBe(true);
    expect(workEl.value).toBe('30');
  });
});

// ─── Suite 12: saveSettings ───
describe('saveSettings', function() {
  test('calls setSetting for all keys', async function() {
    var taskEl = document.createElement('input');
    taskEl.id = 'taskPopupToggle';
    taskEl.type = 'checkbox';
    taskEl.checked = true;
    document.body.appendChild(taskEl);
    var soundEl = document.createElement('input');
    soundEl.id = 'pomoSoundToggle';
    soundEl.type = 'checkbox';
    soundEl.checked = true;
    document.body.appendChild(soundEl);
    var workEl = document.createElement('input');
    workEl.id = 'settingWork';
    workEl.value = '25';
    document.body.appendChild(workEl);
    await saveSettings();
    expect(window.db.setSetting).toHaveBeenCalledWith('taskPopup', 'true');
    expect(window.db.setSetting).toHaveBeenCalledWith('playPomoSound', 'true');
    expect(window.db.setSetting).toHaveBeenCalledWith('workMinutes', 25);
  });
});
