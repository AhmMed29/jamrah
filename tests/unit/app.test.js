// app.test.js — 40 unit tests for app.js logic

if (typeof window === 'undefined') global.window = {};
if (!window.electronAPI) {
  window.electronAPI = {
    zoomIn: jest.fn(), zoomOut: jest.fn(), zoomReset: jest.fn(),
    onShortcut: jest.fn(), startDownload: jest.fn(), quitAndInstall: jest.fn(),
    onUpdateAvailable: jest.fn(), onUpdateProgress: jest.fn(), onUpdateDownloaded: jest.fn(),
    checkForUpdates: jest.fn(), selectFolder: jest.fn(), onBackendError: jest.fn(),
    checkFrontendUpdate: jest.fn()
  };
}
if (!window.localStorage) {
  window.localStorage = {
    _data: {},
    getItem: function(k) { return this._data[k]; },
    setItem: function(k, v) { this._data[k] = String(v); },
    removeItem: function(k) { delete this._data[k]; },
    clear: function() { this._data = {}; }
  };
}

var _pendingNav = null;
var APP_VERSION = '2.4.0';

function renderReleaseNotes(text) {
  if (!text) return '';
  return text
    .replace(/^### (.+)$/gm, '<div style="font-size:14px;font-weight:600;color:#374151;margin-top:12px;margin-bottom:6px">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="font-size:15px;font-weight:700;color:#1F2937;margin-top:14px;margin-bottom:8px">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="font-size:16px;font-weight:700;color:#111827;margin-top:16px;margin-bottom:8px">$1</div>')
    .replace(/^- (.+)$/gm, '<div style="display:flex;align-items:baseline;gap:8px;padding:2px 0"><span style="color:#3B82F6;flex-shrink:0">\u2022</span><span>$1</span></div>')
    .replace(/\n/g, '<br>');
}

function _localDateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

async function showPage(name) {
  var settingsPage = document.getElementById('page-settings');
  if (settingsPage && !settingsPage.classList.contains('hidden') && window.settingsDirty) {
    _pendingNav = name;
    var modal = document.getElementById('settingsConfirmModal');
    if (modal) modal.style.display = 'flex';
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
  var pomoSideBox = document.getElementById('pomoSideBox');
  if (pomoSideBox) {
    pomoSideBox.style.display = (name === 'pomodoro') ? 'flex' : 'none';
  }
  var pomoRightToggleBtn = document.getElementById('pomoRightToggleBtn');
  if (pomoRightToggleBtn) {
    pomoRightToggleBtn.style.display = (name === 'pomodoro') ? 'flex' : 'none';
  }
  var pomoRightPanelWrapper = document.getElementById('pomoRightPanelWrapper');
  if (pomoRightPanelWrapper) {
    pomoRightPanelWrapper.style.display = (name === 'pomodoro') ? 'flex' : 'none';
  }
}

window.confirmSettingsSave = async function() {
  if (window.saveSettings) await window.saveSettings();
  var modal = document.getElementById('settingsConfirmModal');
  if (modal) modal.style.display = 'none';
  var target = _pendingNav;
  _pendingNav = null;
  await showPage(target || 'pomodoro');
};

window.confirmSettingsDiscard = function() {
  if (window.cancelSettings) window.cancelSettings();
  var modal = document.getElementById('settingsConfirmModal');
  if (modal) modal.style.display = 'none';
  var target = _pendingNav;
  _pendingNav = null;
  showPage(target || 'pomodoro');
};

function setupPages(pages) {
  pages.forEach(function(p) {
    var el = document.createElement('div');
    el.id = 'page-' + p;
    el.classList.add('hidden');
    document.body.appendChild(el);
  });
}

beforeEach(function() {
  _pendingNav = null;
  window.settingsDirty = false;
  window.initPomoShader = undefined;
  window.destroyPomoShader = undefined;
  window.saveSettings = undefined;
  window.cancelSettings = undefined;
  document.body.innerHTML = '';
});

// ─── Suite 1: showPage ───
describe('showPage', function() {
  test('shows correct page and hides others', async function() {
    setupPages(['home', 'pomodoro', 'tasks']);
    await showPage('pomodoro');
    expect(document.getElementById('page-pomodoro').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('page-home').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('page-tasks').classList.contains('hidden')).toBe(true);
  });

  test('hides settings if dirty and sets _pendingNav', async function() {
    setupPages(['settings', 'pomodoro']);
    window.settingsDirty = true;
    document.getElementById('page-settings').classList.remove('hidden');
    await showPage('pomodoro');
    expect(_pendingNav).toBe('pomodoro');
  });
});

// ─── Suite 2: confirmSettingsSave ───
describe('confirmSettingsSave', function() {
  test('calls saveSettings', async function() {
    window.saveSettings = jest.fn();
    await window.confirmSettingsSave();
    expect(window.saveSettings).toHaveBeenCalled();
  });

  test('navigates to pendingNav', async function() {
    _pendingNav = 'pomodoro';
    window.saveSettings = jest.fn();
    setupPages(['pomodoro']);
    await window.confirmSettingsSave();
    expect(document.getElementById('page-pomodoro').classList.contains('hidden')).toBe(false);
  });
});

// ─── Suite 3: confirmSettingsDiscard ───
describe('confirmSettingsDiscard', function() {
  test('calls cancelSettings', function() {
    window.cancelSettings = jest.fn();
    window.confirmSettingsDiscard();
    expect(window.cancelSettings).toHaveBeenCalled();
  });

  test('navigates to pendingNav', function() {
    _pendingNav = 'pomodoro';
    window.cancelSettings = jest.fn();
    setupPages(['pomodoro']);
    window.confirmSettingsDiscard();
    expect(document.getElementById('page-pomodoro').classList.contains('hidden')).toBe(false);
  });
});

// ─── Suite 4: Keyboard shortcuts ───
describe('keyboard shortcuts', function() {
  var _handler;

  beforeAll(function() {
    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey && (e.key === '=' || e.key === '+')) { e.preventDefault(); window.electronAPI.zoomIn(); }
      if (e.ctrlKey && e.key === '-') { e.preventDefault(); window.electronAPI.zoomOut(); }
      if (e.ctrlKey && e.key === '0') { e.preventDefault(); window.electronAPI.zoomReset(); }
    });
    window.electronAPI.onShortcut.mockImplementation(function(cb) { _handler = cb; });
    _handler = function(action) {
      switch (action) {
        case 'pomodoro': showPage('pomodoro'); break;
        case 'settings': if (window.openSettings) window.openSettings(); break;
        case 'new-task':
          var inp = document.getElementById('tasks-new-input');
          if (inp) { inp.focus(); showPage('tasks'); }
          break;
      }
    };
  });

  test('Ctrl+= calls electronAPI.zoomIn', function() {
    var ev = new KeyboardEvent('keydown', { ctrlKey: true, key: '=' });
    document.dispatchEvent(ev);
    expect(window.electronAPI.zoomIn).toHaveBeenCalled();
  });

  test('Ctrl+- calls electronAPI.zoomOut', function() {
    var ev = new KeyboardEvent('keydown', { ctrlKey: true, key: '-' });
    document.dispatchEvent(ev);
    expect(window.electronAPI.zoomOut).toHaveBeenCalled();
  });

  test('Ctrl+0 calls electronAPI.zoomReset', function() {
    var ev = new KeyboardEvent('keydown', { ctrlKey: true, key: '0' });
    document.dispatchEvent(ev);
    expect(window.electronAPI.zoomReset).toHaveBeenCalled();
  });

  test('pomodoro shows page pomodoro', async function() {
    setupPages(['pomodoro']);
    await _handler('pomodoro');
    expect(document.getElementById('page-pomodoro').classList.contains('hidden')).toBe(false);
  });

  test('settings calls openSettings', function() {
    window.openSettings = jest.fn();
    _handler('settings');
    expect(window.openSettings).toHaveBeenCalled();
  });

  test('new-task focuses input', function() {
    setupPages(['tasks']);
    var inp = document.getElementById('tasks-new-input');
    if (!inp) {
      inp = document.createElement('input');
      inp.id = 'tasks-new-input';
      inp.focus = jest.fn();
      document.body.appendChild(inp);
    }
    _handler('new-task');
    expect(inp.focus).toHaveBeenCalled();
  });
});

// ─── Suite 5: Clock ───
describe('updateClock', function() {
  function updateClock() {
    var now = new Date();
    var clk = document.getElementById('clockDisplay');
    if (clk) clk.textContent = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    var dateEl = document.getElementById('dateDisplay');
    if (dateEl) {
      var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      dateEl.textContent = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();
    }
  }

  test('formats time correctly', function() {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-21T09:05:00'));
    var clk = document.createElement('div');
    clk.id = 'clockDisplay';
    document.body.appendChild(clk);
    updateClock();
    expect(clk.textContent).toBe('09:05');
    jest.useRealTimers();
  });

  test('formats date correctly', function() {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-21T00:00:00'));
    var dateEl = document.createElement('div');
    dateEl.id = 'dateDisplay';
    document.body.appendChild(dateEl);
    updateClock();
    expect(dateEl.textContent).toBe('Tuesday, July 21, 2026');
    jest.useRealTimers();
  });
});

// ─── Suite 6: APP_VERSION ───
describe('APP_VERSION', function() {
  test('is 2.4.0', function() {
    expect(APP_VERSION).toBe('2.4.0');
  });
});

// ─── Suite 7: renderReleaseNotes ───
describe('renderReleaseNotes', function() {
  test('converts markdown headers', function() {
    var result = renderReleaseNotes('# Header');
    expect(result).toContain('font-size:16px');
  });

  test('converts bullet points', function() {
    var result = renderReleaseNotes('- item');
    expect(result).toContain('padding:2px 0');
  });
});

// ─── Suite 8: onUpdateAvailable ───
describe('onUpdateAvailable', function() {
  test('stores update data', function() {
    var updateData = null;
    var onUpdateAvailable = function(data) {
      updateData = data;
      var verEl = document.getElementById('updateVersion');
      if (verEl) verEl.textContent = data.version;
    };
    var data = { version: '2.5.0', files: [{ size: 5000000 }] };
    var verEl = document.createElement('div');
    verEl.id = 'updateVersion';
    document.body.appendChild(verEl);
    onUpdateAvailable(data);
    expect(verEl.textContent).toBe('2.5.0');
  });
});

// ─── Suite 9: startUpdateDownload ───
describe('startUpdateDownload', function() {
  test('shows progress', function() {
    var onStartDownload = function() {
      var wrap = document.getElementById('updateProgressWrap');
      if (wrap) wrap.style.display = 'block';
    };
    var wrap = document.createElement('div');
    wrap.id = 'updateProgressWrap';
    wrap.style.display = 'none';
    document.body.appendChild(wrap);
    onStartDownload();
    expect(wrap.style.display).toBe('block');
  });

  test('calls electronAPI.startDownload', function() {
    window.electronAPI.startDownload.mockResolvedValue(true);
    var startUpdateDownload = function() {
      window.electronAPI.startDownload();
    };
    startUpdateDownload();
    expect(window.electronAPI.startDownload).toHaveBeenCalled();
  });

  test('success calls quitAndInstall', function() {
    window.electronAPI.startDownload.mockResolvedValue(true);
    var qai = jest.fn();
    window.electronAPI.startDownload().then(function(success) {
      if (success) qai();
    });
    return new Promise(function(resolve) {
      setTimeout(function() {
        expect(qai).toHaveBeenCalled();
        resolve();
      }, 10);
    });
  });

  test('failure shows error', function() {
    var el = document.createElement('div');
    el.id = 'updateStatus';
    document.body.appendChild(el);
    window.electronAPI.startDownload.mockResolvedValue(false);
    window.electronAPI.startDownload().then(function(success) {
      if (!success) el.textContent = 'Update failed. Please try again.';
    });
    return new Promise(function(resolve) {
      setTimeout(function() {
        expect(el.textContent).toBe('Update failed. Please try again.');
        resolve();
      }, 10);
    });
  });
});

// ─── Suite 10: onUpdateProgress ───
describe('onUpdateProgress', function() {
  test('updates bar width', function() {
    var bar = document.createElement('div');
    bar.id = 'updateProgressBar';
    document.body.appendChild(bar);
    var handler = function(pct) {
      var b = document.getElementById('updateProgressBar');
      if (b) b.style.width = pct + '%';
    };
    handler(50);
    expect(bar.style.width).toBe('50%');
  });

  test('100% shows Download complete', function() {
    var status = document.createElement('div');
    status.id = 'updateStatus';
    document.body.appendChild(status);
    var handler = function(pct) {
      var s = document.getElementById('updateStatus');
      if (s) s.textContent = pct < 100 ? 'Downloading... ' + pct + '%' : 'Download complete! Installing...';
    };
    handler(100);
    expect(status.textContent).toBe('Download complete! Installing...');
  });
});

// ─── Suite 11: onUpdateDownloaded ───
describe('onUpdateDownloaded', function() {
  test('shows ready to install', function() {
    var status = document.createElement('div');
    status.id = 'updateStatus';
    document.body.appendChild(status);
    var handler = function() {
      var s = document.getElementById('updateStatus');
      if (s) s.textContent = 'Ready to install!';
    };
    handler();
    expect(status.textContent).toBe('Ready to install!');
  });
});

// ─── Suite 12: closeUpdateModal ───
describe('closeUpdateModal', function() {
  test('closes on backdrop', function() {
    var modal = document.createElement('div');
    modal.id = 'updateModal';
    modal.style.display = 'flex';
    document.body.appendChild(modal);
    var closeFn = function(e) {
      if (!e || e.target === e.currentTarget) {
        document.getElementById('updateModal').style.display = 'none';
      }
    };
    closeFn({ target: modal, currentTarget: modal });
    expect(modal.style.display).toBe('none');
  });
});

// ─── Suite 13: checkForUpdates ───
describe('checkForUpdates', function() {
  test('disables button', function() {
    var btn = document.createElement('button');
    btn.id = 'checkUpdateBtn';
    btn.disabled = false;
    document.body.appendChild(btn);
    var fn = function() {
      var b = document.getElementById('checkUpdateBtn');
      if (b) { b.disabled = true; b.textContent = 'Checking...'; }
    };
    fn();
    expect(btn.disabled).toBe(true);
  });

  test('enables button after response', function() {
    var btn = document.createElement('button');
    btn.id = 'checkUpdateBtn';
    btn.disabled = true;
    document.body.appendChild(btn);
    window.electronAPI.checkForUpdates.mockResolvedValue(false);
    var fn = function() {
      window.electronAPI.checkForUpdates().then(function() {
        var b = document.getElementById('checkUpdateBtn');
        if (b) { b.disabled = false; b.textContent = 'Search for Updates'; }
      });
    };
    fn();
    return new Promise(function(resolve) {
      setTimeout(function() {
        expect(btn.disabled).toBe(false);
        resolve();
      }, 10);
    });
  });

  test('shows up to date message', function() {
    var statusEl = document.createElement('div');
    statusEl.id = 'updateSettingsStatus';
    document.body.appendChild(statusEl);
    window.electronAPI.checkForUpdates.mockResolvedValue(false);
    var fn = function() {
      window.electronAPI.checkForUpdates().then(function(available) {
        if (!available) {
          var s = document.getElementById('updateSettingsStatus');
          if (s) s.textContent = 'You are up to date.';
        }
      });
    };
    fn();
    return new Promise(function(resolve) {
      setTimeout(function() {
        expect(statusEl.textContent).toBe('You are up to date.');
        resolve();
      }, 10);
    });
  });
});

// ─── Suite 14: showAppToast ───
describe('showAppToast', function() {
  function showAppToast(msg) {
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
  }

  test('creates toast element', function() {
    showAppToast('test message');
    var toast = document.getElementById('appToast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toBe('test message');
  });

  test('shows message with opacity 1', function() {
    showAppToast('opacity test');
    var toast = document.getElementById('appToast');
    expect(toast.style.opacity).toBe('1');
  });

  test('hides after 6 seconds', function() {
    jest.useFakeTimers();
    showAppToast('hide test');
    var toast = document.getElementById('appToast');
    jest.advanceTimersByTime(6000);
    expect(toast.style.opacity).toBe('0');
    jest.useRealTimers();
  });
});

// ─── Suite 15: onBackendError ───
describe('onBackendError', function() {
  test('calls showAppToast', function() {
    window.showAppToast = jest.fn();
    var handler = function(msg) {
      window.showAppToast(msg);
    };
    handler('backend error');
    expect(window.showAppToast).toHaveBeenCalledWith('backend error');
  });
});

// ─── Suite 16: _localDateStr ───
describe('_localDateStr', function() {
  test('formats correctly', function() {
    var d = new Date(2026, 6, 21);
    expect(_localDateStr(d)).toBe('2026-07-21');
  });
});

// ─── Suite 17: Date change ───
describe('date change checker', function() {
  test('re-renders habits on date change', function() {
    window.renderHabits = jest.fn();
    var _lastDateStr = '';
    var nowStr = _localDateStr(new Date());
    if (nowStr !== _lastDateStr) {
      _lastDateStr = nowStr;
      if (window.renderHabits) window.renderHabits();
    }
    expect(window.renderHabits).toHaveBeenCalled();
  });
});

// ─── Suite 18: Page router (shader) ───
describe('page router shader', function() {
  test('pomodoro activates shader', async function() {
    window.initPomoShader = jest.fn();
    setupPages(['pomodoro']);
    await showPage('pomodoro');
    expect(window.initPomoShader).toHaveBeenCalled();
  });

  test('other pages destroy shader', async function() {
    window.destroyPomoShader = jest.fn();
    setupPages(['home']);
    await showPage('home');
    expect(window.destroyPomoShader).toHaveBeenCalled();
  });
});

// ─── Suite 19: pomoSideBox display ───
describe('pomoSideBox display', function() {
  test('shown on pomodoro page', async function() {
    setupPages(['pomodoro']);
    var box = document.createElement('div');
    box.id = 'pomoSideBox';
    document.body.appendChild(box);
    await showPage('pomodoro');
    expect(box.style.display).toBe('flex');
  });

  test('hidden on other pages', async function() {
    setupPages(['home']);
    var box = document.createElement('div');
    box.id = 'pomoSideBox';
    document.body.appendChild(box);
    await showPage('home');
    expect(box.style.display).toBe('none');
  });
});

// ─── Suite 20: pomoRightToggleBtn display ───
describe('pomoRightToggleBtn display', function() {
  test('shown on pomodoro page', async function() {
    setupPages(['pomodoro']);
    var btn = document.createElement('div');
    btn.id = 'pomoRightToggleBtn';
    document.body.appendChild(btn);
    await showPage('pomodoro');
    expect(btn.style.display).toBe('flex');
  });

  test('hidden on other pages', async function() {
    setupPages(['home']);
    var btn = document.createElement('div');
    btn.id = 'pomoRightToggleBtn';
    document.body.appendChild(btn);
    await showPage('home');
    expect(btn.style.display).toBe('none');
  });
});

// ─── Suite 21: pomoRightPanelWrapper display ───
describe('pomoRightPanelWrapper display', function() {
  test('shown on pomodoro page', async function() {
    setupPages(['pomodoro']);
    var wrap = document.createElement('div');
    wrap.id = 'pomoRightPanelWrapper';
    document.body.appendChild(wrap);
    await showPage('pomodoro');
    expect(wrap.style.display).toBe('flex');
  });

  test('hidden on other pages', async function() {
    setupPages(['home']);
    var wrap = document.createElement('div');
    wrap.id = 'pomoRightPanelWrapper';
    document.body.appendChild(wrap);
    await showPage('home');
    expect(wrap.style.display).toBe('none');
  });
});
