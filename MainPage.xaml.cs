using Jamrah.Services;

namespace Jamrah;

public partial class MainPage : ContentPage
{
    private bool _sidebarOpen;
    private bool _calendarExpanded;
    private readonly ICalendarStateService _calendarState;
    private Microsoft.AspNetCore.Components.WebView.Maui.BlazorWebView? _calendarWebView;
    private Microsoft.AspNetCore.Components.WebView.Maui.BlazorWebView? _tasksWebView;

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

    private void OnMyTasksTapped(object sender, TappedEventArgs e) => ShowTasksPage();

    private void ShowCalendarPage()
    {
        PlaceholderLabel.IsVisible = false;
        EnsureWebViews();
        _tasksWebView!.IsVisible = false;
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
        }

        if (_tasksWebView == null)
        {
            _tasksWebView = new Microsoft.AspNetCore.Components.WebView.Maui.BlazorWebView
            {
                HostPage = "wwwroot/index.html",
            };
            _tasksWebView.RootComponents.Add(new Microsoft.AspNetCore.Components.WebView.Maui.RootComponent
            {
                Selector = "#app",
                ComponentType = typeof(Components.Tasks.TaskPage)
            });
            MainContent.Children.Add(_tasksWebView);
        }
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