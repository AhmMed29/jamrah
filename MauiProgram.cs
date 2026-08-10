using Jamrah.Data;
using Jamrah.Services;
using Microsoft.Extensions.Logging;

namespace Jamrah
{
    public static class MauiProgram
    {
        public static MauiApp CreateMauiApp()
        {
            var builder = MauiApp.CreateBuilder();
            builder
                .UseMauiApp<App>()
                .ConfigureFonts(fonts =>
                {
                    fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                    fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
                });

            // Register Data Access Layer
            builder.Services.AddSingleton<ICalendarRepository, CalendarRepository>();
            builder.Services.AddSingleton<ITaskRepository, TaskRepository>();

            // Register Calendar State & Layout Engine Services
            builder.Services.AddSingleton<CalendarStateService>();
            builder.Services.AddSingleton<ICalendarStateService>(sp => sp.GetRequiredService<CalendarStateService>());
            builder.Services.AddSingleton<CalendarLayoutEngine>();
            builder.Services.AddSingleton<TaskStateService>();
            builder.Services.AddSingleton<ITaskStateService>(sp => sp.GetRequiredService<TaskStateService>());

            // Register MAUI Blazor Services
            builder.Services.AddMauiBlazorWebView();

#if DEBUG
            builder.Services.AddBlazorWebViewDeveloperTools();
            builder.Logging.AddDebug();
#endif

            return builder.Build();
        }
    }
}
