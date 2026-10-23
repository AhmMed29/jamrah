using Jamrah.Application.Services;
using Jamrah.Core.Interfaces;
using Jamrah.Files.Core;
using Jamrah.Presentation.Shared;
using Microsoft.AspNetCore.Components.WebView.Maui;
using Microsoft.Maui.Storage;
#if WINDOWS
using Microsoft.UI.Xaml.Controls;
#endif

namespace Jamrah;

public partial class MainPage : ContentPage
{
    private readonly ICalendarStateService _calendarState;
    private readonly ISettingsRepository _settingsRepository;
    private readonly IAppNavService _navService;
    private readonly IClipAgentService _clipAgent;
    private readonly ITranslatorService _translator;
    private readonly LocalizationService _lang;
    private readonly ShellIntegrationService _shellIntegration;
    private readonly ShellIpcService _shellIpc;
    // Single-WebView fixed-sidebar layout: one BlazorWebView hosting AppMainLayout
    // (sidebar rendered once, 5 pages Keep-Alive inside Blazor).
    private BlazorWebView? _mainWebView;
    private bool _warmupStarted;
#if WINDOWS
    // CoreWebView2 is recreated when the WebView2 browser process restarts, so the
    // virtual-host mappings and CoreWebView2 event wiring must re-run per instance.
    private Microsoft.Web.WebView2.Core.CoreWebView2? _zoomWiredCore;
    private WebView2? _dropWiredView;
#endif

    public MainPage(ICalendarStateService calendarState, ISettingsRepository settingsRepository, IAppNavService navService, IClipAgentService clipAgent, ITranslatorService translator, LocalizationService lang, ShellIntegrationService shellIntegration, ShellIpcService shellIpc)
    {
        InitializeComponent();
        _calendarState = calendarState;
        _settingsRepository = settingsRepository;
        _navService = navService;
        _clipAgent = clipAgent;
        _translator = translator;
        _lang = lang;
        _shellIntegration = shellIntegration;
        _shellIpc = shellIpc;
        Loaded += OnPageLoaded;
    }

    private async void OnPageLoaded(object? sender, EventArgs e)
    {
        Loaded -= OnPageLoaded;
        if (_warmupStarted) return;
        _warmupStarted = true;
        _shellIpc.Start();
#if WINDOWS
        var startupPaths = ShellCommandLine.ParseAddToJamrah(Environment.GetCommandLineArgs());
        if (startupPaths.Count > 0) _shellIpc.Enqueue(startupPaths);
#endif
#if ANDROID
        // Mobile only: go straight to Tasks (landing page), single WebView builds once.
        SplashLayer.IsVisible = false;
        EnsureMainWebView();
        _navService.SetCurrent("tasks");
        await Task.CompletedTask;
        return;
#else
        await RunWarmupAsync();
#endif
    }

    // ─── Splash + startup warmup (single WebView) ────────────────────────────

    private async Task RunWarmupAsync()
    {
        try
        {
            await LoadSplashAsync();
            await SetSplashAsync(5, _lang["splash.preparing"]);
            await _settingsRepository.InitAsync();
            _ = _clipAgent.ApplyStartupStateAsync();
            _ = _translator.ApplyStartupStateAsync();
            try { _shellIntegration.ApplyStartupState(); } catch { }
            await SetSplashAsync(30, _lang["splash.tasks"]);
            EnsureMainWebView();
            await WaitForBlazorReadyAsync(_mainWebView);
            await SetSplashAsync(90, _lang["splash.finishing"]);
        }
        catch { }
        try { await SetSplashAsync(100, _lang["splash.done"]); } catch { }
        await Task.Delay(350);
        SplashLayer.IsVisible = false;
        _navService.SetCurrent("tasks");
    }

    private async Task LoadSplashAsync()
    {
        try
        {
            using var stream = await FileSystem.OpenAppPackageFileAsync("wwwroot/splash.html");
            using var reader = new StreamReader(stream);
            var html = await reader.ReadToEndAsync();
            if (_lang.Lang == "en")
            {
                html = html.Replace("<html lang=\"ar\" dir=\"rtl\">", "<html lang=\"en\" dir=\"ltr\">")
                    .Replace("جَمْرَة — جاري التحميل", "JAMRAH — Loading")
                    .Replace("شعلة الإنتاجية", "Ember of productivity")
                    .Replace("ember of productivity", string.Empty)
                    .Replace("جاري تجهيز مساحة عملك وتحميل جميع الصفحات مسبقاً،<br>عشان تتنقل بينها بدون انتظار.", "Preparing your workspace and preloading all pages,<br>so you can switch between them without waiting.")
                    .Replace("جاري التحميل...", "Loading...")
                    .Replace("الإصدار 4.3.0 • جميع بياناتك محلية وآمنة", "Version 4.3.0 • All your data is local and safe");
            }
            SplashView.Source = new HtmlWebViewSource { Html = html };
        }
        catch { }
    }

    private async Task SetSplashAsync(int percent, string stage)
    {
        try
        {
            var safe = stage.Replace("'", "\\'");
            await SplashView.EvaluateJavaScriptAsync($"setSplashProgress({percent}, '{safe}')");
        }
        catch { }
    }

    private static async Task WaitForBlazorReadyAsync(BlazorWebView? webView)
    {
        try
        {
            if (webView == null) return;
            for (var i = 0; i < 100 && webView.Handler == null; i++)
                await Task.Delay(100);
#if WINDOWS
            if (webView.Handler?.PlatformView is not WebView2 platformView) return;
            await EnsureCoreReadyAsync(platformView, "warmup");
            if (platformView.CoreWebView2 == null) return;
            var tcs = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            void OnNav(object? s, object? e) => tcs.TrySetResult();
            platformView.NavigationCompleted += OnNav;
            try
            {
                await Task.WhenAny(tcs.Task, Task.Delay(TimeSpan.FromSeconds(15)));
                await Task.Delay(800);
            }
            finally
            {
                platformView.NavigationCompleted -= OnNav;
            }
#else
            await Task.Delay(1500);
#endif
        }
        catch { }
    }

#if WINDOWS
    private static async Task<bool> EnsureCoreReadyAsync(WebView2 platformView, string why)
    {
        try
        {
            var ensure = platformView.EnsureCoreWebView2Async().AsTask();
            var done = await Task.WhenAny(ensure, Task.Delay(TimeSpan.FromSeconds(10)));
            if (done != ensure) return false;
            await ensure;
            return platformView.CoreWebView2 != null;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[ZOOM-DIAG] EnsureFail {why}: {ex.GetType().Name}: {ex.Message}");
            return false;
        }
    }
#endif

    // ─── Single WebView (fixed sidebar layout) ───────────────────────────────

    private void EnsureMainWebView()
    {
        if (_mainWebView != null) return;
        _mainWebView = new BlazorWebView
        {
            HostPage = "wwwroot/index.html",
        };
        _mainWebView.RootComponents.Add(new RootComponent
        {
            Selector      = "#app",
            ComponentType = typeof(AppMainLayout)
        });
        // Article reader links: external http(s) opens in the browser, in-page
        // anchors and the app origin itself keep loading inside the WebView.
        // The app origin is a loopback address that varies by version/config
        // (0.0.0.0, 0.0.0.1, ...), so allow any IP/localhost host instead of one.
        _mainWebView.UrlLoading += (_, e) =>
        {
            if ((e.Url.Scheme == "http" || e.Url.Scheme == "https")
                && !IsAppOriginHost(e.Url.Host))
            {
                e.UrlLoadingStrategy = Microsoft.AspNetCore.Components.WebView.UrlLoadingStrategy.CancelLoad;
                _ = Microsoft.Maui.ApplicationModel.Launcher.OpenAsync(e.Url);
            }
        };
        MainContent.Children.Add(_mainWebView);
        EnableUnifiedZoom(_mainWebView);
    }

    /// <summary>
    /// True for the BlazorWebView app origin and in-page anchors (same host).
    /// Real article links are DNS names; anything numeric/local is the app itself.
    /// </summary>
    private static bool IsAppOriginHost(string host)
    {
        if (string.IsNullOrWhiteSpace(host)) return true;
        if (host.Equals("localhost", System.StringComparison.OrdinalIgnoreCase)) return true;
        return System.Net.IPAddress.TryParse(host, out _);
    }

    // ─── Unified zoom (one zoom for sidebar + content, persisted as zoom_unified) ───

    private void EnableUnifiedZoom(BlazorWebView webView)
    {
#if WINDOWS
        WebView2? wiredPlatformView = null;
        void Wire()
        {
            if (webView.Handler?.PlatformView is WebView2 platformView && !ReferenceEquals(platformView, wiredPlatformView))
            {
                wiredPlatformView = platformView;
                // The core is recreated after a browser-process failure; re-run the
                // wiring whenever it (re)initializes (subscribe once per platform view).
                platformView.CoreWebView2Initialized += (_, _) => _ = WireUnifiedZoomAsync(platformView);
                _ = WireUnifiedZoomAsync(platformView);
            }
        }
        Wire();
        webView.HandlerChanged += (_, _) => Wire();
#else
        // Non-Windows: zoom shortcuts stay dormant (same as before — JS init is Windows-driven).
        _ = Task.CompletedTask;
#endif
    }

#if WINDOWS
    private async Task WireUnifiedZoomAsync(WebView2 platformView)
    {
        try
        {
            if (!await EnsureCoreReadyAsync(platformView, "unified/wire")) return;
            var core = platformView.CoreWebView2;
            if (core == null || ReferenceEquals(core, _zoomWiredCore)) return;
            _zoomWiredCore = core;

            try { core.Settings.IsZoomControlEnabled = false; } catch {}
            try { core.Settings.IsPinchZoomEnabled = false; } catch {}

            // Clipboard images (bookmark clips) served from local folder — moved here
            // from the old bookmarks-only WebView wiring.
            try
            {
                var clipsDir = Jamrah.Infrastructure.AppPaths.Layout.ClipsDir;
                System.IO.Directory.CreateDirectory(clipsDir);
                core.SetVirtualHostNameToFolderMapping("jamrahclips.local", clipsDir, Microsoft.Web.WebView2.Core.CoreWebView2HostResourceAccessKind.Allow);
            }
            catch { }

            try
            {
                var libraryDir = Jamrah.Infrastructure.AppPaths.Layout.LibraryDir;
                System.IO.Directory.CreateDirectory(libraryDir);
                core.SetVirtualHostNameToFolderMapping(Jamrah.Infrastructure.AppPaths.HostLibrary, libraryDir, Microsoft.Web.WebView2.Core.CoreWebView2HostResourceAccessKind.Allow);
            }
            catch { }

            // ADDITIVE: Explorer drag & drop with real paths (WebView2 gives no paths to JS).
            // Wired once per platform view: the view survives core recreation and the
            // handler resolves the live core at drop time, so re-adding would double-fire.
            if (!ReferenceEquals(platformView, _dropWiredView))
            {
                _dropWiredView = platformView;
                try
                {
                    platformView.AllowDrop = true;
                    platformView.DragOver += (s, de) =>
                    {
                        try
                        {
                            if (de.DataView.Contains(Windows.ApplicationModel.DataTransfer.StandardDataFormats.StorageItems))
                                de.AcceptedOperation = Windows.ApplicationModel.DataTransfer.DataPackageOperation.Copy;
                        }
                        catch { }
                    };
                    platformView.Drop += async (s, e) =>
                    {
                        try
                        {
                            if (!e.DataView.Contains(Windows.ApplicationModel.DataTransfer.StandardDataFormats.StorageItems)) return;
                            var items = await e.DataView.GetStorageItemsAsync();
                            var paths = new System.Collections.Generic.List<string>();
                            foreach (var it in items)
                            {
                                if (it is Windows.Storage.StorageFile sf) paths.Add(sf.Path);
                                else if (it is Windows.Storage.StorageFolder dir) paths.Add(dir.Path);
                            }
                            if (paths.Count == 0) return;
                            var json = System.Text.Json.JsonSerializer.Serialize(paths);
                            await platformView.CoreWebView2.ExecuteScriptAsync(
                                $"window.jamrahLocalDrop && window.jamrahLocalDrop.deliver({json})");
                        }
                        catch { }
                    };
                }
                catch { }
            }

            async Task ApplyUnifiedZoomAsync()
            {
                try
                {
                    var z = await _settingsRepository.GetUnifiedZoomAsync();
                    var js = $"if(window.jamrahZoom) window.jamrahZoom.init('unified', {z.ToString(System.Globalization.CultureInfo.InvariantCulture)}); else document.documentElement.style.zoom='{z.ToString(System.Globalization.CultureInfo.InvariantCulture)}';";
                    if (platformView.CoreWebView2 != null)
                        await platformView.CoreWebView2.ExecuteScriptAsync(js);
                }
                catch { }
            }

            core.NavigationCompleted += async (s, e) =>
            {
                await ApplyUnifiedZoomAsync();
            };
            core.WebMessageReceived += (s, e) =>
            {
                try
                {
                    var msg = e.TryGetWebMessageAsString();
                    if (string.IsNullOrWhiteSpace(msg)) return;
                    using var doc = System.Text.Json.JsonDocument.Parse(msg);
                    if (!doc.RootElement.TryGetProperty("type", out var t) || t.GetString() != "zoom") return;
                    if (!doc.RootElement.TryGetProperty("zoom", out var z)) return;
                    var zoomVal = z.GetDouble();
                    _ = _settingsRepository.SetUnifiedZoomAsync(zoomVal);
                }
                catch { }
            };

            await ApplyUnifiedZoomAsync();
        }
        catch { }
    }
#endif
}
