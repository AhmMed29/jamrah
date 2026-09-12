using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Text.Json;
using SQLite;

namespace Jamrah.ClipAgent;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        using var mutex = new Mutex(true, "JamrahClipAgentSingleInstance", out var owned);
        if (!owned) return;
        try
        {
            var cfg = AgentConfig.Load();
            if (cfg == null) return;
            SQLitePCL.Batteries_V2.Init();
            var store = new ClipStore(cfg);
            _ = store.InitAsync();
            NativeListener.Run(store.OnClipboardUpdate);
        }
        catch { }
    }
}

internal sealed class AgentConfig
{
    public string DbPath { get; set; } = string.Empty;
    public string ClipsDir { get; set; } = string.Empty;

    public static AgentConfig? Load()
    {
        try
        {
            var path = Path.Combine(AppContext.BaseDirectory, "agent-config.json");
            if (!File.Exists(path)) return null;
            var cfg = JsonSerializer.Deserialize<AgentConfig>(File.ReadAllText(path));
            if (cfg == null || string.IsNullOrWhiteSpace(cfg.DbPath) || string.IsNullOrWhiteSpace(cfg.ClipsDir)) return null;
            Directory.CreateDirectory(cfg.ClipsDir);
            return cfg;
        }
        catch { return null; }
    }
}

[Table("BookmarkClips")]
internal sealed class ClipRow
{
    [PrimaryKey]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Text { get; set; } = string.Empty;
    public string Kind { get; set; } = "text";
    public string FilePath { get; set; } = string.Empty;
    public DateTime At { get; set; } = DateTime.UtcNow;
    public bool Pinned { get; set; }
}

internal sealed class ClipStore
{
    private readonly AgentConfig _cfg;
    private SQLiteAsyncConnection? _db;
    private string _lastText = string.Empty;
    private bool _dbReady;

    public ClipStore(AgentConfig cfg)
    {
        _cfg = cfg;
    }

    public async Task InitAsync()
    {
        try
        {
            _db = new SQLiteAsyncConnection(_cfg.DbPath);
            try { await _db.ExecuteAsync("PRAGMA journal_mode=WAL;").ConfigureAwait(false); } catch { }
            try { await _db.ExecuteAsync("PRAGMA busy_timeout=5000;").ConfigureAwait(false); } catch { }
            await _db.CreateTableAsync<ClipRow>().ConfigureAwait(false);
            var last = await _db.Table<ClipRow>().OrderByDescending(c => c.At).FirstOrDefaultAsync().ConfigureAwait(false);
            if (last != null && last.Kind == "text") _lastText = last.Text ?? string.Empty;
            _dbReady = true;
        }
        catch { }
    }

    public void OnClipboardUpdate()
    {
        if (!_dbReady || _db == null) return;
        try
        {
            if (NativeClipboard.HasImage()) { TryCaptureImage(); return; }
            TryCaptureText();
        }
        catch { }
    }

    private void TryCaptureImage()
    {
        var png = NativeClipboard.ReadImagePng(_cfg.ClipsDir);
        if (png == null) return;
        _ = SaveRowAsync(new ClipRow { Kind = "image", FilePath = png });
    }

    private void TryCaptureText()
    {
        var text = NativeClipboard.ReadText();
        if (string.IsNullOrWhiteSpace(text)) return;
        if (text.Length > 50000) return;
        if (text == _lastText) return;
        _lastText = text;
        _ = SaveRowAsync(new ClipRow { Kind = "text", Text = text });
    }

    private async Task SaveRowAsync(ClipRow row)
    {
        try
        {
            if (_db == null) return;
            await _db.InsertAsync(row).ConfigureAwait(false);
        }
        catch { }
    }
}

internal static class NativeClipboard
{
    private const uint CF_UNICODETEXT = 13;
    private const uint CF_DIB = 8;

    [DllImport("user32.dll")] private static extern bool OpenClipboard(IntPtr hWndNewOwner);
    [DllImport("user32.dll")] private static extern bool CloseClipboard();
    [DllImport("user32.dll")] private static extern bool IsClipboardFormatAvailable(uint format);
    [DllImport("user32.dll")] private static extern IntPtr GetClipboardData(uint uFormat);
    [DllImport("kernel32.dll")] private static extern IntPtr GlobalLock(IntPtr hMem);
    [DllImport("kernel32.dll")] private static extern bool GlobalUnlock(IntPtr hMem);

    [StructLayout(LayoutKind.Sequential)]
    private struct BitmapInfoHeader
    {
        public uint biSize;
        public int biWidth;
        public int biHeight;
        public ushort biPlanes;
        public ushort biBitCount;
        public uint biCompression;
        public uint biSizeImage;
        public int biXPelsPerMeter;
        public int biYPelsPerMeter;
        public uint biClrUsed;
        public uint biClrImportant;
    }

    public static bool HasImage()
    {
        if (!TryOpenClipboard()) return false;
        try { return IsClipboardFormatAvailable(CF_DIB); }
        finally { try { CloseClipboard(); } catch { } }
    }

    public static string? ReadText()
    {
        if (!TryOpenClipboard()) return null;
        try
        {
            if (!IsClipboardFormatAvailable(CF_UNICODETEXT)) return null;
            var h = GetClipboardData(CF_UNICODETEXT);
            if (h == IntPtr.Zero) return null;
            return Marshal.PtrToStringUni(h);
        }
        finally { try { CloseClipboard(); } catch { } }
    }

    public static string? ReadImagePng(string dir)
    {
        if (!TryOpenClipboard()) return null;
        try
        {
            if (!IsClipboardFormatAvailable(CF_DIB)) return null;
            var h = GetClipboardData(CF_DIB);
            if (h == IntPtr.Zero) return null;
            var p = GlobalLock(h);
            if (p == IntPtr.Zero) return null;
            try { return DibToPng(p, dir); }
            finally { try { GlobalUnlock(h); } catch { } }
        }
        finally { try { CloseClipboard(); } catch { } }
    }

    private static bool TryOpenClipboard()
    {
        for (var i = 0; i < 5; i++)
        {
            try
            {
                if (OpenClipboard(IntPtr.Zero)) return true;
            }
            catch { }
            Thread.Sleep(80);
        }
        return false;
    }

    private static string? DibToPng(IntPtr p, string dir)
    {
        try
        {
            var hdr = Marshal.PtrToStructure<BitmapInfoHeader>(p);
            if (hdr.biCompression != 0) return null;
            if (hdr.biBitCount != 24 && hdr.biBitCount != 32) return null;
            var w = hdr.biWidth;
            var h = Math.Abs(hdr.biHeight);
            if (w <= 0 || h <= 0 || w > 8000 || h > 8000) return null;
            var bottomUp = hdr.biHeight > 0;
            var stride = ((w * hdr.biBitCount + 31) / 32) * 4;
            var src = IntPtr.Add(p, (int)hdr.biSize);
            var topDown = new byte[(long)stride * h];
            for (var y = 0; y < h; y++)
            {
                var srcY = bottomUp ? (h - 1 - y) : y;
                Marshal.Copy(IntPtr.Add(src, srcY * stride), topDown, y * stride, stride);
            }
            var pf = hdr.biBitCount == 32 ? PixelFormat.Format32bppArgb : PixelFormat.Format24bppRgb;
            var handle = GCHandle.Alloc(topDown, GCHandleType.Pinned);
            try
            {
                using var bmp = new Bitmap(w, h, stride, pf, handle.AddrOfPinnedObject());
                var name = $"clip_{DateTime.UtcNow:yyyyMMdd_HHmmss_fff}.png";
                bmp.Save(Path.Combine(dir, name), ImageFormat.Png);
                return name;
            }
            finally { handle.Free(); }
        }
        catch { return null; }
    }
}

internal static class NativeListener
{
    private const int WM_CLIPBOARDUPDATE = 0x031D;
    private const int WM_DESTROY = 0x0002;
    private static readonly IntPtr HWND_MESSAGE = new(-3);

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate IntPtr WndProcDelegate(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

    private static readonly WndProcDelegate _wndProc = WndProcHandler;
    private static Action? _onUpdate;

    [StructLayout(LayoutKind.Sequential)]
    private struct Point { public int X; public int Y; }

    [StructLayout(LayoutKind.Sequential)]
    private struct Msg
    {
        public IntPtr hwnd;
        public uint message;
        public IntPtr wParam;
        public IntPtr lParam;
        public uint time;
        public Point pt;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct WndClassEx
    {
        public uint cbSize;
        public uint style;
        public IntPtr lpfnWndProc;
        public int cbClsExtra;
        public int cbWndExtra;
        public IntPtr hInstance;
        public IntPtr hIcon;
        public IntPtr hCursor;
        public IntPtr hbrBackground;
        public string? lpszMenuName;
        public string lpszClassName;
        public IntPtr hIconSm;
    }

    [DllImport("user32.dll")] private static extern bool AddClipboardFormatListener(IntPtr hwnd);
    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern ushort RegisterClassEx(ref WndClassEx lpwcx);
    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr CreateWindowEx(uint exStyle, string lpClassName, string lpWindowName, uint dwStyle,
        int x, int y, int w, int h, IntPtr hWndParent, IntPtr hMenu, IntPtr hInstance, IntPtr lpParam);
    [DllImport("user32.dll")] private static extern int GetMessage(out Msg lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax);
    [DllImport("user32.dll")] private static extern bool TranslateMessage(ref Msg lpMsg);
    [DllImport("user32.dll")] private static extern IntPtr DispatchMessage(ref Msg lpMsg);
    [DllImport("user32.dll")] private static extern IntPtr DefWindowProc(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] private static extern IntPtr GetModuleHandle(string? lpModuleName);

    public static void Run(Action onUpdate)
    {
        _onUpdate = onUpdate;
        var hInst = GetModuleHandle(null);
        var cls = new WndClassEx
        {
            cbSize = (uint)Marshal.SizeOf<WndClassEx>(),
            lpfnWndProc = Marshal.GetFunctionPointerForDelegate(_wndProc),
            hInstance = hInst,
            lpszClassName = "JamrahClipAgentMsg",
        };
        if (RegisterClassEx(ref cls) == 0) return;
        var hwnd = CreateWindowEx(0, "JamrahClipAgentMsg", "", 0, 0, 0, 0, 0, HWND_MESSAGE, IntPtr.Zero, hInst, IntPtr.Zero);
        if (hwnd == IntPtr.Zero) return;
        try { AddClipboardFormatListener(hwnd); } catch { }
        while (GetMessage(out var msg, IntPtr.Zero, 0, 0) > 0)
        {
            TranslateMessage(ref msg);
            DispatchMessage(ref msg);
        }
    }

    private static IntPtr WndProcHandler(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam)
    {
        if (msg == WM_CLIPBOARDUPDATE)
        {
            try { _onUpdate?.Invoke(); } catch { }
        }
        return DefWindowProc(hWnd, msg, wParam, lParam);
    }
}
