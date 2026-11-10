using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Maui.Storage;

namespace Jamrah.Application.Services
{
    /// <summary>One entry in the "What's new" list.</summary>
    public sealed class ChangelogItem
    {
        public string Type { get; set; } = "improvement";
        public string Emoji { get; set; } = string.Empty;
        public string TitleEn { get; set; } = string.Empty;
        public string TitleAr { get; set; } = string.Empty;
        public string DescEn { get; set; } = string.Empty;
        public string DescAr { get; set; } = string.Empty;
        public List<string> Tags { get; set; } = new();

        public string Title(string lang) => lang == "ar" && !string.IsNullOrWhiteSpace(TitleAr) ? TitleAr : TitleEn;
        public string Desc(string lang) => lang == "ar" && !string.IsNullOrWhiteSpace(DescAr) ? DescAr : DescEn;
    }

    /// <summary>One released version and the changes that shipped with it.</summary>
    public sealed class ChangelogRelease
    {
        public string Version { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;
        public List<ChangelogItem> Items { get; set; } = new();
    }

    /// <summary>
    /// Reads the bundled "what's new" notes (wwwroot/changelog.json) and remembers
    /// which release the user has already been shown, so the window appears once
    /// per version and never again after it is dismissed.
    /// </summary>
    public sealed class ChangelogService
    {
        /// <summary>Settings key holding the last release the user dismissed.</summary>
        public const string SeenKey = "changelog.seen";

        private static readonly SemaphoreSlim Gate = new(1, 1);
        private IReadOnlyList<ChangelogRelease>? _cache;

        /// <summary>Raised when something asks for the window to open (the Settings button).</summary>
        public event Action? OpenRequested;

        public void RequestOpen() => OpenRequested?.Invoke();

        /// <summary>All bundled releases, newest first. Never throws - an unreadable
        /// file simply yields an empty list.</summary>
        public async Task<IReadOnlyList<ChangelogRelease>> LoadAsync()
        {
            if (_cache is not null) return _cache;
            await Gate.WaitAsync().ConfigureAwait(false);
            try
            {
                if (_cache is not null) return _cache;
                var list = new List<ChangelogRelease>();
                try
                {
                    using var stream = await FileSystem.OpenAppPackageFileAsync("wwwroot/changelog.json");
                    using var reader = new StreamReader(stream);
                    var text = await reader.ReadToEndAsync().ConfigureAwait(false);
                    Parse(text, list);
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine("[Changelog] could not read changelog.json: " + ex.Message);
                }
                _cache = list;
                return _cache;
            }
            finally { Gate.Release(); }
        }

        private static void Parse(string text, List<ChangelogRelease> into)
        {
            if (string.IsNullOrWhiteSpace(text)) return;
            var root = JsonNode.Parse(text) as JsonObject;
            if (root?["releases"] is not JsonArray releases) return;
            foreach (var rel in releases)
            {
                if (rel is not JsonObject ro) continue;
                var release = new ChangelogRelease
                {
                    Version = Str(ro, "version"),
                    Date = Str(ro, "date")
                };
                if (ro["items"] is JsonArray items)
                {
                    foreach (var it in items)
                    {
                        if (it is not JsonObject io) continue;
                        var item = new ChangelogItem
                        {
                            Type = Str(io, "type"),
                            Emoji = Str(io, "emoji")
                        };
                        if (io["title"] is JsonObject t)
                        {
                            item.TitleEn = Str(t, "en");
                            item.TitleAr = Str(t, "ar");
                        }
                        if (io["desc"] is JsonObject d)
                        {
                            item.DescEn = Str(d, "en");
                            item.DescAr = Str(d, "ar");
                        }
                        if (io["tags"] is JsonArray tags)
                        {
                            foreach (var tg in tags)
                            {
                                var s = tg?.GetValue<string>();
                                if (!string.IsNullOrWhiteSpace(s)) item.Tags.Add(s);
                            }
                        }
                        release.Items.Add(item);
                    }
                }
                into.Add(release);
            }
        }

        private static string Str(JsonObject o, string key)
        {
            var n = o[key];
            if (n is null) return string.Empty;
            try { return n.GetValue<string>() ?? string.Empty; }
            catch { return n.ToString(); }
        }
    }
}
