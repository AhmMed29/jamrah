namespace Jamrah.Components.Pomodoro;

public sealed class Session
{
    public string Id { get; init; } = "";
    public string Date { get; init; } = "";
    public string Title { get; init; } = "";
    public string Time { get; init; } = "";
    public int Duration { get; init; }
    public string Note { get; init; } = "";
    public Tag? Tag { get; init; }
}

public sealed class Tag
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
    public string Color { get; init; } = "#000000";
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
