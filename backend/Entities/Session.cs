namespace Jamrah.Backend.Entities;

public class Session
{
    public string Id { get; set; } = string.Empty;
    public long StartTime { get; set; }
    public long EndTime { get; set; }
    public double PlannedMinutes { get; set; }
    public double FocusMinutes { get; set; }
    public string TaskName { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public string? TagId { get; set; }
    public long CreatedAt { get; set; }
    public string? TaskId { get; set; }
    public string? GoalId { get; set; }

    public Tag? Tag { get; set; }
    public Goal? Goal { get; set; }
}
