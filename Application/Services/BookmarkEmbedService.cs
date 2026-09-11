using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace Jamrah.Application.Services
{
    public record EmbedResult(
        string Title, string Desc, string Image, string Author, string Provider,
        string Otype, string Url, string Domain);

    // Port of fetchEmbed()/suggestType()/platformName()/autoTitle() — free public services, no keys.
    public class BookmarkEmbedService
    {
        private readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(12) };

        public static string PlatformName(string? dom)
        {
            var d = (dom ?? string.Empty).ToLowerInvariant();
            string[][] pairs =
            {
                new[] { "youtu", "YouTube" }, new[] { "youtube", "YouTube" }, new[] { "vimeo", "Vimeo" },
                new[] { "tiktok", "TikTok" }, new[] { "twitch", "Twitch" }, new[] { "facebook", "Facebook" },
                new[] { "fb.watch", "Facebook" }, new[] { "instagram", "Instagram" }, new[] { "threads", "Threads" },
                new[] { "twitter", "Twitter / X" }, new[] { "x.com", "Twitter / X" }, new[] { "reddit", "Reddit" },
                new[] { "linkedin", "LinkedIn" }, new[] { "flickr", "Flickr" }, new[] { "imgur", "Imgur" },
                new[] { "unsplash", "Unsplash" }, new[] { "pinterest", "Pinterest" }, new[] { "soundcloud", "SoundCloud" },
                new[] { "spotify", "Spotify" }, new[] { "github", "GitHub" }, new[] { "gitlab", "GitLab" },
                new[] { "arxiv", "arXiv" }, new[] { "bsky", "Bluesky" }, new[] { "mastodon", "Mastodon" },
                new[] { "dailymotion", "Dailymotion" },
            };
            foreach (var p in pairs)
                if (d.Contains(p[0])) return p[1];
            return dom ?? string.Empty;
        }

        public static string SuggestType(string? dom, string? otype)
        {
            var d = (dom ?? string.Empty).ToLowerInvariant();
            bool Re(string pat) => System.Text.RegularExpressions.Regex.IsMatch(d, pat);
            if (Re(@"youtu\.?be")) return "video";
            if (Re(@"vimeo|tiktok|twitch|dailymotion")) return "video";
            if (Re(@"soundcloud|spotify")) return "music";
            if (Re(@"flickr|imgur|unsplash|pinterest|deviantart|500px")) return "image";
            if (Re(@"instagram")) return "image";
            if (Re(@"github\.com")) return "repo";
            if (Re(@"gitlab")) return "repo";
            if (Re(@"arxiv|dl\.acm|ieeexplore|sciencedirect|springer|nature\.com")) return "research";
            if (Re(@"facebook|twitter|x\.com|threads|reddit|linkedin|bsky|mastodon")) return "post";
            if (otype == "photo") return "image";
            if (otype == "video") return "video";
            return "article";
        }

        public static string AutoTitle(string? u)
        {
            if (string.IsNullOrWhiteSpace(u)) return string.Empty;
            try
            {
                var url = u.Contains("://") ? u : "https://" + u;
                var uri = new Uri(url);
                var host = uri.Host.Replace("www.", "");
                var segs = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
                var seg = segs.Length > 0 ? segs[^1] : string.Empty;
                string t;
                if (string.IsNullOrEmpty(seg)) t = host;
                else
                {
                    t = System.Text.RegularExpressions.Regex.Replace(seg, @"\.(html?|php|aspx?)$", "", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    t = System.Text.RegularExpressions.Regex.Replace(t, @"[-_]+", " ");
                    t = System.Text.RegularExpressions.Regex.Replace(t, @"\b\w", m => m.Value.ToUpperInvariant()).Trim();
                }
                return (string.IsNullOrEmpty(t) ? host : t).Substring(0, Math.Min(80, (string.IsNullOrEmpty(t) ? host : t).Length));
            }
            catch { return string.Empty; }
        }

        public async Task<EmbedResult?> FetchAsync(string url)
        {
            var dom = Jamrah.Presentation.Bookmarks.BookmarkCardData.HostOf(url);
            try
            {
                var r = await _http.GetAsync("https://noembed.com/embed?url=" + Uri.EscapeDataString(url));
                if (r.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(await r.Content.ReadAsStringAsync());
                    var root = doc.RootElement;
                    if (!root.TryGetProperty("error", out _))
                    {
                        Str(root, "title", out var title); Str(root, "description", out var desc);
                        Str(root, "thumbnail_url", out var img); Str(root, "author_name", out var author);
                        Str(root, "provider_name", out var provider); Str(root, "type", out var otype);
                        return new EmbedResult(title.Trim(), desc.Trim(), img, author, provider, otype, url, dom);
                    }
                }
            }
            catch { }
            try
            {
                var r = await _http.GetAsync("https://api.microlink.io/?url=" + Uri.EscapeDataString(url));
                if (r.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(await r.Content.ReadAsStringAsync());
                    var root = doc.RootElement;
                    if (root.TryGetProperty("status", out var st) && st.GetString() == "success" && root.TryGetProperty("data", out var d))
                    {
                        Str(d, "title", out var title); Str(d, "description", out var desc);
                        Str(d, "author", out var author); Str(d, "publisher", out var provider);
                        var img = string.Empty;
                        string otype = "link";
                        if (d.TryGetProperty("video", out var v) && v.ValueKind != JsonValueKind.Null) otype = "video";
                        else if (d.TryGetProperty("image", out var im) && im.ValueKind == JsonValueKind.Object)
                        {
                            otype = "photo";
                            if (im.TryGetProperty("url", out var iu)) img = iu.GetString() ?? string.Empty;
                        }
                        return new EmbedResult(title, desc.Trim(), img, author, provider, otype, url, dom);
                    }
                }
            }
            catch { }
            return null;
        }

        private static void Str(JsonElement e, string name, out string value)
        {
            value = string.Empty;
            if (e.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.String)
                value = p.GetString() ?? string.Empty;
        }
    }
}
