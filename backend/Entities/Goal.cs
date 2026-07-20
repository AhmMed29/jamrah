namespace Jamrah.Backend.Entities;

public class Goal
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string? TagId { get; set; }
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public int Duration { get; set; }
    public string? DurationType { get; set; }
    public int? DurationValue { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string? ParentGoalId { get; set; }

    public Tag? Tag { get; set; }
    public Goal? ParentGoal { get; set; }
    public ICollection<Goal> Children { get; set; } = new List<Goal>();
    public ICollection<GoalProgress> ProgressRecords { get; set; } = new List<GoalProgress>();
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
    public ICollection<Session> Sessions { get; set; } = new List<Session>();
}
