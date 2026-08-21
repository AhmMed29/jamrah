using Jamrah.Services;
using Microsoft.AspNetCore.Components.WebView.Maui;
using PointerEventArgs = Microsoft.Maui.Controls.PointerEventArgs;

namespace Jamrah;

public partial class MainPage : ContentPage
{
    private readonly ICalendarStateService _calendarState;
    private BlazorWebView? _calendarWebView;
    private BlazorWebView? _tasksWebView;
    private BlazorWebView? _pomodoroWebView;
    // Mobile mirrors
    private BlazorWebView? _calendarWebViewMobile;
    private BlazorWebView? _tasksWebViewMobile;
    private BlazorWebView? _pomodoroWebViewMobile;
    private enum ActivePage { None, Tasks, Pomodoro, Calendar }
    private ActivePage _activePage = ActivePage.None;
    private bool _isMobile => DeviceInfo.Current.Idiom == DeviceIdiom.Phone;

    public MainPage(ICalendarStateService calendarState)
    {
        InitializeComponent();
        _calendarState = calendarState;
        ApplyIdiomLayout();
        ShowTasksPage();
    }

    private void ApplyIdiomLayout()
    {
        if (_isMobile)
        {
            DesktopLayout.IsVisible = false;
            MobileLayout.IsVisible = true;
        }
        else
        {
            DesktopLayout.IsVisible = true;
            MobileLayout.IsVisible = false;
        }
    }

    
    // ─── Content area switching ──────────────────────────────────────────────

    private void OnPomodoroTapped(object sender, TappedEventArgs e)      => ShowPomodoroPage();
    private void OnMyTasksTapped(object sender, TappedEventArgs e)        => ShowTasksPage();
    private void OnCalendarMonthTapped(object sender, TappedEventArgs e)  => ShowCalendarPage();

    private void ShowPomodoroPage()
    {
        EnsureWebViews();
        if (_isMobile)
        {
            _calendarWebViewMobile!.IsVisible = false;
            _tasksWebViewMobile!.IsVisible    = false;
            _pomodoroWebViewMobile!.IsVisible = true;
        }
        else
        {
            _calendarWebView!.IsVisible = false;
            _tasksWebView!.IsVisible    = false;
            _pomodoroWebView!.IsVisible = true;
        }
        SetActivePage(ActivePage.Pomodoro);
    }

    private void ShowCalendarPage()
    {
        EnsureWebViews();
        if (_isMobile)
        {
            _tasksWebViewMobile!.IsVisible    = false;
            _pomodoroWebViewMobile!.IsVisible = false;
            _calendarWebViewMobile!.IsVisible = true;
        }
        else
        {
            _tasksWebView!.IsVisible    = false;
            _pomodoroWebView!.IsVisible = false;
            _calendarWebView!.IsVisible = true;
        }
        SetActivePage(ActivePage.Calendar);
    }

    private void ShowTasksPage()
    {
        EnsureWebViews();
        if (_isMobile)
        {
            _calendarWebViewMobile!.IsVisible  = false;
            _pomodoroWebViewMobile!.IsVisible  = false;
            _tasksWebViewMobile!.IsVisible     = true;
        }
        else
        {
            _calendarWebView!.IsVisible  = false;
            _pomodoroWebView!.IsVisible  = false;
            _tasksWebView!.IsVisible     = true;
        }
        SetActivePage(ActivePage.Tasks);
    }

    // ─── Ensure WebViews ────────────────────────────────────────────────────

    private void EnsureWebViews()
    {
        var targetContent = _isMobile ? MobileContent : MainContent;

        if (_isMobile)
        {
            if (_calendarWebViewMobile == null)
            {
                _calendarWebViewMobile = new BlazorWebView { HostPage = "wwwroot/index.html" };
                _calendarWebViewMobile.RootComponents.Add(new RootComponent { Selector = "#app", ComponentType = typeof(Components.Calendar.CalendarPage) });
                MobileContent.Children.Add(_calendarWebViewMobile);
                DisableZoom(_calendarWebViewMobile);
            }
            if (_tasksWebViewMobile == null)
            {
                _tasksWebViewMobile = new BlazorWebView { HostPage = "wwwroot/index.html" };
                _tasksWebViewMobile.RootComponents.Add(new RootComponent { Selector = "#app", ComponentType = typeof(Components.Tasks.TaskPage) });
                MobileContent.Children.Add(_tasksWebViewMobile);
                DisableZoom(_tasksWebViewMobile);
            }
            if (_pomodoroWebViewMobile == null)
            {
                _pomodoroWebViewMobile = new BlazorWebView { HostPage = "wwwroot/index.html" };
                _pomodoroWebViewMobile.RootComponents.Add(new RootComponent { Selector = "#app", ComponentType = typeof(Components.Pomodoro.PomodoroPage) });
                MobileContent.Children.Add(_pomodoroWebViewMobile);
                DisableZoom(_pomodoroWebViewMobile);
            }
            return;
        }

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

    private void DisableZoom(BlazorWebView webView)
    {
        webView.HandlerChanged += async (_, _) =>
        {
            try
            {
#if WINDOWS
                if (webView.Handler?.PlatformView is Microsoft.UI.Xaml.Controls.WebView2 platformView)
                {
                    await platformView.EnsureCoreWebView2Async();
                    if (platformView.CoreWebView2 != null)
                    {
                        platformView.CoreWebView2.Settings.IsZoomControlEnabled = false;
                        platformView.CoreWebView2.Settings.IsPinchZoomEnabled   = false;
                    }
                }
#elif ANDROID
                if (webView.Handler?.PlatformView is Android.Webkit.WebView androidWebView)
                {
                    androidWebView.Settings.SetSupportZoom(false);
                    androidWebView.Settings.BuiltInZoomControls = false;
                    androidWebView.Settings.DisplayZoomControls = false;
                }
#elif IOS || MACCATALYST
                if (webView.Handler?.PlatformView is WebKit.WKWebView iosWebView)
                {
                    iosWebView.AllowsBackForwardNavigationGestures = false;
                }
#endif
            }
            catch { }
        };
    }

    // ─── Active page highlight ───────────────────────────────────────────────

    private void SetActivePage(ActivePage page)
    {
        _activePage = page;

        // Reset all - Unified Light (Desktop)
        if (DesktopLayout.IsVisible)
        {
            TasksBtnBorder.Background = Color.FromArgb("#FFFFFF");
            PomoBtnBorder.Background  = Color.FromArgb("#FFFFFF");
            CalBtnBorder.Background   = Color.FromArgb("#FFFFFF");
            TasksBtnBorder.Stroke = Color.FromArgb("#E7E5E4");
            PomoBtnBorder.Stroke  = Color.FromArgb("#E7E5E4");
            CalBtnBorder.Stroke   = Color.FromArgb("#E7E5E4");
            TasksIcon.Fill = new SolidColorBrush(Color.FromArgb("#78716C"));
            PomoIcon.Fill  = new SolidColorBrush(Color.FromArgb("#78716C"));
            CalIcon.Fill   = new SolidColorBrush(Color.FromArgb("#78716C"));
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

        // Reset all - Mobile
        if (MobileLayout.IsVisible)
        {
            MobileTasksBtnBorder.Background = Color.FromArgb("#FFFFFF");
            MobilePomoBtnBorder.Background  = Color.FromArgb("#FFFFFF");
            MobileCalBtnBorder.Background   = Color.FromArgb("#FFFFFF");
            MobileTasksBtnBorder.Stroke = Color.FromArgb("#E7E5E4");
            MobilePomoBtnBorder.Stroke  = Color.FromArgb("#E7E5E4");
            MobileCalBtnBorder.Stroke   = Color.FromArgb("#E7E5E4");
            MobileTasksIcon.Fill = new SolidColorBrush(Color.FromArgb("#78716C"));
            MobilePomoIcon.Fill  = new SolidColorBrush(Color.FromArgb("#78716C"));
            MobileCalIcon.Fill   = new SolidColorBrush(Color.FromArgb("#78716C"));
            MobileTasksLabel.TextColor = Color.FromArgb("#78716C");
            MobilePomoLabel.TextColor  = Color.FromArgb("#78716C");
            MobileCalLabel.TextColor   = Color.FromArgb("#78716C");
            switch (page)
            {
                case ActivePage.Tasks:
                    MobileTasksBtnBorder.Background = Color.FromArgb("#1C1917");
                    MobileTasksBtnBorder.Stroke = Color.FromArgb("#1C1917");
                    MobileTasksIcon.Fill = new SolidColorBrush(Color.FromArgb("#FFFFFF"));
                    MobileTasksLabel.TextColor = Color.FromArgb("#FFFFFF");
                    break;
                case ActivePage.Pomodoro:
                    MobilePomoBtnBorder.Background = Color.FromArgb("#1C1917");
                    MobilePomoBtnBorder.Stroke = Color.FromArgb("#1C1917");
                    MobilePomoIcon.Fill = new SolidColorBrush(Color.FromArgb("#FFFFFF"));
                    MobilePomoLabel.TextColor = Color.FromArgb("#FFFFFF");
                    break;
                case ActivePage.Calendar:
                    MobileCalBtnBorder.Background = Color.FromArgb("#1C1917");
                    MobileCalBtnBorder.Stroke = Color.FromArgb("#1C1917");
                    MobileCalIcon.Fill = new SolidColorBrush(Color.FromArgb("#FFFFFF"));
                    MobileCalLabel.TextColor = Color.FromArgb("#FFFFFF");
                    break;
            }
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