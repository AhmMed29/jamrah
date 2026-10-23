using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Jamrah.Core.Entities;
using Jamrah.Core.Interfaces;
using Jamrah.Infrastructure.Repositories;

namespace Jamrah.Application.Services
{
    public class GoalStateService : IGoalStateService
    {
        private readonly IGoalRepository _repo;
        private readonly PomodoroRepository _pomoRepo;

        public GoalStateService(IGoalRepository repo, PomodoroRepository pomoRepo)
        {
            _repo = repo ?? throw new ArgumentNullException(nameof(repo));
            _pomoRepo = pomoRepo ?? throw new ArgumentNullException(nameof(pomoRepo));
        }

        public List<GoalItem> Goals { get; private set; } = new();
        public List<Tag> Tags { get; private set; } = new();

        public event Action? OnStateChanged;
        private void Notify() => OnStateChanged?.Invoke();

        public async Task InitAsync()
        {
            await _repo.InitAsync();
            await RefreshAsync();
        }

        public async Task RefreshAsync()
        {
            Goals = await _repo.GetGoalsAsync();
            try { Tags = await _pomoRepo.GetTagsAsync(); }
            catch { Tags = new List<Tag>(); }
            Notify();
        }

        public async Task AddGoalAsync(GoalItem goal)
        {
            await _repo.SaveGoalAsync(goal);
            await RefreshAsync();
        }

        public async Task UpdateGoalAsync(GoalItem goal)
        {
            await _repo.SaveGoalAsync(goal);
            await RefreshAsync();
        }

        public async Task DeleteGoalAsync(string id)
        {
            await _repo.DeleteGoalAsync(id);
            await RefreshAsync();
        }

        // Log achieved amount on a day (creates the day row with current expected snapshot).
        public async Task RecordAsync(string goalId, DateTime day, double amount)
        {
            var goal = Goals.FirstOrDefault(g => g.Id == goalId);
            if (goal == null) return;
            var d = day.Date;
            var log = await _repo.GetLogAsync(goalId, d);
            if (log == null)
            {
                log = new GoalLog
                {
                    GoalId = goalId,
                    Date = d,
                    ExpectedValue = goal.ExpectedValue,
                    AchievedValue = 0
                };
            }
            log.AchievedValue += amount;
            await _repo.SaveLogAsync(log);
            await RefreshAsync();
        }

        // Binary check goal: single tap toggles done for the day (modeled as Expected=1).
        public async Task ToggleCheckAsync(string goalId, DateTime day)
        {
            var goal = Goals.FirstOrDefault(g => g.Id == goalId);
            if (goal == null) return;
            var d = day.Date;
            var log = await _repo.GetLogAsync(goalId, d);
            if (log == null)
            {
                log = new GoalLog { GoalId = goalId, Date = d, ExpectedValue = 1, AchievedValue = 0 };
            }
            log.ExpectedValue = 1;
            log.AchievedValue = log.AchievedValue >= 1 ? 0 : 1;
            await _repo.SaveLogAsync(log);
            await RefreshAsync();
        }

        // Change the daily target starting at a day (history rows keep their snapshots).
        public async Task SetDayExpectedAsync(string goalId, DateTime day, double? expected)
        {
            var goal = Goals.FirstOrDefault(g => g.Id == goalId);
            if (goal == null) return;
            var d = day.Date;
            var log = await _repo.GetLogAsync(goalId, d);
            if (log == null)
            {
                log = new GoalLog { GoalId = goalId, Date = d, AchievedValue = 0 };
            }
            log.ExpectedValue = expected;
            await _repo.SaveLogAsync(log);
            goal.ExpectedValue = expected; // template for future days without rows
            await _repo.SaveGoalAsync(goal);
            await RefreshAsync();
        }

        // New pomodoro tag via the same API pomodoro itself uses (additive row only).
        public async Task<int> CreateTagAsync(string name, string color)
        {
            var tag = new Tag { Name = (name ?? "").Trim(), Color = string.IsNullOrWhiteSpace(color) ? "#A8A29E" : color };
            if (string.IsNullOrWhiteSpace(tag.Name)) return 0;
            await _pomoRepo.SaveTagAsync(tag);
            await RefreshAsync();
            return tag.Id;
        }

        public static bool IsPersistent(GoalItem g) => g.Recurrence == "untilDone";

        // Completion check for persistent goals over period totals.
        public static bool IsDoneTotal(GoalItem g, double achievedTotal, double? expectedTotal)
        {
            if (g.Kind == "check") return achievedTotal >= 1;
            if (achievedTotal <= 0) return false;
            if ((g.CompletionRule ?? "any") == "half")
                return expectedTotal.HasValue && expectedTotal.Value > 0 && achievedTotal > expectedTotal.Value / 2.0;
            return true; // "any": done even with little
        }

        private static bool IsActiveDay(GoalItem g, DateTime day)
        {
            if (IsPersistent(g)) return false; // handled by persistent window logic
            var d = day.Date;
            if (d < g.StartDate.Date || d > g.EndDate.Date) return false;
            if (g.Recurrence == "daily") return true;
            return d == g.StartDate.Date; // once
        }

        private static string LogKey(string goalId, DateTime day) => goalId + "|" + day.Date.ToString("yyyy-MM-dd");

        private static void AccumulateRangeTotals(GoalItem g, Dictionary<string, GoalLog> allMap, out double achievedTotal, out double? expectedTotal, out DateTime? firstDoneDate)
        {
            achievedTotal = 0;
            firstDoneDate = null;
            // Total achieved across [Start,End]; total expected = template once (not per-day sum).
            for (var d = g.StartDate.Date; d <= g.EndDate.Date; d = d.AddDays(1))
            {
                if (allMap.TryGetValue(LogKey(g.Id, d), out var log))
                    achievedTotal += log.AchievedValue;
            }
            expectedTotal = g.Kind == "check" ? 1 : g.ExpectedValue;
            // Find first day where running total satisfies the rule (check uses any-day done).
            if (g.Kind == "check")
            {
                for (var d = g.StartDate.Date; d <= g.EndDate.Date; d = d.AddDays(1))
                {
                    if (allMap.TryGetValue(LogKey(g.Id, d), out var log) && (log.AchievedValue >= 1))
                    { firstDoneDate = d; break; }
                }
            }
            else
            {
                double running = 0;
                for (var d = g.StartDate.Date; d <= g.EndDate.Date; d = d.AddDays(1))
                {
                    if (allMap.TryGetValue(LogKey(g.Id, d), out var log)) running += log.AchievedValue;
                    if (IsDoneTotal(g, running, expectedTotal)) { firstDoneDate = d; break; }
                }
            }
        }

        private static bool ShouldShowPersistentOnDay(GoalItem g, DateTime day, DateTime today, DateTime? completedDate)
        {
            var d = day.Date;
            if (d < g.StartDate.Date || d > g.EndDate.Date) return false;
            if (completedDate.HasValue) return d <= completedDate.Value.Date; // done: Start..doneDay visible, future hidden (مش هيظهر بكره)
            if (today.Date > g.EndDate.Date) return true; // failed: visible in whole range as failed
            return d == today.Date; // unresolved: moving window, today only
        }

        private (string name, string color) ResolveTag(GoalItem g)
        {
            var live = g.PomodoroTagId.HasValue ? Tags.FirstOrDefault(t => t.Id == g.PomodoroTagId.Value && !t.IsArchived) : null;
            if (live != null) return (live.Name, string.IsNullOrWhiteSpace(live.Color) ? "#A8A29E" : live.Color);
            if (!string.IsNullOrWhiteSpace(g.TagName)) return (g.TagName, string.IsNullOrWhiteSpace(g.TagColor) ? "#A8A29E" : g.TagColor);
            return ("", "#A8A29E");
        }

        private GoalRowView BuildDayRow(GoalItem g, DateTime day, Dictionary<string, GoalLog> logs)
        {
            var (name, color) = ResolveTag(g);
            logs.TryGetValue(g.Id + "|" + day.Date.ToString("yyyy-MM-dd"), out var log);
            return new GoalRowView
            {
                Goal = g,
                TagName = name,
                TagColor = color,
                Expected = log?.ExpectedValue ?? g.ExpectedValue,
                Achieved = log?.AchievedValue ?? 0,
                DoneToday = (log?.AchievedValue ?? 0) > 0
            };
        }

        public async Task<List<GoalRowView>> GetDayRowsAsync(DateTime day)
        {
            var d = day.Date;
            var today = DateTime.Today;
            var logs = await _repo.GetLogsAsync(d, d);
            var map = logs.Where(l => l.Date == d).ToDictionary(l => l.GoalId + "|" + d.ToString("yyyy-MM-dd"), l => l);
            var rows = Goals.Where(g => IsActiveDay(g, d)).Select(g => BuildDayRow(g, d, map)).ToList();

            var persistents = Goals.Where(IsPersistent).ToList();
            if (persistents.Count > 0)
            {
                var min = persistents.Min(g => g.StartDate.Date);
                var max = persistents.Max(g => g.EndDate.Date);
                var allLogs = await _repo.GetLogsAsync(min, max);
                var allMap = allLogs.ToDictionary(l => l.GoalId + "|" + l.Date.Date.ToString("yyyy-MM-dd"), l => l);
                foreach (var g in persistents)
                {
                    AccumulateRangeTotals(g, allMap, out var achievedTotal, out var expectedTotal, out var completedDate);
                    bool failed = !completedDate.HasValue && today.Date > g.EndDate.Date;
                    bool completed = completedDate.HasValue;
                    if (!ShouldShowPersistentOnDay(g, d, today, completedDate)) continue;
                    var (name, color) = ResolveTag(g);
                    allMap.TryGetValue(LogKey(g.Id, d), out var dayLog);
                    rows.Add(new GoalRowView
                    {
                        Goal = g,
                        TagName = name,
                        TagColor = color,
                        Expected = expectedTotal,
                        Achieved = achievedTotal,
                        DoneToday = (dayLog?.AchievedValue ?? 0) > 0 || completed,
                        IsPersistent = true,
                        IsFailed = failed,
                        IsCompleted = completed,
                        CompletedDate = completedDate
                    });
                }
            }
            return rows;
        }

        public async Task<List<GoalRowView>> GetWeekRowsAsync(DateTime saturday)
        {
            var sat = saturday.Date;
            var days = Enumerable.Range(0, 7).Select(i => sat.AddDays(i)).ToList();
            return await GetRangeRowsAsync(days);
        }

        public async Task<List<GoalRowView>> GetMonthRowsAsync(int year, int month)
        {
            var first = new DateTime(year, month, 1);
            var days = Enumerable.Range(0, DateTime.DaysInMonth(year, month)).Select(i => first.AddDays(i)).ToList();
            return await GetRangeRowsAsync(days);
        }

        private async Task<List<GoalRowView>> GetRangeRowsAsync(List<DateTime> days)
        {
            if (days.Count == 0) return new List<GoalRowView>();
            var logs = await _repo.GetLogsAsync(days.First(), days.Last());
            var map = logs.ToDictionary(l => l.GoalId + "|" + l.Date.Date.ToString("yyyy-MM-dd"), l => l);
            var rows = new List<GoalRowView>();
            // Bulk persistent logs for correct totals/status even outside the viewed slice.
            Dictionary<string, GoalLog>? persistMap = null;
            var persistents = Goals.Where(IsPersistent).ToList();
            if (persistents.Count > 0)
            {
                var min = persistents.Min(g => g.StartDate.Date);
                var max = persistents.Max(g => g.EndDate.Date);
                // Only fetch extra if viewed range doesn't already cover it.
                if (min < days.First() || max > days.Last())
                {
                    var extra = await _repo.GetLogsAsync(min < days.First() ? min : days.First(), max > days.Last() ? max : days.Last());
                    persistMap = extra.ToDictionary(l => l.GoalId + "|" + l.Date.Date.ToString("yyyy-MM-dd"), l => l);
                }
                else persistMap = map;
            }
            var today = DateTime.Today;
            foreach (var g in Goals)
            {
                if (IsPersistent(g))
                {
                    var fullMap = persistMap ?? map;
                    AccumulateRangeTotals(g, fullMap, out var achievedTotal, out var expectedTotal, out var completedDate);
                    bool failed = !completedDate.HasValue && today.Date > g.EndDate.Date;
                    bool completed = completedDate.HasValue;
                    // Show if viewed range overlaps [Start,End] AND (resolved OR contains today).
                    bool overlaps = days.Any(d => d.Date >= g.StartDate.Date && d.Date <= g.EndDate.Date);
                    if (!overlaps) continue;
                    bool containsToday = days.Any(d => d.Date == today.Date);
                    if (!completed && !failed && !containsToday) continue;
                    var (pname, pcolor) = ResolveTag(g);
                    fullMap.TryGetValue(LogKey(g.Id, today), out var tlog);
                    rows.Add(new GoalRowView
                    {
                        Goal = g,
                        TagName = pname,
                        TagColor = pcolor,
                        Expected = expectedTotal,
                        Achieved = achievedTotal,
                        DoneToday = (tlog?.AchievedValue ?? 0) > 0 || completed,
                        IsPersistent = true,
                        IsFailed = failed,
                        IsCompleted = completed,
                        CompletedDate = completedDate
                    });
                    continue;
                }
                var activeDays = days.Where(d => IsActiveDay(g, d)).ToList();
                if (activeDays.Count == 0) continue;
                var (name, color) = ResolveTag(g);
                double achieved = 0;
                double expected = 0;
                bool hasExpected = false;
                foreach (var d in activeDays)
                {
                    map.TryGetValue(g.Id + "|" + d.ToString("yyyy-MM-dd"), out var log);
                    var e = log?.ExpectedValue ?? g.ExpectedValue;
                    if (e.HasValue) { expected += e.Value; hasExpected = true; }
                    achieved += log?.AchievedValue ?? 0;
                }
                rows.Add(new GoalRowView
                {
                    Goal = g,
                    TagName = name,
                    TagColor = color,
                    Expected = hasExpected ? expected : (double?)null,
                    Achieved = achieved,
                    DoneToday = map.TryGetValue(g.Id + "|" + DateTime.Today.ToString("yyyy-MM-dd"), out var tlog2) && tlog2.AchievedValue > 0
                });
            }
            return rows;
        }
    }
}
