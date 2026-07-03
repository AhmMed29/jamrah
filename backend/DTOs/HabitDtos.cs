using System.ComponentModel.DataAnnotations;

namespace Jamrah.Backend.DTOs;

public class CreateHabitDto
{
    [Required]
    public string Id { get; set; } = string.Empty;

    [Required(ErrorMessage = "Habit name is required")]
    [StringLength(200, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [RegularExpression("^#[0-9A-Fa-f]{6}$", ErrorMessage = "Color must be hex")]
    public string Color { get; set; } = "#3b82f6";

    public string DurationType { get; set; } = "yearly";
    public string? DurationStart { get; set; }
    public string? DurationEnd { get; set; }
}

public class UpdateHabitDto
{
    [Required(ErrorMessage = "Habit name is required")]
    [StringLength(200, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^#[0-9A-Fa-f]{6}$")]
    public string Color { get; set; } = "#3b82f6";

    public string DurationType { get; set; } = "yearly";
    public string? DurationStart { get; set; }
    public string? DurationEnd { get; set; }
}

public class CreateHabitLogDto
{
    [Required]
    public string HabitId { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{4}-\d{2}-\d{2}$", ErrorMessage = "Date must be YYYY-MM-DD")]
    public string Date { get; set; } = string.Empty;

    public int Value { get; set; } = 1;
}
