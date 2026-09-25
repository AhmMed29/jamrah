using System;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace Jamrah.Application.Services.LinkPreview
{
    /// <summary>Fast path: plain HttpClient + OpenGraph parsing. Handles ~90% of articles.</summary>
    public sealed class HttpOpenGraphProvider : ILinkPreviewProvider
    {
        private readonly HttpClient _http;

        public HttpOpenGraphProvider(HttpClient http) => _http = http;

        public async Task<LinkPreviewResult?> TryFetchAsync(string url, CancellationToken ct)
        {
            var domain = Presentation.Bookmarks.BookmarkCardData.HostOf(url);
            try
            {
                if (OpenGraphParser.IsDirectImageUrl(url))
                    return OpenGraphParser.ForDirectImage(url, domain);

                using var req = new HttpRequestMessage(HttpMethod.Get, url);
                req.Headers.TryAddWithoutValidation("User-Agent",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36");
                req.Headers.TryAddWithoutValidation("Accept",
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/*,*/*;q=0.8");

                using var res = await _http.SendAsync(req,
                    HttpCompletionOption.ResponseHeadersRead, ct).ConfigureAwait(false);
                if (!res.IsSuccessStatusCode) return null;

                var media = res.Content.Headers.ContentType?.MediaType ?? string.Empty;
                if (media.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                    return OpenGraphParser.ForDirectImage(url, domain);
                if (!media.Contains("html", StringComparison.OrdinalIgnoreCase)
                    && !media.Contains("text", StringComparison.OrdinalIgnoreCase)
                    && !string.IsNullOrEmpty(media))
                    return null;

                var html = await res.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
                if (html.Length > 2_000_000) html = html[..2_000_000];
                return OpenGraphParser.Parse(html, url);
            }
            catch { return null; }
        }
    }
}
