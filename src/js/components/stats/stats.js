/* ── Stats Dashboard with Chart.js ── */

var currentTimeRange = 'week'; // week, month, year, all
var currentRangeOffset = 0; // offset in units of currentTimeRange
var rawData = {
  sessions: [],
  goals: [],
  tasks: [],
  habits: []
};
var charts = {
  focus: null,
  tasks: null,
  habits: null
};

function todayISO() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Attach event listeners for time toggles
document.addEventListener('DOMContentLoaded', function() {
  var toggleContainer = document.getElementById('statsTimeToggle');
  if (toggleContainer) {
    toggleContainer.addEventListener('click', function(e) {
      if (e.target.classList.contains('stats-time-btn')) {
        var btns = toggleContainer.querySelectorAll('.stats-time-btn');
        btns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentTimeRange = e.target.getAttribute('data-range');
        currentRangeOffset = 0; // Reset offset on range change
        drawStats();
      }
    });
  }
  
  var prevBtn = document.getElementById('statsRangePrev');
  if (prevBtn) {
    prevBtn.addEventListener('click', function() {
      currentRangeOffset--;
      drawStats();
    });
  }
  var nextBtn = document.getElementById('statsRangeNext');
  if (nextBtn) {
    nextBtn.addEventListener('click', function() {
      currentRangeOffset++;
      drawStats();
    });
  }
});

window.renderStats = async function() {
  var grid = document.getElementById('statsGrid');
  if (!grid) return;
  
  // Keep layout structure if it doesn't exist
  if (grid.children.length === 0) {
    grid.innerHTML = `
      <div class="stats-overview-cards" id="statsOverviewCards"></div>
      <div class="stats-chart-row">
        <div class="stats-chart-card" style="flex: 2;">
          <div class="stats-chart-header">Focus Time</div>
          <div class="stats-chart-body"><canvas id="focusChart"></canvas></div>
        </div>
        <div class="stats-chart-card" style="flex: 1;">
          <div class="stats-chart-header">Tasks Completed</div>
          <div class="stats-chart-body"><canvas id="tasksChart"></canvas></div>
        </div>
      </div>
      <div class="stats-chart-row">
        <div class="stats-chart-card" style="flex: 1;">
          <div class="stats-chart-header">Habits Consistency</div>
          <div class="stats-chart-body"><canvas id="habitsChart"></canvas></div>
        </div>
        <div class="stats-chart-card" style="flex: 1; display:flex; flex-direction:column;">
          <div class="stats-chart-header">Goals Progress</div>
          <div class="stats-chart-body" id="goalsProgressBody" style="overflow-y:auto; flex:1;"></div>
        </div>
      </div>
    `;
  }

  try {
    var groupedResult = await window.db.getSessionsGrouped();
    var grouped = groupedResult || {};
    rawData.sessions = [];
    for (var dateKey in grouped) {
      if (grouped.hasOwnProperty(dateKey)) {
        rawData.sessions = rawData.sessions.concat(grouped[dateKey]);
      }
    }
    var results = await Promise.all([
      window.db.getGoals(),
      window.db.getTasks(),
      window.db.getHabits ? window.db.getHabits() : Promise.resolve([])
    ]);
    rawData.goals = results[0] || [];
    rawData.tasks = results[1] || [];
    rawData.habits = results[2] || [];

    if (rawData.habits.length > 0 && window.db.getHabitLogs) {
      var habitLogPromises = rawData.habits.map(function(h) {
        var start = '2000-01-01';
        var end = todayISO();
        return window.db.getHabitLogs(h.id, start, end).then(function(logs) {
          h.logs = logs || [];
        });
      });
      await Promise.all(habitLogPromises);
    }
  } catch(e) {
    grid.innerHTML = '<div class="stats-empty">Failed to load data</div>';
    return;
  }

  drawStats();
};

function getDaysArray(startDate, endDate) {
  var arr = [];
  var dt = new Date(startDate);
  while (dt <= endDate) {
    arr.push(new Date(dt));
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
}

function getMonthsArray(startDate, endDate) {
  var arr = [];
  var dt = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  while (dt <= endDate) {
    arr.push(new Date(dt));
    dt.setMonth(dt.getMonth() + 1);
  }
  return arr;
}

function drawStats() {
  var now = new Date();
  var startDate = new Date();

  // Determine time frame
  var numLabels = 0;
  var isMonths = false;

  var offsetNow = new Date(now);
  if (currentTimeRange === 'week') {
    offsetNow.setDate(now.getDate() + (currentRangeOffset * 7));
    startDate = new Date(offsetNow);
    startDate.setDate(offsetNow.getDate() - 6);
  } else if (currentTimeRange === 'month') {
    offsetNow.setDate(now.getDate() + (currentRangeOffset * 28));
    startDate = new Date(offsetNow);
    startDate.setDate(offsetNow.getDate() - 27); // 4 weeks
  } else if (currentTimeRange === 'year') {
    offsetNow.setFullYear(now.getFullYear() + currentRangeOffset);
    startDate = new Date(offsetNow);
    startDate.setMonth(offsetNow.getMonth() - 11);
    startDate.setDate(1);
    isMonths = true;
  } else if (currentTimeRange === 'all') {
    startDate = new Date(2023, 0, 1); // rough fallback
    if (rawData.sessions.length > 0) {
      startDate = new Date(rawData.sessions[0].startTime);
    }
    isMonths = true;
  }
  startDate.setHours(0,0,0,0);
  
  var timePoints = isMonths ? getMonthsArray(startDate, offsetNow) : getDaysArray(startDate, offsetNow);
  
  var labels = timePoints.map(d => {
    if (isMonths) {
      return d.toLocaleDateString('en-US', { month: 'short', year: currentTimeRange === 'all' ? '2-digit' : undefined });
    } else {
      return d.toLocaleDateString('en-US', { weekday: currentTimeRange === 'week' ? 'short' : undefined, month: currentTimeRange !== 'week' ? 'short' : undefined, day: currentTimeRange !== 'week' ? 'numeric' : undefined });
    }
  });

  // Calculate Overview
  var totalFocus = 0;
  var rangeFocus = 0;
  var rangeTasks = 0;
  var rangeHabits = 0;

  // Aggregate Focus Time
  var focusData = new Array(timePoints.length).fill(0);
  rawData.sessions.forEach(s => {
    var st = new Date(s.startTime);
    totalFocus += (s.focusMinutes || 0);
    if (st >= startDate) {
      rangeFocus += (s.focusMinutes || 0);
      var idx = timePoints.findIndex((tp, i) => {
        var next = timePoints[i+1] || new Date(now.getTime() + 86400000);
        return st >= tp && st < next;
      });
      if (idx !== -1) focusData[idx] += (s.focusMinutes || 0);
    }
  });

  // Aggregate Tasks
  var tasksData = new Array(timePoints.length).fill(0);
  rawData.tasks.forEach(t => {
    if (t.completed && t.createdAt) {
      var cd = new Date(t.createdAt);
      if (cd >= startDate) {
        rangeTasks++;
        var idx = timePoints.findIndex((tp, i) => {
          var next = timePoints[i+1] || new Date(now.getTime() + 86400000);
          return cd >= tp && cd < next;
        });
        if (idx !== -1) tasksData[idx]++;
      }
    }
  });

  // Aggregate Habits
  var habitsData = new Array(timePoints.length).fill(0);
  var habitsTotalCount = rawData.habits.length;
  rawData.habits.forEach(h => {
    if (h.logs) {
      h.logs.forEach(l => {
        if (l.value > 0) {
          var ld = new Date(l.date + 'T00:00:00');
          if (ld >= startDate) {
            rangeHabits++;
            var idx = timePoints.findIndex((tp, i) => {
              var next = timePoints[i+1] || new Date(now.getTime() + 86400000);
              return ld >= tp && ld < next;
            });
            if (idx !== -1) habitsData[idx]++;
          }
        }
      });
    }
  });

  // Convert habitsData to percentages for display if needed, but keeping absolute count for tooltip
  var habitsPctData = habitsData.map(val => habitsTotalCount > 0 ? Math.round((val / habitsTotalCount) * 100) : 0);

  // Update Overview Cards
  var ovContainer = document.getElementById('statsOverviewCards');
  if (ovContainer) {
    var tHours = Math.floor(totalFocus / 60);
    var tMins = Math.round(totalFocus % 60);
    var tFocusStr = tHours > 0 ? tHours + 'h ' + tMins + 'm' : tMins + 'm';

    // Today's focus
    var todayStr = todayISO();
    var todayFocusMins = 0;
    rawData.sessions.forEach(function(s) {
      var st = new Date(s.startTime);
      var stStr = st.getFullYear() + '-' + String(st.getMonth()+1).padStart(2,'0') + '-' + String(st.getDate()).padStart(2,'0');
      if (stStr === todayStr) todayFocusMins += (s.focusMinutes || 0);
    });
    var tdH = Math.floor(todayFocusMins / 60);
    var tdM = Math.round(todayFocusMins % 60);
    var todayFocusStr = tdH > 0 ? tdH + 'h ' + tdM + 'm' : tdM + 'm';

    // All-time tasks completed
    var totalTasksDone = 0;
    rawData.tasks.forEach(function(t) { if (t.completed) totalTasksDone++; });

    ovContainer.innerHTML = `
      <div class="stats-ov-card">
        <div class="stats-ov-title">Today's Focus</div>
        <div class="stats-ov-value">${todayFocusStr}</div>
      </div>
      <div class="stats-ov-card">
        <div class="stats-ov-title">Tasks Completed</div>
        <div class="stats-ov-value">${totalTasksDone}</div>
      </div>
      <div class="stats-ov-card">
        <div class="stats-ov-title">All-Time Focus</div>
        <div class="stats-ov-value">${tFocusStr}</div>
      </div>
    `;
  }

  // Draw Focus Chart
  if (charts.focus) charts.focus.destroy();
  var ctxFocus = document.getElementById('focusChart').getContext('2d');
  charts.focus = new Chart(ctxFocus, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Focus Minutes',
        data: focusData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#3b82f6',
        pointBorderWidth: 2,
        pointRadius: 4,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: {
          mode: 'index',
          callbacks: {
            label: function(context) {
              var mins = context.raw;
              var h = Math.floor(mins / 60);
              var m = Math.round(mins % 60);
              return (h > 0 ? h + 'h ' : '') + m + 'm focused';
            }
          }
        }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, border: { display: false } },
        x: { grid: { display: false }, border: { display: false } }
      }
    }
  });

  // Draw Tasks Chart
  if (charts.tasks) charts.tasks.destroy();
  var ctxTasks = document.getElementById('tasksChart').getContext('2d');
  charts.tasks = new Chart(ctxTasks, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Tasks',
        data: tasksData,
        backgroundColor: '#10b981',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: {
          mode: 'index',
          callbacks: {
            label: function(context) {
              return context.raw + ' tasks completed';
            }
          }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.04)' }, border: { display: false } },
        x: { grid: { display: false }, border: { display: false } }
      }
    }
  });

  // Draw Habits Chart
  if (charts.habits) charts.habits.destroy();
  var ctxHabits = document.getElementById('habitsChart').getContext('2d');
  charts.habits = new Chart(ctxHabits, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Habits (%)',
        data: habitsPctData,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#f59e0b',
        pointBorderWidth: 2,
        pointRadius: 4,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: {
          mode: 'index',
          callbacks: {
            label: function(context) {
              var count = habitsData[context.dataIndex];
              return count + '/' + habitsTotalCount + ' habits done';
            }
          }
        }
      },
      scales: {
        y: { beginAtZero: true, max: 100, ticks: { stepSize: 20, callback: function(value) { return value + '%'; } }, grid: { color: 'rgba(0,0,0,0.04)' }, border: { display: false } },
        x: { grid: { display: false }, border: { display: false } }
      }
    }
  });

  // Draw Goals Progress (Redesigned Table)
  var goalsBody = document.getElementById('goalsProgressBody');
  if (goalsBody) {
    if (rawData.goals.length === 0) {
      goalsBody.innerHTML = '<div style="color:#9ca3af; font-size:13px; text-align:center; padding:20px;">No goals yet</div>';
    } else {
      var html = '<table class="stats-goals-table">';
      html += '<thead><tr><th>Goal Name</th><th>Duration</th><th>Progress</th><th>Status</th></tr></thead><tbody>';
      rawData.goals.forEach(g => {
        var goalTasks = rawData.tasks.filter(t => t.goalId === g.id);
        var done = goalTasks.filter(t => t.completed).length;
        var pct = goalTasks.length > 0 ? Math.round((done / goalTasks.length) * 100) : 0;
        
        var statusBadgeClass = g.status === 'done' ? 'stats-badge-done' : (g.status === 'cancelled' ? 'stats-badge-cancelled' : 'stats-badge-active');
        var statusText = g.status === 'done' ? 'Done' : (g.status === 'cancelled' ? 'Cancelled' : 'Active');

        html += `
          <tr>
            <td style="font-weight:600; color:#374151;">${escapeHtml(g.name || 'Goal')}</td>
            <td style="color:#6b7280; font-size:12px;">${g.startDate ? g.startDate : '-'} &rarr; ${g.endDate ? g.endDate : '-'}</td>
            <td>
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="flex:1; height:6px; background:#f3f4f6; border-radius:3px; overflow:hidden;">
                  <div style="height:100%; width:${pct}%; background:${g.color || '#3b82f6'};"></div>
                </div>
                <span style="font-size:12px; font-weight:600; color:#374151; min-width:32px;">${pct}%</span>
              </div>
            </td>
            <td><span class="stats-goal-badge ${statusBadgeClass}">${statusText}</span></td>
          </tr>
        `;
      });
      html += '</tbody></table>';
      goalsBody.innerHTML = html;
    }
  }
}
