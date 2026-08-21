using SQLite;

namespace Jamrah.Components.Pomodoro;

[Table("PomodoroSession")]
public sealed class Session
{
    [PrimaryKey]
    public string Id { get; set; } = "";
    public string Date { get; set; } = "";
    public string Time { get; set; } = "";
    public string Title { get; set; } = "";
    public string Note { get; set; } = "";
    public int PlannedMinutes { get; set; }
    public int ElapsedSeconds { get; set; }
    public bool Completed { get; set; }
    public int? TagId { get; set; }
    public string TagName { get; set; } = "";
    public string TagColor { get; set; } = "#000000";
    public string SoundFile { get; set; } = "";

    [Ignore]
    public Tag? Tag { get; set; }
}

[Table("PomodoroTag")]
public sealed class Tag
{
    [PrimaryKey, AutoIncrement]
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Color { get; set; } = "#000000";
}

public sealed class SessionGroup
{
    public string Id { get; init; } = "";
    public string Label { get; init; } = "";
    public int Count { get; init; }
    public List<SessionGroup>? Children { get; init; }
    public List<Session>? Sessions { get; init; }
    public bool Open { get; set; }
}
