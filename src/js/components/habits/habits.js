var today = new Date();
var dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
function formatDate(d) {
  return String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
}
var startDate = new Date(today.getFullYear(), 0, 1);
var DAY_COUNT = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
function getDateStrings() {
  var arr = [];
  for (var i = 0; i < DAY_COUNT; i++) {
    var d = new Date(today);
    d.setDate(d.getDate() - i);
    arr.push(d);
  }
  return arr;
}
var dates = getDateStrings();
var habitsCache = [];

function dateKey(d) {
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
    console.error('[Habits] DB error:', e);
    return { habits: [], logs: {} };
  }
}

function getChecked(habit, logs, dateStr) {
  if (!logs[habit.id]) return 0;
  return logs[habit.id][dateStr] || 0;
}

function calcPct(habit, logs) {
  var total = 0;
  for (var i = 0; i < DAY_COUNT; i++) {
    var dk = dateKey(dates[i]);
    if (getChecked(habit, logs, dk)) total++;
  }
  return Math.round(total / DAY_COUNT * 100);
}

async function render() {
  var data = await loadHabitsFromDB();
  var habits = data.habits;
  var logs = data.logs;

  var h = '<tr>';
  h += '<th class="sticky-corner min-w-[350px] p-2"></th>';
  h += '<th class="sticky-header px-1 py-4 align-bottom text-gray-300 border-b border-gray-100"></th>';
  dates.forEach(function(d, i) {
    var isToday = i === DAY_COUNT - 1;
    var tc = isToday ? '#2563eb' : '#6b7280';
    h += '<th class="sticky-header min-w-[60px] px-2 py-4 border-b border-gray-100 text-center font-medium text-sm" style="color:' + tc + '"><div>' + formatDate(d) + '</div><div class="mt-1">' + dayNames[d.getDay()] + '</div></th>';
  });
  h += '</tr>';
  document.getElementById('table-head').innerHTML = h;

  var b = '';
  habits.forEach(function(habit) {
    var pct = calcPct(habit, logs);
    var streak = calcStreak(habit, logs);
    b += '<tr style="background:#fff">';
    b += '<th class="sticky-col py-4 px-6 text-right font-normal text-[15px] border-l border-gray-100" data-habit-id="' + habit.id + '" style="cursor:pointer;background:#fff;color:#333">';
    b += '<div class="flex items-center justify-end gap-3">';
    b += '<span style="color:' + habit.color + ';font-weight:500">' + habit.name + '</span>';
    b += '<svg class="-rotate-90 w-[28px] h-[28px]" viewBox="0 0 36 36">';
    b += '<path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" stroke-width="4"></path>';
    b += '<path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="' + habit.color + '" stroke-dasharray="' + pct + ', 100" stroke-linecap="round" stroke-width="4"></path>';
    b += '</svg></div></th>';
    b += '<td class="text-center px-1"></td>';
    for (var i = DAY_COUNT - 1; i >= 0; i--) {
      var dk = dateKey(dates[i]);
      var checked = getChecked(habit, logs, dk);
      b += '<td class="text-center" style="padding:6px 0">';
      if (checked) {
        b += '<div class="habit-toggle checked" style="background-color:' + habit.color + '" data-habit-id="' + habit.id + '" data-date="' + dk + '" data-value="0"><svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg></div>';
      } else {
        b += '<div class="habit-toggle unchecked" style="border-color:' + habit.color + '40" data-habit-id="' + habit.id + '" data-date="' + dk + '" data-value="1"></div>';
      }
      b += '</td>';
    }
    b += '</tr>';
  });
  b += '<tr><td style="height:96px" colspan="' + (DAY_COUNT + 2) + '"></td></tr>';
  document.getElementById('table-body').innerHTML = b;
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

  var checked = 0;
  for (var j = 0; j < DAY_COUNT; j++) {
    var dk = dateKey(dates[j]);
    if (getChecked(habit, logs, dk)) checked++;
  }
  var streak = calcStreak(habit, logs);
  var pct = calcPct(habit, logs);

  var modal = document.getElementById('habit-modal');
  var modalContent = document.getElementById('modal-content');

  var durationLabel = '';
  if (habit.durationType === 'yearly') durationLabel = 'سنوي';
  else if (habit.durationType === '6months') durationLabel = '6 Months';
  else if (habit.durationType === '4months') durationLabel = '4 Months';
  else if (habit.durationType === '3months') durationLabel = '3 Months';
  else if (habit.durationType === 'custom' && habit.durationStart && habit.durationEnd) durationLabel = habit.durationStart + ' → ' + habit.durationEnd;
  else durationLabel = 'سنوي';

  modalContent.innerHTML =
    '<div class="flex items-center gap-3 mb-6">' +
      '<div class="w-4 h-4 rounded-full" style="background:' + habit.color + '"></div>' +
      '<h2 class="text-lg font-bold text-gray-800" style="font-family:\'Tajawal\',sans-serif">' + habit.name + '</h2>' +
    '</div>' +
    '<div class="flex items-center justify-center mb-6">' +
      '<svg class="w-20 h-20 -rotate-90" viewBox="0 0 36 36">' +
        '<path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" stroke-width="3"></path>' +
        '<path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="' + habit.color + '" stroke-dasharray="' + pct + ', 100" stroke-linecap="round" stroke-width="3"></path>' +
      '</svg>' +
    '</div>' +
    '<div class="text-center mb-4"><span class="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1">' + durationLabel + '</span></div>' +
    '<div class="grid grid-cols-3 gap-3 text-center mb-6">' +
      '<div class="bg-gray-50 rounded-xl py-3 px-2"><div class="text-2xl font-bold text-gray-800">' + DAY_COUNT + '</div><div class="text-xs text-gray-500 mt-1">إجمالي الأيام</div></div>' +
      '<div class="bg-gray-50 rounded-xl py-3 px-2"><div class="text-2xl font-bold" style="color:' + habit.color + '">' + checked + '</div><div class="text-xs text-gray-500 mt-1">تم الإنجاز</div></div>' +
      '<div class="bg-gray-50 rounded-xl py-3 px-2"><div class="text-2xl font-bold text-gray-800">' + streak + '</div><div class="text-xs text-gray-500 mt-1">أطول سلسلة</div></div>' +
    '</div>' +
    '<div class="flex gap-3">' +
      '<button class="flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90 edit-habit-btn" style="background:' + habit.color + '" data-id="' + habitId + '">تعديل العادة</button>' +
      '<button class="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border-2 text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700" style="background:#fff" data-id="' + habitId + '">حذف</button>' +
    '</div>';

  modalContent.querySelector('.edit-habit-btn').addEventListener('click', function() {
    modal.classList.remove('open');
    openEditModal(habitId);
  });
  modalContent.querySelector('.delete-habit-btn').addEventListener('click', function() {
    showConfirmModal('حذف العادة', 'هل أنت متأكد من حذف "' + habit.name + '"?', 'حذف', async function() {
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

  function computeEnd(type) {
    var now = new Date();
    var y = now.getFullYear();
    if (type === 'yearly') return y + '-12-31';
    if (type === '6months') return y + '-06-30';
    if (type === '4months') return y + '-04-30';
    if (type === '3months') return y + '-03-31';
    return '';
  }

  var swatches = '';
  for (var i = 0; i < colorPresets.length; i++) {
    var active = colorPresets[i] === selectedColor ? 'ring-2 ring-offset-2 ring-blue-400' : '';
    swatches += '<div class="w-7 h-7 rounded-full cursor-pointer transition-all hover:scale-110 color-swatch ' + active + '" style="background:' + colorPresets[i] + '" data-color="' + colorPresets[i] + '"></div>';
  }

  var typeOptions = [
    { value: 'yearly', label: 'Yearly' },
    { value: '6months', label: '6 Months' },
    { value: '4months', label: '4 Months' },
    { value: '3months', label: '3 Months' },
    { value: 'custom', label: 'Custom' }
  ];
  var typeHtml = '';
  for (var ti = 0; ti < typeOptions.length; ti++) {
    var opt = typeOptions[ti];
    typeHtml += '<option value="' + opt.value + '"' + (selType === opt.value ? ' selected' : '') + '>' + opt.label + '</option>';
  }

  var customHidden = selType !== 'custom' ? ' hidden' : '';
  var startVal = durationStart || '';
  var endVal = durationEnd || (selType !== 'custom' ? computeEnd(selType) : '');

  addContent.innerHTML =
    '<h2 class="text-lg font-bold text-gray-800 mb-5">' + (name ? 'تعديل العادة' : 'إضافة عادة جديدة') + '</h2>' +
    '<label class="block text-sm font-medium text-gray-600 mb-1.5">اسم العادة</label>' +
    '<input id="habit-name-input" type="text" dir="rtl" value="' + name.replace(/"/g, '&quot;') + '" placeholder="مثال: أذكار الصباح" class="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:border-blue-400 focus:ring-0 transition-all outline-none mb-4" style="font-family:\'Tajawal\',sans-serif">' +
    '<label class="block text-sm font-medium text-gray-600 mb-2.5">اللون</label>' +
    '<div class="flex gap-2.5 flex-wrap mb-4" id="color-picker">' + swatches + '</div>' +
    '<label class="block text-sm font-medium text-gray-600 mb-2.5">مدة العادة</label>' +
    '<select id="duration-type" class="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:border-blue-400 focus:ring-0 transition-all outline-none mb-3">' + typeHtml + '</select>' +
    '<div id="custom-duration-fields" class="' + customHidden + '">' +
      '<label class="block text-sm font-medium text-gray-600 mb-1.5">من</label>' +
      '<input id="duration-start-input" type="date" value="' + startVal + '" class="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:border-blue-400 focus:ring-0 transition-all outline-none mb-3">' +
      '<label class="block text-sm font-medium text-gray-600 mb-1.5">إلى</label>' +
      '<input id="duration-end-input" type="date" value="' + endVal + '" class="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:border-blue-400 focus:ring-0 transition-all outline-none mb-3">' +
    '</div>' +
    '<div class="flex gap-3 mt-4">' +
      '<button id="save-habit-btn" class="flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90" style="background:#3b82f6">' + (name ? 'حفظ التعديل' : 'حفظ العادة') + '</button>' +
      '<button id="cancel-add-btn" class="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border-2 text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700" style="background:#fff">إلغاء</button>' +
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
    } else {
      de = computeEnd(dt);
    }
    onSave(n, c, dt, ds, de);
    addModal.classList.remove('open');
  });

  addModal.classList.add('open');
}

window.renderHabits = render;

// Shared confirm popup
var _confirmCb = null;
window.showConfirmModal = function(title, message, confirmLabel, onConfirm) {
  var el = document.getElementById('confirmPopup');
  if (!el) return;
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;
  document.getElementById('confirmBtn').textContent = confirmLabel || 'حذف';
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

// Single delegated click handler (set up once)
document.getElementById('table-body').addEventListener('click', async function(e) {
  var toggle = e.target.closest('.habit-toggle');
  if (toggle) {
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
        this.scrollBy({ left: -e.deltaY });
        e.preventDefault();
      }
    }, { passive: false });
  }

  render();
})();