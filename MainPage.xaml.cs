using Jamrah.Core.Interfaces;
using Microsoft.AspNetCore.Components.WebView.Maui;
#if WINDOWS
using Microsoft.UI.Xaml.Controls;
#endif
using PointerEventArgs = Microsoft.Maui.Controls.PointerEventArgs;

namespace Jamrah;

public partial class MainPage : ContentPage
{
    private readonly ICalendarStateService _calendarState;
    private readonly ISettingsRepository _settingsRepository;
    private BlazorWebView? _calendarWebView;
    private BlazorWebView? _tasksWebView;
    private BlazorWebView? _pomodoroWebView;
    private BlazorWebView? _planningWebView;
    private enum ActivePage { None, Tasks, Pomodoro, Calendar, Planning }
    private ActivePage _activePage = ActivePage.None;

    public MainPage(ICalendarStateService calendarState, ISettingsRepository settingsRepository)
    {
        InitializeComponent();
        _calendarState = calendarState;
        _settingsRepository = settingsRepository;
        _ = _settingsRepository.InitAsync();
     
        ShowTasksPage();
    }

    
    // ─── Content area switching ──────────────────────────────────────────────

    private void OnPomodoroTapped(object sender, TappedEventArgs e)      => ShowPomodoroPage();
    private void OnMyTasksTapped(object sender, TappedEventArgs e)        => ShowTasksPage();
    private void OnCalendarMonthTapped(object sender, TappedEventArgs e)  => ShowCalendarPage();
    private void OnPlanningTapped(object sender, TappedEventArgs e)       => ShowPlanningPage();

    private void ShowPomodoroPage()
    {
        EnsurePomodoroWebView();
        if (_calendarWebView != null) _calendarWebView.IsVisible = false;
        if (_tasksWebView != null) _tasksWebView.IsVisible = false;
        if (_planningWebView != null) _planningWebView.IsVisible = false;
        _pomodoroWebView!.IsVisible = true;
        SetActivePage(ActivePage.Pomodoro);
    }

    private void ShowCalendarPage()
    {
        EnsureCalendarWebView();
        if (_tasksWebView != null) _tasksWebView.IsVisible = false;
        if (_pomodoroWebView != null) _pomodoroWebView.IsVisible = false;
        if (_planningWebView != null) _planningWebView.IsVisible = false;
        _calendarWebView!.IsVisible = true;
        SetActivePage(ActivePage.Calendar);
    }

    private void ShowTasksPage()
    {
        EnsureTasksWebView();
        if (_calendarWebView != null) _calendarWebView.IsVisible = false;
        if (_pomodoroWebView != null) _pomodoroWebView.IsVisible = false;
        if (_planningWebView != null) _planningWebView.IsVisible = false;
        _tasksWebView!.IsVisible = true;
        SetActivePage(ActivePage.Tasks);
    }

    private void ShowPlanningPage()
    {
        EnsurePlanningWebView();
        if (_calendarWebView != null) _calendarWebView.IsVisible = false;
        if (_tasksWebView != null) _tasksWebView.IsVisible = false;
        if (_pomodoroWebView != null) _pomodoroWebView.IsVisible = false;
        _planningWebView!.IsVisible = true;
        SetActivePage(ActivePage.Planning);
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
            ComponentType = typeof(Presentation.Calendar.CalendarPage)
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
            ComponentType = typeof(Presentation.Tasks.TaskPage)
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
            ComponentType = typeof(Presentation.Pomodoro.PomodoroPage)
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
            ComponentType = typeof(Presentation.Planning.PlanningPage)
        });
        MainContent.Children.Add(_planningWebView);
        EnableZoomWithPersistence(_planningWebView, "planning");
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

    // ─── Active page highlight ───────────────────────────────────────────────

    private void SetActivePage(ActivePage page)
    {
        _activePage = page;

        // Reset all - Unified Light
        TasksBtnBorder.Background = Color.FromArgb("#FFFFFF");
        PomoBtnBorder.Background  = Color.FromArgb("#FFFFFF");
        CalBtnBorder.Background   = Color.FromArgb("#FFFFFF");
        PlanningBtnBorder.Background = Color.FromArgb("#FFFFFF");
        TasksBtnBorder.Stroke = Color.FromArgb("#E7E5E4");
        PomoBtnBorder.Stroke  = Color.FromArgb("#E7E5E4");
        CalBtnBorder.Stroke   = Color.FromArgb("#E7E5E4");
        PlanningBtnBorder.Stroke = Color.FromArgb("#E7E5E4");
        TasksIcon.Fill = new SolidColorBrush(Color.FromArgb("#78716C"));
        PomoIcon.Fill  = new SolidColorBrush(Color.FromArgb("#78716C"));
        CalIcon.Fill   = new SolidColorBrush(Color.FromArgb("#78716C"));
        PlanningIcon.Fill = new SolidColorBrush(Color.FromArgb("#78716C"));

        // Highlight active
        switch (page)
        {
            case ActivePage.Tasks:
                TasksBtnBorder.Background = Color.FromArgb("#1C1917");
                TasksBtnBorder.Stroke = Color.FromArgb("#1C1917");
                TasksIcon.Fill = new SolidColorBrush(Color.FromArgb("#FFFFFF"));
                break;
            case ActivePage.Pomodoro:
                PomoBtnBorder.Background = Color.FromArgb("#1C1917");
                PomoBtnBorder.Stroke = Color.FromArgb("#1C1917");
                PomoIcon.Fill = new SolidColorBrush(Color.FromArgb("#FFFFFF"));
                break;
            case ActivePage.Calendar:
                CalBtnBorder.Background = Color.FromArgb("#1C1917");
                CalBtnBorder.Stroke = Color.FromArgb("#1C1917");
                CalIcon.Fill = new SolidColorBrush(Color.FromArgb("#FFFFFF"));
                break;
            case ActivePage.Planning:
                PlanningBtnBorder.Background = Color.FromArgb("#1C1917");
                PlanningBtnBorder.Stroke = Color.FromArgb("#1C1917");
                PlanningIcon.Fill = new SolidColorBrush(Color.FromArgb("#FFFFFF"));
                break;
        }
    }

    // ─── Hover effects ───────────────────────────────────────────────────────

    private void OnTasksBtnEnter(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Tasks)     TasksBtnBorder.Background = Color.FromArgb("#F5F5F4"); }
    private void OnTasksBtnExit(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Tasks)     TasksBtnBorder.Background = Color.FromArgb("#FFFFFF"); }

    private void OnPomoBtnEnter(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Pomodoro)  PomoBtnBorder.Background  = Color.FromArgb("#F5F5F4"); }
    private void OnPomoBtnExit(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Pomodoro)  PomoBtnBorder.Background  = Color.FromArgb("#FFFFFF"); }

    private void OnCalBtnEnter(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Calendar)  CalBtnBorder.Background   = Color.FromArgb("#F5F5F4"); }
    private void OnCalBtnExit(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Calendar)  CalBtnBorder.Background   = Color.FromArgb("#FFFFFF"); }

    private void OnPlanningBtnEnter(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Planning)  PlanningBtnBorder.Background = Color.FromArgb("#F5F5F4"); }
    private void OnPlanningBtnExit(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Planning)  PlanningBtnBorder.Background = Color.FromArgb("#FFFFFF"); }
}
