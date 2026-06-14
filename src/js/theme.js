// theme.js - theme system

var currentTheme = localStorage.getItem('app_theme') || 'light';
var previewTheme = currentTheme;

var themeColors = {
  light: { body: '#FAFAFA', sidebar: '#3B82F6', main: '#FFFFFF', aside: '#FFFFFF', card: '#F5F6F8', titlebar: '#FFFFFF', ring: '#3B82F6', bgRing: '#F3F4F6', startBtn: '#3B82F6', endBtn: '#EF4444' },
  night: { body: '#FFF5D6', sidebar: '#A898E0', main: '#FFF8E0', aside: '#FFF8E0', card: '#FFF0C0', titlebar: '#FFF8E0', ring: '#8A7CFB', bgRing: '#E8E0C8', startBtn: '#8A7CFB', endBtn: '#EF4444' },
  offwhite: { body: '#F0F0F0', sidebar: '#D1D1D1', main: '#F5F5F5', aside: '#F5F5F5', card: '#E8E8E8', titlebar: '#F5F5F5', ring: '#3B82F6', bgRing: '#E0E0E0', startBtn: '#3B82F6', endBtn: '#EF4444' },
  'black-white': { body: '#FFFFFF', sidebar: '#1A1A1A', main: '#FFFFFF', aside: '#FFFFFF', card: '#F5F5F5', titlebar: '#FFFFFF', ring: '#000000', bgRing: '#E5E5E5', startBtn: '#000000', endBtn: '#EF4444' },
  dark: { body: '#1A1A1A', sidebar: '#2D2D2D', main: '#2D2D2D', aside: '#2D2D2D', card: '#3D3D3D', titlebar: '#2D2D2D', ring: '#FFFFFF', bgRing: '#4D4D4D', startBtn: '#FFFFFF', endBtn: '#EF4444' },
  'pure-black': { body: '#000000', sidebar: '#000000', main: '#000000', aside: '#000000', card: '#111111', titlebar: '#000000', ring: '#FFFFFF', bgRing: '#222222', startBtn: '#FFFFFF', endBtn: '#EF4444' }
};
var themeNames = { light: 'Light', night: 'Night', offwhite: 'OffWhite', 'black-white': 'Black & White', dark: 'Dark', 'pure-black': 'Pure Black' };

function applyTheme(name) {
  var c = themeColors[name];
  if (!c) return;
  document.body.style.backgroundColor = c.body;
  var nav = document.getElementById('navSidebar');
  if (nav) nav.style.backgroundColor = c.sidebar;
  var tb = document.getElementById('titlebar');
  if (tb) tb.style.backgroundColor = c.titlebar;

  var startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.style.backgroundColor = c.startBtn;
  var endBtn = document.getElementById('endBtn');
  if (endBtn) endBtn.style.backgroundColor = c.endBtn;

  var main = document.getElementById('mainArea');
  if (main) main.style.backgroundColor = c.main;
  var aside = document.getElementById('asideArea');
  if (aside) aside.style.backgroundColor = c.aside;
  document.querySelectorAll('#asideArea .grid > div').forEach(function(el) { el.style.backgroundColor = c.card; });
  var ring = document.getElementById('progressRing');
  if (ring) ring.style.stroke = c.ring;
  var bg = document.getElementById('progressBg');
  if (bg) bg.style.stroke = c.bgRing || '#F3F4F6';

  var headers = document.querySelectorAll('.habits-header, .habits-footer');
  headers.forEach(function(el) { el.style.backgroundColor = c.card; });
}

function openSettings() {
  previewTheme = currentTheme;
  var pc = document.getElementById('pomodoroContent');
  if (pc) pc.classList.add('hidden');
  var sc = document.getElementById('settingsContent');
  if (sc) sc.classList.remove('hidden');
  applyTheme(previewTheme);
  var stn = document.getElementById('selectedThemeName');
  if (stn) stn.textContent = themeNames[previewTheme];
  var spd = document.getElementById('storagePathDisplay');
  if (spd && typeof STORAGE !== 'undefined' && STORAGE.getPath) spd.textContent = STORAGE.getPath();
}

function closeSettings() {
  var sc = document.getElementById('settingsContent');
  if (sc) sc.classList.add('hidden');
  var pc = document.getElementById('pomodoroContent');
  if (pc) pc.classList.remove('hidden');
  applyTheme(currentTheme);
}

function toggleThemeDropdown() {
  var dd = document.getElementById('themeDropdown');
  if (dd) dd.classList.toggle('hidden');
}

function selectTheme(name) {
  previewTheme = name;
  var stn = document.getElementById('selectedThemeName');
  if (stn) stn.textContent = themeNames[name];
  var dd = document.getElementById('themeDropdown');
  if (dd) dd.classList.add('hidden');
  applyTheme(name);
}

function saveSettings() {
  currentTheme = previewTheme;
  localStorage.setItem('app_theme', currentTheme);
  closeSettings();
}

function cancelSettings() {
  closeSettings();
}

function selectStoragePath() {
  if (typeof STORAGE === 'undefined' || !STORAGE.getPath) return;
  window.electronAPI.selectFolder().then(function(newPath) {
    if (newPath) {
      STORAGE.setPath(newPath);
      var spd = document.getElementById('storagePathDisplay');
      if (spd) spd.textContent = newPath;
    }
  });
}

applyTheme(currentTheme);
