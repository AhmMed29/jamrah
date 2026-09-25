using System.Drawing;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Windows.Forms;

namespace Jamrah.TranslatorAgent;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        using var mutex = new Mutex(true, "JamrahTranslatorAgentSingleInstance", out var owned);
        if (!owned) return;
        try
        {
            // NOTE: unlike ClipAgent, we do NOT exit when config is missing.
            // Run with safe defaults so the Run-key autostart works on first reboot.
            var cfg = AgentConfig.LoadOrDefault();
            ApplicationConfiguration.Initialize();
            Application.Run(new AgentAppContext(cfg));
        }
        catch (Exception ex)
        {
            try { AgentLog.Log("FATAL main: " + ex.ToString().Substring(0, Math.Min(800, ex.ToString().Length))); } catch { }
        }
    }
}

internal sealed class AgentConfig
{
    public bool Enabled { get; set; } = true;
    public string TargetLang { get; set; } = "ar";
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "gemini-2.5-flash";
    public string Prefs { get; set; } = string.Empty;
    public string Hotkey { get; set; } = "Win+Shift+T";
    public string Source { get; set; } = "auto";

    public static (uint mod, uint vk, string label) ParseHotkey(string? v)
    {
        return (v ?? "").Trim() switch
        {
            "Ctrl+Alt+T" => (0x0002u | 0x0001u, 0x54u, "Ctrl+Alt+T"),
            "Alt+T" => (0x0001u, 0x54u, "Alt+T"),
            "Ctrl+Shift+T" => (0x0002u | 0x0004u, 0x54u, "Ctrl+Shift+T"),
            _ => (0x0008u | 0x0004u, 0x54u, "Win+Shift+T"),
        };
    }

    public static string ConfigPath => Path.Combine(AppContext.BaseDirectory, "translator-config.json");

    public static AgentConfig LoadOrDefault()
    {
        try
        {
            if (File.Exists(ConfigPath))
            {
                var cfg = JsonSerializer.Deserialize<AgentConfig>(File.ReadAllText(ConfigPath));
                if (cfg != null)
                {
                    if (string.IsNullOrWhiteSpace(cfg.TargetLang)) cfg.TargetLang = "ar";
                    if (string.IsNullOrWhiteSpace(cfg.Model)) cfg.Model = "gemini-2.5-flash";
                    cfg.TargetLang = cfg.TargetLang.Trim().ToLowerInvariant();
                    cfg.Hotkey = ParseHotkey(cfg.Hotkey).label;
                    cfg.Source = Translator.NormalizeSource(cfg.Source);
                    return cfg;
                }
            }
        }
        catch { }
        return new AgentConfig();
    }

    public static void SaveSource(string source)
    {
        try
        {
            var cfg = LoadOrDefault();
            cfg.Source = Translator.NormalizeSource(source);
            File.WriteAllText(ConfigPath, JsonSerializer.Serialize(cfg));
        }
        catch (Exception ex) { AgentLog.Log("ERR save-source: " + ex.Message); }
    }

    /// <summary>هل الحزمة المحلية (ONNX) مثبتة؟ الزر المحلي مخفي حتى تجهز.</summary>
    public static bool HasLocalPack()
    {
        try
        {
            var dir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "Jamrah", "models");
            if (!Directory.Exists(dir)) return false;
            return Directory.GetFiles(dir, "*.onnx", SearchOption.AllDirectories).Length > 0;
        }
        catch { return false; }
    }
}

internal sealed class TranslationResult
{
    public bool Ok { get; set; }
    public string Text { get; set; } = string.Empty;
    public string Source { get; set; } = "error"; // gemini | google | cache | error
}

internal static class Translator
{
    private static readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(25) };
    private static readonly Dictionary<string, string> _cache = new();
    private static string CachePath => Path.Combine(AppContext.BaseDirectory, "translator-cache.json");

    static Translator()
    {
        try
        {
            if (File.Exists(CachePath))
            {
                var d = JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(CachePath));
                if (d != null)
                    foreach (var kv in d.Take(200))
                        _cache[kv.Key] = kv.Value;
            }
        }
        catch { }
    }

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

    // System prompt ثابت في الكود: رد بالترجمة فقط للغة المستهدفة.
    public static string BuildPrompt(string text, AgentConfig cfg)
    {
        var sb = new StringBuilder();
        sb.Append("You are a translator. Reply with ONLY the translation into ");
        sb.Append(TargetName(cfg.TargetLang));
        sb.Append(". No explanations, no quotes, no source text repetition.");
        if (!string.IsNullOrWhiteSpace(cfg.Prefs))
        {
            sb.Append(" User preferences: ");
            sb.Append(cfg.Prefs.Trim());
        }
        sb.Append("\n\nText to translate:\n");
        sb.Append(text);
        return sb.ToString();
    }

    public static string NormalizeSource(string? v) => (v ?? "auto").Trim().ToLowerInvariant() switch
    {
        "gemini" => "gemini",
        "google" => "google",
        "local" => "local",
        _ => "auto",
    };

    /// <summary>ترجمة بمصدر محدد: auto (السلسلة) أو gemini/google/local — مع سبب واضح عند الفشل.</summary>
    public static async Task<TranslationResult> TranslateWithSource(string text, AgentConfig cfg, string source)
    {
        text = (text ?? string.Empty).Trim();
        if (text.Length == 0)
            return new TranslationResult { Ok = false, Text = "اكتب أو الصق نصاً أولاً ثم اضغط ترجم." };
        if (text.Length > 5000)
            text = text.Substring(0, 5000);
        source = NormalizeSource(source);

        if (source is "auto" or "gemini")
        {
            if (string.IsNullOrWhiteSpace(cfg.ApiKey))
            {
                if (source == "gemini")
                    return Fail("لا يوجد مفتاح Gemini — ضعه من إعدادات Jamrah أو اختر مصدراً آخر.");
            }
            else
            {
                var (r, err) = await TryGeminiAsync(text, cfg).ConfigureAwait(false);
                if (r != null)
                {
                    SaveCache(text, cfg.TargetLang, r);
                    return new TranslationResult { Ok = true, Text = r, Source = "gemini" };
                }
                if (source == "gemini")
                    return Fail("تعذر Gemini (" + err + ") — تحقق من المفتاح والموديل والإنترنت.");
                AgentLog.Log("WARN gemini failed (" + err + "), falling back");
            }
        }

        if (source is "auto" or "google")
        {
            try
            {
                var r = await TryGoogleFreeAsync(text, cfg.TargetLang).ConfigureAwait(false);
                if (!string.IsNullOrWhiteSpace(r))
                {
                    SaveCache(text, cfg.TargetLang, r);
                    return new TranslationResult { Ok = true, Text = r, Source = "google" };
                }
                if (source == "google")
                    return Fail("تعذر جوجل (رد فارغ) — تحقق من الإنترنت.");
            }
            catch (Exception ex)
            {
                if (source == "google")
                    return Fail("تعذر جوجل (" + ShortErr(ex.Message) + ") — تحقق من الإنترنت.");
            }
            if (source == "auto") AgentLog.Log("WARN google failed, falling back to cache");
        }

        if (source is "auto" or "local")
        {
            var key = CacheKey(text, cfg.TargetLang);
            if (_cache.TryGetValue(key, out var cached))
                return new TranslationResult { Ok = true, Text = cached, Source = source == "local" ? "local" : "cache" };
            if (source == "local")
                return Fail("لا توجد ترجمة محفوظة لهذا النص — الحزمة المحلية الكاملة لم تُثبت بعد.");
        }

        return Fail("تعذر الاتصال بخدمة الترجمة. تحقق من الإنترنت أو مفتاح Gemini من إعدادات Jamrah.");
    }

    private static TranslationResult Fail(string msg) => new() { Ok = false, Text = msg };

    private static string ShortErr(string s)
    {
        try
        {
            s = (s ?? "").Trim();
            return s.Length > 150 ? s.Substring(0, 150) + "…" : s;
        }
        catch { return ""; }
    }

    public static Task<TranslationResult> TranslateAsync(string text, AgentConfig cfg)
        => TranslateWithSource(text, cfg, "auto");

    private static async Task<(string? text, string err)> TryGeminiAsync(string text, AgentConfig cfg)
    {
        try
        {
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{Uri.EscapeDataString(cfg.Model)}:generateContent?key={Uri.EscapeDataString(cfg.ApiKey)}";
            var body = JsonSerializer.Serialize(new
            {
                contents = new[] { new { parts = new[] { new { text = BuildPrompt(text, cfg) } } } },
                generationConfig = new { temperature = 0.2, maxOutputTokens = 2000 }
            });
            using var req = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            };
            using var res = await _http.SendAsync(req).ConfigureAwait(false);
            var json = await res.Content.ReadAsStringAsync().ConfigureAwait(false);
            if (!res.IsSuccessStatusCode) return (null, "HTTP " + (int)res.StatusCode);
            try
            {
                using var doc = JsonDocument.Parse(json);
                var cands = doc.RootElement.GetProperty("candidates");
                if (cands.GetArrayLength() == 0) return (null, "رد فارغ");
                var parts = cands[0].GetProperty("content").GetProperty("parts");
                var sb = new StringBuilder();
                foreach (var p in parts.EnumerateArray())
                    if (p.TryGetProperty("text", out var t))
                        sb.Append(t.GetString());
                var out_ = sb.ToString().Trim();
                return string.IsNullOrEmpty(out_) ? (null, "رد فارغ") : (out_, "");
            }
            catch { return (null, "رد غير مفهوم"); }
        }
        catch (Exception ex) { return (null, ShortErr(ex.Message)); }
    }

    private static async Task<string?> TryGoogleFreeAsync(string text, string target)
    {
        var url = $"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={Uri.EscapeDataString(target)}&dt=t&q={Uri.EscapeDataString(text)}";
        var json = await _http.GetStringAsync(url).ConfigureAwait(false);
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var sb = new StringBuilder();
            foreach (var sentence in root[0].EnumerateArray())
                sb.Append(sentence[0].GetString());
            var out_ = sb.ToString().Trim();
            return string.IsNullOrEmpty(out_) ? null : out_;
        }
        catch { return null; }
    }

    private static string CacheKey(string text, string lang) => lang + "::" + text;

    private static void SaveCache(string text, string lang, string translated)
    {
        try
        {
            _cache[CacheKey(text, lang)] = translated;
            // persist آخر 200 فقط — بدون await لأننا في background
            var snapshot = _cache.Take(200).ToDictionary(kv => kv.Key, kv => kv.Value);
            File.WriteAllText(CachePath, JsonSerializer.Serialize(snapshot));
        }
        catch { }
    }
}

/// <summary>سجل تشخيصي بسيط — أي فشل يتسجل هنا بدل البلع الصامت.</summary>
internal static class AgentLog
{
    private static readonly object _lock = new();
    private static string LogPath => Path.Combine(AppContext.BaseDirectory, "translator-agent.log");

    public static void Log(string msg)
    {
        try
        {
            var line = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + " " + msg + Environment.NewLine;
            lock (_lock)
            {
                try
                {
                    // BOM عند الإنشاء حتى يُقرأ العربي سليماً في المفكرة
                    if (!File.Exists(LogPath))
                        File.WriteAllText(LogPath, "", new UTF8Encoding(true));
                    File.AppendAllText(LogPath, line, Encoding.UTF8);
                }
                catch { }
            }
            // قص الملف لو كبر عن ~200KB حتى لا يأكل المساحة
            try
            {
                var fi = new FileInfo(LogPath);
                if (fi.Exists && fi.Length > 200 * 1024)
                    File.WriteAllText(LogPath, "[truncated]" + Environment.NewLine + line);
            }
            catch { }
        }
        catch { }
    }
}

internal static class SelectionCapture
{
    // NOTE: الـ union لازم يكون بحجمه الأصلي (40 بايت على x64) وإلا SendInput يرفض بـ 87.
    [StructLayout(LayoutKind.Sequential)] private struct INPUT
    {
        public uint type;
        public InputUnion U;
    }
    [StructLayout(LayoutKind.Explicit)] private struct InputUnion
    {
        [FieldOffset(0)] public MOUSEINPUT mi;
        [FieldOffset(0)] public KEYBDINPUT ki;
        [FieldOffset(0)] public HARDWAREINPUT hi;
    }
    [StructLayout(LayoutKind.Sequential)] private struct MOUSEINPUT
    {
        public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo;
    }
    [StructLayout(LayoutKind.Sequential)] private struct HARDWAREINPUT
    {
        public uint uMsg; public ushort wParamL; public ushort wParamH;
    }
    [StructLayout(LayoutKind.Sequential)] private struct KEYBDINPUT
    {
        public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo;
    }
    private const uint INPUT_KEYBOARD = 1;
    private const uint KEYEVENTF_KEYUP = 0x0002;
    private const ushort VK_CONTROL = 0x11;
    private const ushort VK_C = 0x43;

    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    private static INPUT KeyDown(ushort vk) => new() { type = INPUT_KEYBOARD, U = new InputUnion { ki = new KEYBDINPUT { wVk = vk } } };
    private static INPUT KeyUp(ushort vk) => new() { type = INPUT_KEYBOARD, U = new InputUnion { ki = new KEYBDINPUT { wVk = vk, dwFlags = KEYEVENTF_KEYUP } } };

    private static string? TryGetClipboardText()
    {
        try
        {
            if (Clipboard.ContainsText())
                return Clipboard.GetText();
        }
        catch (Exception ex) { AgentLog.Log("WARN clip-read: " + ex.Message); }
        return null;
    }

    /// <summary>
    /// الالتقاط الكامل — يجب النداء من الـ UI thread (Clipboard يشترط STA+pump).
    /// لا يجمد الواجهة: كل الانتظارات await. بدون Clear وبدون استعادة (مقارنة بالأصل).
    /// </summary>
    public static async Task<string?> CaptureAsync()
    {
        // حيلة Ctrl+C بمقارنة الأصل — بدون Clear وبدون استعادة (لا تدمير أصلاً)
        string? original = TryGetClipboardText();
        try
        {
            var inputs = new[] { KeyDown(VK_CONTROL), KeyDown(VK_C), KeyUp(VK_C), KeyUp(VK_CONTROL) };
            var sent = SendInput((uint)inputs.Length, inputs, Marshal.SizeOf<INPUT>());
            if (sent != (uint)inputs.Length)
            {
                int err;
                try { err = Marshal.GetLastWin32Error(); } catch { err = -999; }
                AgentLog.Log("WARN SendInput sent " + sent + "/" + inputs.Length + " win32err=" + err + " cbSize=" + Marshal.SizeOf<INPUT>());
                return null;
            }
        }
        catch (Exception ex) { AgentLog.Log("ERR SendInput: " + ex.Message); return null; }

        for (var i = 0; i < 10; i++)
        {
            await Task.Delay(200).ConfigureAwait(true);
            var cur = TryGetClipboardText()?.Trim();
            if (!string.IsNullOrEmpty(cur) && cur != original)
            {
                AgentLog.Log("capture clip len=" + cur.Length + " tries=" + i);
                return cur;
            }
        }
        AgentLog.Log("capture empty (origLen=" + (original?.Length ?? -1) + ")");
        return null;
    }
}

internal static class MouseHook
{
    private const int WH_MOUSE_LL = 14;
    private const int WM_LBUTTONDOWN = 0x0201;
    private const int WM_LBUTTONUP = 0x0202;
    private const int WM_MOUSEMOVE = 0x0200;
    private const int VK_LBUTTON = 0x01;

    private delegate IntPtr HookProc(int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, HookProc lpfn, IntPtr hMod, uint dwThreadId);
    [DllImport("user32.dll")]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);
    [DllImport("user32.dll")]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr GetModuleHandle(string? lpModuleName);
    [DllImport("user32.dll")]
    private static extern bool GetCursorPos(out POINT lpPoint);
    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int vKey);

    [StructLayout(LayoutKind.Sequential)] private struct POINT { public int X; public int Y; }

    private static HookProc? _proc;
    private static IntPtr _hook;
    private static Action<Point>? _onMouseDown;
    private static Action<Point>? _onMouseUp;
    private static Action<Point>? _onHoverMove;

    public static bool IsInstalled => _hook != IntPtr.Zero;

    public static void Start(Action<Point> onMouseDown, Action<Point> onMouseUp, Action<Point> onHoverMove)
    {
        _onMouseDown = onMouseDown;
        _onMouseUp = onMouseUp;
        _onHoverMove = onHoverMove;
        _proc = HookCallback;
        try
        {
            var mod = GetModuleHandle(null);
            _hook = SetWindowsHookEx(WH_MOUSE_LL, _proc, mod, 0);
            AgentLog.Log(_hook != IntPtr.Zero ? "mouse hook installed" : "ERR mouse hook FAILED (null)");
        }
        catch (Exception ex) { AgentLog.Log("ERR mouse hook: " + ex.Message); }
    }

    public static void Stop()
    {
        try { if (_hook != IntPtr.Zero) UnhookWindowsHookEx(_hook); } catch { }
        _hook = IntPtr.Zero;
    }

    private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
    {
        try
        {
            if (nCode >= 0)
            {
                if (wParam == (IntPtr)WM_LBUTTONDOWN)
                {
                    var cb = _onMouseDown;
                    if (cb != null)
                    {
                        var captured = ReadHookPoint(lParam);
                        _ = Task.Run(() => { try { cb(captured); } catch (Exception ex) { AgentLog.Log("ERR mousedown-cb: " + ex.Message); } });
                    }
                }
                else if (wParam == (IntPtr)WM_LBUTTONUP)
                {
                    Point pt = new(200, 200);
                    try
                    {
                        if (GetCursorPos(out var p)) pt = new Point(p.X, p.Y);
                    }
                    catch { }
                    var cb = _onMouseUp;
                    // لا ننفذ مباشرة داخل الهوك — نمرر خارجها فوراً
                    if (cb != null)
                    {
                        var captured = pt;
                        _ = Task.Run(() => { try { cb(captured); } catch (Exception ex) { AgentLog.Log("ERR mouseup-cb: " + ex.Message); } });
                    }
                }
                else if (wParam == (IntPtr)WM_MOUSEMOVE)
                {
                    // هوفر فقط عندما لا يوجد زر مضغوط
                    bool anyDown;
                    try { anyDown = (GetAsyncKeyState(VK_LBUTTON) & 0x8000) != 0; }
                    catch { anyDown = false; }
                    if (!anyDown)
                    {
                        var pt = ReadHookPoint(lParam);
                        var cb = _onHoverMove;
                        if (cb != null && pt != Point.Empty)
                        {
                            var captured = pt;
                            _ = Task.Run(() => { try { cb(captured); } catch (Exception ex) { AgentLog.Log("ERR hover-cb: " + ex.Message); } });
                        }
                    }
                }
            }
        }
        catch { }
        try { return CallNextHookEx(_hook, nCode, wParam, lParam); }
        catch { return IntPtr.Zero; }
    }

    private static Point ReadHookPoint(IntPtr lParam)
    {
        try
        {
            var raw = Marshal.PtrToStructure<POINT>(lParam);
            return new Point(raw.X, raw.Y);
        }
        catch { return Point.Empty; }
    }
}

internal sealed class AgentAppContext : ApplicationContext
{
    private const int WM_HOTKEY = 0x0312;
    private const int HOTKEY_ID = 101;

    private AgentConfig _cfg;
    private readonly HotkeyHostForm _host;
    private readonly PillForm _pill;
    private readonly TranslatePopupForm _popup;
    private readonly FileSystemWatcher _watcher;
    private DateTime _lastWatchReload = DateTime.MinValue;
    // حالة التحديد: فحص صامت لحظة الفك + إظهار على الهوفر فقط
    private Point _lastMouseDownPt;
    private bool _downInOwn;
    private string? _selectedText;
    private DateTime _selectedAt = DateTime.MinValue;
    private Point _releasePt;
    private bool _armed;
    private int _gestureId;
    private int _busy;
    private string _hotkeyLabel = "Win+Shift+T";
    private readonly System.Windows.Forms.Timer _showTimer;

    [DllImport("user32.dll", SetLastError = true)] private static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);
    [DllImport("user32.dll")] private static extern bool UnregisterHotKey(IntPtr hWnd, int id);

    public AgentAppContext(AgentConfig cfg)
    {
        _cfg = cfg;
        AgentLog.Log("agent start enabled=" + cfg.Enabled + " target=" + cfg.TargetLang + " model=" + cfg.Model);
        try { AgentLog.Log("agent binary built " + File.GetLastWriteTime(Environment.ProcessPath ?? Application.ExecutablePath)); } catch { }
        _pill = new PillForm(OnPillClicked);
        _popup = new TranslatePopupForm(
            getSource: () => _cfg.Source,
            saveSource: s => { AgentConfig.SaveSource(s); try { _cfg = AgentConfig.LoadOrDefault(); } catch { } },
            hasLocal: () => AgentConfig.HasLocalPack());
        _popup.TranslateRequested += OnManualTranslate;
        _host = new HotkeyHostForm(OnHotkeyPressed);
        // إنشاء الـ handles على الـ UI thread — بدونه Invoke/Show يفشل بصمت
        _host.CreateControl();
        try { _pill.CreateControl(); } catch (Exception ex) { AgentLog.Log("ERR pill handle: " + ex.Message); }
        try { _popup.CreateControl(); } catch (Exception ex) { AgentLog.Log("ERR popup handle: " + ex.Message); }
        RegisterHotkey();
        MouseHook.Start(OnMouseDown, OnMouseUp, OnHoverMove);
        _showTimer = new System.Windows.Forms.Timer { Interval = 2000 };
        _showTimer.Tick += OnShowTimer;

        _watcher = new FileSystemWatcher(AppContext.BaseDirectory, "translator-config.json")
        {
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.Size,
            EnableRaisingEvents = true,
        };
        _watcher.Changed += (_, __) =>
        {
            try
            {
                // debounce
                if ((DateTime.Now - _lastWatchReload).TotalMilliseconds < 800) return;
                _lastWatchReload = DateTime.Now;
                _cfg = AgentConfig.LoadOrDefault();
                AgentLog.Log("config reloaded enabled=" + _cfg.Enabled + " hotkey=" + _cfg.Hotkey);
                RegisterHotkey();
            }
            catch (Exception ex) { AgentLog.Log("ERR config-reload: " + ex.Message); }
        };
    }

    private void RegisterHotkey()
    {
        if (TryRegisterOnce()) return;
        // قد تكون نسخة قديمة في طريقها للموت — أعد المحاولة مرتين بفاصل ثانيتين
        _ = Task.Run(async () =>
        {
            try
            {
                for (var i = 0; i < 2; i++)
                {
                    await Task.Delay(2000).ConfigureAwait(false);
                    if (TryRegisterOnce()) return;
                }
                AgentLog.Log("ERR no hotkey could be registered after retries");
            }
            catch { }
        });
    }

    private bool TryRegisterOnce()
    {
        try { UnregisterHotKey(_host.Handle, HOTKEY_ID); } catch { }
        // المطلوب أولاً ثم البدائل — لو اختصار محجوز من برنامج آخر نأخذ التالي تلقائياً
        var ordered = new List<string> { _cfg.Hotkey, "Win+Shift+T", "Ctrl+Alt+T", "Alt+T" };
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var h in ordered)
        {
            var (mod, vk, label) = AgentConfig.ParseHotkey(h);
            if (!seen.Add(label)) continue;
            try
            {
                if (RegisterHotKey(_host.Handle, HOTKEY_ID, mod, vk))
                {
                    _hotkeyLabel = label;
                    AgentLog.Log("hotkey " + label + " registered");
                    WriteStatus(label);
                    return true;
                }
                AgentLog.Log("WARN hotkey " + label + " busy, trying next");
            }
            catch (Exception ex) { AgentLog.Log("ERR hotkey " + label + ": " + ex.Message); }
        }
        AgentLog.Log("WARN no hotkey free right now");
        WriteStatus("none");
        return false;
    }

    private static void WriteStatus(string activeHotkey)
    {
        try
        {
            var path = Path.Combine(AppContext.BaseDirectory, "translator-status.json");
            File.WriteAllText(path, JsonSerializer.Serialize(new { ActiveHotkey = activeHotkey, UpdatedAt = DateTime.Now }));
        }
        catch { }
    }

    private void CancelPending()
    {
        try
        {
            _gestureId++;
            _showTimer.Stop();
        }
        catch { }
    }

    private void OnMouseDown(Point cursor)
    {
        try
        {
            CancelPending();
            _armed = false;
            _selectedText = null;
            _lastMouseDownPt = cursor;
            _downInOwn = IsInsideOwnWindows(cursor);
            // أي كليك يخفي الدايرة لو ظاهرة (ضغط بره = إخفاء)
            _pill.InvokeIfNeeded(_pill.HidePill);
        }
        catch { }
    }

    private void OnMouseUp(Point cursor)
    {
        try
        {
            CancelPending();
            _armed = false;
            if (!_cfg.Enabled) return;
            if (_downInOwn || IsInsideOwnWindows(cursor)) { _selectedText = null; return; }
            var dx = cursor.X - _lastMouseDownPt.X;
            var dy = cursor.Y - _lastMouseDownPt.Y;
            // كليك عادي (بدون سحب) → لا فحص ولا دايرة نهائياً
            if (dx * dx + dy * dy < 144) { _selectedText = null; return; }
            // سحب: فحص صامت — الدايرة لا تظهر إلا لو فيه نص محدد فعلاً.
            // الالتقاط على الـ UI thread (Clipboard يشترط STA+pump) مع awaits لا تجمد الواجهة.
            var gid = _gestureId;
            var pt = cursor;
            try
            {
                _host.BeginInvoke(new Func<Task>(async () =>
                {
                    try
                    {
                        var text = await SelectionCapture.CaptureAsync();
                        if (string.IsNullOrWhiteSpace(text)) return; // لا تحديد حقيقي → صمت تام
                        if (gid != _gestureId) return; // إيماءة أحدث سبقت → تجاهل
                        _selectedText = text;
                        _selectedAt = DateTime.Now;
                        _releasePt = pt;
                        _armed = true;
                        AgentLog.Log("probe armed len=" + text.Length);
                    }
                    catch (Exception ex) { AgentLog.Log("ERR probe: " + ex.Message); }
                }));
            }
            catch (Exception ex) { AgentLog.Log("ERR probe-invoke: " + ex.Message); }
        }
        catch (Exception ex) { AgentLog.Log("ERR mouseup: " + ex.Message); }
    }

    private void OnHoverMove(Point cursor)
    {
        try
        {
            // الدايرة لا تظهر إلا بشرطين معاً: تحديد حقيقي مخزن + هوفر على التحديد
            if (!_cfg.Enabled || !_armed) return;
            if (_popup.Visible) return;
            if (IsInsideOwnWindows(cursor)) return;
            if ((DateTime.Now - _selectedAt).TotalMilliseconds > 6000) { _armed = false; return; }
            var dx = cursor.X - _releasePt.X;
            var dy = cursor.Y - _releasePt.Y;
            if (dx * dx + dy * dy > 140 * 140) return; // بعيد عن التحديد → ليس هوفر عليه
            if (_pill.Visible) return;
            bool pending;
            try { pending = _showTimer.Enabled; } catch { pending = false; }
            if (pending) return;
            _showTimer.Tag = _gestureId;
            AgentLog.Log("hover on selection — pill in 2s");
            _showTimer.Start();
        }
        catch (Exception ex) { AgentLog.Log("ERR hover: " + ex.Message); }
    }

    private void OnShowTimer(object? s, EventArgs e)
    {
        try
        {
            _showTimer.Stop();
            if (!_cfg.Enabled || !_armed) return;
            if (_popup.Visible) return;
            if (_showTimer.Tag is not int gid || gid != _gestureId) return;
            Point at;
            try { at = Cursor.Position; } catch { at = _releasePt; }
            AgentLog.Log("pill show after hover+2s at " + at.X + "," + at.Y);
            var c = at;
            _pill.InvokeIfNeeded(() => _pill.ShowNear(c));
        }
        catch (Exception ex) { AgentLog.Log("ERR showtimer: " + ex.Message); }
    }

    private static bool IsRtl(string textOrLang)
    {
        try
        {
            var s = (textOrLang ?? "").Trim().ToLowerInvariant();
            if (s is "ar" or "ur" or "fa" or "he") return true;
            foreach (var ch in textOrLang ?? "")
                if (ch >= '\u0600' && ch <= '\u06FF') return true;
        }
        catch { }
        return false;
    }

    private bool IsInsideOwnWindows(Point p)
    {
        try
        {
            if (_pill.Visible && _pill.Bounds.Contains(p)) return true;
            if (_popup.Visible && _popup.Bounds.Contains(p)) return true;
        }
        catch { }
        return false;
    }

    private void OnHotkeyPressed()
    {
        try
        {
            if (!_cfg.Enabled) return;
            CancelPending();
            _armed = false;
            AgentLog.Log("hotkey pressed");
            DoTranslateAtCursor(null);
        }
        catch (Exception ex) { AgentLog.Log("ERR hotkey-cb: " + ex.Message); }
    }

    private void OnPillClicked(Point at)
    {
        try
        {
            if (!_cfg.Enabled) return;
            CancelPending();
            _armed = false;
            AgentLog.Log("pill clicked — request sent");
            _pill.InvokeIfNeeded(_pill.HidePill);
            // يستخدم النص المخزن لحظة الفك — بدون التقاط جديد
            var cached = _selectedText;
            _selectedText = null;
            DoTranslateAtCursor(cached);
        }
        catch (Exception ex) { AgentLog.Log("ERR pill-cb: " + ex.Message); }
    }

    /// <summary>التقاط حي عبر الـ UI thread (Clipboard يشترط STA+pump) — للنداء من الخلفية.</summary>
    private Task<string?> CaptureOnUiAsync()
    {
        var tcs = new TaskCompletionSource<string?>(TaskCreationOptions.RunContinuationsAsynchronously);
        try
        {
            _host.BeginInvoke(new Func<Task>(async () =>
            {
                try { tcs.TrySetResult(await SelectionCapture.CaptureAsync()); }
                catch (Exception ex) { tcs.TrySetException(ex); }
            }));
        }
        catch (Exception ex) { tcs.TrySetException(ex); }
        return tcs.Task;
    }

    private void OnManualTranslate(string text)
    {
        StartTranslation(text ?? string.Empty);
    }

    private void StartTranslation(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return;
        // منع تكدس الطلبات — طلب واحد في المرة
        if (Interlocked.Exchange(ref _busy, 1) == 1)
        {
            AgentLog.Log("busy — skip overlapping request");
            return;
        }
        var cfg = _cfg;
        try { _popup.InvokeIfNeeded(() => _popup.ShowTranslating()); } catch { }
        // الشغل التقيل خارج الـ UI thread — الـ UI يعرض فقط
        _ = Task.Run(async () =>
        {
            try
            {
                var r = await Translator.TranslateWithSource(text, cfg, cfg.Source).ConfigureAwait(false);
                AgentLog.Log("translated src=" + r.Source + " len=" + (r.Text?.Length ?? 0));
                _popup.InvokeIfNeeded(() => _popup.ShowOutput(r, IsRtl(r.Ok ? (r.Text ?? "") : cfg.TargetLang)));
            }
            catch (Exception ex) { AgentLog.Log("ERR translate-flow: " + ex.Message); }
            finally { Interlocked.Exchange(ref _busy, 0); }
        });
    }

    private void DoTranslateAtCursor(string? preText)
    {
        try
        {
            Point anchor;
            try { anchor = Cursor.Position; }
            catch { anchor = (_releasePt.X == 0 && _releasePt.Y == 0) ? new Point(200, 200) : _releasePt; }
            var cfg = _cfg;
            if (!string.IsNullOrWhiteSpace(preText))
            {
                // من الحبة: النص مخزن — عرض + ترجمة فورية بالمصدر المحفوظ
                AgentLog.Log("using cached selection len=" + preText.Length);
                var c = preText;
                _popup.InvokeIfNeeded(() => _popup.ShowInput(anchor, c, autoTranslate: true, IsRtl(cfg.TargetLang)));
                return;
            }
            // هوتكي بلا مخزن: نافذة يدوية فوراً + التقاط حي في الخلفية يملؤها تلقائياً
            _popup.InvokeIfNeeded(() => _popup.ShowInput(anchor, "", autoTranslate: false, IsRtl(cfg.TargetLang)));
            _ = Task.Run(async () =>
            {
                try
                {
                    var text = await CaptureOnUiAsync().ConfigureAwait(false);
                    if (string.IsNullOrWhiteSpace(text)) return; // المستخدم يكتب يدوياً
                    AgentLog.Log("hotkey captured len=" + text.Length);
                    bool empty = true;
                    try { empty = (bool)_popup.Invoke(new Func<bool>(() => _popup.IsInputEmpty())); } catch { }
                    if (!empty)
                    {
                        AgentLog.Log("user typed — skip autofill");
                        return;
                    }
                    var t = text;
                    _popup.InvokeIfNeeded(() => _popup.ShowInput(anchor, t, autoTranslate: true, IsRtl(cfg.TargetLang)));
                }
                catch (Exception ex) { AgentLog.Log("ERR hotkey-capture: " + ex.Message); }
            });
        }
        catch (Exception ex) { AgentLog.Log("ERR dotranslate: " + ex.Message); }
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            try { UnregisterHotKey(_host.Handle, HOTKEY_ID); } catch { }
            MouseHook.Stop();
            try { _watcher.Dispose(); } catch { }
            _host.Dispose();
            _pill.Dispose();
            _popup.Dispose();
        }
        base.Dispose(disposing);
    }

    private sealed class HotkeyHostForm : Form
    {
        private readonly Action _onHotkey;
        public HotkeyHostForm(Action onHotkey)
        {
            _onHotkey = onHotkey;
            ShowInTaskbar = false;
            FormBorderStyle = FormBorderStyle.None;
            Opacity = 0;
            Size = new Size(0, 0);
        }
        protected override void WndProc(ref Message m)
        {
            if (m.Msg == WM_HOTKEY && m.WParam == (IntPtr)HOTKEY_ID)
            {
                try { _onHotkey(); } catch { }
                return;
            }
            base.WndProc(ref m);
        }
    }
}

internal static class ControlExt
{
    public static void InvokeIfNeeded(this Control c, Action a)
    {
        try
        {
            if (c.InvokeRequired) c.BeginInvoke(a);
            else a();
        }
        catch { }
    }
}

/// <summary>حبة "ترجمه" العائمة فوق النص المحدد.</summary>
internal sealed class PillForm : Form
{
    private readonly Action<Point> _onClick;
    private readonly System.Windows.Forms.Timer _hideTimer;

    public PillForm(Action<Point> onClick)
    {
        _onClick = onClick;
        AutoScaleMode = AutoScaleMode.None;
        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = false;
        TopMost = true;
        StartPosition = FormStartPosition.Manual;
        Size = new Size(104, 42);
        BackColor = Color.FromArgb(0xFF, 0x6B, 0x35);
        Cursor = Cursors.Hand;
        Click += (_, __) => { try { _onClick(Location); } catch { } };

        _hideTimer = new System.Windows.Forms.Timer { Interval = 6000 };
        _hideTimer.Tick += (_, __) => { try { HidePill(); } catch { } };
        Deactivate += (_, __) => { /* نتركه يختفي بالتايمر حتى يلحق المستخدم يضغط */ };
        FixSize();
    }

    /// <summary>تطبيع شكل الحبة: مستطيل مدور يملأ النافذة أياً كان مقاسها.</summary>
    private void FixSize()
    {
        try
        {
            var p = RoundedRect(new Rectangle(1, 1, Math.Max(2, ClientSize.Width - 2), Math.Max(2, ClientSize.Height - 2)), 13);
            Region = new Region(p);
            Invalidate();
        }
        catch { }
    }

    private static System.Drawing.Drawing2D.GraphicsPath RoundedRect(Rectangle r, int radius)
    {
        var p = new System.Drawing.Drawing2D.GraphicsPath();
        int d = radius * 2;
        p.AddArc(r.X, r.Y, d, d, 180, 90);
        p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
        p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
        p.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
        p.CloseFigure();
        return p;
    }

    // الحبة تظهر من غير خطف الفوكس — التحديد في البرنامج الأصلي يفضل موجوداً
    protected override bool ShowWithoutActivation => true;

    protected override void OnPaint(PaintEventArgs e)
    {
        try
        {
            var g = e.Graphics;
            g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
            var rect = new Rectangle(2, 2, Math.Max(4, ClientSize.Width - 5), Math.Max(4, ClientSize.Height - 5));
            using (var path = RoundedRect(rect, 12))
            {
                using var fill = new SolidBrush(BackColor);
                g.FillPath(fill, path);
                using var pen = new Pen(Color.White, 2);
                g.DrawPath(pen, path);
            }
            using var font = new Font("Segoe UI", 13f, FontStyle.Bold);
            using var brush = new SolidBrush(Color.White);
            using var fmt = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };
            g.DrawString("ترجمه", font, brush, new RectangleF(0, 0, ClientSize.Width, ClientSize.Height), fmt);
        }
        catch { }
    }

    /// <summary>تظهر فوق نقطة التحديد مباشرة.</summary>
    public void ShowNear(Point cursor)
    {
        try
        {
            FixSize();
            Screen screen;
            try { screen = Screen.FromPoint(cursor); }
            catch { screen = Screen.PrimaryScreen ?? Screen.AllScreens[0]; }
            var area = screen.WorkingArea;
            var x = cursor.X - Width / 2;
            var y = cursor.Y - Height - 10;
            if (x < area.Left) x = area.Left + 4;
            if (y < area.Top) y = area.Top + 4;
            if (x + Width > area.Right) x = area.Right - Width - 4;
            if (y + Height > area.Bottom) y = area.Bottom - Height - 4;
            if (x < area.Left || x > area.Right) x = Math.Max(area.Left, area.Right - Width - 4);
            if (y < area.Top || y > area.Bottom) y = Math.Max(area.Top, area.Bottom - Height - 4);
            Location = new Point(x, y);
            if (!Visible) Show();
            _hideTimer.Stop();
            _hideTimer.Start();
            try { AgentLog.Log($"pill shown visible={Visible} bounds={Bounds} screen={screen.DeviceName} dpi={DeviceDpi}"); }
            catch (Exception ex) { AgentLog.Log("ERR pill-verify: " + ex.Message); }
        }
        catch (Exception ex) { AgentLog.Log("ERR pill-show: " + ex.Message); }
    }

    public void HidePill()
    {
        try { _hideTimer.Stop(); } catch { }
        try { if (Visible) Hide(); } catch { }
    }
}

/// <summary>نافذة الترجمة: مربع إدخال + مربع ناتج + اختيار المصدر — تختفي عند الضغط خارجه.</summary>
internal sealed class TranslatePopupForm : Form
{
    private static readonly Color Accent = Color.FromArgb(0xFF, 0x6B, 0x35);
    private static readonly Color Ink = Color.FromArgb(0x1C, 0x19, 0x17);
    private static readonly Color Muted = Color.FromArgb(0x78, 0x71, 0x6C);

    private readonly TextBox _input;
    private readonly TextBox _output;
    private readonly Label _src;
    private readonly Button _trBtn;
    private readonly Button _copyBtn;
    private readonly Button _closeBtn;
    private readonly Button _btnAuto;
    private readonly Button _btnAi;
    private readonly Button _btnGoogle;
    private readonly Button _btnLocal;
    private string _source = "auto";
    private string _lastInput = string.Empty;
    private string _lastResult = string.Empty;

    public event Action<string>? TranslateRequested;

    private readonly Action<string> _saveSource;
    private readonly Func<bool> _hasLocal;

    public TranslatePopupForm(Func<string> getSource, Action<string> saveSource, Func<bool> hasLocal)
    {
        _saveSource = saveSource;
        _hasLocal = hasLocal;
        AutoScaleMode = AutoScaleMode.Dpi;
        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = false;
        TopMost = true;
        StartPosition = FormStartPosition.Manual;
        Size = new Size(460, 430);
        BackColor = Color.FromArgb(0xE7, 0xE5, 0xE4);
        Padding = new Padding(1);

        var inner = new Panel { Dock = DockStyle.Fill, BackColor = Color.White, Padding = new Padding(12) };
        Controls.Add(inner);

        var top = new Panel { Dock = DockStyle.Top, Height = 30, BackColor = Color.White };
        _src = new Label { Dock = DockStyle.Fill, ForeColor = Muted, Font = new Font("Segoe UI", 8.5f), Text = "Jamrah Translate", TextAlign = ContentAlignment.MiddleLeft };
        _closeBtn = new Button { Dock = DockStyle.Right, Width = 30, Text = "×", FlatStyle = FlatStyle.Flat, ForeColor = Muted, BackColor = Color.White, Cursor = Cursors.Hand };
        _closeBtn.FlatAppearance.BorderSize = 0;
        _closeBtn.Click += (_, __) => HidePopup();
        top.Controls.Add(_src);
        top.Controls.Add(_closeBtn);
        inner.Controls.Add(top);

        var accent = new Panel { Dock = DockStyle.Top, Height = 2, BackColor = Accent };
        inner.Controls.Add(accent);

        var srcRow = new FlowLayoutPanel { Dock = DockStyle.Top, Height = 36, BackColor = Color.White, FlowDirection = FlowDirection.RightToLeft, WrapContents = false };
        _btnAuto = MkSrc("تلقائية", "auto");
        _btnAi = MkSrc("ذكاء", "gemini");
        _btnGoogle = MkSrc("جوجل", "google");
        _btnLocal = MkSrc("محلية", "local");
        srcRow.Controls.Add(_btnAuto);
        srcRow.Controls.Add(_btnAi);
        srcRow.Controls.Add(_btnGoogle);
        srcRow.Controls.Add(_btnLocal);
        inner.Controls.Add(srcRow);

        var inLbl = new Label { Dock = DockStyle.Top, Height = 20, Text = "النص:", ForeColor = Muted, Font = new Font("Segoe UI", 9f), TextAlign = ContentAlignment.MiddleLeft };
        inner.Controls.Add(inLbl);

        _input = new TextBox
        {
            Dock = DockStyle.Top,
            Height = 100,
            Multiline = true,
            BorderStyle = BorderStyle.FixedSingle,
            Font = new Font("Segoe UI", 11f),
            ForeColor = Ink,
            BackColor = Color.White,
            ScrollBars = ScrollBars.Vertical,
        };
        inner.Controls.Add(_input);

        var outLbl = new Label { Dock = DockStyle.Top, Height = 20, Text = "الترجمة:", ForeColor = Muted, Font = new Font("Segoe UI", 9f), TextAlign = ContentAlignment.MiddleLeft };
        inner.Controls.Add(outLbl);

        _output = new TextBox
        {
            Dock = DockStyle.Fill,
            Multiline = true,
            ReadOnly = true,
            BorderStyle = BorderStyle.None,
            Font = new Font("Segoe UI", 12f),
            ForeColor = Ink,
            BackColor = Color.White,
            ScrollBars = ScrollBars.Vertical,
        };
        inner.Controls.Add(_output);

        var bottom = new Panel { Dock = DockStyle.Bottom, Height = 38, BackColor = Color.White };
        _trBtn = new Button { Dock = DockStyle.Right, Width = 100, Text = "ترجم", FlatStyle = FlatStyle.Flat, BackColor = Accent, ForeColor = Color.White, Cursor = Cursors.Hand, Font = new Font("Segoe UI", 10f, FontStyle.Bold) };
        _trBtn.FlatAppearance.BorderSize = 0;
        _trBtn.Click += (_, __) => RaiseTranslate();
        _copyBtn = new Button { Dock = DockStyle.Right, Width = 90, Text = "نسخ", FlatStyle = FlatStyle.Flat, BackColor = Color.White, ForeColor = Ink, Cursor = Cursors.Hand };
        _copyBtn.Click += (_, __) =>
        {
            try { if (!string.IsNullOrEmpty(_lastResult)) Clipboard.SetText(_lastResult); } catch { }
            HidePopup();
        };
        bottom.Controls.Add(_trBtn);
        bottom.Controls.Add(_copyBtn);
        inner.Controls.Add(bottom);

        Deactivate += (_, __) => HidePopup();
        _input.KeyDown += (_, e) =>
        {
            if (e.KeyCode == Keys.Escape) HidePopup();
            else if (e.KeyCode == Keys.Enter && e.Control)
            {
                RaiseTranslate();
                e.Handled = true;
                e.SuppressKeyPress = true;
            }
        };
        _output.KeyDown += (_, e) => { if (e.KeyCode == Keys.Escape) HidePopup(); };

        try { SetSource(Translator.NormalizeSource(getSource()), save: false); }
        catch { SetSource("auto", save: false); }
        RefreshLocalVisibility();
    }

    private Button MkSrc(string text, string src)
    {
        var b = new Button
        {
            Width = 80,
            Height = 28,
            Text = text,
            FlatStyle = FlatStyle.Flat,
            Cursor = Cursors.Hand,
            Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
            Margin = new Padding(2),
            Tag = src,
        };
        b.FlatAppearance.BorderSize = 1;
        b.Click += (_, __) => SetSource(src, save: true);
        return b;
    }

    public void SetSource(string src, bool save)
    {
        try
        {
            src = Translator.NormalizeSource(src);
            if (src == "local" && !_hasLocal()) return; // مخفي حتى تجهز الحزمة
            _source = src;
            if (save)
            {
                try { _saveSource(src); } catch (Exception ex) { AgentLog.Log("ERR src-save: " + ex.Message); }
                RefreshLocalVisibility();
            }
            PaintSources();
        }
        catch { }
    }

    private void RefreshLocalVisibility()
    {
        try
        {
            bool has;
            try { has = _hasLocal(); } catch { has = false; }
            _btnLocal.Visible = has;
            if (!has && _source == "local") { _source = "auto"; PaintSources(); }
        }
        catch { }
    }

    private void PaintSources()
    {
        try
        {
            foreach (var b in new[] { _btnAuto, _btnAi, _btnGoogle, _btnLocal })
            {
                var on = (b.Tag as string) == _source;
                b.BackColor = on ? Accent : Color.White;
                b.ForeColor = on ? Color.White : Ink;
            }
        }
        catch { }
    }

    private void RaiseTranslate()
    {
        try { TranslateRequested?.Invoke(_input.Text ?? string.Empty); }
        catch (Exception ex) { AgentLog.Log("ERR tr-raise: " + ex.Message); }
    }

    public bool IsInputEmpty()
    {
        try { return string.IsNullOrWhiteSpace(_input.Text); }
        catch { return true; }
    }

    private void PlaceAt(Point anchor)
    {
        try
        {
            var area = Screen.FromPoint(anchor).WorkingArea;
            var x = Math.Min(Math.Max(anchor.X, area.Left), Math.Max(area.Left, area.Right - Width - 4));
            var y = anchor.Y + 12;
            if (y + Height > area.Bottom) y = Math.Max(area.Top, anchor.Y - Height - 12);
            Location = new Point(x, y);
        }
        catch { }
    }

    private void ApplyRtl(bool rtl)
    {
        try
        {
            _input.RightToLeft = rtl ? RightToLeft.Yes : RightToLeft.No;
            _output.RightToLeft = rtl ? RightToLeft.Yes : RightToLeft.No;
        }
        catch { }
    }

    /// <summary>عرض النافذة: prefill فارغ = وضع يدوي (آخر نص محفوظ)، وغير فارغ + auto = ترجمة فورية.</summary>
    public void ShowInput(Point anchor, string prefill, bool autoTranslate, bool rtl)
    {
        try
        {
            PlaceAt(anchor);
            ApplyRtl(rtl);
            RefreshLocalVisibility();
            var text = string.IsNullOrWhiteSpace(prefill) ? _lastInput : prefill.Trim();
            _input.Text = text;
            _src.Text = "Jamrah Translate";
            if (autoTranslate && !string.IsNullOrWhiteSpace(text))
            {
                _output.Text = "جاري الترجمة...";
                if (!Visible) Show();
                Activate();
                RaiseTranslate();
            }
            else
            {
                if (string.IsNullOrWhiteSpace(_output.Text))
                    _output.Text = "اكتب النص ثم اضغط ترجم (Ctrl+Enter).";
                if (!Visible) Show();
                Activate();
                try { _input.Focus(); } catch { }
            }
        }
        catch (Exception ex) { AgentLog.Log("ERR popup-input: " + ex.Message); }
    }

    public void ShowTranslating()
    {
        try { _output.Text = "جاري الترجمة..."; } catch { }
    }

    public void ShowOutput(TranslationResult r, bool rtl)
    {
        try
        {
            ApplyRtl(rtl);
            var tag = r.Source switch
            {
                "gemini" => "ذكاء (Gemini)",
                "google" => "جوجل",
                "cache" => "محفوظة",
                "local" => "محلية",
                _ => "تنبيه",
            };
            _src.Text = $"Jamrah Translate · {tag}";
            _output.Text = r.Text;
            _lastResult = r.Ok ? r.Text : string.Empty;
            try { _lastInput = _input.Text ?? string.Empty; } catch { }
            if (!Visible) Show();
            Activate();
        }
        catch (Exception ex) { AgentLog.Log("ERR popup-output: " + ex.Message); }
    }

    public void HidePopup()
    {
        try { if (Visible) Hide(); } catch { }
    }
}
