namespace Jamrah.Backend.DTOs;

public class TagsWithGoalsResponse
{
    public List<TagDto> Tags { get; set; } = new();
    public List<GoalBriefDto> Goals { get; set; } = new();
}

public class TagDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public long CreatedAt { get; set; }
}

public class GoalBriefDto
{
    public string GoalId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
}

public class SaveGoalProgressDto
{
    public string GoalId { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public double ProgressValue { get; set; }
    public double FocusMinutes { get; set; }
}
