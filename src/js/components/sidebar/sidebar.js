/* ══════════════════════════════════════
   App Sidebar — simplified & page preferences
   ══════════════════════════════════════ */

var _sidebarOpen = false;

/* ── Sidebar Toggle ── */
window.toggleAppSidebar = function() {
  _sidebarOpen = !_sidebarOpen;
  var sidebar = document.getElementById('appSidebar');
  var backdrop = document.getElementById('appSidebarBackdrop');
  var btn = document.getElementById('sidebarToggleBtn');
  if (sidebar) sidebar.classList.toggle('open', _sidebarOpen);
  if (backdrop) backdrop.classList.toggle('open', _sidebarOpen);
  if (btn) {
    btn.classList.toggle('open', _sidebarOpen);
  }
  
  var cb = document.getElementById('sidebarCheckbox');
  if (cb) cb.checked = _sidebarOpen;
};

/* ── Sidebar Navigation ── */
window.appSidebarNavigate = function(page) {
  // Navigation does NOT auto-close the sidebar anymore
  if (typeof showPage === 'function') {
    showPage(page);
    if (window.AudioManager && window.AudioManager.playSound) {
      window.AudioManager.playSound('tab-swipping.mp3');
    }
  }
};

/* ── Update active state based on current page ── */
window.updateAppSidebarActive = function(page) {
  var items = document.querySelectorAll('.app-sidebar-menu-item');
  items.forEach(function(item) {
    item.classList.toggle('active', item.dataset.page === page);
  });
};

/* ── Page Placement Preference Logic ── */
window.savePagePrefs = function(prefs) {
  localStorage.setItem('pagePrefs', JSON.stringify(prefs));
  window.applyPagePrefs();
};

window.getPagePrefs = function() {
  var prefsStr = localStorage.getItem('pagePrefs');
  var prefs = {};
  try {
    if (prefsStr) prefs = JSON.parse(prefsStr);
  } catch(e) {}
  var pages = ['pomodoro', 'tasks', 'calender', 'habits', 'stats', 'settings'];
  pages.forEach(function(p) {
    if (!prefs[p]) prefs[p] = 'sidebar';
  });
  return prefs;
};

  window.applyPagePrefs = function() {
    var prefs = window.getPagePrefs();
    var pages = ['pomodoro', 'tasks', 'calender', 'habits', 'stats', 'settings'];
    pages.forEach(function(p) {
      var val = prefs[p] || 'both';
      var showInDock = (val === 'both' || val === 'dock');
      var showInSidebar = (val === 'both' || val === 'sidebar');
      
      // Enforce settings to always be visible in the sidebar
      if (p === 'settings') {
        showInSidebar = true;
      }
      
      // Find in Dock
      var dockItem = document.querySelector('#navDock .dock-item[data-page="' + p + '"]');
      if (dockItem) {
        dockItem.style.display = showInDock ? '' : 'none';
      }
      
      // Find in Sidebar
      var sidebarItem = document.querySelector('#appSidebar .app-sidebar-menu-item[data-page="' + p + '"]');
      if (sidebarItem) {
        sidebarItem.style.display = showInSidebar ? '' : 'none';
      }
    });

    var glassContainer = document.querySelector('.floating-menu-glass');
    if (glassContainer) {
      var dockItems = document.querySelectorAll('#navDock .dock-item');
      var anyVisible = false;
      dockItems.forEach(function(item) {
        if (item.style.display !== 'none') anyVisible = true;
      });
      glassContainer.style.display = anyVisible ? '' : 'none';
    }
  };

// Initialize preferences on load
(function() {
  window.applyPagePrefs();
})();
