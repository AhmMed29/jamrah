using System.Threading.Tasks;

namespace Jamrah.Core.Interfaces
{
    public interface IClipAgentService
    {
        bool IsSupported { get; }
        string AgentExePath { get; }
        string ClipsDir { get; }
        string DbPath { get; }
        bool AgentExeExists();
        bool IsAgentRunning();
        Task<bool> IsCaptureEnabledAsync();
        Task SetCaptureEnabledAsync(bool enabled);
        Task<bool> IsAutoStartEnabledAsync();
        Task SetAutoStartEnabledAsync(bool enabled);
        Task ApplyStartupStateAsync();
    }
}
