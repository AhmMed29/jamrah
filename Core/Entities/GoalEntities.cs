using System;
using SQLite;

namespace Jamrah.Core.Entities
{
    // Daily goals (Today section). Tags are shared with Pomodoro (PomodoroTag by Id).
    [Table("GoalItems")]
    public class GoalItem
    {
        [PrimaryKey]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        public string Title { get; set; } = string.Empty;

        // Shared pomodoro tag (nullable). Display resolves live; snapshots below are fallback.
        public int? PomodoroTagId { get; set; }
        public string TagName { get; set; } = string.Empty;
        public string TagColor { get; set; } = "#A8A29E";

        // Daily target for "daily", total for "once". Null = just-do-it goal (no bar).
        public double? ExpectedValue { get; set; }
        public string Unit { get; set; } = string.Empty;

        // "once" | "daily" | "untilDone" (persistent until done or deadline)
        public string Recurrence { get; set; } = "once";

        // "amount" (measurable) | "check" (done/not-done)
        public string Kind { get; set; } = "amount";

        // Completion rule for persistent ("untilDone") amount goals only:
        // "any" = done even with little (>0), "half" = achieved > expected/2. Null = legacy.
        public string? CompletionRule { get; set; }

        [Indexed]
        public DateTime StartDate { get; set; } = DateTime.Today;
        [Indexed]
        public DateTime EndDate { get; set; } = DateTime.Today;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    // Per-day record: Expected is a snapshot (history never changes when template edits happen).
    [Table("GoalLogs")]
    public class GoalLog
    {
        [PrimaryKey]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Indexed]
        public string GoalId { get; set; } = string.Empty;

        [Indexed]
        public DateTime Date { get; set; } = DateTime.Today;

        public double? ExpectedValue { get; set; }
        public double AchievedValue { get; set; } = 0;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    // UI row (computed, not stored).
    public sealed class GoalRowView
    {
        public GoalItem Goal { get; set; } = new();
        public string TagName { get; set; } = string.Empty;
        public string TagColor { get; set; } = "#A8A29E";
        public double? Expected { get; set; }
        public double Achieved { get; set; }
        public bool DoneToday { get; set; }
        public bool HasExpected => Expected.HasValue;
        public bool Over => HasExpected && Achieved > Expected!.Value;
        public int Pct => !HasExpected || Expected!.Value <= 0 ? 0 : Math.Min(100, (int)Math.Round(Achieved / Expected!.Value * 100));
        public bool IsPersistent { get; set; }
        public bool IsFailed { get; set; }
        public bool IsCompleted { get; set; }
        public string DeadlineText { get; set; } = string.Empty;
        public string PeriodLabel { get; set; } = string.Empty;
        public DateTime? CompletedDate { get; set; }
    }
}
