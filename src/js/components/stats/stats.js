/* ── Stats Dashboard ── */

function todayISO() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

var widgetOrder = ['overview', 'focus', 'goals', 'tasks', 'habits', 'heatmap'];
var dragSrcEl = null;

window.renderStats = async function() {
  var grid = document.getElementById('statsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  // Load saved order
  var saved = localStorage.getItem('statsWidgetOrder');
  if (saved) {
    try { widgetOrder = JSON.parse(saved); } catch(e) {}
  }

  // Load data
  var sessions, goals, tasks, habits;
  try {
    var groupedResult = await window.db.getSessionsGrouped();
    var grouped = groupedResult || {};
    sessions = [];
    for (var dateKey in grouped) {
      if (grouped.hasOwnProperty(dateKey)) {
        sessions = sessions.concat(grouped[dateKey]);
      }
    }
    var results = await Promise.all([
      window.db.getGoals(),
      window.db.getTasks(),
      window.db.getHabits ? window.db.getHabits() : Promise.resolve([])
    ]);
    goals = results[0] || [];
    tasks = results[1] || [];
    habits = results[2] || [];

    // Compute habit completion data from logs
    if (habits.length > 0 && window.db.getHabitLogs) {
      var habitLogPromises = habits.map(function(h) {
        var start = h.durationStart || (new Date().getFullYear() + '-01-01');
        var end = h.durationEnd || todayISO();
        return window.db.getHabitLogs(h.id, start, end).then(function(logs) {
          var completedDays = logs ? logs.filter(function(l) { return l.value > 0; }).length : 0;
          var totalDays = logs ? logs.length : 0;
          var completedDates = logs ? logs.filter(function(l) { return l.value > 0; }).map(function(l) { return l.date; }) : [];
          h.completedDays = completedDays;
          h.totalDays = Math.max(totalDays, 1);
          h.completedDates = completedDates;
        });
      });
      await Promise.all(habitLogPromises);
    }
  } catch(e) {
    grid.innerHTML = '<div class="stats-empty">فشل تحميل البيانات</div>';
    return;
  }

  var now = new Date();
  var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Calculate focus minutes
  var allFocusMs = 0, todayFocusMs = 0, weekFocusMs = 0, monthFocusMs = 0;
  for (var si = 0; si < sessions.length; si++) {
    var s = sessions[si];
    var ms = s.accumulatedMs || 0;
    var start = new Date(s.startTime);
    allFocusMs += ms;
    if (start >= todayStart) todayFocusMs += ms;
    if (start >= weekStart) weekFocusMs += ms;
    if (start >= monthStart) monthFocusMs += ms;
  }

  function fmt(ms) {
    var hours = Math.floor(ms / 3600000);
    var mins = Math.round((ms % 3600000) / 60000);
    if (hours > 0) return hours + 'h ' + mins + 'm';
    return mins + 'm';
  }

  var widgets = {};
  widgets['overview'] = createOverviewWidget(fmt(allFocusMs), fmt(todayFocusMs), fmt(weekFocusMs), fmt(monthFocusMs));
  widgets['focus'] = createFocusWidget(sessions, now);
  widgets['goals'] = createGoalsWidget(goals, tasks);
  widgets['tasks'] = createTasksWidget(tasks, todayStart, weekStart, monthStart);
  widgets['habits'] = createHabitsWidget(habits);
  widgets['heatmap'] = createHeatmapWidget(sessions, habits, now);

  for (var wi = 0; wi < widgetOrder.length; wi++) {
    var w = widgets[widgetOrder[wi]];
    if (w) grid.appendChild(w);
  }
};

function createWidget(title, id) {
  var div = document.createElement('div');
  div.className = 'stats-widget';
  div.dataset.widgetId = id;
  div.draggable = true;

  var header = document.createElement('div');
  header.className = 'stats-widget-header';

  var titleEl = document.createElement('span');
  titleEl.className = 'stats-widget-title';
  titleEl.textContent = title;

  var dots = document.createElement('div');
  dots.className = 'stats-widget-dots';
  var dotHtml = '';
  for (var di = 0; di < 6; di++) dotHtml += '<span class="stats-widget-dot"></span>';
  dots.innerHTML = dotHtml;

  header.appendChild(titleEl);
  header.appendChild(dots);
  div.appendChild(header);

  // Drag events
  div.addEventListener('dragstart', handleDragStart);
  div.addEventListener('dragenter', handleDragEnter);
  div.addEventListener('dragleave', handleDragLeave);
  div.addEventListener('dragover', handleDragOver);
  div.addEventListener('drop', handleDrop);
  div.addEventListener('dragend', handleDragEnd);

  return div;
}

function createOverviewWidget(allTime, today, week, month) {
  var w = createWidget('نظرة عامة', 'overview');
  var body = document.createElement('div');
  body.className = 'stats-overview';
  body.innerHTML =
    '<div class="stats-ov-item"><div class="stats-ov-value">' + allTime + '</div><div class="stats-ov-label">الكل</div></div>' +
    '<div class="stats-ov-item"><div class="stats-ov-value">' + today + '</div><div class="stats-ov-label">اليوم</div></div>' +
    '<div class="stats-ov-item"><div class="stats-ov-value">' + week + '</div><div class="stats-ov-label">الأسبوع</div></div>' +
    '<div class="stats-ov-item"><div class="stats-ov-value">' + month + '</div><div class="stats-ov-label">الشهر</div></div>';
  w.appendChild(body);
  return w;
}

function createFocusWidget(sessions, now) {
  var w = createWidget('ساعات التركيز', 'focus');
  var days = [];
  for (var di = 6; di >= 0; di--) {
    var d = new Date(now);
    d.setDate(d.getDate() - di);
    var dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var dayEnd = new Date(dayStart.getTime() + 86400000);
    var ms = 0;
    for (var si = 0; si < sessions.length; si++) {
      var st = new Date(sessions[si].startTime);
      if (st >= dayStart && st < dayEnd) ms += (sessions[si].accumulatedMs || 0);
    }
    days.push({ label: d.toLocaleDateString('ar-EG', { weekday: 'short' }), ms: ms });
  }

  var maxMs = 1;
  for (var mi = 0; mi < days.length; mi++) {
    if (days[mi].ms > maxMs) maxMs = days[mi].ms;
  }

  var body = document.createElement('div');
  body.className = 'stats-focus-chart';
  for (var bi = 0; bi < days.length; bi++) {
    var pct = (days[bi].ms / maxMs) * 100;
    if (pct < 4) pct = 4;
    var bar = document.createElement('div');
    bar.className = 'stats-focus-bar';
    bar.style.height = pct + '%';
    bar.style.background = '#3b82f6';
    bar.title = Math.round(days[bi].ms / 60000) + ' min';
    var label = document.createElement('div');
    label.className = 'stats-focus-label';
    label.textContent = days[bi].label;
    bar.appendChild(label);
    body.appendChild(bar);
  }
  w.appendChild(body);
  return w;
}

function createGoalsWidget(goals, tasks) {
  var w = createWidget('تقدم الأهداف', 'goals');
  var body = document.createElement('div');

  if (!goals || goals.length === 0) {
    body.innerHTML = '<div style="color:#9ca3af;font-size:13px;padding:12px 0">لا توجد أهداف</div>';
  } else {
    for (var gi = 0; gi < goals.length; gi++) {
      var g = goals[gi];
      var goalTasks = [];
      for (var ti = 0; ti < tasks.length; ti++) {
        if (tasks[ti].goalId === g.id) goalTasks.push(tasks[ti]);
      }
      var pct = 0;
      if (goalTasks.length > 0) {
        var done = 0;
        for (var dti = 0; dti < goalTasks.length; dti++) {
          if (goalTasks[dti].completed) done++;
        }
        pct = Math.round((done / goalTasks.length) * 100);
      }
      var item = document.createElement('div');
      item.className = 'stats-goal-item';
      item.innerHTML =
        '<span class="stats-goal-name">' + (g.name || '') + '</span>' +
        '<span class="stats-goal-bar"><span class="stats-goal-fill" style="width:' + pct + '%;background:' + (g.color || '#3b82f6') + '"></span></span>' +
        '<span class="stats-goal-pct">' + pct + '%</span>';
      body.appendChild(item);
    }
  }
  w.appendChild(body);
  return w;
}

function createTasksWidget(tasks, todayStart, weekStart, monthStart) {
  var w = createWidget('المهام المنجزة', 'tasks');
  var allDone = 0, todayDone = 0, weekDone = 0, monthDone = 0;
  for (var ti = 0; ti < tasks.length; ti++) {
    var t = tasks[ti];
    if (t.completed) {
      allDone++;
      if (t.completedAt) {
        var cd = new Date(t.completedAt);
        if (cd >= todayStart) todayDone++;
        if (cd >= weekStart) weekDone++;
        if (cd >= monthStart) monthDone++;
      }
    }
  }

  var body = document.createElement('div');
  body.className = 'stats-tasks-summary';
  body.innerHTML =
    '<div class="stats-tasks-stat"><div class="stats-tasks-num">' + allDone + '</div><div class="stats-tasks-label">الكل</div></div>' +
    '<div class="stats-tasks-stat"><div class="stats-tasks-num">' + todayDone + '</div><div class="stats-tasks-label">اليوم</div></div>' +
    '<div class="stats-tasks-stat"><div class="stats-tasks-num">' + weekDone + '</div><div class="stats-tasks-label">هذا الأسبوع</div></div>' +
    '<div class="stats-tasks-stat"><div class="stats-tasks-num">' + monthDone + '</div><div class="stats-tasks-label">هذا الشهر</div></div>';
  w.appendChild(body);
  return w;
}

function createHabitsWidget(habits) {
  var w = createWidget('العادات', 'habits');
  var body = document.createElement('div');

  if (!habits || habits.length === 0) {
    body.innerHTML = '<div style="color:#9ca3af;font-size:13px;padding:12px 0">لا توجد عادات</div>';
  } else {
    for (var hi = 0; hi < habits.length; hi++) {
      var h = habits[hi];
      var completed = h.completedDays || 0;
      var total = h.totalDays || 30;
      var pct = Math.min(100, Math.round((completed / Math.max(total, 1)) * 100));
      var item = document.createElement('div');
      item.className = 'stats-habit-item';
      item.innerHTML =
        '<span class="stats-habit-name">' + (h.name || h.title || 'عادة') + '</span>' +
        '<span class="stats-habit-bar"><span class="stats-habit-fill" style="width:' + pct + '%;background:#10b981"></span></span>' +
        '<span class="stats-habit-pct">' + pct + '%</span>';
      body.appendChild(item);
    }
  }
  w.appendChild(body);
  return w;
}

function createHeatmapWidget(sessions, habits, now) {
  var w = createWidget('خريطة النشاط', 'heatmap');
  var body = document.createElement('div');
  body.className = 'stats-heatmap';

  // Build a lookup of dates with activity levels
  var heatMap = {};
  for (var si = 0; si < sessions.length; si++) {
    var d = new Date(sessions[si].startTime);
    var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    heatMap[key] = (heatMap[key] || 0) + (sessions[si].accumulatedMs || 0);
  }

  // Add habits data
  for (var hi = 0; hi < habits.length; hi++) {
    var dates = habits[hi].completedDates;
    if (dates && dates.length) {
      for (var hdi = 0; hdi < dates.length; hdi++) {
        // completedDates might be timestamps or date strings
        var dk = dates[hdi];
        if (typeof dk === 'number') {
          var dd = new Date(dk);
          dk = dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0');
        }
        if (!heatMap[dk]) heatMap[dk] = 0;
        heatMap[dk] += 30; // 30 min equivalent for a habit
      }
    }
  }

  var heatColor = '#3b82f6';
  for (var ww = 11; ww >= 0; ww--) {
    var weekRow = document.createElement('div');
    weekRow.className = 'stats-heatmap-week';
    for (var dd = 0; dd < 7; dd++) {
      var day = new Date(now);
      day.setDate(day.getDate() - (ww * 7 + (6 - dd)));
      var key = day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0');
      var totalMin = heatMap[key] || 0;
      var level = 0;
      if (totalMin > 180) level = 4;
      else if (totalMin > 90) level = 3;
      else if (totalMin > 30) level = 2;
      else if (totalMin > 0) level = 1;

      var dayEl = document.createElement('div');
      dayEl.className = 'stats-heatmap-day';
      if (level > 0) {
        dayEl.style.backgroundColor = heatColor;
        dayEl.style.opacity = 0.2 + (level * 0.2);
      }
      dayEl.title = day.toLocaleDateString('ar-EG') + ': ' + Math.round(totalMin) + ' دقيقة';
      weekRow.appendChild(dayEl);
    }
    body.appendChild(weekRow);
  }

  w.appendChild(body);
  return w;
}

/* ── Drag and Drop ── */

function handleDragStart(e) {
  dragSrcEl = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.widgetId);
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  e.preventDefault();
  if (this !== dragSrcEl) this.classList.add('drag-over');
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  e.stopPropagation();
  if (dragSrcEl !== this) {
    var grid = document.getElementById('statsGrid');
    var allWidgets = grid.querySelectorAll('.stats-widget');
    var fromIdx = -1, toIdx = -1;
    for (var i = 0; i < allWidgets.length; i++) {
      if (allWidgets[i] === dragSrcEl) fromIdx = i;
      if (allWidgets[i] === this) toIdx = i;
    }
    if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
      var moved = widgetOrder.splice(fromIdx, 1)[0];
      widgetOrder.splice(toIdx, 0, moved);
      localStorage.setItem('statsWidgetOrder', JSON.stringify(widgetOrder));
      renderStats();
    }
  }
  this.classList.remove('drag-over');
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  var all = document.querySelectorAll('.stats-widget');
  for (var i = 0; i < all.length; i++) all[i].classList.remove('drag-over');
}
