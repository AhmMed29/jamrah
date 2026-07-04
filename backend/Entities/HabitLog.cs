using System.Text.Json.Serialization;

namespace Jamrah.Backend.Entities;

public class HabitLog
{
    public int Id { get; set; }
    public string HabitId { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public int Value { get; set; } = 1;
    public string CreatedAt { get; set; } = string.Empty;

    [JsonIgnore] public Habit Habit { get; set; } = null!;
}
