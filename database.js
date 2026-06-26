const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;
let dbPath = null;
var fallbackPath = null;

const MIGRATIONS = [
  function v1(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        createdAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        startTime INTEGER NOT NULL,
        endTime INTEGER NOT NULL,
        plannedMinutes REAL NOT NULL,
        focusMinutes REAL NOT NULL,
        taskName TEXT DEFAULT '',
        note TEXT DEFAULT '',
        tagId TEXT,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (tagId) REFERENCES tags(id)
      );
    `);
  },

  function v2(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        color TEXT NOT NULL,
        tagId TEXT,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        duration INTEGER NOT NULL,
        createdAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (tagId) REFERENCES tags(id)
      );

      CREATE TABLE IF NOT EXISTS goal_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goalId TEXT NOT NULL,
        date TEXT NOT NULL,
        progressValue REAL DEFAULT 0,
        focusMinutes REAL DEFAULT 0,
        FOREIGN KEY (goalId) REFERENCES goals(id)
      );

      CREATE INDEX IF NOT EXISTS idx_goal_progress_goalId ON goal_progress(goalId);
      CREATE INDEX IF NOT EXISTS idx_goal_progress_date ON goal_progress(date);
    `);
  },

  function v3(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        goalId TEXT,
        completed INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (goalId) REFERENCES goals(id)
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_goalId ON tasks(goalId);
    `);
  },

  function v4(db) {
    db.exec(`
      ALTER TABLE goals ADD COLUMN parentGoalId TEXT REFERENCES goals(id);
      CREATE INDEX IF NOT EXISTS idx_goals_parent ON goals(parentGoalId);
    `);
  },
  function v5(db) {
    try { db.exec('ALTER TABLE sessions ADD COLUMN taskId TEXT'); } catch(e) {}
    try { db.exec('ALTER TABLE sessions ADD COLUMN goalId TEXT'); } catch(e) {}
    try { db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_taskId ON sessions(taskId)'); } catch(e) {}
    try { db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_goalId ON sessions(goalId)'); } catch(e) {}
  }
];

function init(storagePath, defaultPath) {
  fallbackPath = defaultPath || storagePath;
  dbPath = path.join(storagePath, 'app.db');
  var dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations();
}

function runMigrations() {
  var version = db.pragma('user_version', { simple: true });
  // If db was at a higher version with now-removed migrations, re-run current ones
  if (version > MIGRATIONS.length) version = 0;
  for (var i = version; i < MIGRATIONS.length; i++) {
    MIGRATIONS[i](db);
    db.pragma('user_version = ' + (i + 1));
  }
}

function getSetting(key) {
  try {
    var row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
  } catch (e) { return null; }
}

function setSetting(key, value) {
  try {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
    return true;
  } catch (e) { return false; }
}

function getAllSettings() {
  try {
    var rows = db.prepare('SELECT key, value FROM settings').all();
    var result = {};
    for (var i = 0; i < rows.length; i++) result[rows[i].key] = rows[i].value;
    return result;
  } catch (e) { return {}; }
}

function getTags() {
  try { return db.prepare('SELECT * FROM tags ORDER BY createdAt ASC').all(); }
  catch (e) { return []; }
}

function saveTag(tag) {
  try {
    db.prepare('INSERT OR REPLACE INTO tags (id, name, color, createdAt) VALUES (?, ?, ?, ?)').run(
      tag.id, tag.name, tag.color, tag.createdAt || Date.now()
    );
    return true;
  } catch (e) { return false; }
}

function deleteTag(id) {
  try {
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    db.prepare('UPDATE sessions SET tagId = NULL WHERE tagId = ?').run(id);
    return true;
  } catch (e) { return false; }
}

function getTagsWithGoals() {
  try {
    var tags = db.prepare('SELECT * FROM tags ORDER BY createdAt ASC').all();
    var goals = db.prepare('SELECT id as goalId, name, color FROM goals ORDER BY name ASC').all();
    return { tags: tags, goals: goals };
  } catch (e) { return { tags: [], goals: [] }; }
}

function saveSession(session) {
  try {
    db.prepare(`
      INSERT OR REPLACE INTO sessions
      (id, startTime, endTime, plannedMinutes, focusMinutes, taskName, note, tagId, createdAt, taskId, goalId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      session.startTime,
      session.endTime,
      session.plannedMinutes,
      session.focusMinutes,
      session.taskName || '',
      session.note || '',
      session.tagId || null,
      session.createdAt || Date.now(),
      session.taskId || null,
      session.goalId || null
    );
    return true;
  } catch (e) { return false; }
}

function updateSession(id, taskName, tagId, note, goalId) {
  try {
    db.prepare('UPDATE sessions SET taskName = ?, tagId = ?, note = ?, goalId = ? WHERE id = ?').run(
      taskName || '', tagId || null, note || '', goalId || null, id
    );
    return true;
  } catch (e) { return false; }
}

function getAllSessionsGrouped() {
  try {
    var rows = db.prepare('SELECT * FROM sessions ORDER BY startTime DESC').all();
    var grouped = {};
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var dateKey = new Date(r.startTime).toISOString().split('T')[0];
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(r);
    }
    return grouped;
  } catch (e) { return {}; }
}

function getTodayStats() {
  try {
    var today = new Date().toISOString().split('T')[0];
    var startMs = new Date(today).getTime();
    var endMs = new Date(today + 'T23:59:59.999').getTime();

    var row = db.prepare(`
      SELECT COUNT(*) as pomos, COALESCE(SUM(focusMinutes), 0) as minutes
      FROM sessions WHERE startTime >= ? AND startTime <= ?
    `).get(startMs, endMs);

    return { todayPomos: row.pomos, todayFocusMinutes: row.minutes };
  } catch (e) { return { todayPomos: 0, todayFocusMinutes: 0 }; }
}

function getTotalStats() {
  try {
    var row = db.prepare(`
      SELECT COUNT(*) as pomos, COALESCE(SUM(focusMinutes), 0) as minutes FROM sessions
    `).get();
    return { totalPomos: row.pomos, totalFocusMinutes: row.minutes };
  } catch (e) { return { totalPomos: 0, totalFocusMinutes: 0 }; }
}

function migrateFromJson(storagePath) {
  if (getSetting('_migrated') === 'true') return;

  var srcPath = storagePath;
  if (fallbackPath && fallbackPath !== storagePath) {
    if (fs.existsSync(path.join(fallbackPath, 'settings.json')) || fs.existsSync(path.join(fallbackPath, 'pomodoro-sessions.json'))) {
      srcPath = fallbackPath;
    }
  }

  var settingsPath = path.join(srcPath, 'settings.json');
  if (fs.existsSync(settingsPath)) {
    try {
      var data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      for (var key in data) {
        if (key !== 'dataPath') setSetting(key, typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]));
      }
    } catch (e) {}
  }

  var tagsPath = path.join(srcPath, 'pomodoro-tags.json');
  if (fs.existsSync(tagsPath)) {
    try {
      var tags = JSON.parse(fs.readFileSync(tagsPath, 'utf-8'));
      for (var i = 0; i < tags.length; i++) {
        saveTag({ id: tags[i].id, name: tags[i].name, color: tags[i].color, createdAt: Date.now() });
      }
    } catch (e) {}
  }

  var sessionsPath = path.join(srcPath, 'pomodoro-sessions.json');
  if (fs.existsSync(sessionsPath)) {
    try {
      var grouped = JSON.parse(fs.readFileSync(sessionsPath, 'utf-8'));
      for (var dateKey in grouped) {
        var arr = grouped[dateKey];
        for (var j = 0; j < arr.length; j++) {
          var s = arr[j];
          saveSession({
            id: s.id,
            startTime: s.startTime,
            endTime: s.endTime,
            plannedMinutes: s.focusMinutes,
            focusMinutes: s.focusMinutes,
            taskName: s.taskName || '',
            note: s.note || '',
            tagId: s.tagId || null,
            createdAt: s.startTime
          });
        }
      }
    } catch (e) {}
  }

  var statsPath = path.join(srcPath, 'pomodoro-stats.json');
  if (fs.existsSync(statsPath)) {
    try {
      var stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
      if (stats.lastDate) setSetting('lastDate', stats.lastDate);
    } catch (e) {}
  }

  setSetting('_migrated', 'true');
}

function setPath(newStoragePath) {
  try {
    var oldDbPath = dbPath;
    var newDbPath = path.join(newStoragePath, 'app.db');
    var dir = path.dirname(newDbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (db) db.close();
    fs.copyFileSync(oldDbPath, newDbPath);
    dbPath = newDbPath;
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    runMigrations();
    return newStoragePath;
  } catch (e) { return null; }
}

function getPath() { return dbPath ? path.dirname(dbPath) : null; }

function close() {
  if (db) { try { db.close(); } catch (e) {} db = null; }
}

function getSessionsByTagId(tagId) {
  try { return db.prepare('SELECT * FROM sessions WHERE tagId = ? ORDER BY startTime ASC').all(tagId); }
  catch (e) { return []; }
}

function getDescendantGoalIds(goalId) {
  try {
    var all = db.prepare('SELECT id, parentGoalId FROM goals').all();
    var result = [goalId];
    function collect(parentId) {
      for (var dgi = 0; dgi < all.length; dgi++) {
        if (all[dgi].parentGoalId === parentId) {
          result.push(all[dgi].id);
          collect(all[dgi].id);
        }
      }
    }
    collect(goalId);
    return result;
  } catch (e) { return [goalId]; }
}

function getSessionsByGoal(goalId) {
  try {
    var goalIds = getDescendantGoalIds(goalId);
    var placeholders = goalIds.map(function() { return '?' }).join(',');
    var tasks = db.prepare('SELECT id FROM tasks WHERE goalId IN (' + placeholders + ')').all.apply(null, goalIds);
    var taskIds = tasks.map(function(t) { return t.id; });
    if (taskIds.length > 0) {
      var tPlaceholders = taskIds.map(function() { return '?' }).join(',');
      return db.prepare('SELECT * FROM sessions WHERE goalId IN (' + placeholders + ') OR taskId IN (' + tPlaceholders + ') ORDER BY startTime DESC').all.apply(null, goalIds.concat(taskIds));
    }
    return db.prepare('SELECT * FROM sessions WHERE goalId IN (' + placeholders + ') ORDER BY startTime DESC').all.apply(null, goalIds);
  } catch (e) { return []; }
}

function getGoals() {
  try { return db.prepare('SELECT * FROM goals ORDER BY createdAt ASC').all(); }
  catch (e) { return []; }
}

function getGoal(id) {
  try { return db.prepare('SELECT * FROM goals WHERE id = ?').get(id); }
  catch (e) { return null; }
}

function createGoal(goal) {
  try {
    db.prepare('INSERT INTO goals (id, name, description, color, tagId, startDate, endDate, duration, parentGoalId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      goal.id, goal.name, goal.description || '', goal.color, goal.tagId || null, goal.startDate, goal.endDate, goal.duration, goal.parentGoalId || null
    );
    return true;
  } catch (e) { return false; }
}

function updateGoal(id, goal) {
  try {
    db.prepare('UPDATE goals SET name = ?, description = ?, color = ?, tagId = ?, startDate = ?, endDate = ?, duration = ?, parentGoalId = ? WHERE id = ?').run(
      goal.name, goal.description || '', goal.color, goal.tagId || null, goal.startDate, goal.endDate, goal.duration, goal.parentGoalId || null, id
    );
    return true;
  } catch (e) { return false; }
}

function deleteGoal(id) {
  try {
    db.prepare('DELETE FROM goal_progress WHERE goalId = ?').run(id);
    db.prepare('DELETE FROM goals WHERE id = ?').run(id);
    return true;
  } catch (e) { return false; }
}

function getGoalProgress(goalId) {
  try { return db.prepare('SELECT * FROM goal_progress WHERE goalId = ? ORDER BY date ASC').all(goalId); }
  catch (e) { return []; }
}

function getTasks(goalId) {
  try {
    if (goalId) return db.prepare('SELECT * FROM tasks WHERE goalId = ? ORDER BY createdAt DESC').all(goalId);
    return db.prepare('SELECT * FROM tasks ORDER BY createdAt DESC').all();
  } catch (e) { return []; }
}

function createTask(task) {
  try {
    db.prepare('INSERT INTO tasks (id, name, goalId) VALUES (?, ?, ?)').run(task.id, task.name, task.goalId || null);
    return true;
  } catch (e) { return false; }
}

function toggleTask(id) {
  try {
    var task = db.prepare('SELECT completed FROM tasks WHERE id = ?').get(id);
    if (!task) return false;
    db.prepare('UPDATE tasks SET completed = ? WHERE id = ?').run(task.completed ? 0 : 1, id);
    return true;
  } catch (e) { return false; }
}

function deleteTask(id) {
  try {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return true;
  } catch (e) { return false; }
}

function saveGoalProgress(goalId, date, progressValue, focusMinutes) {
  try {
    db.prepare('INSERT OR REPLACE INTO goal_progress (goalId, date, progressValue, focusMinutes) VALUES (?, ?, ?, ?)').run(
      goalId, date, progressValue || 0, focusMinutes || 0
    );
    return true;
  } catch (e) { return false; }
}

module.exports = {
  init, close, getSetting, setSetting, getAllSettings,
  getTags, getTagsWithGoals, saveTag, deleteTag,
  saveSession, updateSession, getAllSessionsGrouped, getSessionsByTagId, getSessionsByGoal,
  getTodayStats, getTotalStats,
  migrateFromJson, setPath, getPath,
  getGoals, getGoal, createGoal, updateGoal, deleteGoal,
  getGoalProgress, saveGoalProgress,
  getTasks, createTask, toggleTask, deleteTask
};
