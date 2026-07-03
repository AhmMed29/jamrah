using System.ComponentModel.DataAnnotations;

namespace Jamrah.Backend.DTOs;

public class CreateGoalDto
{
    [Required(ErrorMessage = "Goal ID is required")]
    public string Id { get; set; } = string.Empty;

    [Required(ErrorMessage = "Goal name is required")]
    [StringLength(200, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required(ErrorMessage = "Goal color is required")]
    public string Color { get; set; } = string.Empty;

    [Required(ErrorMessage = "Start date is required")]
    public string StartDate { get; set; } = string.Empty;

    [Required(ErrorMessage = "End date is required")]
    public string EndDate { get; set; } = string.Empty;

    [Required]
    [Range(1, 36500)]
    public int Duration { get; set; }

    public string? ParentGoalId { get; set; }
}

public class UpdateGoalDto
{
    [Required(ErrorMessage = "Goal name is required")]
    [StringLength(200, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    public string Color { get; set; } = string.Empty;

    public string? TagId { get; set; }

    [Required]
    public string StartDate { get; set; } = string.Empty;

    [Required]
    public string EndDate { get; set; } = string.Empty;

    [Required]
    [Range(1, 36500)]
    public int Duration { get; set; }

    public string? ParentGoalId { get; set; }
}
