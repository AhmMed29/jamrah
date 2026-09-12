using System;
using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Jamrah.Core.Interfaces;
using Microsoft.Maui.Storage;

namespace Jamrah.Application.Services
{
    public class ClipAgentService : IClipAgentService
    {
        private readonly ISettingsRepository _settings;

        public ClipAgentService(ISettingsRepository settings)
        {
            _settings = settings;
        }

        public bool IsSupported =>
#if WINDOWS
            true;
#else
            false;
#endif

        public string DbPath => Path.Combine(FileSystem.AppDataDirectory, "jamrah_bookmarks.db3");
        public string ClipsDir => Path.Combine(FileSystem.AppDataDirectory, "clips");
        public string AgentExePath => Path.Combine(AppContext.BaseDirectory, "ClipAgent.exe");

        public bool AgentExeExists()
        {
            try { return IsSupported && File.Exists(AgentExePath); } catch { return false; }
        }

        public bool IsAgentRunning()
        {
            if (!IsSupported) return false;
            try
            {
                foreach (var p in Process.GetProcessesByName("ClipAgent"))
                {
                    try
                    {
                        var path = p.MainModule?.FileName;
                        if (!string.IsNullOrEmpty(path) &&
                            string.Equals(Path.GetFullPath(path), Path.GetFullPath(AgentExePath), StringComparison.OrdinalIgnoreCase))
                            return true;
                    }
                    catch { }
                    finally { try { p.Dispose(); } catch { } }
                }
            }
            catch { }
            return false;
        }

        public async Task<bool> IsCaptureEnabledAsync()
        {
            try
            {
                var v = await _settings.GetAsync("clipagent_enabled").ConfigureAwait(false);
                return v == null || v == "1";
            }
            catch { return true; }
        }

        public async Task SetCaptureEnabledAsync(bool enabled)
        {
            try { await _settings.SetAsync("clipagent_enabled", enabled ? "1" : "0").ConfigureAwait(false); } catch { }
            if (!IsSupported || !AgentExeExists()) return;
            try
            {
                if (enabled)
                {
                    await EnsureConfigAsync().ConfigureAwait(false);
                    if (!IsAgentRunning()) StartAgent();
                }
                else
                {
                    StopAgent();
                }
            }
            catch { }
        }

        public async Task<bool> IsAutoStartEnabledAsync()
        {
            try
            {
                var v = await _settings.GetAsync("clipagent_autostart").ConfigureAwait(false);
                return v == null || v == "1";
            }
            catch { return true; }
        }

        public async Task SetAutoStartEnabledAsync(bool enabled)
        {
            try { await _settings.SetAsync("clipagent_autostart", enabled ? "1" : "0").ConfigureAwait(false); } catch { }
            try { SetRunKey(enabled); } catch { }
        }

        public async Task ApplyStartupStateAsync()
        {
            if (!IsSupported || !AgentExeExists()) return;
            try
            {
                var enabled = await IsCaptureEnabledAsync().ConfigureAwait(false);
                var autoStart = await IsAutoStartEnabledAsync().ConfigureAwait(false);
                await EnsureConfigAsync().ConfigureAwait(false);
                try { SetRunKey(autoStart); } catch { }
                if (enabled && !IsAgentRunning()) StartAgent();
                if (!enabled) StopAgent();
            }
            catch { }
        }

        private async Task EnsureConfigAsync()
        {
            try
            {
                Directory.CreateDirectory(ClipsDir);
                var cfg = new { DbPath, ClipsDir };
                var path = Path.Combine(AppContext.BaseDirectory, "agent-config.json");
                await File.WriteAllTextAsync(path, JsonSerializer.Serialize(cfg)).ConfigureAwait(false);
            }
            catch { }
        }

        private void StartAgent()
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = AgentExePath,
                    WorkingDirectory = Path.GetDirectoryName(AgentExePath) ?? AppContext.BaseDirectory,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                });
            }
            catch { }
        }

        private void StopAgent()
        {
            try
            {
                foreach (var p in Process.GetProcessesByName("ClipAgent"))
                {
                    try
                    {
                        var path = p.MainModule?.FileName;
                        if (!string.IsNullOrEmpty(path) &&
                            string.Equals(Path.GetFullPath(path), Path.GetFullPath(AgentExePath), StringComparison.OrdinalIgnoreCase))
                        {
                            try { p.Kill(); } catch { }
                        }
                    }
                    catch { }
                    finally { try { p.Dispose(); } catch { } }
                }
            }
            catch { }
        }

        private void SetRunKey(bool enabled)
        {
#if WINDOWS
            try
            {
                using var key = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", writable: true);
                if (key == null) return;
                if (enabled) key.SetValue("JamrahClipAgent", AgentExePath);
                else
                {
                    try { key.DeleteValue("JamrahClipAgent", throwOnMissingValue: false); } catch { }
                }
            }
            catch { }
#else
            await Task.CompletedTask;
#endif
        }
    }
}
