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
}

public class UpdateTaskItemDto
{
    [Required(ErrorMessage = "Task name is required")]
    [StringLength(500, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;
}
