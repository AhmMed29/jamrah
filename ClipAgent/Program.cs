using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Windows.Forms;
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
            ApplicationConfiguration.Initialize();
            Application.Run(new AgentAppContext(store));
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
    private bool _suppressNext;

    public ClipStore(AgentConfig cfg)
    {
        _cfg = cfg;
    }

    public string ClipsDirectory => _cfg.ClipsDir;

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
        if (_suppressNext) { _suppressNext = false; return; }
        try
        {
            if (NativeClipboard.HasImage()) { TryCaptureImage(); return; }
            TryCaptureText();
        }
        catch { }
    }

    public void SuppressNextCapture() { _suppressNext = true; }

    public async Task<List<ClipRow>> GetRecentAsync(int limit)
    {
        try
        {
            await InitAsync().ConfigureAwait(false);
            if (_db == null) return new();
            return await _db.Table<ClipRow>().OrderByDescending(r => r.At).Take(limit).ToListAsync().ConfigureAwait(false);
        }
        catch { return new(); }
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
    private static readonly IntPtr HWND_MESSAGE = new(-3);

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate IntPtr WndProcDelegate(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

    private static readonly WndProcDelegate _wndProc = WndProcHandler;
    private static Action? _onUpdate;

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
    [DllImport("user32.dll")] private static extern bool DestroyWindow(IntPtr hWnd);
    [DllImport("user32.dll")] private static extern IntPtr DefWindowProc(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] private static extern IntPtr GetModuleHandle(string? lpModuleName);

    public static IntPtr Create(Action onUpdate)
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
        if (RegisterClassEx(ref cls) == 0) return IntPtr.Zero;
        var hwnd = CreateWindowEx(0, "JamrahClipAgentMsg", "", 0, 0, 0, 0, 0, HWND_MESSAGE, IntPtr.Zero, hInst, IntPtr.Zero);
        if (hwnd == IntPtr.Zero) return IntPtr.Zero;
        try { AddClipboardFormatListener(hwnd); } catch { }
        return hwnd;
    }

    public static void Destroy(IntPtr hwnd)
    {
        if (hwnd == IntPtr.Zero) return;
        try { DestroyWindow(hwnd); } catch { }
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

internal sealed class AgentAppContext : ApplicationContext
{
    private const int WM_HOTKEY = 0x0312;
    private const uint MOD_CONTROL = 0x0002;
    private const uint MOD_SHIFT = 0x0004;
    private const uint VK_V = 0x56;
    private const int HOTKEY_ID = 1;

    private readonly ClipStore _store;
    private readonly HotkeyHostForm _host;
    private readonly PopupForm _popup;
    private IntPtr _listenerHwnd;
    private IntPtr _prevForeground;

    [DllImport("user32.dll", SetLastError = true)] private static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);
    [DllImport("user32.dll")] private static extern bool UnregisterHotKey(IntPtr hWnd, int id);
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();

    public AgentAppContext(ClipStore store)
    {
        _store = store;
        _listenerHwnd = NativeListener.Create(_store.OnClipboardUpdate);
        _host = new HotkeyHostForm(OnHotkeyPressed);
        _host.CreateControl();
        try { RegisterHotKey(_host.Handle, HOTKEY_ID, MOD_CONTROL | MOD_SHIFT, VK_V); } catch { }
        _popup = new PopupForm(_store, PasteRow);
    }

    private void OnHotkeyPressed()
    {
        try
        {
            _prevForeground = GetForegroundWindow();
            var anchor = NativePaste.CaretOrCursorPoint(_prevForeground);
            _popup.ShowAt(anchor);
        }
        catch { }
    }

    private void PasteRow(ClipRow row)
    {
        try
        {
            _popup.HidePopup();
            _store.SuppressNextCapture();
            if (!NativePaste.PutOnClipboard(_store, row)) return;
            NativePaste.PasteInto(_prevForeground);
        }
        catch { }
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            try { UnregisterHotKey(_host.Handle, HOTKEY_ID); } catch { }
            NativeListener.Destroy(_listenerHwnd);
            _listenerHwnd = IntPtr.Zero;
            _host.Dispose();
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

internal static class NativePaste
{
    [StructLayout(LayoutKind.Sequential)] private struct POINT { public int X; public int Y; }
    [StructLayout(LayoutKind.Sequential)] private struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
    [StructLayout(LayoutKind.Sequential)] private struct GUITHREADINFO
    {
        public int cbSize;
        public uint flags;
        public IntPtr hwndActive;
        public IntPtr hwndFocus;
        public IntPtr hwndCapture;
        public IntPtr hwndMenuOwner;
        public IntPtr hwndMoveSize;
        public IntPtr hwndCaret;
        public RECT rcCaret;
    }

    [DllImport("user32.dll")] private static extern bool GetCursorPos(out POINT lpPoint);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] private static extern bool GetGUIThreadInfo(uint idThread, ref GUITHREADINFO lpgui);
    [DllImport("user32.dll")] private static extern bool ClientToScreen(IntPtr hWnd, ref POINT lpPoint);
    [DllImport("user32.dll")] private static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll", SetLastError = true)] private static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    [StructLayout(LayoutKind.Sequential)] private struct MOUSEINPUT
    {
        public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)] private struct KEYBDINPUT
    {
        public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)] private struct HARDWAREINPUT
    {
        public uint uMsg; public ushort wParamL; public ushort wParamH;
    }

    [StructLayout(LayoutKind.Explicit)] private struct InputUnion
    {
        [FieldOffset(0)] public MOUSEINPUT mi;
        [FieldOffset(0)] public KEYBDINPUT ki;
        [FieldOffset(0)] public HARDWAREINPUT hi;
    }

    [StructLayout(LayoutKind.Sequential)] private struct INPUT
    {
        public uint type;
        public InputUnion U;
    }

    private const uint INPUT_KEYBOARD = 1;
    private const uint KEYEVENTF_KEYUP = 0x0002;
    private const ushort VK_CONTROL = 0x11;
    private const ushort VK_VKEY = 0x56;

    public static Point CaretOrCursorPoint(IntPtr fgWnd)
    {
        try
        {
            uint tid = GetWindowThreadProcessId(fgWnd, out _);
            var info = new GUITHREADINFO { cbSize = Marshal.SizeOf<GUITHREADINFO>() };
            if (GetGUIThreadInfo(tid, ref info) && info.hwndCaret != IntPtr.Zero)
            {
                var pt = new POINT { X = info.rcCaret.Left, Y = info.rcCaret.Bottom };
                if (ClientToScreen(info.hwndCaret, ref pt))
                    return new Point(pt.X, pt.Y);
            }
        }
        catch { }
        try
        {
            if (GetCursorPos(out var cur))
                return new Point(cur.X, cur.Y);
        }
        catch { }
        return new Point(200, 200);
    }

    public static bool PutOnClipboard(ClipStore store, ClipRow row)
    {
        try
        {
            if (row.Kind == "image" && !string.IsNullOrWhiteSpace(row.FilePath))
            {
                var dir = store.ClipsDirectory;
                var path = Path.Combine(dir, row.FilePath);
                if (File.Exists(path))
                {
                    using var img = Image.FromFile(path);
                    Clipboard.SetImage((Image)img.Clone());
                    return true;
                }
                return false;
            }
            if (string.IsNullOrEmpty(row.Text)) return false;
            Clipboard.SetText(row.Text);
            return true;
        }
        catch { return false; }
    }

    public static void PasteInto(IntPtr fgWnd)
    {
        try
        {
            var ok = fgWnd != IntPtr.Zero && SetForegroundWindow(fgWnd);
            if (!ok) return;
            Thread.Sleep(50);
            var inputs = new[]
            {
                KeyDown(VK_CONTROL), KeyDown(VK_VKEY), KeyUp(VK_VKEY), KeyUp(VK_CONTROL),
            };
            SendInput((uint)inputs.Length, inputs, Marshal.SizeOf<INPUT>());
        }
        catch { }
    }

    private static INPUT KeyDown(ushort vk) => new() { type = INPUT_KEYBOARD, U = new InputUnion { ki = new KEYBDINPUT { wVk = vk } } };
    private static INPUT KeyUp(ushort vk) => new() { type = INPUT_KEYBOARD, U = new InputUnion { ki = new KEYBDINPUT { wVk = vk, dwFlags = KEYEVENTF_KEYUP } } };
}

internal sealed class PopupForm : Form
{
    private static readonly Color Bg = Color.FromArgb(0xFA, 0xFA, 0xF9);
    private static readonly Color Card = Color.White;
    private static readonly Color Border = Color.FromArgb(0xE7, 0xE5, 0xE4);
    private static readonly Color Ink = Color.FromArgb(0x1C, 0x19, 0x17);
    private static readonly Color Muted = Color.FromArgb(0x78, 0x71, 0x6C);
    private static readonly Color Accent = Color.FromArgb(0xFF, 0x6B, 0x35);

    private readonly ClipStore _store;
    private readonly Action<ClipRow> _onPick;
    private readonly ListBox _list;
    private readonly Label _empty;
    private List<ClipRow> _rows = new();

    public PopupForm(ClipStore store, Action<ClipRow> onPick)
    {
        _store = store;
        _onPick = onPick;

        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = false;
        TopMost = true;
        StartPosition = FormStartPosition.Manual;
        Size = new Size(380, 480);
        BackColor = Border;
        Padding = new Padding(1);
        Font = LoadFont();

        var inner = new Panel { Dock = DockStyle.Fill, BackColor = Bg, Padding = new Padding(8) };
        Controls.Add(inner);

        _list = new ListBox
        {
            Dock = DockStyle.Fill,
            BorderStyle = BorderStyle.None,
            BackColor = Bg,
            ForeColor = Ink,
            DrawMode = DrawMode.OwnerDrawFixed,
            ItemHeight = 48,
            IntegralHeight = false,
        };
        _list.DrawItem += OnDrawItem;
        _list.DoubleClick += (_, __) => PickSelected();
        _list.KeyDown += (_, e) =>
        {
            if (e.KeyCode == Keys.Enter) { PickSelected(); e.Handled = true; }
            else if (e.KeyCode == Keys.Escape) { HidePopup(); e.Handled = true; }
        };
        inner.Controls.Add(_list);

        _empty = new Label
        {
            Dock = DockStyle.Fill,
            Text = "الحافظة فاضية",
            ForeColor = Muted,
            TextAlign = ContentAlignment.MiddleCenter,
            Visible = false,
        };
        inner.Controls.Add(_empty);

        Deactivate += (_, __) => HidePopup();
    }

    public void ShowAt(Point anchor)
    {
        try
        {
            var area = Screen.FromPoint(anchor).WorkingArea;
            var x = Math.Min(Math.Max(anchor.X, area.Left), Math.Max(area.Left, area.Right - Width));
            var y = anchor.Y + 8;
            if (y + Height > area.Bottom) y = Math.Max(area.Top, anchor.Y - Height - 8);
            Location = new Point(x, y);
            _ = ReloadAsync();
            Show();
            Activate();
            _list.Focus();
        }
        catch { }
    }

    public void HidePopup()
    {
        try { if (Visible) Hide(); } catch { }
    }

    private async Task ReloadAsync()
    {
        try
        {
            _rows = await _store.GetRecentAsync(100).ConfigureAwait(true);
            _list.BeginUpdate();
            _list.Items.Clear();
            foreach (var r in _rows) _list.Items.Add(r);
            _list.EndUpdate();
            _empty.Visible = _rows.Count == 0;
            _list.Visible = _rows.Count > 0;
            if (_list.Items.Count > 0) _list.SelectedIndex = 0;
        }
        catch { }
    }

    private void PickSelected()
    {
        try
        {
            if (_list.SelectedItem is ClipRow row) _onPick(row);
            else HidePopup();
        }
        catch { HidePopup(); }
    }

    private void OnDrawItem(object? sender, DrawItemEventArgs e)
    {
        try
        {
            e.DrawBackground();
            if (e.Index < 0 || e.Index >= _rows.Count) return;
            var row = _rows[e.Index];
            var selected = (e.State & DrawItemState.Selected) == DrawItemState.Selected;
            var bounds = e.Bounds;
            using (var bg = new SolidBrush(selected ? Color.FromArgb(0xFF, 0xED, 0xE3) : Card))
                e.Graphics.FillRectangle(bg, bounds);
            using (var pen = new Pen(Border))
                e.Graphics.DrawRectangle(pen, bounds.X, bounds.Y, bounds.Width - 1, bounds.Height - 1);

            var title = RowTitle(row);
            var sub = row.At.ToLocalTime().ToString("d/M/yyyy HH:mm");
            var pad = 8;
            using (var tb = new SolidBrush(Ink))
            using (var sb = new SolidBrush(Muted))
            using (var f = new Font(Font, FontStyle.Regular))
            using (var sf = new Font(Font.FontFamily, Font.Size - 1.5f))
            using (var fmt = new StringFormat { Trimming = StringTrimming.EllipsisCharacter, FormatFlags = StringFormatFlags.NoWrap })
            {
                var titleRect = new RectangleF(bounds.X + pad, bounds.Y + 5, bounds.Width - pad * 2, 22);
                e.Graphics.DrawString(title, f, tb, titleRect, fmt);
                var subRect = new RectangleF(bounds.X + pad, bounds.Y + 26, bounds.Width - pad * 2, 16);
                e.Graphics.DrawString(sub, sf, sb, subRect, fmt);
            }
            if (selected)
            {
                using var edge = new Pen(Accent, 2);
                e.Graphics.DrawLine(edge, bounds.X, bounds.Y, bounds.X, bounds.Y + bounds.Height);
            }
            e.DrawFocusRectangle();
        }
        catch { }
    }

    private static string RowTitle(ClipRow row)
    {
        if (row.Kind == "image") return "صورة محفوظة";
        var t = (row.Text ?? "").Replace('\r', ' ').Replace('\n', ' ').Trim();
        if (t.Length == 0) return "نص فارغ";
        return t.Length > 80 ? t[..80] + "…" : t;
    }

    private static Font LoadFont()
    {
        try { return new Font("Tajawal", 10f); } catch { }
        try { return new Font("Segoe UI", 10f); } catch { }
        return SystemFonts.DefaultFont;
    }
}
