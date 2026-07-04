using System.Text.Json.Serialization;

namespace Jamrah.Backend.Entities;

public class Habit
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#3b82f6";
    public int SortOrder { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string DurationType { get; set; } = "yearly";
    public string? DurationStart { get; set; }
    public string? DurationEnd { get; set; }

    [JsonIgnore] public ICollection<HabitLog> Logs { get; set; } = new List<HabitLog>();
}
