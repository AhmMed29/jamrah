/* mobile-bootstrap.js - Initializes mobile environment
   Runs after desktop JS has loaded. Patches showPage for bottom nav,
   initializes DB, hides floating dock. */

;(async function() {
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorSQLite) {
    try {
      window.sqliteConnection = window.Capacitor.Plugins.CapacitorSQLite
    } catch(e) {}
  }

  if (window.db && window.db.init) {
    try {
      await window.db.init()
    } catch(e) {}
  }

  // Patch window.showPage to also update bottom nav active state
  var _origShowPage = window.showPage
  window.showPage = async function(name) {
    await _origShowPage(name)
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
      window.showPage(this.getAttribute('data-page'))
    })
  })

  // Show bottom nav
  var bottomNav = document.getElementById('mobile-bottom-nav')
  if (bottomNav) bottomNav.style.display = 'flex'

  // Hide floating dock
  var dock = document.getElementById('floating-dock')
  if (dock) dock.style.display = 'none'
})()
