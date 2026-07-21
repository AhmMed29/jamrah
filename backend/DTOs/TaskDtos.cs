using System.ComponentModel.DataAnnotations;

namespace Jamrah.Backend.DTOs;

public class CreateTaskItemDto
{
    [Required]
    public string Id { get; set; } = string.Empty;

    [Required(ErrorMessage = "Task name is required")]
    [StringLength(500, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    public string? GoalId { get; set; }
    public string? ParentTaskId { get; set; }
    public string? ScheduledTime { get; set; }
    public string? Priority { get; set; }
    public string? Recurrence { get; set; }
    public string? CustomDays { get; set; }
    public string? DurationStart { get; set; }
    public string? DurationEnd { get; set; }
    public string? Notes { get; set; }
}

public class UpdateTaskItemDto
{
    public string? Name { get; set; }
    public string? Priority { get; set; }
    public string? ScheduledTime { get; set; }
    public string? Recurrence { get; set; }
    public string? CustomDays { get; set; }
    public string? DurationStart { get; set; }
    public string? DurationEnd { get; set; }
    public string? Notes { get; set; }
}
