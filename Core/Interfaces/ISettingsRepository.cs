using System.Threading.Tasks;

namespace Jamrah.Core.Interfaces
{
    public interface ISettingsRepository
    {
        Task InitAsync();
        Task<string?> GetAsync(string key);
        Task SetAsync(string key, string value);
        Task<double> GetZoomAsync(string pageKey);
        Task SetZoomAsync(string pageKey, double zoom);
        // UNIFIED (single-WebView layout): one zoom for sidebar + content.
        Task<double> GetUnifiedZoomAsync();
        Task SetUnifiedZoomAsync(double zoom);
    }
}
