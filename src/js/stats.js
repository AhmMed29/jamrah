window.initStats = function () { return Promise.resolve() };

window.getStats = async function () {
  var todayStats = await window.db.getTodayStats();
  var totalStats = await window.db.getTotalStats();
  return {
    todayPomos: todayStats.todayPomos,
    todayFocusMinutes: todayStats.todayFocusMinutes,
    totalPomos: totalStats.totalPomos,
    totalFocusMinutes: totalStats.totalFocusMinutes
  };
};


