using System.IO;
using System.Threading.Tasks;
using Jamrah.Core.Interfaces;
using Microsoft.Maui.Storage;

namespace Jamrah.Infrastructure.Repositories
{
    public class PlanningRepository : IPlanningRepository
    {
        private readonly string _filePath;

        public PlanningRepository()
        {
            var dir = Path.Combine(FileSystem.AppDataDirectory, "Planning");
            _filePath = Path.Combine(dir, "note.md");
        }

        public string GetFilePath() => _filePath;

        public async Task<string> LoadAsync()
        {
            try
            {
                if (!File.Exists(_filePath)) return string.Empty;
                return await File.ReadAllTextAsync(_filePath).ConfigureAwait(false);
            }
            catch { return string.Empty; }
        }

        public async Task SaveAsync(string content)
        {
            try
            {
                var dir = Path.GetDirectoryName(_filePath)!;
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                await File.WriteAllTextAsync(_filePath, content ?? string.Empty).ConfigureAwait(false);
            }
            catch { }
        }
    }
}
