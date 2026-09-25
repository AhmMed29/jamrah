using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Jamrah.Application.Services.LinkPreview
{
    /// <summary>
    /// Video/music path: official oEmbed via noembed.com (same free service the app
    /// already used). Only fires for known media domains so articles stay on the fast path.
    /// </summary>
    public sealed class OEmbedProvider : ILinkPreviewProvider
    {
        private readonly HttpClient _http;

        public OEmbedProvider(HttpClient http) => _http = http;

        public static bool IsMediaDomain(string? domain)
        {
            if (string.IsNullOrWhiteSpace(domain)) return false;
            var d = domain.ToLowerInvariant();
            return d.Contains("youtu") || d.Contains("vimeo") || d.Contains("tiktok")
                || d.Contains("soundcloud") || d.Contains("spotify") || d.Contains("dailymotion")
                || d.Contains("twitch");
        }

        public async Task<LinkPreviewResult?> TryFetchAsync(string url, CancellationToken ct)
        {
            var domain = Presentation.Bookmarks.BookmarkCardData.HostOf(url);
            if (!IsMediaDomain(domain)) return null;
            try
            {
                using var res = await _http.GetAsync(
                    "https://noembed.com/embed?url=" + Uri.EscapeDataString(url), ct).ConfigureAwait(false);
                if (!res.IsSuccessStatusCode) return null;
                using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(ct).ConfigureAwait(false));
                var root = doc.RootElement;
                if (root.TryGetProperty("error", out _)) return null;

                static string Str(JsonElement e, string name) =>
                    e.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.String
                        ? p.GetString() ?? string.Empty : string.Empty;

                var title = Str(root, "title").Trim();
                var author = Str(root, "author_name").Trim();
                var provider = Str(root, "provider_name").Trim();
                var img = Str(root, "thumbnail_url").Trim();
                var otype = Str(root, "type").Trim();
                if (string.IsNullOrWhiteSpace(title) && string.IsNullOrWhiteSpace(img)) return null;

                if (string.IsNullOrWhiteSpace(provider))
                    provider = BookmarkEmbedService.PlatformName(domain);
                var suggested = BookmarkEmbedService.SuggestType(domain, otype);
                var embedAvailable =
                    Presentation.Bookmarks.BookmarkTemplates.EmbedHtml(url, domain) != null;
                return new LinkPreviewResult(title, string.Empty, img, author, provider,
                    string.IsNullOrWhiteSpace(otype) ? "video" : otype,
                    url, domain, suggested, null, null, embedAvailable);
            }
            catch { return null; }
        }
    }
}
