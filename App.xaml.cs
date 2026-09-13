namespace Jamrah
{
    public partial class App : Microsoft.Maui.Controls.Application
    {
        public App()
        {
            InitializeComponent();
        }

        protected override Window CreateWindow(IActivationState? activationState)
        {
            var window = new Window(new AppShell());
#if WINDOWS
            window.HandlerChanged += MaximizeOnWindows;
#endif
            return window;
        }

#if WINDOWS
        private void MaximizeOnWindows(object? sender, EventArgs e)
        {
            if (sender is not Window window) return;
            window.HandlerChanged -= MaximizeOnWindows;
            if (window.Handler?.PlatformView is Microsoft.UI.Xaml.Window platformWindow)
            {
                TryMaximize(platformWindow);
            }
        }

        private static void TryMaximize(Microsoft.UI.Xaml.Window platformWindow)
        {
            if (platformWindow.AppWindow.Presenter is Microsoft.UI.Windowing.OverlappedPresenter presenter)
            {
                presenter.Maximize();
                return;
            }
            // fallback: بعض الأوقات الـ Presenter مش جاهز بعد — نحاول عند أول تفعيل للنافذة
            void OnActivated(object? s, Microsoft.UI.Xaml.WindowActivatedEventArgs args)
            {
                if (args.WindowActivationState == Microsoft.UI.Xaml.WindowActivationState.Deactivated) return;
                platformWindow.Activated -= OnActivated;
                if (platformWindow.AppWindow.Presenter is Microsoft.UI.Windowing.OverlappedPresenter p) p.Maximize();
            }
            platformWindow.Activated += OnActivated;
        }
#endif
    }
}
