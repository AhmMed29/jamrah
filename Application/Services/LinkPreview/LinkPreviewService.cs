using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace Jamrah.Application.Services.LinkPreview
{
    /// <summary>
    /// Tries providers in order. Video/media URLs prefer oEmbed first (YouTube blocks
    /// plain HttpClient); articles prefer the fast Http+OpenGraph path; Playwright is last.
    /// </summary>
    public sealed class LinkPreviewService
    {
        private readonly HttpOpenGraphProvider _http;
        private readonly OEmbedProvider _oembed;
        private readonly PlaywrightFallbackProvider _playwright;

        public LinkPreviewService(
            HttpOpenGraphProvider http,
            OEmbedProvider oembed,
            PlaywrightFallbackProvider playwright)
        {
            _http = http;
            _oembed = oembed;
            _playwright = playwright;
        }

        public static string NormalizeUrl(string? url)
        {
            url = (url ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(url)) return string.Empty;
            if (!url.Contains("://", StringComparison.Ordinal))
                url = "https://" + url.TrimStart('/');
            return url;
        }

        private static bool HasSignal(LinkPreviewResult? r) =>
            r != null && (!string.IsNullOrWhiteSpace(r.Title)
                || !string.IsNullOrWhiteSpace(r.Desc)
                || !string.IsNullOrWhiteSpace(r.ImageUrl));

        public async Task<LinkPreviewResult?> PreviewAsync(string url, CancellationToken ct = default)
        {
            url = NormalizeUrl(url);
            if (string.IsNullOrWhiteSpace(url)) return null;
            if (!Uri.TryCreate(url, UriKind.Absolute, out _)) return null;

            var domain = Presentation.Bookmarks.BookmarkCardData.HostOf(url);
            var mediaFirst = OEmbedProvider.IsMediaDomain(domain)
                || OpenGraphParser.IsDirectImageUrl(url);

            if (mediaFirst)
            {
                var m = await TryWithTimeout(_oembed, url, 10000, ct).ConfigureAwait(false);
                if (HasSignal(m)) return m;
                var h = await TryWithTimeout(_http, url, 12000, ct).ConfigureAwait(false);
                if (HasSignal(h)) return h;
            }
            else
            {
                var h = await TryWithTimeout(_http, url, 12000, ct).ConfigureAwait(false);
                if (HasSignal(h)) return h;
                var m = await TryWithTimeout(_oembed, url, 10000, ct).ConfigureAwait(false);
                if (HasSignal(m)) return m;
            }

            var p = await TryWithTimeout(_playwright, url, 25000, ct).ConfigureAwait(false);
            return HasSignal(p) ? p : null;
        }

        private static async Task<LinkPreviewResult?> TryWithTimeout(
            ILinkPreviewProvider provider, string url, int ms, CancellationToken ct)
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(ms);
            try { return await provider.TryFetchAsync(url, cts.Token).ConfigureAwait(false); }
            catch (OperationCanceledException) { return null; }
            catch { return null; }
        }
    }
}
