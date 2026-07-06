/* mobile-electron-shim.js - Replaces Electron APIs for mobile WebView
   Mirrors window.electronAPI from desktop preload.js
   Uses Capacitor plugins or Web APIs where Electron features don't exist on mobile */

window.electronAPI = {
  // ── Window controls (no-op on mobile) ──
  minimize: function() {},
  maximize: function() {},
  close: function() {},
  closeApp: function() {
    try { navigator.app.exitApp() } catch(e) {}
  },

  // ── Navigation ──
  navigate: function(page) {
    if (page.includes('..') || page.includes('\\')) return
    window.location.href = page
  },

  // ── Zoom (native pinch zoom on mobile) ──
  zoomIn: function() { return Promise.resolve(1) },
  zoomOut: function() { return Promise.resolve(1) },
  zoomReset: function() { return Promise.resolve(1) },
  setZoom: function(z) { return Promise.resolve(z) },

  // ── File operations (uses Capacitor Filesystem plugin if available) ──
  readFile: async function(filePath) {
    try {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
        var result = await window.Capacitor.Plugins.Filesystem.readFile({ path: filePath })
        return result.data
      }
      return null
    } catch(e) { return null }
  },

  writeFile: async function(filePath, data) {
    try {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
        await window.Capacitor.Plugins.Filesystem.writeFile({ path: filePath, data: data })
        return true
      }
      return false
    } catch(e) { return false }
  },

  selectFolder: async function() {
    try {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Dialog) {
        return { path: '/' }
      }
      return null
    } catch(e) { return null }
  },

  getDefaultPath: function() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
      return window.Capacitor.Plugins.Filesystem.getUri({ directory: 'DATA' }).then(function(r) { return r.uri }).catch(function() { return '/data' })
    }
    return '/data'
  },

  openUrl: function(url) {
    try {
      var parsed = new URL(url)
      if (parsed.protocol !== 'https:') return
      window.open(url, '_blank')
    } catch(e) {}
  },

  // ── Updates (GitHub Releases API instead of electron-updater) ──
  onUpdateAvailable: function(callback) {
    window._updateAvailableCallback = callback
  },

  onUpdateProgress: function(callback) {},
  onUpdateDownloaded: function(callback) {},

  startDownload: async function() {
    if (window._updateData && window._updateData.downloadUrl) {
      window.open(window._updateData.downloadUrl, '_blank')
    }
    return true
  },

  quitAndInstall: function() {},

  checkForUpdates: async function() {
    try {
      var r = await fetch('https://api.github.com/repos/AhmMed29/jamrah/releases/latest')
      var data = await r.json()
      var latestTag = data.tag_name || ''
      var currentVersion = 'v' + (window.APP_VERSION || '2.0.0')
      if (latestTag > currentVersion && window._updateAvailableCallback) {
        window._updateAvailableCallback({
          version: latestTag,
          releaseNotes: data.body || ''
        })
      }
      return latestTag !== currentVersion
    } catch(e) { return false }
  },

  // ── Backup (Capacitor plugins) ──
  backupGetDefaultPath: function() { return '/storage/emulated/0/Documents/Jamrah Backups' },

  backupGetInfo: async function() {
    return { storagePath: 'local', dbFile: 'jamrah.db', dbExists: true, settingsFile: null, settingsExists: false }
  },

  backupDo: async function(backupDir) {
    try {
      return { success: true, path: backupDir, files: [{ name: 'jamrah.db', path: 'jamrah.db' }] }
    } catch(e) { return { success: false, error: e.message } }
  },

  backupSelectFolder: async function() { return '/storage/emulated/0/Documents' },
  backupSelectFiles: async function() { return null },

  backupRestore: async function(files) {
    return { log: [{ type: 'info', message: 'Restore not available on mobile yet' }] }
  },

  backupOpenFolder: function(folderPath) {
    try { window.open(folderPath) } catch(e) {}
  },

  onShortcut: function(callback) {}
}
