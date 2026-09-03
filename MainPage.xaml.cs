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
    private BlazorWebView? _calendarWebView;
    private BlazorWebView? _tasksWebView;
    private BlazorWebView? _pomodoroWebView;
    private enum ActivePage { None, Tasks, Pomodoro, Calendar }
    private ActivePage _activePage = ActivePage.None;

    public MainPage(ICalendarStateService calendarState)
    {
        InitializeComponent();
        _calendarState = calendarState;
    
        ShowTasksPage();
    }

    
    // ─── Content area switching ──────────────────────────────────────────────

    private void OnPomodoroTapped(object sender, TappedEventArgs e)      => ShowPomodoroPage();
    private void OnMyTasksTapped(object sender, TappedEventArgs e)        => ShowTasksPage();
    private void OnCalendarMonthTapped(object sender, TappedEventArgs e)  => ShowCalendarPage();

    private void ShowPomodoroPage()
    {
        EnsurePomodoroWebView();
        if (_calendarWebView != null) _calendarWebView.IsVisible = false;
        if (_tasksWebView != null) _tasksWebView.IsVisible = false;
        _pomodoroWebView!.IsVisible = true;
        SetActivePage(ActivePage.Pomodoro);
    }

    private void ShowCalendarPage()
    {
        EnsureCalendarWebView();
        if (_tasksWebView != null) _tasksWebView.IsVisible = false;
        if (_pomodoroWebView != null) _pomodoroWebView.IsVisible = false;
        _calendarWebView!.IsVisible = true;
        SetActivePage(ActivePage.Calendar);
    }

    private void ShowTasksPage()
    {
        EnsureTasksWebView();
        if (_calendarWebView != null) _calendarWebView.IsVisible = false;
        if (_pomodoroWebView != null) _pomodoroWebView.IsVisible = false;
        _tasksWebView!.IsVisible = true;
        SetActivePage(ActivePage.Tasks);
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
        EnableZoomWithPersistence(_calendarWebView);
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
        EnableZoomWithPersistence(_tasksWebView);
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
        EnableZoomWithPersistence(_pomodoroWebView);
    }

    // ─── Disable Zoom (Windows only) ────────────────────────────────────────────

    private void EnableZoomWithPersistence(BlazorWebView webView)
    {
#if WINDOWS
        webView.HandlerChanged += async (_, _) =>
        {
            if (webView.Handler?.PlatformView is WebView2 platformView)
            {
                await platformView.EnsureCoreWebView2Async();
                if (platformView.CoreWebView2 != null)
                {
                    platformView.CoreWebView2.Settings.IsZoomControlEnabled = true;
                    platformView.CoreWebView2.Settings.IsPinchZoomEnabled   = true;
                }
            }
        };
#endif
    }

    // ─── Active page highlight ───────────────────────────────────────────────

    private void SetActivePage(ActivePage page)
    {
        _activePage = page;

        // Reset all - Unified Light
        TasksBtnBorder.Background = Color.FromArgb("#FFFFFF");
        PomoBtnBorder.Background  = Color.FromArgb("#FFFFFF");
        CalBtnBorder.Background   = Color.FromArgb("#FFFFFF");
        TasksBtnBorder.Stroke = Color.FromArgb("#E7E5E4");
        PomoBtnBorder.Stroke  = Color.FromArgb("#E7E5E4");
        CalBtnBorder.Stroke   = Color.FromArgb("#E7E5E4");
        TasksIcon.Fill = new SolidColorBrush(Color.FromArgb("#78716C"));
        PomoIcon.Fill  = new SolidColorBrush(Color.FromArgb("#78716C"));
        CalIcon.Fill   = new SolidColorBrush(Color.FromArgb("#78716C"));

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
}
