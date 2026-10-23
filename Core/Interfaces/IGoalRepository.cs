using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Jamrah.Core.Entities;

namespace Jamrah.Core.Interfaces
{
    public interface IGoalRepository
    {
        Task InitAsync();
        Task<List<GoalItem>> GetGoalsAsync();
        Task SaveGoalAsync(GoalItem goal);
        Task DeleteGoalAsync(string id);
        Task<List<GoalLog>> GetLogsAsync(DateTime from, DateTime to);
        Task<GoalLog?> GetLogAsync(string goalId, DateTime day);
        Task SaveLogAsync(GoalLog log);
    }
}
