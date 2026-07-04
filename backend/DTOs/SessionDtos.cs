using System.ComponentModel.DataAnnotations;

namespace Jamrah.Backend.DTOs;

public class CreateSessionDto
{
    [Required(ErrorMessage = "Session ID is required")]
    public string Id { get; set; } = string.Empty;

    [Required]
    public long StartTime { get; set; }

    [Required]
    public long EndTime { get; set; }

    [Required]
    [Range(0, 1440, ErrorMessage = "Planned minutes must be between 0 and 1440")]
    public double PlannedMinutes { get; set; }

    [Required]
    [Range(0, 1440, ErrorMessage = "Focus minutes must be between 0 and 1440")]
    public double FocusMinutes { get; set; }

    public string? TaskName { get; set; }
    public string? Note { get; set; }
    public string? TagId { get; set; }
    public long? CreatedAt { get; set; }
    public string? TaskId { get; set; }
    public string? GoalId { get; set; }
}

public class UpdateSessionDto
{
    public string? TaskName { get; set; }
    public string? TagId { get; set; }
    public string? Note { get; set; }
    public string? GoalId { get; set; }
}
