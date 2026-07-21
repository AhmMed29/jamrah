const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
var pkg = require('../package.json')

var ver = pkg.version
var dist = path.join(__dirname, '..', 'dist')
var src = path.join(__dirname, '..', 'src')
var zf = path.join(dist, 'frontend-v' + ver + '.zip')

if (!fs.existsSync(dist)) fs.mkdirSync(dist, { recursive: true })
if (fs.existsSync(zf)) fs.rmSync(zf)

var cmd = 'Compress-Archive -Path "' + src.replace(/"/g, '\\"') + '\\*" -DestinationPath "' + zf.replace(/"/g, '\\"') + '" -Force'
var enc = Buffer.from(cmd, 'ucs-2').toString('base64')
execSync('powershell -NoProfile -EncodedCommand ' + enc, { stdio: 'pipe', windowsHide: true })

var m = { version: ver, zipFile: 'frontend-v' + ver + '.zip', zipSize: fs.statSync(zf).size, createdAt: new Date().toISOString() }
fs.writeFileSync(path.join(dist, 'frontend-manifest.json'), JSON.stringify(m, null, 2))
console.log('[frontend] Created frontend-v' + ver + '.zip (' + (m.zipSize / 1024).toFixed(1) + ' KB)')
