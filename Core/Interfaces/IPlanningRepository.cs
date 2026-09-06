using System.Threading.Tasks;

namespace Jamrah.Core.Interfaces
{
    public interface IPlanningRepository
    {
        Task<string> LoadAsync();
        Task SaveAsync(string content);
        string GetFilePath();
    }
}
