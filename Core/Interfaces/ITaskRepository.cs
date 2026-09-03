using System.Collections.Generic;
using System.Threading.Tasks;
using Jamrah.Core.Entities;

namespace Jamrah.Core.Interfaces
{
    public interface ITaskRepository
    {
        Task InitAsync();
        
        Task<List<TaskFolder>> GetFoldersAsync();
        Task SaveFolderAsync(TaskFolder folder);
        Task DeleteFolderAsync(string id);
        
        Task<List<KanbanColumn>> GetColumnsAsync();
        Task SaveColumnAsync(KanbanColumn column);
        Task DeleteColumnAsync(string id);

        Task<List<AppTask>> GetTasksAsync();
        Task SaveTaskAsync(AppTask task);
        Task DeleteTaskAsync(string id);
    }
}
