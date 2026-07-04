using System.Text.Json.Serialization;

namespace Jamrah.Backend.Entities;

public class TaskItem
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? GoalId { get; set; }
    public int Completed { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string? ParentTaskId { get; set; }

    // navs are EF-only: serializing them cycles once relationship fixup
    // wires ParentTask<->Subtasks in a list query
    [JsonIgnore] public Goal? Goal { get; set; }
    [JsonIgnore] public TaskItem? ParentTask { get; set; }
    [JsonIgnore] public ICollection<TaskItem> Subtasks { get; set; } = new List<TaskItem>();
}
