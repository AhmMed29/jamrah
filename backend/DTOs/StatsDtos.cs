namespace Jamrah.Backend.DTOs;

public class StatsDto
{
    public int TodayPomos { get; set; }
    public double TodayFocusMinutes { get; set; }
    public int TotalPomos { get; set; }
    public double TotalFocusMinutes { get; set; }
}

public class TodayStatsDto
{
    public int TodayPomos { get; set; }
    public double TodayFocusMinutes { get; set; }
}

public class TotalStatsDto
{
    public int TotalPomos { get; set; }
    public double TotalFocusMinutes { get; set; }
}
