var _pomoTheme = window.db.getSetting('pomoTheme') || 'ocean';
var _customColors = { c1: null, c2: null, bg: null };

function buildThemeCards() {
  var grid = document.getElementById('pomoThemeGrid');
  if (!grid) return;
  var themeKeys = Object.keys(window.shaderThemes || {});
  if (themeKeys.length === 0) return;
  grid.innerHTML = '';
  themeKeys.forEach(function(key) {
    var t = window.shaderThemes[key];
    var card = document.createElement('div');
    card.className = 'rounded-xl p-3 border-2 cursor-pointer transition-all hover:shadow-md text-center min-h-[80px] flex flex-col items-center justify-center gap-1';
    card.id = 'pomoCard_' + key;
    card.style.background = t.preview[2];
    card.innerHTML = '<div class="flex gap-1.5"><span class="w-4 h-4 rounded-full inline-block" style="background:' + t.preview[0] + '"></span><span class="w-4 h-4 rounded-full inline-block" style="background:' + t.preview[1] + '"></span><span class="w-4 h-4 rounded-full inline-block border border-gray-400" style="background:' + t.preview[2] + '"></span></div><span class="text-xs font-medium" style="color:' + (t.preview[2] === '#000' ? '#ccc' : '#333') + '">' + t.label + '</span>';
    card.onclick = function() { selectPomoTheme(key); };
    grid.appendChild(card);
  });
  document.getElementById('customColor1').value = '#0088CC';
  document.getElementById('customColor2').value = '#4DA8DA';
  document.getElementById('customBgColor').value = '#000000';
}

function selectPomoTheme(id) {
  _pomoTheme = id;
  _customColors = { c1: null, c2: null, bg: null };
  var themeKeys = Object.keys(window.shaderThemes || {});
  themeKeys.forEach(function(key) {
    var card = document.getElementById('pomoCard_' + key);
    if (card) card.className = 'rounded-xl p-3 border-2 cursor-pointer transition-all hover:shadow-md text-center min-h-[80px] flex flex-col items-center justify-center gap-1' + (id === key ? ' border-blue-500 ring-2 ring-blue-300' : ' border-gray-200');
  });
  var t = window.shaderThemes[id];
  if (t) {
    document.getElementById('customColor1').value = t.preview[0];
    document.getElementById('customColor2').value = t.preview[1];
    document.getElementById('customBgColor').value = t.preview[2];
  }
  window.db.setSetting('pomoTheme', id);
  if (window.shaderSetTheme) window.shaderSetTheme(id);
  if (window.updateRingColor) window.updateRingColor();
}

function applyCustomColors() {
  var c1 = document.getElementById('customColor1').value;
  var c2 = document.getElementById('customColor2').value;
  var bg = document.getElementById('customBgColor').value;
  _customColors = { c1: hexToRgb(c1), c2: hexToRgb(c2), bg: hexToRgb(bg) };
  var themeKeys = Object.keys(window.shaderThemes || {});
  themeKeys.forEach(function(key) {
    var card = document.getElementById('pomoCard_' + key);
    if (card) card.className = 'rounded-xl p-3 border-2 border-gray-200 cursor-pointer transition-all hover:shadow-md text-center min-h-[80px] flex flex-col items-center justify-center gap-1';
  });
  window.db.setSetting('pomoTheme', 'custom');
  window.db.setSetting('customColor1', c1);
  window.db.setSetting('customColor2', c2);
  window.db.setSetting('customBgColor', bg);
  if (window.shaderSetColors) window.shaderSetColors(_customColors.c1, _customColors.c2, _customColors.bg);
  if (window.updateRingColor) window.updateRingColor();
}

// sync color pickers with saved custom colors after shader loads
(function(){
  setTimeout(function() {
    var savedTheme = window.db.getSetting('pomoTheme') || 'ocean';
    if (savedTheme === 'custom') {
      var cc1 = window.db.getSetting('customColor1');
      var cc2 = window.db.getSetting('customColor2');
      var cbg = window.db.getSetting('customBgColor');
      if (cc1 && cc2 && cbg) {
        document.getElementById('customColor1').value = cc1;
        document.getElementById('customColor2').value = cc2;
        document.getElementById('customBgColor').value = cbg;
      }
    }
  }, 200);
})();

if (typeof(window.shaderThemes) !== 'undefined') buildThemeCards();
if (_pomoTheme !== 'custom') selectPomoTheme(_pomoTheme);
