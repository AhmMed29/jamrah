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
    private BlazorWebView? _bookmarkWebView;
    private enum ActivePage { None, Tasks, Pomodoro, Calendar, Planning, Bookmarks }
    private ActivePage _activePage = ActivePage.None;
    private bool _sidebarCollapsed;

    // Unified sidebar palette (#F7F6F3 warm cream family)
    private static readonly Color SbBg      = Color.FromArgb("#F7F6F3");
    private static readonly Color SbHover   = Color.FromArgb("#F1EFE9");
    private static readonly Color SbInk     = Color.FromArgb("#181715");
    private static readonly Color SbInk2    = Color.FromArgb("#59554E");
    private static readonly Color SbWhite   = Color.FromArgb("#FFFFFF");

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
    private void OnBookmarksTapped(object sender, TappedEventArgs e)      => ShowBookmarksPage();
    private void OnSidebarCollapseTapped(object sender, TappedEventArgs e) => SetSidebarCollapsed(!_sidebarCollapsed);

    private void ShowPomodoroPage()
    {
        EnsurePomodoroWebView();
        if (_calendarWebView != null) _calendarWebView.IsVisible = false;
        if (_tasksWebView != null) _tasksWebView.IsVisible = false;
        if (_planningWebView != null) _planningWebView.IsVisible = false;
        if (_bookmarkWebView != null) _bookmarkWebView.IsVisible = false;
        _pomodoroWebView!.IsVisible = true;
        SetActivePage(ActivePage.Pomodoro);
    }

    private void ShowCalendarPage()
    {
        EnsureCalendarWebView();
        if (_tasksWebView != null) _tasksWebView.IsVisible = false;
        if (_pomodoroWebView != null) _pomodoroWebView.IsVisible = false;
        if (_planningWebView != null) _planningWebView.IsVisible = false;
        if (_bookmarkWebView != null) _bookmarkWebView.IsVisible = false;
        _calendarWebView!.IsVisible = true;
        SetActivePage(ActivePage.Calendar);
    }

    private void ShowTasksPage()
    {
        EnsureTasksWebView();
        if (_calendarWebView != null) _calendarWebView.IsVisible = false;
        if (_pomodoroWebView != null) _pomodoroWebView.IsVisible = false;
        if (_planningWebView != null) _planningWebView.IsVisible = false;
        if (_bookmarkWebView != null) _bookmarkWebView.IsVisible = false;
        _tasksWebView!.IsVisible = true;
        SetActivePage(ActivePage.Tasks);
    }

    private void ShowPlanningPage()
    {
        EnsurePlanningWebView();
        if (_calendarWebView != null) _calendarWebView.IsVisible = false;
        if (_tasksWebView != null) _tasksWebView.IsVisible = false;
        if (_pomodoroWebView != null) _pomodoroWebView.IsVisible = false;
        if (_bookmarkWebView != null) _bookmarkWebView.IsVisible = false;
        _planningWebView!.IsVisible = true;
        SetActivePage(ActivePage.Planning);
    }

    private void ShowBookmarksPage()
    {
        EnsureBookmarksWebView();
        if (_calendarWebView != null) _calendarWebView.IsVisible = false;
        if (_tasksWebView != null) _tasksWebView.IsVisible = false;
        if (_pomodoroWebView != null) _pomodoroWebView.IsVisible = false;
        if (_planningWebView != null) _planningWebView.IsVisible = false;
        _bookmarkWebView!.IsVisible = true;
        SetActivePage(ActivePage.Bookmarks);
    }

    // ─── Sidebar collapse (Slim Mode: 250px <-> 64px) ────────────────────────

    private void SetSidebarCollapsed(bool collapsed)
    {
        _sidebarCollapsed = collapsed;
        ShellGrid.ColumnDefinitions = new Microsoft.Maui.Controls.ColumnDefinitionCollection
        {
            new Microsoft.Maui.Controls.ColumnDefinition { Width = new GridLength(collapsed ? 64 : 250) },
            new Microsoft.Maui.Controls.ColumnDefinition { Width = GridLength.Star }
        };

        BrandName.IsVisible = !collapsed;
        MenuSectionLbl.IsVisible = !collapsed;
        TasksLbl.IsVisible = !collapsed;
        PomoLbl.IsVisible = !collapsed;
        CalLbl.IsVisible = !collapsed;
        PlanningLbl.IsVisible = !collapsed;
        BmLbl.IsVisible = !collapsed;

        var rowOption = collapsed ? LayoutOptions.Center : LayoutOptions.Start;
        TasksBtnRow.HorizontalOptions = rowOption;
        PomoBtnRow.HorizontalOptions = rowOption;
        CalBtnRow.HorizontalOptions = rowOption;
        PlanningBtnRow.HorizontalOptions = rowOption;
        BmBtnRow.HorizontalOptions = rowOption;

        BrandRow.HorizontalOptions = collapsed ? LayoutOptions.Center : LayoutOptions.Start;
        BrandRow.Padding = collapsed ? new Thickness(0, 4, 0, 12) : new Thickness(16, 4, 12, 12);
        CollapseIcon.ScaleX = collapsed ? -1 : 1;
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
            ComponentType = typeof(Presentation.Bookmarks.BookmarkPage)
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

    // ─── Active page highlight ───────────────────────────────────────────────

    private void StyleNavButton(Microsoft.Maui.Controls.Border border, Microsoft.Maui.Controls.Shapes.Path icon, Label label, bool active)
    {
        border.Background = active ? SbInk : Colors.Transparent;
        icon.Fill = new SolidColorBrush(active ? SbWhite : SbInk2);
        label.TextColor = active ? SbWhite : SbInk2;
    }

    private void SetActivePage(ActivePage page)
    {
        _activePage = page;

        StyleNavButton(TasksBtnBorder, TasksIcon, TasksLbl, page == ActivePage.Tasks);
        StyleNavButton(PomoBtnBorder, PomoIcon, PomoLbl, page == ActivePage.Pomodoro);
        StyleNavButton(CalBtnBorder, CalIcon, CalLbl, page == ActivePage.Calendar);
        StyleNavButton(PlanningBtnBorder, PlanningIcon, PlanningLbl, page == ActivePage.Planning);
        StyleNavButton(BmBtnBorder, BmIcon, BmLbl, page == ActivePage.Bookmarks);
    }

    // ─── Hover effects ───────────────────────────────────────────────────────

    private void OnTasksBtnEnter(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Tasks)       TasksBtnBorder.Background = SbHover; }
    private void OnTasksBtnExit(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Tasks)       TasksBtnBorder.Background = Colors.Transparent; }

    private void OnPomoBtnEnter(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Pomodoro)    PomoBtnBorder.Background  = SbHover; }
    private void OnPomoBtnExit(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Pomodoro)    PomoBtnBorder.Background  = Colors.Transparent; }

    private void OnCalBtnEnter(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Calendar)    CalBtnBorder.Background   = SbHover; }
    private void OnCalBtnExit(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Calendar)    CalBtnBorder.Background   = Colors.Transparent; }

    private void OnPlanningBtnEnter(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Planning)    PlanningBtnBorder.Background = SbHover; }
    private void OnPlanningBtnExit(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Planning)    PlanningBtnBorder.Background = Colors.Transparent; }

    private void OnBmBtnEnter(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Bookmarks)   BmBtnBorder.Background = SbHover; }
    private void OnBmBtnExit(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Bookmarks)   BmBtnBorder.Background = Colors.Transparent; }

    private void OnCollapseBtnEnter(object sender, PointerEventArgs e)
    { CollapseBorder.Background = SbHover; }
    private void OnCollapseBtnExit(object sender, PointerEventArgs e)
    { CollapseBorder.Background = Colors.Transparent; }
}
