const path = require('path')
const fs = require('fs')

var storagePath = ''
var backendRunning = false

function stopBackend() {
  backendRunning = false
}

async function startBackend() {
  backendRunning = true
}

function is(type, val) {
  if (type === 'string') return typeof val === 'string' && val.length > 0
  if (type === 'object') return val !== null && typeof val === 'object' && !Array.isArray(val)
  return typeof val === type
}

async function dbSetPath(newPath) {
  if (!is('string', newPath)) return null
  var fullPath = newPath + '/MyProductivityApp/data'
  var oldDb = path.join(storagePath, 'app.db')
  var newDb = path.join(fullPath, 'app.db')
  try {
    var dir = path.dirname(newDb)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.copyFileSync(oldDb, newDb)
    stopBackend()
    storagePath = fullPath
    await startBackend()
    var defaultPath = path.join(__dirname, '.test-userdata/data')
    fs.writeFileSync(path.join(defaultPath, '.datadir'), storagePath, 'utf-8')
    return storagePath
  } catch { return null }
}

describe('db:set-path', () => {
  var userPath = 'C:/Users/test/AppData'
  var fullPath = userPath + '/MyProductivityApp/data'
  var oldDb = path.join(storagePath, 'app.db')
  var newDb = path.join(fullPath, 'app.db')

  afterEach(function () { jest.restoreAllMocks() })

  test('non-string newPath returns null', async () => {
    var result = await dbSetPath(123)
    expect(result).toBeNull()
  })

  test('valid path creates dir, copies db, restarts backend, writes .datadir, returns storagePath', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false)
    var mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockReturnValue(undefined)
    var copySpy = jest.spyOn(fs, 'copyFileSync').mockReturnValue(undefined)
    var writeSpy = jest.spyOn(fs, 'writeFileSync').mockReturnValue(undefined)
    var defaultPath = path.join(__dirname, '.test-userdata/data')

    var result = await dbSetPath(userPath)

    expect(mkdirSpy).toHaveBeenCalledWith(path.dirname(newDb), { recursive: true })
    expect(copySpy).toHaveBeenCalledWith(oldDb, newDb)
    expect(backendRunning).toBe(true)
    expect(writeSpy).toHaveBeenCalledWith(path.join(defaultPath, '.datadir'), fullPath, 'utf-8')
    expect(result).toBe(fullPath)
  })

  test('mkdirSync error returns null', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false)
    jest.spyOn(fs, 'mkdirSync').mockImplementation(function () { throw new Error('Permission denied') })
    jest.spyOn(fs, 'copyFileSync')

    var result = await dbSetPath(userPath)

    expect(fs.copyFileSync).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  test('copyFileSync error returns null', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true)
    jest.spyOn(fs, 'mkdirSync')
    jest.spyOn(fs, 'copyFileSync').mockImplementation(function () { throw new Error('File in use') })

    var result = await dbSetPath(userPath)

    expect(result).toBeNull()
  })

  test('startBackend failure returns null', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true)
    jest.spyOn(fs, 'mkdirSync')
    jest.spyOn(fs, 'copyFileSync').mockReturnValue(undefined)
    jest.spyOn(fs, 'writeFileSync').mockReturnValue(undefined)

    var _origStart = startBackend
    startBackend = async function () { throw new Error('Backend refused') }

    var result = await dbSetPath(userPath)

    expect(result).toBeNull()

    startBackend = _origStart
  })
})
