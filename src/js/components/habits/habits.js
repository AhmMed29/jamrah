var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var CAL_MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function formatDate(d) {
  return String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
}
var today, startDate, DAY_COUNT, dates;
var _habitsMonthOffset = 0;

function refreshDateGlobals() {
  today = new Date();
  today.setHours(0,0,0,0);
  DAY_COUNT = 365;
  dates = [];
  for (var i = 0; i < DAY_COUNT; i++) {
    var d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d);
  }
  startDate = dates[dates.length - 1];
}
refreshDateGlobals();
var habitsCache = [];

function habitsMonthDate() {
  var d = new Date(today);
  d.setMonth(d.getMonth() + _habitsMonthOffset);
  return d;
}

window.habitsPrevMonth = function() {
  _habitsMonthOffset--;
  render();
};

window.habitsNextMonth = function() {
  if (_habitsMonthOffset < 0) _habitsMonthOffset++;
  render();
};

function dateKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function localDateString(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function todayKey() {
  return dateKey(today);
}

function startDateKey() {
  return dateKey(startDate);
}

async function loadHabitsFromDB() {
  try {
    var habits = await window.db.getHabits() || [];
    habitsCache = habits;
    var allLogs = {};
    for (var h = 0; h < habits.length; h++) {
      var habitLogs = await window.db.getHabitLogs(habits[h].id, startDateKey(), todayKey()) || [];
      allLogs[habits[h].id] = {};
      for (var l = 0; l < habitLogs.length; l++) {
        allLogs[habits[h].id][habitLogs[l].date] = habitLogs[l].value;
      }
    }
    return { habits: habits, logs: allLogs };
  } catch (e) {
    return { habits: [], logs: {} };
  }
}

function getChecked(habit, logs, dateStr) {
  if (!logs[habit.id]) return 0;
  return logs[habit.id][dateStr] || 0;
}

var DURATION_DAYS = {
  daily: Infinity,
  '3months': 90,
  '4months': 120,
  '6months': 180,
  yearly: 365
};

function getHabitTotalDays(habit) {
  if (habit.durationType === 'daily') return Infinity;
  if (habit.durationType && DURATION_DAYS[habit.durationType]) return DURATION_DAYS[habit.durationType];
  if (habit.durationType === 'custom' && habit.durationStart && habit.durationEnd) {
    var s = new Date(habit.durationStart + 'T00:00:00');
    var e = new Date(habit.durationEnd + 'T00:00:00');
    return Math.max(1, Math.floor((e - s) / 86400000) + 1);
  }
  return DAY_COUNT;
}

function getCheckedCount(habit, logs) {
  var startStr = habit.durationStart || startDateKey();
  var endStr = habit.durationEnd || todayKey();
  var total = 0;
  for (var i = 0; i < DAY_COUNT; i++) {
    var dk = dateKey(dates[i]);
    if (dk < startStr) break;
    if (dk > endStr) continue;
    if (getChecked(habit, logs, dk)) total++;
  }
  return total;
}

function calcPct(habit, logs) {
  var totalDays = getHabitTotalDays(habit);
  if (totalDays === Infinity) {
    totalDays = Math.min(DAY_COUNT, 365);
    var checked = 0;
    for (var i = 0; i < totalDays; i++) {
      if (getChecked(habit, logs, dateKey(dates[i]))) checked++;
    }
    return Math.round(checked / totalDays * 100);
  }
  var checked = getCheckedCount(habit, logs);
  return Math.round(checked / totalDays * 100);
}

async function render() {
  refreshDateGlobals();
  var data = await loadHabitsFromDB();
  var habits = data.habits;
  var logs = data.logs;

  var monthDate = habitsMonthDate();
  var displayYear = monthDate.getFullYear();
  var displayMonth = monthDate.getMonth();
  var daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
  var displayDates = [];
  for (var di = 1; di <= daysInMonth; di++) {
    var dt = new Date(displayYear, displayMonth, di);
    displayDates.push(dt);
  }

  var monthName = CAL_MONTH_NAMES[displayMonth];
  var h = '<tr><th colspan="' + (displayDates.length + 2) + '" style="padding:6px 0 8px 0">';
  h += '<div style="display:flex;align-items:center;justify-content:center;gap:16px;font-size:14px;font-weight:600;color:#333">';
  h += '<button onclick="habitsPrevMonth()" style="background:none;border:none;cursor:pointer;font-size:18px;color:#6b7280;padding:2px 8px">&#9664;</button>';
  h += '<span>' + monthName + ' ' + displayYear + '</span>';
  h += '<button onclick="habitsNextMonth()" style="background:none;border:none;cursor:pointer;font-size:18px;color:' + (_habitsMonthOffset < 0 ? '#6b7280' : '#d1d5db') + ';padding:2px 8px"' + (_habitsMonthOffset >= 0 ? 'disabled' : '') + '>&#9654;</button>';
  h += '</div></th></tr>';
  h += '<tr>';
  for (var i = 0; i < displayDates.length; i++) {
    var d = displayDates[i];
    var isToday = dateKey(d) === todayKey();
    var tc = isToday ? '#2563eb' : '#6b7280';
    h += '<th class="sticky-header min-w-[60px] px-2 py-4 border-b border-gray-100 text-center font-medium text-sm" style="color:' + tc + '"><div style="line-height:1.2"><div>' + d.getDate() + '</div><div style="font-size:0.7em;opacity:0.65">' + dayNames[d.getDay()] + '</div></div></th>';
  }
  h += '<th class="sticky-header px-1 py-4 align-bottom text-gray-300 border-b border-gray-100"></th>';
  h += '<th class="sticky-corner min-w-[350px] p-2"></th>';
  h += '</tr>';
  document.getElementById('table-head').innerHTML = h;

  var activeHabits = [];
  var doneHabits = [];
  habits.forEach(function(habit) {
    var totalDays = getHabitTotalDays(habit);
    if (totalDays === Infinity) {
      activeHabits.push(habit);
      return;
    }
    var checked = getCheckedCount(habit, logs);
    if (checked >= totalDays) {
      doneHabits.push(habit);
    } else {
      activeHabits.push(habit);
    }
  });

  var b = '';
  activeHabits.forEach(function(habit) {
    var pct = calcPct(habit, logs);
    var streak = calcStreak(habit, logs);
    b += '<tr style="background:var(--bg-card)">';
    for (var i = 0; i < displayDates.length; i++) {
      var dk = dateKey(displayDates[i]);
      var cv = getChecked(habit, logs, dk);
      b += '<td class="text-center" style="padding:6px 0">';
      if (cv) {
        b += '<div class="habit-toggle checked" style="background-color:' + habit.color + '" data-habit-id="' + habit.id + '" data-date="' + dk + '" data-value="0"><svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg></div>';
      } else {
        b += '<div class="habit-toggle unchecked" style="border-color:' + habit.color + '40" data-habit-id="' + habit.id + '" data-date="' + dk + '" data-value="1"></div>';
      }
      b += '</td>';
    }
    b += '<td class="text-center px-1"></td>';
    b += '<th class="sticky-col py-4 px-6 text-right font-normal text-[15px] border-l border-gray-100" data-habit-id="' + habit.id + '" style="cursor:pointer;background:var(--bg-card);color:#333">';
    b += '<div class="flex items-center justify-end gap-3">';
    b += '<span style="color:' + habit.color + ';font-weight:500">' + habit.name + '</span>';
    b += '<svg class="-rotate-90 w-[28px] h-[28px]" viewBox="0 0 36 36">';
    b += '<path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" stroke-width="4"></path>';
    b += '<path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="' + habit.color + '" stroke-dasharray="' + pct + ', 100" stroke-linecap="round" stroke-width="4"></path>';
    b += '</svg></div></th>';
    b += '</tr>';
  });
  b += '<tr><td style="height:48px" colspan="' + (displayDates.length + 2) + '"></td></tr>';
  document.getElementById('table-body').innerHTML = b;

  var doneEl = document.getElementById('done-section');
  if (!doneEl) {
    doneEl = document.createElement('div');
    doneEl.id = 'done-section';
    document.getElementById('main-scroll').appendChild(doneEl);
  }
  if (doneHabits.length > 0) {
    var dd = '<div class="done-header px-6 py-3 bg-gray-50 border-t border-gray-200"><span class="text-sm font-semibold text-gray-500 uppercase tracking-wider">Done (' + doneHabits.length + ')</span></div>';
    dd += '<table class="border-collapse" style="min-width:100%"><tbody>';
    doneHabits.forEach(function(habit) {
      var pct = calcPct(habit, logs);
      dd += '<tr style="background:#fafafa;opacity:0.6">';
      for (var i = 0; i < displayDates.length; i++) {
        var dk = dateKey(displayDates[i]);
        var cv = getChecked(habit, logs, dk);
        dd += '<td class="text-center" style="padding:6px 0">';
        if (cv) {
          dd += '<div class="habit-toggle done" style="background-color:' + habit.color + '80;cursor:default" data-habit-id="' + habit.id + '" data-date="' + dk + '"><svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg></div>';
        } else {
          dd += '<div class="habit-toggle done" style="border-color:' + habit.color + '20;cursor:default" data-habit-id="' + habit.id + '" data-date="' + dk + '"></div>';
        }
        dd += '</td>';
      }
      dd += '<td class="text-center px-1"></td>';
      dd += '<th class="sticky-col py-4 px-6 text-right font-normal text-[15px] border-l border-gray-100 min-w-[350px]" style="background:#fafafa;color:#999">';
      dd += '<div class="flex items-center justify-end gap-3">';
      dd += '<span style="color:' + habit.color + ';font-weight:500">' + habit.name + '</span>';
      dd += '<svg class="-rotate-90 w-[28px] h-[28px]" viewBox="0 0 36 36">';
      dd += '<path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" stroke-width="4"></path>';
      dd += '<path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="' + habit.color + '" stroke-dasharray="' + pct + ', 100" stroke-linecap="round" stroke-width="4"></path>';
      dd += '</svg></div></th>';
      dd += '</tr>';
    });
    dd += '</tbody></table>';
    doneEl.innerHTML = dd;
    doneEl.style.display = '';
  } else {
    doneEl.style.display = 'none';
  }

  var sc = document.getElementById('main-scroll');
  if (sc) {
    requestAnimationFrame(function() {
      if (_habitsMonthOffset === 0) {
        var todayTh = document.getElementById('table-head').querySelector('.sticky-header');
        if (todayTh) {
          var ths = document.getElementById('table-head').querySelectorAll('th.sticky-header');
          for (var ti = 0; ti < ths.length; ti++) {
            var cellDate = displayDates[ti];
            if (cellDate && dateKey(cellDate) === todayKey()) {
              sc.scrollLeft = ths[ti].offsetLeft - 20;
              break;
            }
          }
        }
      } else {
        sc.scrollLeft = 0;
      }
    });
  }
}

function calcStreak(habit, logs) {
  var max = 0, cur = 0;
  for (var i = 0; i < DAY_COUNT; i++) {
    var dk = dateKey(dates[i]);
    if (getChecked(habit, logs, dk)) {
      cur++;
      if (cur > max) max = cur;
    } else {
      cur = 0;
    }
  }
  return max;
}

async function openModal(habitId) {
  var data = await loadHabitsFromDB();
  var habit = null;
  for (var i = 0; i < data.habits.length; i++) {
    if (data.habits[i].id === habitId) { habit = data.habits[i]; break; }
  }
  if (!habit) return;
  var logs = data.logs;

  var checked = getCheckedCount(habit, logs);
  var streak = calcStreak(habit, logs);
  var pct = calcPct(habit, logs);
  var totalDays = getHabitTotalDays(habit);

  var modal = document.getElementById('habit-modal');
  var modalContent = document.getElementById('modal-content');

  var durationLabel = '';
  if (habit.durationType === 'daily') durationLabel = 'يومي';
  else if (habit.durationType === 'yearly') durationLabel = 'سنوي';
  else if (habit.durationType === '6months') durationLabel = '6 أشهر';
  else if (habit.durationType === '4months') durationLabel = '4 أشهر';
  else if (habit.durationType === '3months') durationLabel = '3 أشهر';
  else if (habit.durationType === 'custom' && habit.durationStart && habit.durationEnd) durationLabel = habit.durationStart + ' → ' + habit.durationEnd;
  else durationLabel = 'سنوي';

  var totalDaysDisplay = totalDays === Infinity ? '∞' : totalDays;
  var remainingDisplay = totalDays === Infinity ? '∞' : Math.max(0, totalDays - checked);

  modalContent.innerHTML =
    '<div class="flex items-center gap-3 mb-6">' +
      '<div class="w-4 h-4 rounded-full" style="background:' + habit.color + '"></div>' +
      '<h2 class="text-lg font-bold text-gray-800">' + habit.name + '</h2>' +
    '</div>' +
    '<div class="flex items-center justify-center mb-6">' +
      '<svg class="w-20 h-20 -rotate-90" viewBox="0 0 36 36">' +
        '<path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" stroke-width="3"></path>' +
        '<path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="' + habit.color + '" stroke-dasharray="' + pct + ', 100" stroke-linecap="round" stroke-width="3"></path>' +
      '</svg>' +
    '</div>' +
    '<div class="text-center mb-4"><span class="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1">' + durationLabel + '</span></div>' +
    '<div class="grid grid-cols-4 gap-3 text-center mb-6">' +
      '<div class="bg-gray-50 rounded-xl py-3 px-2"><div class="text-2xl font-bold text-gray-800">' + totalDaysDisplay + '</div><div class="text-xs text-gray-500 mt-1">Total Days</div></div>' +
      '<div class="bg-gray-50 rounded-xl py-3 px-2"><div class="text-2xl font-bold" style="color:' + habit.color + '">' + checked + '</div><div class="text-xs text-gray-500 mt-1">Done</div></div>' +
      '<div class="bg-gray-50 rounded-xl py-3 px-2"><div class="text-2xl font-bold text-gray-800">' + remainingDisplay + '</div><div class="text-xs text-gray-500 mt-1">Remaining</div></div>' +
      '<div class="bg-gray-50 rounded-xl py-3 px-2"><div class="text-2xl font-bold text-gray-800">' + streak + '</div><div class="text-xs text-gray-500 mt-1">Best Streak</div></div>' +
    '</div>' +
    '<div class="flex gap-3">' +
      '<button class="flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90 edit-habit-btn" style="background:' + habit.color + '" data-id="' + habitId + '">Edit Habit</button>' +
      '<button class="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border-2 text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700 delete-habit-btn" style="background:var(--bg-card)" data-id="' + habitId + '">Delete</button>' +
    '</div>';

  modalContent.querySelector('.edit-habit-btn').addEventListener('click', function() {
    modal.classList.remove('open');
    openEditModal(habitId);
  });
  modalContent.querySelector('.delete-habit-btn').addEventListener('click', function() {
    showConfirmModal('Delete Habit', 'Are you sure you want to delete "' + habit.name + '"?', 'Delete', async function() {
      await window.db.deleteHabit(habitId);
      modal.classList.remove('open');
      await render();
    });
  });
  modal.classList.add('open');
}

var colorPresets = ['#f59e0b','#8b5cf6','#3b82f6','#22c55e','#06b6d4','#f43f5e','#6366f1','#ec4899','#f97316','#a855f7'];

async function openEditModal(habitId) {
  var data = await loadHabitsFromDB();
  var habit = null;
  for (var i = 0; i < data.habits.length; i++) {
    if (data.habits[i].id === habitId) { habit = data.habits[i]; break; }
  }
  if (!habit) return;
  showHabitForm(habit.name, habit.color, async function(name, color, durationType, durationStart, durationEnd) {
    await window.db.updateHabit(habitId, { name: name, color: color, durationType: durationType, durationStart: durationStart, durationEnd: durationEnd });
    await render();
  }, habit.durationType, habit.durationStart, habit.durationEnd);
}

function openAddModal() {
  showHabitForm('', '#3b82f6', async function(name, color, durationType, durationStart, durationEnd) {
    await window.db.createHabit({ id: 'h_' + Date.now(), name: name, color: color, durationType: durationType, durationStart: durationStart, durationEnd: durationEnd });
    await render();
  });
}

function showHabitForm(name, color, onSave, durationType, durationStart, durationEnd) {
  var addModal = document.getElementById('add-modal');
  var addContent = document.getElementById('add-modal-content');
  var selectedColor = color;
  var selType = durationType || 'yearly';

  function computeEnd(startDateStr, type) {
    if (type === 'daily') return null;
    var s = startDateStr ? new Date(startDateStr + 'T00:00:00') : new Date();
    var days = DURATION_DAYS[type];
    if (!days) return '';
    var e = new Date(s);
    e.setDate(e.getDate() + days - 1);
    return e.getFullYear() + '-' + String(e.getMonth() + 1).padStart(2, '0') + '-' + String(e.getDate()).padStart(2, '0');
  }

  var swatches = '';
  for (var i = 0; i < colorPresets.length; i++) {
    var active = colorPresets[i] === selectedColor ? 'ring-2 ring-offset-2 ring-blue-400' : '';
    swatches += '<div class="w-7 h-7 rounded-full cursor-pointer transition-all hover:scale-110 color-swatch ' + active + '" style="background:' + colorPresets[i] + '" data-color="' + colorPresets[i] + '"></div>';
  }

  var typeOptions = [
    { value: 'daily', label: 'يومي' },
    { value: 'yearly', label: 'سنوي' },
    { value: '6months', label: '6 أشهر' },
    { value: '4months', label: '4 أشهر' },
    { value: '3months', label: '3 أشهر' },
    { value: 'custom', label: 'مخصص' }
  ];
  var typeHtml = '';
  for (var ti = 0; ti < typeOptions.length; ti++) {
    var opt = typeOptions[ti];
    typeHtml += '<option value="' + opt.value + '"' + (selType === opt.value ? ' selected' : '') + '>' + opt.label + '</option>';
  }

  var customHidden = selType !== 'custom' ? ' hidden' : '';
  var startVal = durationStart || '';
  var endVal = durationEnd || '';

  addContent.innerHTML =
    '<h2 class="text-lg font-bold text-gray-800 mb-5">' + (name ? 'Edit Habit' : 'Add New Habit') + '</h2>' +
    '<label class="block text-sm font-medium text-gray-600 mb-1.5">Habit Name</label>' +
    '<input id="habit-name-input" type="text" value="' + name.replace(/"/g, '&quot;') + '" placeholder="e.g. Morning exercise" class="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:border-blue-400 focus:ring-0 transition-all outline-none mb-4">' +
    '<label class="block text-sm font-medium text-gray-600 mb-2.5">Color</label>' +
    '<div class="flex gap-2.5 flex-wrap mb-4" id="color-picker">' + swatches + '</div>' +
    '<label class="block text-sm font-medium text-gray-600 mb-2.5">Duration</label>' +
    '<select id="duration-type" class="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:border-blue-400 focus:ring-0 transition-all outline-none mb-3">' + typeHtml + '</select>' +
    '<div id="custom-duration-fields" class="' + customHidden + '">' +
      '<label class="block text-sm font-medium text-gray-600 mb-1.5">From</label>' +
      '<input id="duration-start-input" type="date" value="' + startVal + '" class="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:border-blue-400 focus:ring-0 transition-all outline-none mb-3">' +
      '<label class="block text-sm font-medium text-gray-600 mb-1.5">To</label>' +
      '<input id="duration-end-input" type="date" value="' + endVal + '" class="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:border-blue-400 focus:ring-0 transition-all outline-none mb-3">' +
    '</div>' +
    '<div class="flex gap-3 mt-4">' +
      '<button id="save-habit-btn" class="flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90" style="background:#3b82f6">' + (name ? 'Save Changes' : 'Save Habit') + '</button>' +
      '<button id="cancel-add-btn" class="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border-2 text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700" style="background:var(--bg-card)">Cancel</button>' +
    '</div>';

  addContent.querySelectorAll('.color-swatch').forEach(function(el) {
    el.addEventListener('click', function() {
      addContent.querySelectorAll('.color-swatch').forEach(function(s) { s.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-400'); });
      this.classList.add('ring-2', 'ring-offset-2', 'ring-blue-400');
      selectedColor = this.getAttribute('data-color');
    });
  });

  addContent.querySelector('#duration-type').addEventListener('change', function() {
    var fields = document.getElementById('custom-duration-fields');
    if (this.value === 'custom') {
      fields.classList.remove('hidden');
    } else {
      fields.classList.add('hidden');
    }
  });

  addContent.querySelector('#cancel-add-btn').addEventListener('click', function() { addModal.classList.remove('open'); });
  addContent.querySelector('#save-habit-btn').addEventListener('click', function() {
    var n = addContent.querySelector('#habit-name-input').value.trim();
    if (!n) { addContent.querySelector('#habit-name-input').focus(); return; }
    var c = addContent.querySelector('.color-swatch.ring-2')?.getAttribute('data-color') || '#3b82f6';
    var dt = addContent.querySelector('#duration-type').value;
    var ds = null, de = null;
    if (dt === 'custom') {
      ds = addContent.querySelector('#duration-start-input').value || null;
      de = addContent.querySelector('#duration-end-input').value || null;
    } else if (dt === 'daily') {
      ds = durationStart || localDateString(new Date());
      de = null;
    } else {
      ds = durationStart || localDateString(new Date());
      de = computeEnd(ds, dt);
    }
    onSave(n, c, dt, ds, de);
    addModal.classList.remove('open');
  });

  addModal.classList.add('open');
}

window.renderHabits = render;

var _confirmCb = null;
window.showConfirmModal = function(title, message, confirmLabel, onConfirm) {
  var el = document.getElementById('confirmPopup');
  if (!el) return;
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;
  document.getElementById('confirmBtn').textContent = confirmLabel || 'Confirm';
  _confirmCb = onConfirm;
  el.classList.remove('hidden');
};
window.closeConfirmPopup = function(e) {
  if (e && e.target !== e.currentTarget) return;
  var el = document.getElementById('confirmPopup');
  if (el) el.classList.add('hidden');
  _confirmCb = null;
};
window.cancelConfirm = function() {
  var el = document.getElementById('confirmPopup');
  if (el) el.classList.add('hidden');
  _confirmCb = null;
};
window.confirmConfirm = function() {
  var el = document.getElementById('confirmPopup');
  if (el) el.classList.add('hidden');
  if (_confirmCb) _confirmCb();
  _confirmCb = null;
};

document.getElementById('table-body').addEventListener('click', async function(e) {
  var toggle = e.target.closest('.habit-toggle');
  if (toggle) {
    if (toggle.classList.contains('done')) return;
    var habitId = toggle.getAttribute('data-habit-id');
    var date = toggle.getAttribute('data-date');
    var value = parseInt(toggle.getAttribute('data-value'));
    if (habitId && date) {
      if (window.AudioManager) window.AudioManager.playSound(value === 1 ? 'checkbox-check.mp3' : 'checkbox-uncheck.mp3');
      await window.db.setHabitLog(habitId, date, value);
      await render();
    }
    return;
  }
  var th = e.target.closest('th[data-habit-id]');
  if (th) {
    openModal(th.getAttribute('data-habit-id'));
  }
});

(function() {
  var modal = document.getElementById('habit-modal');
  var modalClose = document.getElementById('modal-close');
  if (modalClose) modalClose.addEventListener('click', function() { modal.classList.remove('open'); });
  if (modal) modal.addEventListener('click', function(e) { if (e.target === modal) modal.classList.remove('open'); });

  var addModal = document.getElementById('add-modal');
  var addClose = document.getElementById('add-modal-close');
  if (addClose) addClose.addEventListener('click', function() { addModal.classList.remove('open'); });
  if (addModal) addModal.addEventListener('click', function(e) { if (e.target === addModal) addModal.classList.remove('open'); });

  document.getElementById('add-habit-btn').addEventListener('click', openAddModal);

  var sc = document.getElementById('main-scroll');
  if (sc) {
    sc.addEventListener('wheel', function(e) {
      if (e.target.closest('thead')) {
        this.scrollBy({ left: e.deltaY });
        e.preventDefault();
      }
    }, { passive: false });
  }

  render();
})();
