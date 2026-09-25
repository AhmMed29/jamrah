using System.Threading.Tasks;

namespace Jamrah.Core.Interfaces
{
    public sealed class TranslatorTestResult
    {
        public bool Ok { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public interface ITranslatorService
    {
        bool IsSupported { get; }
        string AgentExePath { get; }
        bool AgentExeExists();
        bool IsAgentRunning();
        Task<bool> IsEnabledAsync();
        Task SetEnabledAsync(bool enabled);
        Task<bool> IsAutoStartEnabledAsync();
        Task SetAutoStartEnabledAsync(bool enabled);
        Task<string> GetTargetLangAsync();
        Task SetTargetLangAsync(string lang);
        Task<string> GetApiKeyAsync();
        Task SetApiKeyAsync(string key);
        Task<bool> HasApiKeyAsync();
        Task<string> GetModelAsync();
        Task SetModelAsync(string model);
        Task<string> GetPrefsAsync();
        Task SetPrefsAsync(string prefs);
        Task<string> GetHotkeyAsync();
        Task SetHotkeyAsync(string hotkey);
        Task<string> GetActiveHotkeyAsync();
        Task ApplyStartupStateAsync();
        Task RestartAgentAsync();
        Task<bool> EnsureFreshRunningAsync();
        Task SaveAllAsync(bool enabled, bool autoStart, string targetLang, string apiKey, string model, string prefs, string hotkey);
        Task<TranslatorTestResult> TestApiAsync(string apiKey, string model, string targetLang, string prefs);
    }
}
