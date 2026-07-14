/* ── Stats Dashboard with Chart.js ── */

var currentTimeRange = 'week'; // week, month, year, all
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
        drawStats();
      }
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

  if (currentTimeRange === 'week') {
    startDate.setDate(now.getDate() - 6);
  } else if (currentTimeRange === 'month') {
    startDate.setDate(now.getDate() - 27); // 4 weeks
  } else if (currentTimeRange === 'year') {
    startDate.setMonth(now.getMonth() - 11);
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
  
  var timePoints = isMonths ? getMonthsArray(startDate, now) : getDaysArray(startDate, now);
  
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
  rawData.habits.forEach(h => {
    if (h.logs) {
      h.logs.forEach(l => {
        if (l.value > 0) {
          var ld = new Date(l.date);
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

  // Update Overview Cards
  var ovContainer = document.getElementById('statsOverviewCards');
  if (ovContainer) {
    var hours = Math.floor(rangeFocus / 60);
    var mins = Math.round(rangeFocus % 60);
    var focusStr = hours > 0 ? hours + 'h ' + mins + 'm' : mins + 'm';
    
    var tHours = Math.floor(totalFocus / 60);
    var tMins = Math.round(totalFocus % 60);
    var tFocusStr = tHours > 0 ? tHours + 'h ' + tMins + 'm' : tMins + 'm';

    ovContainer.innerHTML = `
      <div class="stats-ov-card">
        <div class="stats-ov-title">Focus Time (Period)</div>
        <div class="stats-ov-value">${focusStr}</div>
      </div>
      <div class="stats-ov-card">
        <div class="stats-ov-title">Tasks Completed</div>
        <div class="stats-ov-value">${rangeTasks}</div>
      </div>
      <div class="stats-ov-card">
        <div class="stats-ov-title">Habits Done</div>
        <div class="stats-ov-value">${rangeHabits}</div>
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
      plugins: { legend: { display: false } },
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
      plugins: { legend: { display: false } },
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
        label: 'Habits',
        data: habitsData,
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
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.04)' }, border: { display: false } },
        x: { grid: { display: false }, border: { display: false } }
      }
    }
  });

  // Draw Goals Progress
  var goalsBody = document.getElementById('goalsProgressBody');
  if (goalsBody) {
    if (rawData.goals.length === 0) {
      goalsBody.innerHTML = '<div style="color:#9ca3af; font-size:13px; text-align:center; padding:20px;">No goals yet</div>';
    } else {
      var html = '<div style="display:flex; flex-direction:column; gap:12px;">';
      rawData.goals.forEach(g => {
        var goalTasks = rawData.tasks.filter(t => t.goalId === g.id);
        var done = goalTasks.filter(t => t.completed).length;
        var pct = goalTasks.length > 0 ? Math.round((done / goalTasks.length) * 100) : 0;
        
        html += `
          <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600; color:#374151;">
              <span>${g.name || 'Goal'}</span>
              <span>${pct}%</span>
            </div>
            <div style="width:100%; height:6px; background:#f3f4f6; border-radius:3px; overflow:hidden;">
              <div style="height:100%; width:${pct}%; background:${g.color || '#3b82f6'};"></div>
            </div>
          </div>
        `;
      });
      html += '</div>';
      goalsBody.innerHTML = html;
    }
  }
}
