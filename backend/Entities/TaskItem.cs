namespace Jamrah.Backend.Entities;

public class TaskItem
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? GoalId { get; set; }
    public int Completed { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string? ParentTaskId { get; set; }
    public string Priority { get; set; } = "none";
    public string? CompletedAt { get; set; }
    public string? ScheduledTime { get; set; }
    public string? Recurrence { get; set; }
    public string? CustomDays { get; set; }
    public string? DurationStart { get; set; }
    public string? DurationEnd { get; set; }
    public string? Notes { get; set; }

    public Goal? Goal { get; set; }
    public TaskItem? ParentTask { get; set; }
    public ICollection<TaskItem> Subtasks { get; set; } = new List<TaskItem>();
}
