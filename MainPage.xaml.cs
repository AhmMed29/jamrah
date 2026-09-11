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
    private Microsoft.Maui.Controls.Border? _pill;
    private Label _pillZoomLabel = null!;
    private Microsoft.Maui.Controls.Button _pinButton = null!;
    private string? _pillPageKey;
    private double _pillZoom;
    private readonly Dictionary<string, double> _pinnedZooms = new();
    private int _pillGen;

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
        HidePill();
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
        HidePill();
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
        HidePill();
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
        HidePill();
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
        HidePill();
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
                        _pinnedZooms[pageKey] = z;
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
                    platformView.CoreWebView2.WebMessageReceived += (s, e) =>
                    {
                        try
                        {
                            var msg = e.TryGetWebMessageAsString();
                            if (string.IsNullOrWhiteSpace(msg)) return;
                            using var doc = System.Text.Json.JsonDocument.Parse(msg);
                            if (!doc.RootElement.TryGetProperty("type", out var t) || t.GetString() != "zoom") return;
                            if (!doc.RootElement.TryGetProperty("page", out var p) || p.GetString() != pageKey) return;
                            if (!doc.RootElement.TryGetProperty("zoom", out var z)) return;
                            UpdatePillFromMessage(pageKey, z.GetDouble());
                        }
                        catch { }
                    };

                    await ApplyZoomAsync();
                }
            }
#else
            try { _pinnedZooms[pageKey] = await _settingsRepository.GetZoomAsync(pageKey); } catch {}
            // Android: سيطبّق الزوم عبر JS بعد تحميل Blazor (zoom-per-page.js يعمل على كل المنصات)
#endif
        };
    }

    private void EnsurePill()
    {
        if (_pill != null) return;

        _pillZoomLabel = new Label
        {
            Text = "1.0",
            TextColor = Colors.White,
            FontSize = 14,
            VerticalOptions = LayoutOptions.Center,
            HorizontalTextAlignment = TextAlignment.Center,
            MinimumWidthRequest = 40
        };

        Microsoft.Maui.Controls.Button MakeButton(string text, double opacity) => new Microsoft.Maui.Controls.Button
        {
            Text = text,
            TextColor = Colors.White,
            BackgroundColor = Colors.Transparent,
            FontSize = 15,
            Padding = new Thickness(0),
            CornerRadius = 14,
            WidthRequest = 32,
            HeightRequest = 28,
            Opacity = opacity,
            VerticalOptions = LayoutOptions.Center
        };

        var minusButton = MakeButton("−", 0.9);
        var plusButton = MakeButton("+", 0.9);
        _pinButton = MakeButton("📌", 0.4);
        _pinButton.FontSize = 13;

        minusButton.Clicked += async (_, _) => await OnPillZoomDeltaAsync(-0.1);
        plusButton.Clicked += async (_, _) => await OnPillZoomDeltaAsync(0.1);
        _pinButton.Clicked += async (_, _) => await OnPinClickedAsync();

        var row = new HorizontalStackLayout
        {
            Spacing = 2,
            VerticalOptions = LayoutOptions.Center
        };
        row.Children.Add(minusButton);
        row.Children.Add(_pillZoomLabel);
        row.Children.Add(plusButton);
        row.Children.Add(_pinButton);

        _pill = new Microsoft.Maui.Controls.Border
        {
            BackgroundColor = Colors.Black,
            StrokeShape = new Microsoft.Maui.Controls.Shapes.RoundRectangle { CornerRadius = new CornerRadius(18) },
            Padding = new Thickness(10, 5),
            HorizontalOptions = LayoutOptions.Center,
            VerticalOptions = LayoutOptions.Start,
            Margin = new Thickness(0, 10, 0, 0),
            IsVisible = false,
            Content = row
        };

        MainContent.Children.Add(_pill);
    }

    private void UpdatePillFromMessage(string pageKey, double zoom)
    {
        _pillPageKey = pageKey;
        _pillZoom = zoom;
        EnsurePill();
        _pillZoomLabel.Text = zoom.ToString("0.0#", System.Globalization.CultureInfo.InvariantCulture);
        UpdatePinVisual();
        PokePill();
    }

    private void UpdatePinVisual()
    {
        if (_pill == null || _pillPageKey == null) return;
        var isPinned = _pinnedZooms.TryGetValue(_pillPageKey, out var pinned)
                       && Math.Abs(pinned - _pillZoom) < 0.001;
        _pinButton.Opacity = isPinned ? 1.0 : 0.4;
    }

    private void PokePill()
    {
        if (_pill == null) return;
        _pill.IsVisible = true;
        MainContent.Children.Remove(_pill);
        MainContent.Children.Add(_pill);
        var gen = ++_pillGen;
        _ = Task.Delay(2000).ContinueWith(_ =>
        {
            Dispatcher.Dispatch(() =>
            {
                if (gen == _pillGen && _pill != null)
                    _pill.IsVisible = false;
            });
        });
    }

    private void HidePill()
    {
        _pillGen++;
        if (_pill != null && _pill.IsVisible)
            _pill.IsVisible = false;
    }

    private BlazorWebView? WebViewFor(string? pageKey) => pageKey switch
    {
        "tasks" => _tasksWebView,
        "pomodoro" => _pomodoroWebView,
        "calendar" => _calendarWebView,
        "planning" => _planningWebView,
        "bookmarks" => _bookmarkWebView,
        _ => null
    };

    private async Task OnPillZoomDeltaAsync(double delta)
    {
        if (_pillPageKey == null) return;
        var target = Math.Clamp(_pillZoom + delta, 0.5, 2.5);
        PokePill();
        var t = target.ToString(System.Globalization.CultureInfo.InvariantCulture);
        var js = $"if(window.jamrahZoom) window.jamrahZoom.set({t}); else document.documentElement.style.zoom='{t}';";
#if WINDOWS
        if (WebViewFor(_pillPageKey)?.Handler?.PlatformView is WebView2 platformView && platformView.CoreWebView2 != null)
            await platformView.CoreWebView2.ExecuteScriptAsync(js);
#else
        await Task.CompletedTask;
#endif
    }

    private async Task OnPinClickedAsync()
    {
        if (_pillPageKey == null) return;
        _pinnedZooms[_pillPageKey] = _pillZoom;
        UpdatePinVisual();
        PokePill();
        try { await _settingsRepository.SetZoomAsync(_pillPageKey, _pillZoom); } catch { }
    }
}
