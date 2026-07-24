const path = require('path')
const fs = require('fs')
const nock = require('nock')

const API_BASE = 'http://localhost:5200/api'
function api(p) { return API_BASE + p }
function is(type, val) {
  if (type === 'string') return typeof val === 'string' && val.length > 0
  if (type === 'object') return val !== null && typeof val === 'object' && !Array.isArray(val)
  return typeof val === type
}

let storagePath = ''

async function backupDo(backupDir) {
  if (!is('string', backupDir)) return { success: false, error: 'Invalid directory' }
  try {
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })

    var dbSource = path.join(storagePath, 'app.db')
    var dbDest = path.join(backupDir, 'app.db')

    if (fs.existsSync(dbSource)) fs.copyFileSync(dbSource, dbDest)

    var settingsSource = path.join(storagePath, 'settings.json')
    var settingsDest = path.join(backupDir, 'settings.json')

    if (fs.existsSync(settingsSource)) fs.copyFileSync(settingsSource, settingsDest)

    return { success: true, path: backupDir, files: [{ name: 'app.db', path: dbDest }, { name: 'settings.json', path: settingsDest }] }
  } catch (err) { return { success: false, error: err.message } }
}

function backupGetInfo() {
  var dbFile = path.join(storagePath, 'app.db')
  var settingsFile = path.join(storagePath, 'settings.json')
  return {
    storagePath: storagePath,
    dbFile: dbFile,
    dbExists: fs.existsSync(dbFile),
    settingsFile: settingsFile,
    settingsExists: fs.existsSync(settingsFile)
  }
}

async function backupRestore(files) {
  if (!Array.isArray(files) || files.length === 0) return { log: [{ type: 'error', message: 'No files selected' }] }
  try {
    var r = await fetch(api('/backup/restore'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: files })
    })
    return r.ok ? await r.json() : { log: [{ type: 'error', message: 'Restore request failed' }] }
  } catch (err) { return { log: [{ type: 'error', message: err.message }] } }
}

describe('backup:do', () => {
  var backupDir = 'C:/test/backups'
  var dbSource = path.join(storagePath, 'app.db')
  var dbDest = path.join(backupDir, 'app.db')
  var settingsSource = path.join(storagePath, 'settings.json')
  var settingsDest = path.join(backupDir, 'settings.json')

  afterEach(function () { jest.restoreAllMocks() })

  test('invalid directory (non-string) returns error', async () => {
    var result = await backupDo(123)
    expect(result).toEqual({ success: false, error: 'Invalid directory' })
  })

  test('valid backup dir: creates dir, copies files, returns success object', async () => {
    jest.spyOn(fs, 'existsSync')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
    var mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockReturnValue(undefined)
    var copySpy = jest.spyOn(fs, 'copyFileSync').mockReturnValue(undefined)

    var result = await backupDo(backupDir)

    expect(mkdirSpy).toHaveBeenCalledWith(backupDir, { recursive: true })
    expect(copySpy).toHaveBeenCalledWith(dbSource, dbDest)
    expect(copySpy).toHaveBeenCalledWith(settingsSource, settingsDest)
    expect(result).toEqual({
      success: true,
      path: backupDir,
      files: [
        { name: 'app.db', path: dbDest },
        { name: 'settings.json', path: settingsDest }
      ]
    })
  })

  test('handles filesystem errors gracefully', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation(function () { throw new Error('Disk error') })

    var result = await backupDo(backupDir)

    expect(result).toEqual({ success: false, error: 'Disk error' })
  })
})

describe('backup:get-info', () => {
  afterEach(function () { jest.restoreAllMocks() })

  test('returns storagePath, dbFile, settingsFile', () => {
    storagePath = '/some/data'
    jest.spyOn(fs, 'existsSync').mockReturnValue(false)

    var info = backupGetInfo()

    expect(info).toHaveProperty('storagePath', '/some/data')
    expect(info).toHaveProperty('dbFile', path.join('/some/data', 'app.db'))
    expect(info).toHaveProperty('settingsFile', path.join('/some/data', 'settings.json'))
  })

  test('dbExists and settingsExists reflect filesystem state', () => {
    storagePath = '/some/data'
    jest.spyOn(fs, 'existsSync')
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)

    var info = backupGetInfo()

    expect(info.dbExists).toBe(true)
    expect(info.settingsExists).toBe(false)
  })
})

describe('backup:restore', () => {
  beforeEach(function () { nock.cleanAll() })
  afterEach(function () { nock.cleanAll(); jest.restoreAllMocks() })

  test('empty or non-array files returns error log', async () => {
    var r1 = await backupRestore([])
    expect(r1).toEqual({ log: [{ type: 'error', message: 'No files selected' }] })

    var r2 = await backupRestore('not-an-array')
    expect(r2).toEqual({ log: [{ type: 'error', message: 'No files selected' }] })
  })

  test('valid files sends POST to backend', async () => {
    var scope = nock('http://localhost:5200')
      .post('/api/backup/restore', { files: ['file1.db', 'file2.db'] })
      .reply(200, { log: [{ type: 'info', message: 'Restore started' }] })

    var result = await backupRestore(['file1.db', 'file2.db'])

    expect(scope.isDone()).toBe(true)
    expect(result).toEqual({ log: [{ type: 'info', message: 'Restore started' }] })
  })

  test('backend returns 200 with log returns the log', async () => {
    nock('http://localhost:5200')
      .post('/api/backup/restore')
      .reply(200, { log: [{ type: 'success', message: 'Files restored' }] })

    var result = await backupRestore(['backup.db'])

    expect(result).toEqual({ log: [{ type: 'success', message: 'Files restored' }] })
  })

  test('backend returns non-ok status returns error log', async () => {
    nock('http://localhost:5200')
      .post('/api/backup/restore')
      .reply(500)

    var result = await backupRestore(['backup.db'])

    expect(result).toEqual({ log: [{ type: 'error', message: 'Restore request failed' }] })
  })

  test('fetch throws returns error log with message', async () => {
    nock('http://localhost:5200')
      .post('/api/backup/restore')
      .replyWithError('ECONNREFUSED')

    var result = await backupRestore(['backup.db'])

    expect(result.log[0].type).toBe('error')
    expect(result.log[0].message).toBeDefined()
  })
})
