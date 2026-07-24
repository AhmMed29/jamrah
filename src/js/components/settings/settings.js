function markDirty() {
  window.settingsDirty = true;
  var row = document.getElementById('settingsBtnRow');
  if (row) row.style.display = 'flex';
}


;(async function() {
  if (window._dbInitPromise) await window._dbInitPromise;
  
  // Load standard settings
  var tp = await window.db.getSetting('taskPopup');
  var toggle = document.getElementById('taskPopupToggle');
  if (toggle) toggle.checked = (tp !== 'false');
  
  var ps = await window.db.getSetting('playPomoSound');
  var soundToggle = document.getElementById('pomoSoundToggle');
  if (soundToggle) soundToggle.checked = (ps !== 'false');

  // Load new Settings
  var asb = await window.db.getSetting('autoStartBreak');
  var asbToggle = document.getElementById('autoStartBreakToggle');
  if (asbToggle) asbToggle.checked = (asb === 'true');

  var asf = await window.db.getSetting('autoStartFocus');
  var asfToggle = document.getElementById('autoStartFocusToggle');
  if (asfToggle) asfToggle.checked = (asf === 'true');

  var dn = await window.db.getSetting('desktopNotifications');
  var dnToggle = document.getElementById('desktopNotificationsToggle');
  if (dnToggle) dnToggle.checked = (dn !== 'false');

  var ssc = await window.db.getSetting('showSessionCount');
  var sscToggle = document.getElementById('showSessionCountToggle');
  if (sscToggle) sscToggle.checked = (ssc !== 'false');

  var lbi = await window.db.getSetting('longBreakInterval');
  var lbiInput = document.getElementById('longBreakIntervalInput');
  if (lbiInput) {
    lbiInput.value = parseInt(lbi) || 4;
  }

  // Load Page Placements using localStorage
  if (window.getPagePrefs) {
    var prefs = window.getPagePrefs();
    var pages = ['pomodoro', 'tasks', 'calender', 'habits', 'stats', 'settings'];
    pages.forEach(function(p) {
      var val = prefs[p] || 'both';
      var dInp = document.getElementById('pref-' + p + '-dock');
      var sInp = document.getElementById('pref-' + p + '-sidebar');
      if (dInp) dInp.checked = (val === 'both' || val === 'dock');
      if (sInp) sInp.checked = (val === 'both' || val === 'sidebar');
    });
  }

  if (window.applyPagePrefs) await window.applyPagePrefs();
})();

window.saveSettings = async function() {
  var tpEl = document.getElementById('taskPopupToggle');
  var taskPopup = tpEl ? tpEl.checked : true;
  await window.db.setSetting('taskPopup', taskPopup ? 'true' : 'false');
  if (window.updateTaskPopupCache) await window.updateTaskPopupCache();

  var psEl = document.getElementById('pomoSoundToggle');
  var playSound = psEl ? psEl.checked : true;
  await window.db.setSetting('playPomoSound', playSound ? 'true' : 'false');

  var asbEl = document.getElementById('autoStartBreakToggle');
  var autoStartBreak = asbEl ? asbEl.checked : false;
  await window.db.setSetting('autoStartBreak', autoStartBreak ? 'true' : 'false');

  var asfEl = document.getElementById('autoStartFocusToggle');
  var autoStartFocus = asfEl ? asfEl.checked : false;
  await window.db.setSetting('autoStartFocus', autoStartFocus ? 'true' : 'false');

  var dnEl = document.getElementById('desktopNotificationsToggle');
  var desktopNotifications = dnEl ? dnEl.checked : true;
  await window.db.setSetting('desktopNotifications', desktopNotifications ? 'true' : 'false');

  var sscEl = document.getElementById('showSessionCountToggle');
  var showSessionCount = sscEl ? sscEl.checked : true;
  await window.db.setSetting('showSessionCount', showSessionCount ? 'true' : 'false');

  var lbiInput = document.getElementById('longBreakIntervalInput');
  var lbi = lbiInput ? parseInt(lbiInput.value) || 4 : 4;
  if (lbi < 1) lbi = 1; if (lbi > 12) lbi = 12;
  await window.db.setSetting('longBreakInterval', lbi);
  if (lbiInput) lbiInput.value = lbi;

  var w = parseInt(document.getElementById('settingWork').value) || 25;
  var sb = parseInt(document.getElementById('settingShortBreak').value) || 5;
  var lb = parseInt(document.getElementById('settingLongBreak').value) || 15;
  if (w < 1) w = 1; if (w > 90) w = 90;
  if (sb < 1) sb = 1; if (sb > 30) sb = 30;
  if (lb < 1) lb = 1; if (lb > 60) lb = 60;
  await window.db.setSetting('workMinutes', w);
  await window.db.setSetting('shortBreakMinutes', sb);
  await window.db.setSetting('longBreakMinutes', lb);

  document.getElementById('settingWork').value = w;
  document.getElementById('settingShortBreak').value = sb;
  document.getElementById('settingLongBreak').value = lb;

  // Save Page Placements using localStorage
  if (window.savePagePrefs) {
    var prefs = {};
    var pages = ['pomodoro', 'tasks', 'calender', 'habits', 'stats', 'settings'];
    pages.forEach(function(p) {
      var dInp = document.getElementById('pref-' + p + '-dock');
      var sInp = document.getElementById('pref-' + p + '-sidebar');
      var dVal = dInp ? dInp.checked : true;
      var sVal = sInp ? sInp.checked : true;
      if (dVal && sVal) prefs[p] = 'both';
      else if (dVal) prefs[p] = 'dock';
      else if (sVal) prefs[p] = 'sidebar';
      else prefs[p] = 'none';
    });
    window.savePagePrefs(prefs);
  }

  window.settingsDirty = false;
  var row = document.getElementById('settingsBtnRow');
  if (row) row.style.display = 'none';
  var cancel = document.getElementById('settingsCancelBtn');
  if (cancel) cancel.style.display = '';
  
  if (window.updateTaskPopupCache) {
    await window.updateTaskPopupCache();
  }
  if (window.applyPagePrefs) {
    await window.applyPagePrefs();
  }
  if (window.refreshTimerSettings) {
    await window.refreshTimerSettings();
  }
};

window.cancelSettings = async function() {
  var taskEl = document.getElementById('taskPopupToggle');
  if (taskEl) taskEl.checked = (await window.db.getSetting('taskPopup')) !== 'false';

  var soundEl = document.getElementById('pomoSoundToggle');
  if (soundEl) soundEl.checked = (await window.db.getSetting('playPomoSound')) !== 'false';

  var asbEl = document.getElementById('autoStartBreakToggle');
  if (asbEl) asbEl.checked = (await window.db.getSetting('autoStartBreak')) === 'true';

  var asfEl = document.getElementById('autoStartFocusToggle');
  if (asfEl) asfEl.checked = (await window.db.getSetting('autoStartFocus')) === 'true';

  var dnEl = document.getElementById('desktopNotificationsToggle');
  if (dnEl) dnEl.checked = (await window.db.getSetting('desktopNotifications')) !== 'false';

  var sscEl = document.getElementById('showSessionCountToggle');
  if (sscEl) sscEl.checked = (await window.db.getSetting('showSessionCount')) !== 'false';

  var savedLbi = await window.db.getSetting('longBreakInterval');
  var lbiInput = document.getElementById('longBreakIntervalInput');
  if (lbiInput) lbiInput.value = parseInt(savedLbi) || 4;

  var w = parseInt(await window.db.getSetting('workMinutes')) || 25;
  var sb = parseInt(await window.db.getSetting('shortBreakMinutes')) || 5;
  var lb = parseInt(await window.db.getSetting('longBreakMinutes')) || 15;
  document.getElementById('settingWork').value = w;
  document.getElementById('settingShortBreak').value = sb;
  document.getElementById('settingLongBreak').value = lb;

  // Restore page placements
  if (window.getPagePrefs) {
    var prefs = window.getPagePrefs();
    var pages = ['pomodoro', 'tasks', 'calender', 'habits', 'stats'];
    pages.forEach(function(p) {
      var val = prefs[p] || 'both';
      var dInp = document.getElementById('pref-' + p + '-dock');
      var sInp = document.getElementById('pref-' + p + '-sidebar');
      if (dInp) dInp.checked = (val === 'both' || val === 'dock');
      if (sInp) sInp.checked = (val === 'both' || val === 'sidebar');
    });
  }

  window.settingsDirty = false;
  var row = document.getElementById('settingsBtnRow');
  if (row) row.style.display = 'none';
  var cancel = document.getElementById('settingsCancelBtn');
  if (cancel) cancel.style.display = '';

  if (window.applyPagePrefs) await window.applyPagePrefs();
};

window.switchSettingsTab = function(tab) {
  var tabs = document.querySelectorAll('.settings-tab-btn');
  var panes = ['general', 'pomodoro', 'storage'];
  var titleMap = { general:'General', pomodoro:'Pomodoro', storage:'Storage' };

  tabs.forEach(function(btn) {
    var isActive = btn.dataset.tab === tab;
    btn.style.background = isActive ? '#dce9ff' : 'transparent';
    btn.style.color = isActive ? '#0e58c5' : '#4B5563';
    btn.style.fontWeight = isActive ? '600' : '500';
  });

  panes.forEach(function(p) {
    var el = document.getElementById('pane' + p.charAt(0).toUpperCase() + p.slice(1));
    if (el) el.style.display = p === tab ? 'block' : 'none';
  });

  var title = document.getElementById('settingsTabTitle');
  if (title) title.textContent = titleMap[tab] || tab;
};
