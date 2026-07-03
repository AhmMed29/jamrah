using System.ComponentModel.DataAnnotations;

namespace Jamrah.Backend.DTOs;

public class CreateTagDto
{
    [Required(ErrorMessage = "Tag ID is required")]
    public string Id { get; set; } = string.Empty;

    [Required(ErrorMessage = "Tag name is required")]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Tag color is required")]
    [RegularExpression("^#[0-9A-Fa-f]{6}$", ErrorMessage = "Color must be hex (e.g. #3B82F6)")]
    public string Color { get; set; } = string.Empty;

    public long? CreatedAt { get; set; }
}
