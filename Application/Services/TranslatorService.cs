using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Jamrah.Core.Interfaces;
using Microsoft.Maui.Storage;

namespace Jamrah.Application.Services
{
    public class TranslatorService : ITranslatorService
    {
        private readonly ISettingsRepository _settings;
        private static readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(25) };

        public TranslatorService(ISettingsRepository settings)
        {
            _settings = settings;
        }

        public bool IsSupported =>
#if WINDOWS
            true;
#else
            false;
#endif

        public string AgentExePath => Path.Combine(AppContext.BaseDirectory, "TranslatorAgent.exe");
        public string ConfigPath => Path.Combine(AppContext.BaseDirectory, "translator-config.json");

        public static string DefaultModel => "gemini-2.5-flash";
        public static string DefaultTarget => "ar";
        public static string DefaultHotkey => "Win+Shift+T";

        public static string NormalizeHotkey(string? v) => (v ?? "").Trim() switch
        {
            "Ctrl+Alt+T" => "Ctrl+Alt+T",
            "Alt+T" => "Alt+T",
            "Ctrl+Shift+T" => "Ctrl+Shift+T",
            _ => "Win+Shift+T",
        };

        public bool AgentExeExists()
        {
            try { return IsSupported && File.Exists(AgentExePath); } catch { return false; }
        }

        public bool IsAgentRunning()
        {
            if (!IsSupported) return false;
            try
            {
                foreach (var p in Process.GetProcessesByName("TranslatorAgent"))
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

        public async Task<bool> IsEnabledAsync()
        {
            try
            {
                var v = await _settings.GetAsync("translator_enabled").ConfigureAwait(false);
                return v == "1";
            }
            catch { return false; }
        }

        public async Task SetEnabledAsync(bool enabled)
        {
            try { await _settings.SetAsync("translator_enabled", enabled ? "1" : "0").ConfigureAwait(false); } catch { }
            if (!IsSupported || !AgentExeExists()) return;
            try
            {
                await EnsureConfigAsync().ConfigureAwait(false);
                if (enabled)
                {
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
                var v = await _settings.GetAsync("translator_autostart").ConfigureAwait(false);
                return v == null || v == "1";
            }
            catch { return true; }
        }

        public async Task SetAutoStartEnabledAsync(bool enabled)
        {
            try { await _settings.SetAsync("translator_autostart", enabled ? "1" : "0").ConfigureAwait(false); } catch { }
            try { SetRunKey(enabled); } catch { }
        }

        public async Task<string> GetTargetLangAsync()
        {
            try
            {
                var v = await _settings.GetAsync("translator_target").ConfigureAwait(false);
                return string.IsNullOrWhiteSpace(v) ? DefaultTarget : v.Trim().ToLowerInvariant();
            }
            catch { return DefaultTarget; }
        }

        public async Task SetTargetLangAsync(string lang)
        {
            try { await _settings.SetAsync("translator_target", (lang ?? DefaultTarget).Trim().ToLowerInvariant()).ConfigureAwait(false); } catch { }
        }

        public async Task<string> GetApiKeyAsync()
        {
            try { return await _settings.GetAsync("translator_apikey").ConfigureAwait(false) ?? string.Empty; }
            catch { return string.Empty; }
        }

        public async Task SetApiKeyAsync(string key)
        {
            try { await _settings.SetAsync("translator_apikey", (key ?? string.Empty).Trim()).ConfigureAwait(false); } catch { }
        }

        public async Task<bool> HasApiKeyAsync()
        {
            var k = await GetApiKeyAsync().ConfigureAwait(false);
            return !string.IsNullOrWhiteSpace(k);
        }

        public async Task<string> GetModelAsync()
        {
            try
            {
                var v = await _settings.GetAsync("translator_model").ConfigureAwait(false);
                return string.IsNullOrWhiteSpace(v) ? DefaultModel : v.Trim();
            }
            catch { return DefaultModel; }
        }

        public async Task SetModelAsync(string model)
        {
            try { await _settings.SetAsync("translator_model", string.IsNullOrWhiteSpace(model) ? DefaultModel : model.Trim()).ConfigureAwait(false); } catch { }
        }

        public async Task<string> GetPrefsAsync()
        {
            try { return await _settings.GetAsync("translator_prefs").ConfigureAwait(false) ?? string.Empty; }
            catch { return string.Empty; }
        }

        public async Task<string> GetHotkeyAsync()
        {
            try
            {
                var v = await _settings.GetAsync("translator_hotkey").ConfigureAwait(false);
                return NormalizeHotkey(string.IsNullOrWhiteSpace(v) ? DefaultHotkey : v);
            }
            catch { return DefaultHotkey; }
        }

        public async Task SetHotkeyAsync(string hotkey)
        {
            try { await _settings.SetAsync("translator_hotkey", NormalizeHotkey(hotkey)).ConfigureAwait(false); } catch { }
        }

        public async Task<string> GetActiveHotkeyAsync()
        {
            // الاختصار المسجل فعلياً لدى الـ agent — "none" تعني تعذر التسجيل (تحذير في الواجهة)
            try
            {
                var path = Path.Combine(AppContext.BaseDirectory, "translator-status.json");
                if (File.Exists(path))
                {
                    var json = await File.ReadAllTextAsync(path).ConfigureAwait(false);
                    using var doc = JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("ActiveHotkey", out var a))
                    {
                        var v = a.GetString();
                        if (!string.IsNullOrWhiteSpace(v)) return v;
                    }
                }
            }
            catch { }
            return "none";
        }

        public async Task SetPrefsAsync(string prefs)
        {
            try { await _settings.SetAsync("translator_prefs", prefs ?? string.Empty).ConfigureAwait(false); } catch { }
        }

        public async Task SaveAllAsync(bool enabled, bool autoStart, string targetLang, string apiKey, string model, string prefs, string hotkey)
        {
            try { await _settings.SetAsync("translator_enabled", enabled ? "1" : "0").ConfigureAwait(false); } catch { }
            try { await _settings.SetAsync("translator_autostart", autoStart ? "1" : "0").ConfigureAwait(false); } catch { }
            try { await _settings.SetAsync("translator_hotkey", NormalizeHotkey(hotkey)).ConfigureAwait(false); } catch { }
            try { await _settings.SetAsync("translator_target", (targetLang ?? DefaultTarget).Trim().ToLowerInvariant()).ConfigureAwait(false); } catch { }
            // apiKey: empty means "keep existing" (UI sends existing masked handling separately)
            if (apiKey != null)
            {
                try { await _settings.SetAsync("translator_apikey", apiKey.Trim()).ConfigureAwait(false); } catch { }
            }
            try { await _settings.SetAsync("translator_model", string.IsNullOrWhiteSpace(model) ? DefaultModel : model.Trim()).ConfigureAwait(false); } catch { }
            try { await _settings.SetAsync("translator_prefs", prefs ?? string.Empty).ConfigureAwait(false); } catch { }

            if (!IsSupported || !AgentExeExists()) return;
            try
            {
                await EnsureConfigAsync().ConfigureAwait(false);
                try { SetRunKey(autoStart); } catch { }
                if (enabled)
                {
                    if (!IsAgentRunning()) StartAgent();
                }
                else
                {
                    StopAgent();
                }
            }
            catch { }
        }

        public async Task ApplyStartupStateAsync()
        {
            if (!IsSupported || !AgentExeExists()) return;
            try
            {
                var enabled = await IsEnabledAsync().ConfigureAwait(false);
                var autoStart = await IsAutoStartEnabledAsync().ConfigureAwait(false);
                await EnsureConfigAsync().ConfigureAwait(false);
                try { SetRunKey(autoStart); } catch { }
                if (enabled && !IsAgentRunning()) StartAgent();
                if (!enabled) StopAgent();
            }
            catch { }
        }

        public async Task RestartAgentAsync()
        {
            if (!IsSupported || !AgentExeExists()) return;
            try
            {
                await EnsureConfigAsync().ConfigureAwait(false);
                StopAgent();
                // انتظر موت القديمة فعلاً (حتى 5 ثوانٍ) قبل تشغيل الجديدة — يمنع تزاحم النسخ
                for (var i = 0; i < 25 && IsAgentRunning(); i++)
                {
                    try { await Task.Delay(200).ConfigureAwait(false); } catch { }
                }
                StartAgent();
            }
            catch { }
        }

        /// <summary>
        /// لو العملية الشغالة أقدم من ملف الـ exe (بناء جديد) يعيد تشغيلها تلقائياً.
        /// تُستدعى عند فتح الإعدادات — فلا حاجة لقتل العملية يدوياً بعد كل بناء.
        /// </summary>
        public async Task<bool> EnsureFreshRunningAsync()
        {
            if (!IsSupported || !AgentExeExists()) return false;
            try
            {
                if (!await IsEnabledAsync().ConfigureAwait(false)) return false;
                var procs = Process.GetProcessesByName("TranslatorAgent");
                try
                {
                    foreach (var p in procs)
                    {
                        string? path = null;
                        DateTime start = DateTime.MinValue;
                        try { path = p.MainModule?.FileName; start = p.StartTime; } catch { }
                        if (!string.IsNullOrEmpty(path) &&
                            string.Equals(Path.GetFullPath(path), Path.GetFullPath(AgentExePath), StringComparison.OrdinalIgnoreCase))
                        {
                            var built = File.GetLastWriteTime(AgentExePath);
                            if (built > start.AddMinutes(1))
                            {
                                await RestartAgentAsync().ConfigureAwait(false);
                                return true;
                            }
                            return false;
                        }
                    }
                    // مفعّل لكن مش شغال → شغّله
                    await EnsureConfigAsync().ConfigureAwait(false);
                    StartAgent();
                    return true;
                }
                finally { foreach (var p in procs) try { p.Dispose(); } catch { } }
            }
            catch { return false; }
        }

        private async Task EnsureConfigAsync()
        {
            try
            {
                // دمج: مفاتيح الخدمة تكتب، وباقي الحقول (مثل Source الذي يكتبه الـ agent) تُحفظ كما هي
                var merged = new Dictionary<string, object?>();
                try
                {
                    if (File.Exists(ConfigPath))
                    {
                        var old = await File.ReadAllTextAsync(ConfigPath).ConfigureAwait(false);
                        var d = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(old);
                        if (d != null)
                            foreach (var kv in d)
                                merged[kv.Key] = kv.Value;
                    }
                }
                catch { }
                merged["Enabled"] = await IsEnabledAsync().ConfigureAwait(false);
                merged["TargetLang"] = await GetTargetLangAsync().ConfigureAwait(false);
                merged["ApiKey"] = await GetApiKeyAsync().ConfigureAwait(false);
                merged["Model"] = await GetModelAsync().ConfigureAwait(false);
                merged["Prefs"] = await GetPrefsAsync().ConfigureAwait(false);
                merged["Hotkey"] = await GetHotkeyAsync().ConfigureAwait(false);
                await File.WriteAllTextAsync(ConfigPath, JsonSerializer.Serialize(merged)).ConfigureAwait(false);
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
                foreach (var p in Process.GetProcessesByName("TranslatorAgent"))
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
                if (enabled) key.SetValue("JamrahTranslatorAgent", AgentExePath);
                else
                {
                    try { key.DeleteValue("JamrahTranslatorAgent", throwOnMissingValue: false); } catch { }
                }
            }
            catch { }
#endif
        }

        public async Task<TranslatorTestResult> TestApiAsync(string apiKey, string model, string targetLang, string prefs)
        {
            apiKey = (apiKey ?? string.Empty).Trim();
            model = string.IsNullOrWhiteSpace(model) ? DefaultModel : model.Trim();
            targetLang = string.IsNullOrWhiteSpace(targetLang) ? DefaultTarget : targetLang.Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(apiKey))
                return new TranslatorTestResult { Ok = false, Message = "ضع مفتاح Gemini أولاً (AIza...)" };
            try
            {
                var prompt = TranslatorPrompt.Build("Hello, how are you?", targetLang, prefs ?? string.Empty);
                var url = $"https://generativelanguage.googleapis.com/v1beta/models/{Uri.EscapeDataString(model)}:generateContent?key={Uri.EscapeDataString(apiKey)}";
                var body = JsonSerializer.Serialize(new
                {
                    contents = new[] { new { parts = new[] { new { text = prompt } } } },
                    generationConfig = new { temperature = 0.2, maxOutputTokens = 500 }
                });
                using var req = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = new StringContent(body, Encoding.UTF8, "application/json")
                };
                using var res = await _http.SendAsync(req).ConfigureAwait(false);
                var json = await res.Content.ReadAsStringAsync().ConfigureAwait(false);
                if (!res.IsSuccessStatusCode)
                    return new TranslatorTestResult { Ok = false, Message = $"Gemini رفض الطلب ({(int)res.StatusCode}): {Trim(json, 300)}" };
                var text = TranslatorPrompt.ExtractGeminiText(json);
                if (string.IsNullOrWhiteSpace(text))
                    return new TranslatorTestResult { Ok = false, Message = "المفتاح شغال لكن الرد فارغ — جرّب موديل آخر." };
                return new TranslatorTestResult { Ok = true, Message = "تمام ✓ — " + Trim(text, 200) };
            }
            catch (Exception ex)
            {
                return new TranslatorTestResult { Ok = false, Message = "تعذر الاتصال: " + ex.Message };
            }
        }

        private static string Trim(string s, int n)
        {
            if (string.IsNullOrEmpty(s)) return string.Empty;
            s = s.Trim();
            return s.Length > n ? s.Substring(0, n) + "…" : s;
        }
    }

    internal static class TranslatorPrompt
    {
        public static string TargetName(string code) => (code ?? "ar").ToLowerInvariant() switch
        {
            "ar" => "Arabic",
            "en" => "English",
            "fr" => "French",
            "de" => "German",
            "es" => "Spanish",
            "tr" => "Turkish",
            "ur" => "Urdu",
            _ => code ?? "Arabic",
        };

        // System prompt ثابت في الكود — الرد ترجمة فقط للغة المستهدفة.
        public static string Build(string text, string targetLang, string prefs)
        {
            var sb = new StringBuilder();
            sb.Append("You are a translator. Reply with ONLY the translation into ");
            sb.Append(TargetName(targetLang));
            sb.Append(". No explanations, no quotes, no source text repetition.");
            if (!string.IsNullOrWhiteSpace(prefs))
            {
                sb.Append(" User preferences: ");
                sb.Append(prefs.Trim());
            }
            sb.Append("\n\nText to translate:\n");
            sb.Append(text);
            return sb.ToString();
        }

        public static string ExtractGeminiText(string json)
        {
            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                if (!root.TryGetProperty("candidates", out var cands) || cands.GetArrayLength() == 0) return string.Empty;
                var content = cands[0].GetProperty("content");
                var parts = content.GetProperty("parts");
                var sb = new StringBuilder();
                foreach (var p in parts.EnumerateArray())
                {
                    if (p.TryGetProperty("text", out var t))
                        sb.Append(t.GetString());
                }
                return sb.ToString().Trim();
            }
            catch { return string.Empty; }
        }
    }
}
