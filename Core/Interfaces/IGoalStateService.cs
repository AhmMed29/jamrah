using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Jamrah.Core.Entities;

namespace Jamrah.Core.Interfaces
{
    public interface IGoalStateService
    {
        List<GoalItem> Goals { get; }
        List<Tag> Tags { get; }
        event Action? OnStateChanged;
        Task InitAsync();
        Task RefreshAsync();
        Task AddGoalAsync(GoalItem goal);
        Task UpdateGoalAsync(GoalItem goal);
        Task DeleteGoalAsync(string id);
        Task RecordAsync(string goalId, DateTime day, double amount);
        Task ToggleCheckAsync(string goalId, DateTime day);
        Task SetDayExpectedAsync(string goalId, DateTime day, double? expected);
        Task<int> CreateTagAsync(string name, string color);
        Task<List<GoalRowView>> GetDayRowsAsync(DateTime day);
        Task<List<GoalRowView>> GetWeekRowsAsync(DateTime saturday);
        Task<List<GoalRowView>> GetMonthRowsAsync(int year, int month);
    }
}
