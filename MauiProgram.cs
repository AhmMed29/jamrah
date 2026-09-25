using Jamrah.Core.Interfaces;
using Jamrah.Infrastructure.Repositories;
using Jamrah.Application.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Maui.Controls.Hosting;
using Microsoft.Maui.Hosting;

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

            builder.Services.AddSingleton<PrayerTimesService>();
            builder.Services.AddSingleton<PomodoroSoundService>();
            builder.Services.AddSingleton<LocalizationService>();
            
            // Register Data Access Layer
            builder.Services.AddSingleton<ICalendarRepository, CalendarRepository>();
            builder.Services.AddSingleton<ITaskRepository, TaskRepository>();
            builder.Services.AddSingleton<ISettingsRepository, SettingsRepository>();
            builder.Services.AddSingleton<IPlanningRepository, PlanningRepository>();
            builder.Services.AddSingleton<IBookmarkRepository, BookmarkRepository>();
            builder.Services.AddSingleton<IClipAgentService, ClipAgentService>();
            
            // Register Calendar State & Layout Engine Services
            builder.Services.AddSingleton<CalendarStateService>();
            builder.Services.AddSingleton<ICalendarStateService>(sp => sp.GetRequiredService<CalendarStateService>());
            builder.Services.AddSingleton<CalendarLayoutEngine>();
            builder.Services.AddSingleton<TaskStateService>();
            builder.Services.AddSingleton<ITaskStateService>(sp => sp.GetRequiredService<TaskStateService>());
            builder.Services.AddSingleton<BookmarkStateService>();
            builder.Services.AddSingleton<BookmarkEmbedService>();
            // Link preview + archiving (B): shared HttpClient then layered providers.
            builder.Services.AddSingleton(sp =>
            {
                var http = new System.Net.Http.HttpClient
                {
                    Timeout = System.TimeSpan.FromSeconds(15),
                };
                http.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36");
                return http;
            });
            builder.Services.AddSingleton<Jamrah.Application.Services.LinkPreview.HttpOpenGraphProvider>();
            builder.Services.AddSingleton<Jamrah.Application.Services.LinkPreview.OEmbedProvider>();
            builder.Services.AddSingleton<Jamrah.Application.Services.LinkPreview.PlaywrightFallbackProvider>();
            builder.Services.AddSingleton<Jamrah.Application.Services.LinkPreview.LinkPreviewService>();
            builder.Services.AddSingleton<Jamrah.Application.Services.LinkPreview.LinkArchiver>();
            builder.Services.AddSingleton<IAppNavService, AppNavService>();

            // Register MAUI Blazor Services
            builder.Services.AddMauiBlazorWebView();
            builder.Services.AddTransient<AppShell>();
            builder.Services.AddTransient<MainPage>();

#if DEBUG
            builder.Services.AddBlazorWebViewDeveloperTools();
            builder.Logging.AddDebug();
#endif

            SQLitePCL.Batteries_V2.Init();

            return builder.Build();
        }
    }
}
