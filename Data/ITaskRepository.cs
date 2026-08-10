using System.Collections.Generic;
using System.Threading.Tasks;
using Jamrah.Models;

namespace Jamrah.Data
{
    public interface ITaskRepository
    {
        Task InitAsync();
        Task<List<AppTask>> GetTasksAsync();
        Task SaveTaskAsync(AppTask task);
        Task DeleteTaskAsync(string id);
    }
}
