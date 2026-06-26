var GOAL_COLORS = ['#3B82F6','#8B5CF6','#EC4899','#EF4444','#F59E0B','#10B981','#14B8A6','#6366F1','#84CC16','#F97316'];

function hexToRgb(h) {
  var r = parseInt(h.slice(1,3), 16) / 255;
  var g = parseInt(h.slice(3,5), 16) / 255;
  var b = parseInt(h.slice(5,7), 16) / 255;
  return [r, g, b];
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
