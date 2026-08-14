using Jamrah.Services;
using Microsoft.AspNetCore.Components.WebView.Maui;
using Microsoft.UI.Xaml.Controls;

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
        EnsureWebViews();
        _calendarWebView!.IsVisible = false;
        _tasksWebView!.IsVisible    = false;
        _pomodoroWebView!.IsVisible = true;
        SetActivePage(ActivePage.Pomodoro);
    }

    private void ShowCalendarPage()
    {
        EnsureWebViews();
        _tasksWebView!.IsVisible    = false;
        _pomodoroWebView!.IsVisible = false;
        _calendarWebView!.IsVisible = true;
        SetActivePage(ActivePage.Calendar);
    }

    private void ShowTasksPage()
    {
        EnsureWebViews();
        _calendarWebView!.IsVisible  = false;
        _pomodoroWebView!.IsVisible  = false;
        _tasksWebView!.IsVisible     = true;
        SetActivePage(ActivePage.Tasks);
    }

    // ─── Ensure WebViews ────────────────────────────────────────────────────

    private void EnsureWebViews()
    {
        if (_calendarWebView == null)
        {
            _calendarWebView = new Microsoft.AspNetCore.Components.WebView.Maui.BlazorWebView
            {
                HostPage = "wwwroot/index.html",
            };
            _calendarWebView.RootComponents.Add(new Microsoft.AspNetCore.Components.WebView.Maui.RootComponent
            {
                Selector      = "#app",
                ComponentType = typeof(Components.Calendar.CalendarPage)
            });
            MainContent.Children.Add(_calendarWebView);
            DisableZoom(_calendarWebView);
        }

        if (_tasksWebView == null)
        {
            _tasksWebView = new BlazorWebView
            {
                HostPage = "wwwroot/index.html",
            };
            _tasksWebView.RootComponents.Add(new RootComponent
            {
                Selector      = "#app",
                ComponentType = typeof(Components.Tasks.TaskPage)
            });
            MainContent.Children.Add(_tasksWebView);
            DisableZoom(_tasksWebView);
        }

        if (_pomodoroWebView == null)
        {
            _pomodoroWebView = new BlazorWebView
            {
                HostPage = "wwwroot/index.html",
            };
            _pomodoroWebView.RootComponents.Add(new RootComponent
            {
                Selector      = "#app",
                ComponentType = typeof(Components.Pomodoro.PomodoroPage)
            });
            MainContent.Children.Add(_pomodoroWebView);
            DisableZoom(_pomodoroWebView);
        }
    }

    // ─── Disable Zoom ───────────────────────────────────────────────────────

    private async void DisableZoom(BlazorWebView webView)
    {
        webView.HandlerChanged += async (_, _) =>
        {
            if (webView.Handler?.PlatformView is WebView2 platformView)
            {
                await platformView.EnsureCoreWebView2Async();
                if (platformView.CoreWebView2 != null)
                {
                    platformView.CoreWebView2.Settings.IsZoomControlEnabled = false;
                    platformView.CoreWebView2.Settings.IsPinchZoomEnabled   = false;
                }
            }
        };
    }

    // ─── Active page highlight ───────────────────────────────────────────────

    private void SetActivePage(ActivePage page)
    {
        _activePage = page;

        // Reset all
        TasksBtnBorder.Background = Color.FromArgb("#FFFFFF");
        PomoBtnBorder.Background  = Color.FromArgb("#FFFFFF");
        CalBtnBorder.Background   = Color.FromArgb("#FFFFFF");
        TasksIcon.Fill = new SolidColorBrush(Color.FromArgb("#000000"));
        PomoIcon.Fill  = new SolidColorBrush(Color.FromArgb("#000000"));
        CalIcon.Fill   = new SolidColorBrush(Color.FromArgb("#000000"));

        // Highlight active
        switch (page)
        {
            case ActivePage.Tasks:
                TasksBtnBorder.Background = Color.FromArgb("#000000");
                TasksIcon.Fill = new SolidColorBrush(Color.FromArgb("#FFFFFF"));
                break;
            case ActivePage.Pomodoro:
                PomoBtnBorder.Background = Color.FromArgb("#000000");
                PomoIcon.Fill = new SolidColorBrush(Color.FromArgb("#FFFFFF"));
                break;
            case ActivePage.Calendar:
                CalBtnBorder.Background = Color.FromArgb("#000000");
                CalIcon.Fill = new SolidColorBrush(Color.FromArgb("#FFFFFF"));
                break;
        }
    }

    // ─── Hover effects ───────────────────────────────────────────────────────

    private void OnTasksBtnEnter(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Tasks)     TasksBtnBorder.Background = Color.FromArgb("#EEEEEE"); }
    private void OnTasksBtnExit(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Tasks)     TasksBtnBorder.Background = Color.FromArgb("#FFFFFF"); }

    private void OnPomoBtnEnter(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Pomodoro)  PomoBtnBorder.Background  = Color.FromArgb("#EEEEEE"); }
    private void OnPomoBtnExit(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Pomodoro)  PomoBtnBorder.Background  = Color.FromArgb("#FFFFFF"); }

    private void OnCalBtnEnter(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Calendar)  CalBtnBorder.Background   = Color.FromArgb("#EEEEEE"); }
    private void OnCalBtnExit(object sender, PointerEventArgs e)
    { if (_activePage != ActivePage.Calendar)  CalBtnBorder.Background   = Color.FromArgb("#FFFFFF"); }
}