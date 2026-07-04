using System.Text.Json.Serialization;

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
    public string CreatedAt { get; set; } = string.Empty;
    public string? ParentGoalId { get; set; }

    // navs are EF-only: serializing them cycles via ParentGoal<->Children
    [JsonIgnore] public Tag? Tag { get; set; }
    [JsonIgnore] public Goal? ParentGoal { get; set; }
    [JsonIgnore] public ICollection<Goal> Children { get; set; } = new List<Goal>();
    [JsonIgnore] public ICollection<GoalProgress> ProgressRecords { get; set; } = new List<GoalProgress>();
    [JsonIgnore] public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
    [JsonIgnore] public ICollection<Session> Sessions { get; set; } = new List<Session>();
}
