namespace Jamrah.Backend.Entities;

public class GoalProgress
{
    public int Id { get; set; }
    public string GoalId { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public double ProgressValue { get; set; }
    public double FocusMinutes { get; set; }

    public Goal Goal { get; set; } = null!;
}
