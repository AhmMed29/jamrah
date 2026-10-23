using System;
using System.IO;
using System.Text;
using Android.App;
using Android.Runtime;

namespace Jamrah
{
    [Application]
    public class MainApplication : MauiApplication
    {
        public MainApplication(IntPtr handle, JniHandleOwnership ownership)
            : base(handle, ownership)
        {
        }

        public override void OnCreate()
        {
            base.OnCreate();
            // DIAG-TEMP (Android only): capture the silent startup crash to a file.
            // Revert: delete the three subscriptions + WriteCrashLog.
            AndroidEnvironment.UnhandledExceptionRaiser += (s, e) =>
                WriteCrashLog("AndroidEnvironment", e.Exception);
            AppDomain.CurrentDomain.UnhandledException += (s, e) =>
                WriteCrashLog("AppDomain", e.ExceptionObject as Exception);
            TaskScheduler.UnobservedTaskException += (s, e) =>
                WriteCrashLog("TaskScheduler", e.Exception);
        }

        internal static string CrashLogPath()
        {
            try
            {
                var dir = System.Environment.GetFolderPath(System.Environment.SpecialFolder.Personal);
                return Path.Combine(dir, "crash-diag.log");
            }
            catch { return string.Empty; }
        }

        internal static void WriteCrashLog(string source, Exception? ex)
        {
            try
            {
                var path = CrashLogPath();
                if (string.IsNullOrEmpty(path)) return;
                var sb = new StringBuilder();
                sb.AppendLine("==== " + DateTime.UtcNow.ToString("o") + " [" + source + "] ====");
                var cur = ex;
                var depth = 0;
                while (cur != null && depth < 4)
                {
                    sb.AppendLine(cur.GetType().FullName + ": " + cur.Message);
                    sb.AppendLine(cur.StackTrace);
                    cur = cur.InnerException;
                    depth++;
                    if (cur != null) sb.AppendLine("--- inner ---");
                }
                if (ex == null) sb.AppendLine("(no exception object)");
                sb.AppendLine();
                var text = sb.ToString();
                if (text.Length > 8000) text = text.Substring(0, 8000) + "\n...[truncated]";
                File.AppendAllText(path, text);
            }
            catch { }
        }

        protected override MauiApp CreateMauiApp() => MauiProgram.CreateMauiApp();
    }
}
