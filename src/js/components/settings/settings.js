function markDirty() {
  if (!window.settingsDirty) {
    window.settingsDirty = true;
    var row = document.getElementById('settingsBtnRow');
    if (row) row.style.display = 'flex';
    var cancel = document.getElementById('settingsCancelBtn');
    if (cancel) cancel.style.display = 'none';
  }
}

setTimeout(function() {
  window.settingsDirty = false;
  var row = document.getElementById('settingsBtnRow');
  if (row) row.style.display = 'none';
}, 300);

window.toggleTaskPopup = function() {
  document.getElementById('taskPopupToggle').classList.toggle('active');
  markDirty();
};

window.togglePomoSound = function() {
  document.getElementById('pomoSoundToggle').classList.toggle('active');
  markDirty();
};

;(async function() {
  var toggle = document.getElementById('taskPopupToggle');
  if (toggle) {
    var tp = await window.db.getSetting('taskPopup');
    if (tp === 'false') toggle.classList.remove('active');
  }
  var soundToggle = document.getElementById('pomoSoundToggle');
  if (soundToggle) {
    var ps = await window.db.getSetting('playPomoSound');
    if (ps === 'false') soundToggle.classList.remove('active');
  }
})();

window.saveSettings = async function() {
  var taskPopup = document.getElementById('taskPopupToggle').classList.contains('active');
  await window.db.setSetting('taskPopup', taskPopup ? 'true' : 'false');

  var playSound = document.getElementById('pomoSoundToggle').classList.contains('active');
  await window.db.setSetting('playPomoSound', playSound ? 'true' : 'false');

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

  window.settingsDirty = false;
  var row = document.getElementById('settingsBtnRow');
  if (row) row.style.display = 'none';
  var cancel = document.getElementById('settingsCancelBtn');
  if (cancel) cancel.style.display = '';
  
  // Update cache immediately after saving
  if (window.updateTaskPopupCache) {
    await window.updateTaskPopupCache();
  }
};

window.cancelSettings = async function() {
  var taskEl = document.getElementById('taskPopupToggle');
  var savedTaskPopup = await window.db.getSetting('taskPopup');
  if (savedTaskPopup === 'false') taskEl.classList.remove('active');
  else taskEl.classList.add('active');

  var soundEl = document.getElementById('pomoSoundToggle');
  var savedSound = await window.db.getSetting('playPomoSound');
  if (savedSound === 'false') soundEl.classList.remove('active');
  else soundEl.classList.add('active');

  var w = parseInt(await window.db.getSetting('workMinutes')) || 25;
  var sb = parseInt(await window.db.getSetting('shortBreakMinutes')) || 5;
  var lb = parseInt(await window.db.getSetting('longBreakMinutes')) || 15;
  document.getElementById('settingWork').value = w;
  document.getElementById('settingShortBreak').value = sb;
  document.getElementById('settingLongBreak').value = lb;

  window.settingsDirty = false;
  var row = document.getElementById('settingsBtnRow');
  if (row) row.style.display = 'none';
  var cancel = document.getElementById('settingsCancelBtn');
  if (cancel) cancel.style.display = '';
};

// Tab switching
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
