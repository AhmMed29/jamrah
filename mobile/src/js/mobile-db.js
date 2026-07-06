/* mobile-db.js - SQLite database layer for mobile
   Mirrors the desktop window.db API from preload.js
   Uses @capacitor-community/sqlite instead of IPC → HTTP → .NET backend */

var DB_NAME = 'jamrah.db'

async function initDb() {
  try {
    await window.sqliteConnection.openDatabase(DB_NAME)
    await ensureTables()
    return 'ok'
  } catch(e) {
    console.error('[DB] init error:', e)
    return 'error'
  }
}

async function ensureTables() {
  var sql = [
    'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)',
    'CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, name TEXT, color TEXT)',
    'CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, taskName TEXT, tagId TEXT, note TEXT, startTime TEXT, endTime TEXT, focusMinutes REAL, goalId TEXT)',
    'CREATE TABLE IF NOT EXISTS goals (id TEXT PRIMARY KEY, title TEXT, description TEXT, startDate TEXT, endDate TEXT, color TEXT, icon TEXT)',
    'CREATE TABLE IF NOT EXISTS goalProgress (id TEXT PRIMARY KEY, goalId TEXT, date TEXT, value REAL)',
    'CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, title TEXT, description TEXT, isComplete INTEGER DEFAULT 0, goalId TEXT, createdAt TEXT, updatedAt TEXT)',
    'CREATE TABLE IF NOT EXISTS habits (id TEXT PRIMARY KEY, name TEXT, type TEXT, color TEXT, icon TEXT, sortOrder INTEGER DEFAULT 0)',
    'CREATE TABLE IF NOT EXISTS habitLogs (id TEXT PRIMARY KEY, habitId TEXT, date TEXT, value REAL)'
  ]
  for (var i = 0; i < sql.length; i++) {
    await window.sqliteConnection.execute(DB_NAME, sql[i])
  }
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function todayKey() { return new Date().toISOString().split('T')[0] }

window.db = {
  init: async function() {
    if (!window.sqliteConnection) {
      console.warn('[DB] sqliteConnection not available, using localStorage fallback')
      return 'fallback'
    }
    return await initDb()
  },

  getPath: function() { return 'local' },
  setPath: function() { return false },

  // ── Settings ──
  getSetting: async function(key) {
    try {
      var r = await window.sqliteConnection.query(DB_NAME, 'SELECT value FROM settings WHERE key = ?', [key])
      return r.values && r.values.length ? r.values[0].value : null
    } catch(e) { return null }
  },

  setSetting: async function(key, value) {
    try {
      await window.sqliteConnection.execute(DB_NAME, 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)])
      return true
    } catch(e) { return false }
  },

  getAllSettings: async function() {
    try {
      var r = await window.sqliteConnection.query(DB_NAME, 'SELECT key, value FROM settings')
      var result = {}
      if (r.values) { for (var i = 0; i < r.values.length; i++) { result[r.values[i].key] = r.values[i].value } }
      return result
    } catch(e) { return {} }
  },

  // ── Tags ──
  getTags: async function() {
    try {
      var r = await window.sqliteConnection.query(DB_NAME, 'SELECT * FROM tags')
      return r.values || []
    } catch(e) { return [] }
  },

  getTagsWithGoals: async function() {
    try {
      var tags = await window.db.getTags()
      var goals = await window.db.getGoals()
      return { tags: tags, goals: goals }
    } catch(e) { return { tags: [], goals: [] } }
  },

  saveTag: async function(tag) {
    try {
      if (!tag.id) tag.id = uuid()
      await window.sqliteConnection.execute(DB_NAME, 'INSERT OR REPLACE INTO tags (id, name, color) VALUES (?, ?, ?)', [tag.id, tag.name, tag.color || '#3B82F6'])
      return tag
    } catch(e) { return false }
  },

  deleteTag: async function(id) {
    try {
      await window.sqliteConnection.execute(DB_NAME, 'DELETE FROM tags WHERE id = ?', [id])
      return true
    } catch(e) { return false }
  },

  // ── Sessions ──
  getSessionsGrouped: async function() {
    try {
      var r = await window.sqliteConnection.query(DB_NAME, 'SELECT * FROM sessions ORDER BY startTime DESC')
      var grouped = {}
      if (r.values) {
        for (var i = 0; i < r.values.length; i++) {
          var s = r.values[i]
          var key = s.startTime ? s.startTime.split('T')[0] : todayKey()
          if (!grouped[key]) grouped[key] = []
          grouped[key].push(s)
        }
      }
      return grouped
    } catch(e) { return {} }
  },

  saveSession: async function(session) {
    try {
      if (!session.id) session.id = uuid()
      if (!session.startTime) session.startTime = new Date().toISOString()
      await window.sqliteConnection.execute(DB_NAME,
        'INSERT OR REPLACE INTO sessions (id, taskName, tagId, note, startTime, endTime, focusMinutes, goalId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [session.id, session.taskName || '', session.tagId || null, session.note || '', session.startTime, session.endTime || null, session.focusMinutes || 0, session.goalId || null]
      )
      return session
    } catch(e) { return false }
  },

  updateSession: async function(id, taskName, tagId, note, goalId) {
    try {
      await window.sqliteConnection.execute(DB_NAME,
        'UPDATE sessions SET taskName = ?, tagId = ?, note = ?, goalId = ? WHERE id = ?',
        [taskName || '', tagId || null, note || '', goalId || null, id]
      )
      return true
    } catch(e) { return false }
  },

  getTodayStats: async function() {
    try {
      var today = todayKey()
      var r = await window.sqliteConnection.query(DB_NAME, 'SELECT COUNT(*) as pomos, COALESCE(SUM(focusMinutes), 0) as minutes FROM sessions WHERE startTime LIKE ?', [today + '%'])
      if (r.values && r.values.length) return { todayPomos: r.values[0].pomos, todayFocusMinutes: r.values[0].minutes }
      return { todayPomos: 0, todayFocusMinutes: 0 }
    } catch(e) { return { todayPomos: 0, todayFocusMinutes: 0 } }
  },

  getTotalStats: async function() {
    try {
      var r = await window.sqliteConnection.query(DB_NAME, 'SELECT COUNT(*) as pomos, COALESCE(SUM(focusMinutes), 0) as minutes FROM sessions')
      if (r.values && r.values.length) return { totalPomos: r.values[0].pomos, totalFocusMinutes: r.values[0].minutes }
      return { totalPomos: 0, totalFocusMinutes: 0 }
    } catch(e) { return { totalPomos: 0, totalFocusMinutes: 0 } }
  },

  getSessionsByTag: async function(tagId) {
    try {
      var r = await window.sqliteConnection.query(DB_NAME, 'SELECT * FROM sessions WHERE tagId = ? ORDER BY startTime DESC', [tagId])
      return r.values || []
    } catch(e) { return [] }
  },

  getSessionsByGoal: async function(goalId) {
    try {
      var r = await window.sqliteConnection.query(DB_NAME, 'SELECT * FROM sessions WHERE goalId = ? ORDER BY startTime DESC', [goalId])
      return r.values || []
    } catch(e) { return [] }
  },

  // ── Goals ──
  getGoals: async function() {
    try {
      var r = await window.sqliteConnection.query(DB_NAME, 'SELECT * FROM goals ORDER BY startDate DESC')
      return r.values || []
    } catch(e) { return [] }
  },

  createGoal: async function(goal) {
    try {
      if (!goal.id) goal.id = uuid()
      await window.sqliteConnection.execute(DB_NAME,
        'INSERT OR REPLACE INTO goals (id, title, description, startDate, endDate, color, icon) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [goal.id, goal.title || '', goal.description || '', goal.startDate || '', goal.endDate || '', goal.color || '#3B82F6', goal.icon || '']
      )
      return goal
    } catch(e) { return false }
  },

  updateGoal: async function(id, goal) {
    try {
      await window.sqliteConnection.execute(DB_NAME,
        'UPDATE goals SET title = ?, description = ?, startDate = ?, endDate = ?, color = ?, icon = ? WHERE id = ?',
        [goal.title || '', goal.description || '', goal.startDate || '', goal.endDate || '', goal.color || '#3B82F6', goal.icon || '', id]
      )
      return true
    } catch(e) { return false }
  },

  deleteGoal: async function(id) {
    try {
      await window.sqliteConnection.execute(DB_NAME, 'DELETE FROM goals WHERE id = ?', [id])
      return true
    } catch(e) { return false }
  },

  getGoalProgress: async function(goalId) {
    try {
      var r = await window.sqliteConnection.query(DB_NAME, 'SELECT * FROM goalProgress WHERE goalId = ? ORDER BY date', [goalId])
      return r.values || []
    } catch(e) { return [] }
  },

  // ── Tasks ──
  getTasks: async function(goalId) {
    try {
      var sql = 'SELECT * FROM tasks'
      var params = []
      if (goalId) { sql += ' WHERE goalId = ?'; params.push(goalId) }
      sql += ' ORDER BY createdAt DESC'
      var r = await window.sqliteConnection.query(DB_NAME, sql, params)
      return r.values || []
    } catch(e) { return [] }
  },

  createTask: async function(task) {
    try {
      if (!task.id) task.id = uuid()
      var now = new Date().toISOString()
      await window.sqliteConnection.execute(DB_NAME,
        'INSERT OR REPLACE INTO tasks (id, title, description, isComplete, goalId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [task.id, task.title || '', task.description || '', task.isComplete ? 1 : 0, task.goalId || null, task.createdAt || now, now]
      )
      return task
    } catch(e) { return false }
  },

  toggleTask: async function(id) {
    try {
      await window.sqliteConnection.execute(DB_NAME, 'UPDATE tasks SET isComplete = CASE WHEN isComplete THEN 0 ELSE 1 END, updatedAt = ? WHERE id = ?', [new Date().toISOString(), id])
      return true
    } catch(e) { return false }
  },

  updateTask: async function(id, data) {
    try {
      var sets = []
      var params = []
      if (data.title !== undefined) { sets.push('title = ?'); params.push(data.title) }
      if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description) }
      if (data.isComplete !== undefined) { sets.push('isComplete = ?'); params.push(data.isComplete ? 1 : 0) }
      if (data.goalId !== undefined) { sets.push('goalId = ?'); params.push(data.goalId) }
      sets.push('updatedAt = ?'); params.push(new Date().toISOString())
      params.push(id)
      await window.sqliteConnection.execute(DB_NAME, 'UPDATE tasks SET ' + sets.join(', ') + ' WHERE id = ?', params)
      return true
    } catch(e) { return false }
  },

  deleteTask: async function(id) {
    try {
      await window.sqliteConnection.execute(DB_NAME, 'DELETE FROM tasks WHERE id = ?', [id])
      return true
    } catch(e) { return false }
  },

  // ── Habits ──
  getHabits: async function() {
    try {
      var r = await window.sqliteConnection.query(DB_NAME, 'SELECT * FROM habits ORDER BY sortOrder')
      return r.values || []
    } catch(e) { return [] }
  },

  createHabit: async function(habit) {
    try {
      if (!habit.id) habit.id = uuid()
      await window.sqliteConnection.execute(DB_NAME,
        'INSERT OR REPLACE INTO habits (id, name, type, color, icon, sortOrder) VALUES (?, ?, ?, ?, ?, ?)',
        [habit.id, habit.name || '', habit.type || 'daily', habit.color || '#3B82F6', habit.icon || '', habit.sortOrder || 0]
      )
      return habit
    } catch(e) { return false }
  },

  updateHabit: async function(id, data) {
    try {
      var sets = []
      var params = []
      if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name) }
      if (data.type !== undefined) { sets.push('type = ?'); params.push(data.type) }
      if (data.color !== undefined) { sets.push('color = ?'); params.push(data.color) }
      if (data.icon !== undefined) { sets.push('icon = ?'); params.push(data.icon) }
      if (data.sortOrder !== undefined) { sets.push('sortOrder = ?'); params.push(data.sortOrder) }
      if (sets.length === 0) return true
      params.push(id)
      await window.sqliteConnection.execute(DB_NAME, 'UPDATE habits SET ' + sets.join(', ') + ' WHERE id = ?', params)
      return true
    } catch(e) { return false }
  },

  deleteHabit: async function(id) {
    try {
      await window.sqliteConnection.execute(DB_NAME, 'DELETE FROM habits WHERE id = ?', [id])
      await window.sqliteConnection.execute(DB_NAME, 'DELETE FROM habitLogs WHERE habitId = ?', [id])
      return true
    } catch(e) { return false }
  },

  getHabitLogs: async function(habitId, startDate, endDate) {
    try {
      var sql = 'SELECT * FROM habitLogs WHERE habitId = ?'
      var params = [habitId]
      if (startDate) { sql += ' AND date >= ?'; params.push(startDate) }
      if (endDate) { sql += ' AND date <= ?'; params.push(endDate) }
      sql += ' ORDER BY date'
      var r = await window.sqliteConnection.query(DB_NAME, sql, params)
      return r.values || []
    } catch(e) { return [] }
  },

  setHabitLog: async function(habitId, date, value) {
    try {
      var id = habitId + '_' + date
      await window.sqliteConnection.execute(DB_NAME,
        'INSERT OR REPLACE INTO habitLogs (id, habitId, date, value) VALUES (?, ?, ?, ?)',
        [id, habitId, date, value != null ? value : 1]
      )
      return true
    } catch(e) { return false }
  }
}
