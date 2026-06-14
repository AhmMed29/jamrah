var STORAGE = {
  path: null
};

STORAGE.init = async function () {
  var defaultPath = await window.electronAPI.getDefaultPath();

  var pointer = await window.electronAPI.readFile(defaultPath + '/.datadir');
  if (pointer) {
    STORAGE.path = pointer.trim();
    return;
  }

  var settingsRaw = await window.electronAPI.readFile(defaultPath + '/settings.json');
  if (settingsRaw) {
    var settings = JSON.parse(settingsRaw);
    STORAGE.path = settings.dataPath || defaultPath;
    return;
  }

  STORAGE.path = defaultPath;
  await STORAGE.migrate();
};

STORAGE.migrate = async function () {
  var items = {};
  var keys = ['pomodoro_stats', 'pomodoro_sessions', 'pomodoro_tags', 'app_theme', 'last_pomodoro_minutes', 'zoom_factor'];
  for (var i = 0; i < keys.length; i++) {
    var val = localStorage.getItem(keys[i]);
    if (val) items[keys[i]] = val;
  }

  var mapping = {
    'pomodoro_stats': 'pomodoro-stats.json',
    'pomodoro_sessions': 'pomodoro-sessions.json',
    'pomodoro_tags': 'pomodoro-tags.json'
  };
  for (var key in mapping) {
    if (items[key]) {
      var parsed = JSON.parse(items[key]);
      await window.electronAPI.writeFile(STORAGE.path + '/' + mapping[key], JSON.stringify(parsed, null, 2));
    }
  }

  var settings = {
    theme: items['app_theme'] || 'light',
    zoom: parseFloat(items['zoom_factor'] || '1'),
    timerMinutes: parseInt(items['last_pomodoro_minutes'] || '50'),
    dataPath: STORAGE.path
  };
  await STORAGE.set('settings.json', settings);

  var defaultPath = await window.electronAPI.getDefaultPath();
  await window.electronAPI.writeFile(defaultPath + '/.datadir', STORAGE.path);
};

STORAGE.get = async function (filename) {
  var raw = await window.electronAPI.readFile(STORAGE.path + '/' + filename);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

STORAGE.set = async function (filename, data) {
  return await window.electronAPI.writeFile(STORAGE.path + '/' + filename, JSON.stringify(data, null, 2));
};

STORAGE.getPath = function () { return STORAGE.path; };

STORAGE.setPath = async function (newPath) {
  var fullPath = newPath + '/MyProductivityApp/data';
  var oldPath = STORAGE.path;

  var files = ['settings.json', 'pomodoro-stats.json', 'pomodoro-sessions.json', 'pomodoro-tags.json'];
  for (var i = 0; i < files.length; i++) {
    var data = await STORAGE.get(files[i]);
    if (data) {
      await window.electronAPI.writeFile(fullPath + '/' + files[i], JSON.stringify(data, null, 2));
    }
  }

  STORAGE.path = fullPath;
  var settings = await STORAGE.get('settings.json') || {};
  settings.dataPath = fullPath;
  await STORAGE.set('settings.json', settings);

  var defaultPath = await window.electronAPI.getDefaultPath();
  await window.electronAPI.writeFile(defaultPath + '/.datadir', fullPath);
};

(async function() {
  try { await STORAGE.init(); } catch(e) {}
})();
