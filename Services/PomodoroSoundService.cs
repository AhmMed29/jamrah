using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.JSInterop;

namespace Jamrah.Services
{
    public enum PomodoroSoundEvent { SessionStart, TimerWarning, SessionComplete, BreakStart, BreakComplete }

    public sealed class EventSoundSetting
    {
        public bool Enabled { get; set; } = true;
        public string SoundFile { get; set; } = "";
    }

    public sealed class PomodoroSoundSettings
    {
        public bool MasterEnabled { get; set; } = true;
        public int MasterVolume { get; set; } = 70;
        public bool PlayWhenMinimized { get; set; } = true;

        public EventSoundSetting SessionStart { get; set; } = new() { SoundFile = "pomo-start.mp3" };
        public EventSoundSetting TimerWarning { get; set; } = new() { SoundFile = "tab-swipping.mp3" };
        public EventSoundSetting SessionComplete { get; set; } = new() { SoundFile = "before-pomo-end.wav" };
        public EventSoundSetting BreakStart { get; set; } = new() { SoundFile = "pomo-end.wav" };
        public EventSoundSetting BreakComplete { get; set; } = new() { SoundFile = "start-pomo.wav" };
    }

    public sealed class PomodoroSoundService
    {
        private const string PrefKey = "pomo_sound_settings_v1";
        private readonly string _soundsDir;

        public PomodoroSoundSettings Settings { get; private set; }

        public PomodoroSoundService()
        {
            _soundsDir = Path.Combine(AppContext.BaseDirectory, "wwwroot", "sounds");
            Settings = Load();
        }

        public static PomodoroSoundSettings Defaults() => new();

        private PomodoroSoundSettings Load()
        {
            try
            {
                var json = Preferences.Get(PrefKey, "");
                if (!string.IsNullOrWhiteSpace(json))
                    return JsonSerializer.Deserialize<PomodoroSoundSettings>(json) ?? Defaults();
            }
            catch { }
            return Defaults();
        }

        public void Save()
        {
            try { Preferences.Set(PrefKey, JsonSerializer.Serialize(Settings)); } catch { }
        }

        public void ResetToDefaults()
        {
            Settings = Defaults();
        }

        /// <summary>Scans wwwroot/sounds on every call so new files appear automatically.</summary>
        public List<(string File, string Label)> GetAvailableSounds()
        {
            var list = new List<(string File, string Label)> { ("none", "بدون صوت") };
            var seen = new HashSet<string> { "none" };
            try
            {
                if (Directory.Exists(_soundsDir))
                {
                    foreach (var path in Directory.GetFiles(_soundsDir))
                    {
                        var name = Path.GetFileName(path);
                        var ext = Path.GetExtension(name).ToLowerInvariant();
                        if (ext != ".mp3" && ext != ".wav" && ext != ".ogg") continue;
                        if (seen.Add(name)) list.Add((name, LabelFor(name)));
                    }
                }
            }
            catch { }
            // keep currently assigned sounds selectable even if the scan fails
            foreach (var f in new[]
            {
                Settings.SessionStart.SoundFile,
                Settings.TimerWarning.SoundFile,
                Settings.SessionComplete.SoundFile,
                Settings.BreakStart.SoundFile,
                Settings.BreakComplete.SoundFile,
            })
            {
                if (!string.IsNullOrEmpty(f) && seen.Add(f)) list.Add((f, LabelFor(f)));
            }
            return list;
        }

        public bool SoundExists(string file)
            => string.IsNullOrEmpty(file) || file == "none" || File.Exists(Path.Combine(_soundsDir, file));

        private static string LabelFor(string file) => file switch
        {
            "none" => "بدون صوت",
            "pomo-start.mp3" => "بداية (1)",
            "start-pomo.wav" => "بداية (2)",
            "pomo-end.mp3" => "نهاية (1)",
            "pomo-end.wav" => "نهاية (2)",
            "checkbox-check.mp3" => "تأكيد",
            "checkbox-uncheck.mp3" => "إلغاء تأكيد",
            "tab-swipping.mp3" => "سحب",
            "before-pomo-end.wav" => "وقالوا الحمدلله",
            _ => Path.GetFileNameWithoutExtension(file),
        };

        private EventSoundSetting? SettingFor(PomodoroSoundEvent evt) => evt switch
        {
            PomodoroSoundEvent.SessionStart => Settings.SessionStart,
            PomodoroSoundEvent.TimerWarning => Settings.TimerWarning,
            PomodoroSoundEvent.SessionComplete => Settings.SessionComplete,
            PomodoroSoundEvent.BreakStart => Settings.BreakStart,
            PomodoroSoundEvent.BreakComplete => Settings.BreakComplete,
            _ => null,
        };

        public async Task FireEventAsync(IJSRuntime js, PomodoroSoundEvent evt)
        {
            if (!Settings.MasterEnabled) return;
            var s = SettingFor(evt);
            if (s == null || !s.Enabled) return;
            await PlayAsync(js, s.SoundFile);
        }

        public async Task PreviewAsync(IJSRuntime js, string file)
        {
            if (!Settings.MasterEnabled || string.IsNullOrEmpty(file) || file == "none") return;
            await PlayAsync(js, file);
        }

        private async Task PlayAsync(IJSRuntime js, string file)
        {
            try
            {
                var vol = Math.Clamp(Settings.MasterVolume, 0, 100) / 100.0;
                await js.InvokeVoidAsync("playPomoSound", $"sounds/{file}", vol);
            }
            catch { }
        }
    }
}
