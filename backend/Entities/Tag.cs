using System.Text.Json.Serialization;

namespace Jamrah.Backend.Entities;

public class Tag
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public long CreatedAt { get; set; }

    [JsonIgnore] public ICollection<Session> Sessions { get; set; } = new List<Session>();
    [JsonIgnore] public ICollection<Goal> Goals { get; set; } = new List<Goal>();
}
