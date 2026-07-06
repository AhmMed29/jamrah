/* mobile-bootstrap.js - Initializes mobile environment
   Runs after desktop JS has loaded. Overrides navigation,
   initializes DB, hooks bottom nav. */

;(async function() {
  // 1. Initialize Capacitor SQLite connection
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorSQLite) {
    try {
      window.sqliteConnection = window.Capacitor.Plugins.CapacitorSQLite
      console.log('[Bootstrap] CapacitorSQLite connected')
    } catch(e) {
      console.warn('[Bootstrap] CapacitorSQLite not available')
    }
  }

  // 2. Initialize database
  if (window.db && window.db.init) {
    try {
      var result = await window.db.init()
      console.log('[DB] initialized:', result)
    } catch(e) {
      console.warn('[DB] init failed:', e)
    }
  }

  // 3. Override page navigation to use bottom nav instead of floating dock
  function showMobilePage(name) {
    var oldShowPage = window.showPage
    if (oldShowPage) oldShowPage(name)

    // Update bottom nav active state
    document.querySelectorAll('#mobile-bottom-nav .nav-btn').forEach(function(btn) {
      var page = btn.getAttribute('data-page')
      if (page === name) {
        btn.classList.remove('text-gray-400')
        btn.classList.add('text-blue-600')
      } else {
        btn.classList.remove('text-blue-600')
        btn.classList.add('text-gray-400')
      }
    })
  }

  // Hook bottom nav buttons
  document.querySelectorAll('#mobile-bottom-nav .nav-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var page = this.getAttribute('data-page')
      showMobilePage(page)
    })
  })

  // Override Electron navigate to use our showMobilePage
  if (window.electronAPI && window.electronAPI.navigate) {
    var origNavigate = window.electronAPI.navigate
    window.electronAPI.navigate = function(page) {
      var name = page.replace('.html', '')
      showMobilePage(name)
    }
  }

  // 4. Show bottom nav after page loads
  var bottomNav = document.getElementById('mobile-bottom-nav')
  if (bottomNav) bottomNav.style.display = 'flex'

  // 5. Hide floating dock (mobile has bottom nav instead)
  var dock = document.getElementById('floating-dock')
  if (dock) dock.style.display = 'none'

  // 6. Check for updates (async, non-blocking)
  if (window.electronAPI && window.electronAPI.checkForUpdates) {
    window.electronAPI.checkForUpdates()
  }

  console.log('[Bootstrap] Mobile environment ready')
})()
