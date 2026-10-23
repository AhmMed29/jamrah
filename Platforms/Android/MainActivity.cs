using System;
using System.IO;
using Android.App;
using Android.Content;
using Android.Content.PM;
using Android.OS;
using Android.Widget;

namespace Jamrah
{
    [Activity(Theme = "@style/Maui.SplashTheme", MainLauncher = true, LaunchMode = LaunchMode.SingleTop, ConfigurationChanges = ConfigChanges.ScreenSize | ConfigChanges.Orientation | ConfigChanges.UiMode | ConfigChanges.ScreenLayout | ConfigChanges.SmallestScreenSize | ConfigChanges.Density)]
    public class MainActivity : MauiAppCompatActivity
    {
        protected override void OnCreate(Bundle? savedInstanceState)
        {
            base.OnCreate(savedInstanceState);
            // DIAG-TEMP (Android only): show the captured crash log from the previous run.
            // Revert: delete this method override.
            ShowCrashLogIfPresent();
        }

        private void ShowCrashLogIfPresent()
        {
            try
            {
                var path = MainApplication.CrashLogPath();
                if (string.IsNullOrEmpty(path) || !File.Exists(path)) return;
                var text = File.ReadAllText(path);
                if (string.IsNullOrWhiteSpace(text)) return;
                if (text.Length > 6000) text = text.Substring(0, 6000) + "\n...[truncated]";
                var shown = text;

                var scroll = new Android.Widget.ScrollView(this);
                var tv = new Android.Widget.TextView(this)
                {
                    Text = shown,
                    TextSize = 11f,
                };
                tv.SetPadding(24, 16, 24, 16);
                tv.SetTextIsSelectable(true);
                scroll.AddView(tv);

                var builder = new AlertDialog.Builder(this);
                builder.SetTitle("Crash log (diagnostic)");
                builder.SetView(scroll);
                builder.SetPositiveButton("نسخ", (s, e) =>
                {
                    try
                    {
                        var cm = (ClipboardManager?)GetSystemService(ClipboardService);
                        if (cm != null) cm.PrimaryClip = ClipData.NewPlainText("crash", shown);
                        Toast.MakeText(this, "اتنسخ — ابعته", ToastLength.Short)?.Show();
                    }
                    catch { }
                });
                builder.SetNegativeButton("مسح", (s, e) => { try { File.Delete(path); } catch { } });
                builder.SetNeutralButton("إغلاق", (s, e) => { });
                builder.Show();
            }
            catch { }
        }
    }
}
