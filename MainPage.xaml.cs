using Jamrah.Services;
using Microsoft.AspNetCore.Components.WebView.Maui;
using Microsoft.UI.Xaml.Controls;

namespace Jamrah;

public partial class MainPage : ContentPage
{
    private bool _sidebarOpen;
    private bool _calendarExpanded;
    private readonly ICalendarStateService _calendarState;
    private BlazorWebView? _calendarWebView;
    private BlazorWebView? _tasksWebView;
    private BlazorWebView? _pomodoroWebView;
    
    public MainPage(ICalendarStateService calendarState)
    {
        InitializeComponent();
        _calendarState = calendarState;
    }

    // ─── Sidebar open / close ───────────────────────────────────────────────

    private async void OnHoverStripPointerEntered(object sender, PointerEventArgs e)
    {
        if (_sidebarOpen) return;
        _sidebarOpen = true;
        await Sidebar.TranslateTo(0, 0, 200, Easing.CubicOut);
    }

    private async void OnSidebarPointerExited(object sender, PointerEventArgs e)
    {
        if (!_sidebarOpen) return;
        _sidebarOpen = false;
        await Sidebar.TranslateTo(-280, 0, 200, Easing.CubicIn);
    }

    // ─── Calendar toggle ────────────────────────────────────────────────────

    private void OnCalendarToggleTapped(object sender, TappedEventArgs e)
    {
        _calendarExpanded = !_calendarExpanded;
        CalendarChevron.Text = _calendarExpanded ? "\uE70E" : "\uE70D";
        CalendarSubItems.IsVisible = _calendarExpanded;
    }

    // ─── Calendar sub-view selection ────────────────────────────────────────

    private void OpenCalendarWithView(ViewMode view)
    {
        _calendarState.SetView(view);
        ShowCalendarPage();
        HighlightCalendarSubItem(view);
    }

    private void OnCalendarMonthTapped(object sender, TappedEventArgs e)
        => OpenCalendarWithView(ViewMode.Month);

    private void OnCalendarWeekTapped(object sender, TappedEventArgs e)
        => OpenCalendarWithView(ViewMode.Week);

    private void OnCalendarDayTapped(object sender, TappedEventArgs e)
        => OpenCalendarWithView(ViewMode.Day);

    // ─── Content area switching ──────────────────────────────────────────────
    private void OnPomodoroTapped(object sender, TappedEventArgs e) => ShowPomodoroPage();
    private void OnMyTasksTapped(object sender, TappedEventArgs e) => ShowTasksPage();
    
    private void ShowPomodoroPage()
    {
        PlaceholderLabel.IsVisible = false;
        EnsureWebViews();
        _calendarWebView!.IsVisible = false;
        _tasksWebView!.IsVisible = false;
        _pomodoroWebView!.IsVisible = true;
    }
    private void ShowCalendarPage()
    {
        PlaceholderLabel.IsVisible = false;
        EnsureWebViews();
        _tasksWebView!.IsVisible = false;
        _pomodoroWebView!.IsVisible = false;
        _calendarWebView!.IsVisible = true;
    }

    private void ShowTasksPage()
    {
        PlaceholderLabel.IsVisible = false;
        EnsureWebViews();
        _calendarWebView!.IsVisible = false;
        _tasksWebView!.IsVisible = true;
    }

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
                Selector = "#app",
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
                Selector = "#app",
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
                Selector = "#app",
                ComponentType = typeof(Components.Pomodoro.PomodoroPage)
            });
            MainContent.Children.Add(_pomodoroWebView);
            DisableZoom(_pomodoroWebView);
        }
    }

    // ───────────── Disable Zoom ─────────────────────────────────────────

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
                    platformView.CoreWebView2.Settings.IsPinchZoomEnabled = false;
                }
            }
        };
    }
    
    // ─── Sidebar sub-item highlight ─────────────────────────────────────────

    private void HighlightCalendarSubItem(ViewMode view)
    {
        Color normal   = Color.FromArgb("#F0F0F0");
        Color selected = Color.FromArgb("#E0EAFF");

        CalendarSubMonth.Background = view == ViewMode.Month ? selected : normal;
        CalendarSubWeek.Background  = view == ViewMode.Week  ? selected : normal;
        CalendarSubDay.Background   = view == ViewMode.Day   ? selected : normal;
    }
}