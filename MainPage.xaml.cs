using Jamrah.Core.Interfaces;
using Jamrah.Presentation.Shared;
using Microsoft.AspNetCore.Components.WebView.Maui;
#if WINDOWS
using Microsoft.UI.Xaml.Controls;
#endif

namespace Jamrah;

public partial class MainPage : ContentPage
{
    private readonly ICalendarStateService _calendarState;
    private readonly ISettingsRepository _settingsRepository;
    private readonly IAppNavService _navService;
    private BlazorWebView? _calendarWebView;
    private BlazorWebView? _tasksWebView;
    private BlazorWebView? _pomodoroWebView;
    private BlazorWebView? _planningWebView;
    private BlazorWebView? _bookmarkWebView;

    public MainPage(ICalendarStateService calendarState, ISettingsRepository settingsRepository, IAppNavService navService)
    {
        InitializeComponent();
        _calendarState = calendarState;
        _settingsRepository = settingsRepository;
        _navService = navService;
        _navService.PageRequested += OnNavPageRequested;
        _ = _settingsRepository.InitAsync();

        ShowTasksPage();
    }

    // ─── Blazor → native page switching (app sidebar nav buttons) ────────────

    private void OnNavPageRequested(string page)
    {
        Dispatcher.Dispatch(() =>
        {
            switch (page)
            {
                case "tasks": ShowTasksPage(); break;
                case "pomodoro": ShowPomodoroPage(); break;
                case "calendar": ShowCalendarPage(); break;
                case "planning": ShowPlanningPage(); break;
                case "bookmarks": ShowBookmarksPage(); break;
            }
        });
    }

    // ─── Content area switching ──────────────────────────────────────────────

    private void ShowPomodoroPage()
    {
        EnsurePomodoroWebView();
        _navService.SetCurrent("pomodoro");
        if (_calendarWebView != null) _calendarWebView.IsVisible = false;
        if (_tasksWebView != null) _tasksWebView.IsVisible = false;
        if (_planningWebView != null) _planningWebView.IsVisible = false;
        if (_bookmarkWebView != null) _bookmarkWebView.IsVisible = false;
        _pomodoroWebView!.IsVisible = true;
    }

    private void ShowCalendarPage()
    {
        EnsureCalendarWebView();
        _navService.SetCurrent("calendar");
        if (_tasksWebView != null) _tasksWebView.IsVisible = false;
        if (_pomodoroWebView != null) _pomodoroWebView.IsVisible = false;
        if (_planningWebView != null) _planningWebView.IsVisible = false;
        if (_bookmarkWebView != null) _bookmarkWebView.IsVisible = false;
        _calendarWebView!.IsVisible = true;
    }

    private void ShowTasksPage()
    {
        EnsureTasksWebView();
        _navService.SetCurrent("tasks");
        if (_calendarWebView != null) _calendarWebView.IsVisible = false;
        if (_pomodoroWebView != null) _pomodoroWebView.IsVisible = false;
        if (_planningWebView != null) _planningWebView.IsVisible = false;
        if (_bookmarkWebView != null) _bookmarkWebView.IsVisible = false;
        _tasksWebView!.IsVisible = true;
    }

    private void ShowPlanningPage()
    {
        EnsurePlanningWebView();
        _navService.SetCurrent("planning");
        if (_calendarWebView != null) _calendarWebView.IsVisible = false;
        if (_tasksWebView != null) _tasksWebView.IsVisible = false;
        if (_pomodoroWebView != null) _pomodoroWebView.IsVisible = false;
        if (_bookmarkWebView != null) _bookmarkWebView.IsVisible = false;
        _planningWebView!.IsVisible = true;
    }

    private void ShowBookmarksPage()
    {
        EnsureBookmarksWebView();
        _navService.SetCurrent("bookmarks");
        if (_calendarWebView != null) _calendarWebView.IsVisible = false;
        if (_tasksWebView != null) _tasksWebView.IsVisible = false;
        if (_pomodoroWebView != null) _pomodoroWebView.IsVisible = false;
        if (_planningWebView != null) _planningWebView.IsVisible = false;
        _bookmarkWebView!.IsVisible = true;
    }

    // ─── Ensure WebViews (lazy per page - Android single WebView) ────────────

    private void EnsureCalendarWebView()
    {
        if (_calendarWebView != null) return;
        _calendarWebView = new Microsoft.AspNetCore.Components.WebView.Maui.BlazorWebView
        {
            HostPage = "wwwroot/index.html",
        };
        _calendarWebView.RootComponents.Add(new Microsoft.AspNetCore.Components.WebView.Maui.RootComponent
        {
            Selector      = "#app",
            ComponentType = typeof(Presentation.Shared.ShellCalendarPage)
        });
        MainContent.Children.Add(_calendarWebView);
        EnableZoomWithPersistence(_calendarWebView, "calendar");
    }

    private void EnsureTasksWebView()
    {
        if (_tasksWebView != null) return;
        _tasksWebView = new BlazorWebView
        {
            HostPage = "wwwroot/index.html",
        };
        _tasksWebView.RootComponents.Add(new RootComponent
        {
            Selector      = "#app",
            ComponentType = typeof(Presentation.Shared.ShellTaskPage)
        });
        MainContent.Children.Add(_tasksWebView);
        EnableZoomWithPersistence(_tasksWebView, "tasks");
    }

    private void EnsurePomodoroWebView()
    {
        if (_pomodoroWebView != null) return;
        _pomodoroWebView = new BlazorWebView
        {
            HostPage = "wwwroot/index.html",
        };
        _pomodoroWebView.RootComponents.Add(new RootComponent
        {
            Selector      = "#app",
            ComponentType = typeof(Presentation.Shared.ShellPomodoroPage)
        });
        MainContent.Children.Add(_pomodoroWebView);
        EnableZoomWithPersistence(_pomodoroWebView, "pomodoro");
    }

    private void EnsurePlanningWebView()
    {
        if (_planningWebView != null) return;
        _planningWebView = new BlazorWebView
        {
            HostPage = "wwwroot/index.html",
        };
        _planningWebView.RootComponents.Add(new RootComponent
        {
            Selector      = "#app",
            ComponentType = typeof(Presentation.Shared.ShellPlanningPage)
        });
        MainContent.Children.Add(_planningWebView);
        EnableZoomWithPersistence(_planningWebView, "planning");
    }

    private void EnsureBookmarksWebView()
    {
        if (_bookmarkWebView != null) return;
        _bookmarkWebView = new BlazorWebView
        {
            HostPage = "wwwroot/index.html",
        };
        _bookmarkWebView.RootComponents.Add(new RootComponent
        {
            Selector      = "#app",
            ComponentType = typeof(Presentation.Shared.ShellBookmarksPage)
        });
        MainContent.Children.Add(_bookmarkWebView);
        EnableZoomWithPersistence(_bookmarkWebView, "bookmarks");
    }

    // ─── Zoom per-page persisted in Settings table ──────────────────────────

    private void EnableZoomWithPersistence(BlazorWebView webView, string pageKey)
    {
        webView.HandlerChanged += async (_, _) =>
        {
#if WINDOWS
            if (webView.Handler?.PlatformView is WebView2 platformView)
            {
                // سجل المستمع قبل Ensure لضمان عدم فوات أول NavigationCompleted
                async Task ApplyZoomAsync()
                {
                    try
                    {
                        var z = await _settingsRepository.GetZoomAsync(pageKey);
                        var js = $"if(window.jamrahZoom) window.jamrahZoom.init('{pageKey}', {z.ToString(System.Globalization.CultureInfo.InvariantCulture)}); else document.documentElement.style.zoom='{z.ToString(System.Globalization.CultureInfo.InvariantCulture)}';";
                        if (platformView.CoreWebView2 != null)
                            await platformView.CoreWebView2.ExecuteScriptAsync(js);
                    }
                    catch { }
                }

                await platformView.EnsureCoreWebView2Async();
                if (platformView.CoreWebView2 != null)
                {
                    try { platformView.CoreWebView2.Settings.IsZoomControlEnabled = false; } catch {}
                    try { platformView.CoreWebView2.Settings.IsPinchZoomEnabled = false; } catch {}

                    // اشترك قبل أي تنقل لضمان التقاط أول تحميل لـ pomodoro/calendar
                    platformView.CoreWebView2.NavigationCompleted += async (s, e) => await ApplyZoomAsync();
                    platformView.CoreWebView2.WebMessageReceived += async (s, e) =>
                    {
                        try
                        {
                            var msg = e.TryGetWebMessageAsString();
                            if (string.IsNullOrWhiteSpace(msg)) return;
                            using var doc = System.Text.Json.JsonDocument.Parse(msg);
                            if (!doc.RootElement.TryGetProperty("type", out var t) || t.GetString() != "zoom") return;
                            if (!doc.RootElement.TryGetProperty("page", out var p) || p.GetString() != pageKey) return;
                            if (!doc.RootElement.TryGetProperty("zoom", out var z)) return;
                            var zoomVal = z.GetDouble();
                            await _settingsRepository.SetZoomAsync(pageKey, zoomVal);
                        }
                        catch { }
                    };

                    await ApplyZoomAsync();
                }
            }
#else
            try { await _settingsRepository.GetZoomAsync(pageKey); } catch {}
            // Android: سيطبّق الزوم عبر JS بعد تحميل Blazor (zoom-per-page.js يعمل على كل المنصات)
#endif
        };
    }
}
