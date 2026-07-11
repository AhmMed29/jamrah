var STORAGE = {
  path: null
};

STORAGE.init = async function () {
  STORAGE.path = await window.db.init();
};

STORAGE.getPath = function () { return STORAGE.path; };

STORAGE.setPath = async function (newPath) {
  var result = await window.db.setPath(newPath);
  if (result) STORAGE.path = result;
};

window._dbInitPromise = (async function() {
  try { await STORAGE.init(); } catch(e) {}
})();
