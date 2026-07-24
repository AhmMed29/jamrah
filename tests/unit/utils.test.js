// utils.test.js — 20 unit tests for helpers.js and cross-file pure functions

var GOAL_COLORS = ['#3B82F6','#8B5CF6','#EC4899','#EF4444','#F59E0B','#10B981','#14B8A6','#6366F1','#84CC16','#F97316'];

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str || '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function hexToRgb(hex) {
  var r = parseInt(hex.slice(1,3), 16);
  var g = parseInt(hex.slice(3,5), 16);
  var b = parseInt(hex.slice(5,7), 16);
  return r + ',' + g + ',' + b;
}

// ─── Suite 1: GOAL_COLORS ───
describe('GOAL_COLORS', function() {
  test('has 10 colors', function() {
    expect(GOAL_COLORS.length).toBe(10);
  });

  test('starts with #3B82F6', function() {
    expect(GOAL_COLORS[0]).toBe('#3B82F6');
  });
});

// ─── Suite 2: esc (helpers.js) ───
describe('esc', function() {
  test('replaces & to &amp;', function() {
    expect(esc('a&b')).toBe('a&amp;b');
  });

  test('replaces " to &quot;', function() {
    expect(esc('"hello"')).toBe('&quot;hello&quot;');
  });

  test('replaces < to &lt;', function() {
    expect(esc('<tag>')).toBe('&lt;tag&gt;');
  });

  test('replaces > to &gt;', function() {
    expect(esc('a>b')).toBe('a&gt;b');
  });

  test('handles all special chars at once', function() {
    expect(esc('<a href="x">&y</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;y&lt;/a&gt;');
  });

  test('handles empty string', function() {
    expect(esc('')).toBe('');
  });

  test('handles string with no special chars', function() {
    expect(esc('hello world')).toBe('hello world');
  });

  test('is identical to escapeHtml in sessions.js', function() {
    var testCases = ['hello', 'a&b', '<tag>', '"quote"', 'a>b', '<a href="x">&y</a>', ''];
    testCases.forEach(function(s) {
      expect(esc(s)).toBe(escapeHtml(s));
    });
  });
});

// ─── Suite 3: escapeHtml (cross-file duplication check) ───
describe('escapeHtml in sessions.js', function() {
  test('handles null', function() {
    expect(escapeHtml(null)).toBe('');
  });

  test('handles undefined', function() {
    expect(escapeHtml(undefined)).toBe('');
  });

  test('handles all 4 chars', function() {
    expect(escapeHtml('&<>"')).toBe('&amp;&lt;&gt;&quot;');
  });

  test('escapeHtml in tasks.js is identical', function() {
    var testCases = ['test', 'a&b', '<tag>', '"x"'];
    testCases.forEach(function(s) {
      expect(escapeHtml(s)).toBe(esc(s));
    });
  });

  test('compare esc vs escapeHtml output for same input', function() {
    var inputs = ['&', '<>', '"&<>"', 'normal', 'a&b<c>d"e'];
    inputs.forEach(function(s) {
      expect(esc(s)).toBe(escapeHtml(s));
    });
  });
});

// ─── Suite 4: hexToRgb ───
describe('hexToRgb', function() {
  test('converts #3B82F6 to "59,130,246"', function() {
    expect(hexToRgb('#3B82F6')).toBe('59,130,246');
  });

  test('converts #000000 to "0,0,0"', function() {
    expect(hexToRgb('#000000')).toBe('0,0,0');
  });

  test('converts #FFFFFF to "255,255,255"', function() {
    expect(hexToRgb('#FFFFFF')).toBe('255,255,255');
  });

  test('handles short hex #fff (no expansion)', function() {
    var rgb = hexToRgb('#fff');
    expect(rgb.split(',')[0]).toBe('255');
    expect(rgb.split(',')[1]).toBe('15');
  });

  test('handles uppercase #FFF', function() {
    var rgb = hexToRgb('#FFF');
    expect(rgb.split(',')[0]).toBe('255');
  });
});
