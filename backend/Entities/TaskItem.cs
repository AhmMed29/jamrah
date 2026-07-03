namespace Jamrah.Backend.Entities;

public class TaskItem
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? GoalId { get; set; }
    public int Completed { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string? ParentTaskId { get; set; }

    public Goal? Goal { get; set; }
    public TaskItem? ParentTask { get; set; }
    public ICollection<TaskItem> Subtasks { get; set; } = new List<TaskItem>();
}
