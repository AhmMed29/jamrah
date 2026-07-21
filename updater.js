const path = require('path')
const fs = require('fs')
const { spawnSync } = require('child_process')
const { app } = require('electron')

function frontendDir() {
  return path.join(app.getPath('userData'), 'frontend')
}

function psExec(cmd) {
  var b = Buffer.from(cmd, 'ucs-2').toString('base64')
  return spawnSync('powershell', ['-NoProfile', '-EncodedCommand', b], { stdio: 'pipe', windowsHide: true })
}

exports.getFrontendIndexPath = function() {
  var fp = path.join(frontendDir(), 'index.html')
  return fs.existsSync(fp) ? fp : null
}

exports.checkForFrontendUpdate = async function() {
  try {
    var r = await fetch('https://api.github.com/repos/AhmMed29/jamrah/releases/latest', {
      headers: { 'User-Agent': 'jamrah-app', 'Accept': 'application/vnd.github.v3+json' }
    })
    if (!r.ok) return { updated: false }

    var rel = await r.json()
    var tag = rel.tag_name.replace(/^v/, '')

    var vf = path.join(frontendDir(), 'version.txt')
    var localVer = '0.0.0'
    if (fs.existsSync(vf)) localVer = fs.readFileSync(vf, 'utf-8').trim()
    if (cmpVer(localVer, tag) >= 0) return { updated: false }

    var zipAsset = rel.assets.find(function(a) {
      return a.name.startsWith('frontend-') && a.name.endsWith('.zip')
    })
    if (!zipAsset) return { updated: false }

    var zr = await fetch(zipAsset.browser_download_url)
    if (!zr.ok) return { updated: false }

    var buf = Buffer.from(await zr.arrayBuffer())

    var dir = frontendDir()
    var old = dir + '_old'
    if (fs.existsSync(dir)) {
      if (fs.existsSync(old)) fs.rmSync(old, { recursive: true })
      fs.renameSync(dir, old)
    }
    fs.mkdirSync(dir, { recursive: true })

    var zp = path.join(dir, 'update.zip')
    fs.writeFileSync(zp, buf)

    var psCmd = 'Expand-Archive -Path "' + zp.replace(/"/g, '\\"') + '" -DestinationPath "' + dir.replace(/"/g, '\\"') + '" -Force'
    psExec(psCmd)

    try { fs.rmSync(zp) } catch {}
    try { if (fs.existsSync(old)) fs.rmSync(old, { recursive: true }) } catch {}
    fs.writeFileSync(vf, tag, 'utf-8')
    return { updated: true, version: tag }
  } catch (e) {
    return { updated: false }
  }
}

function cmpVer(a, b) {
  var pa = a.split('.').map(Number)
  var pb = b.split('.').map(Number)
  for (var i = 0; i < 3; i++) {
    var na = pa[i] || 0
    var nb = pb[i] || 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}
