using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace Jamrah.Application.Services.LinkPreview
{
    /// <summary>Result with a machine-readable failure reason (surfaced, never silent).</summary>
    public sealed record ThumbArchiveResult(string? LocalPath, string? Reason);

    /// <summary>
    /// Stateless local archiving. No DB access here — the caller saves the item.
    /// - Thumb -&gt; AppData/bookmark-thumbs/{itemId}.ext (local PATH returned; caller keeps
    ///   the remote URL in Thumb and stores the local path in MetadataJson thumbLocal)
    /// - Article -&gt; AppData/Archive/{itemId}/article.html + images/
    /// Never throws: failures return a Reason and the item keeps its remote URLs.
    /// Reasons: already-local, no-id, http-{code}, net-error, empty, too-big, not-image.
    /// </summary>
    public sealed class LinkArchiver
    {
        private const long MaxBytes = 15_1024_1024; // 15 MB
        private readonly HttpClient _http;

        public LinkArchiver(HttpClient http) => _http = http;

        public static string ToFileUri(string localPath)
        {
            try { return new Uri(localPath).AbsoluteUri; } catch { return localPath; }
        }

        public static bool IsLocalRef(string? v)
        {
            if (string.IsNullOrWhiteSpace(v)) return false;
            v = v.Trim();
            return v.StartsWith("data:", StringComparison.OrdinalIgnoreCase)
                || v.StartsWith("file://", StringComparison.OrdinalIgnoreCase)
                || File.Exists(v);
        }

        /// <summary>Downloads a remote image for an item. Returns local file path or null.</summary>
        public Task<string?> SaveThumbLocalAsync(string itemId, string? imageUrl, CancellationToken ct = default)
            => TrySaveThumbLocalAsync(itemId, imageUrl, ct).ContinueWith(t =>
                t.IsCompletedSuccessfully ? t.Result.LocalPath : null,
                TaskContinuationOptions.ExecuteSynchronously);

        /// <summary>Same as SaveThumbLocalAsync but reports WHY it failed.</summary>
        public async Task<ThumbArchiveResult> TrySaveThumbLocalAsync(string itemId, string? imageUrl, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(imageUrl) || IsLocalRef(imageUrl))
                return new ThumbArchiveResult(null, "already-local");
            if (string.IsNullOrWhiteSpace(itemId)) return new ThumbArchiveResult(null, "no-id");
            HttpResponseMessage res;
            try
            {
                res = await _http.GetAsync(imageUrl.Trim(),
                    HttpCompletionOption.ResponseHeadersRead, ct).ConfigureAwait(false);
            }
            catch (OperationCanceledException) { return new ThumbArchiveResult(null, "timeout"); }
            catch { return new ThumbArchiveResult(null, "net-error"); }
            using (res)
            {
                if (!res.IsSuccessStatusCode)
                    return new ThumbArchiveResult(null, "http-" + (int)res.StatusCode);
                var len = res.Content.Headers.ContentLength;
                if (len.HasValue && len.Value > MaxBytes) return new ThumbArchiveResult(null, "too-big");

                byte[] bytes;
                try { bytes = await res.Content.ReadAsByteArrayAsync(ct).ConfigureAwait(false); }
                catch (OperationCanceledException) { return new ThumbArchiveResult(null, "timeout"); }
                catch { return new ThumbArchiveResult(null, "net-error"); }
                if (bytes == null || bytes.Length == 0) return new ThumbArchiveResult(null, "empty");
                if (bytes.Length > MaxBytes) return new ThumbArchiveResult(null, "too-big");

                var media = res.Content.Headers.ContentType?.MediaType ?? string.Empty;
                var looksImage = media.StartsWith("image/", StringComparison.OrdinalIgnoreCase)
                    || media.Contains("octet-stream", StringComparison.OrdinalIgnoreCase)
                    || string.IsNullOrWhiteSpace(media)
                    || OpenGraphParser.IsDirectImageUrl(imageUrl)
                    || IsImageBytes(bytes);
                if (!looksImage) return new ThumbArchiveResult(null, "not-image");

                var ext = ExtFrom(media, imageUrl);
                try
                {
                    var dir = Path.Combine(FileSystem.AppDataDirectory, "bookmark-thumbs");
                    Directory.CreateDirectory(dir);
                    // Remove older extensions for the same item.
                    foreach (var old in Directory.GetFiles(dir, itemId + ".*"))
                        try { File.Delete(old); } catch { }
                    var path = Path.Combine(dir, itemId + ext);
                    await File.WriteAllBytesAsync(path, bytes, ct).ConfigureAwait(false);
                    return new ThumbArchiveResult(path, null);
                }
                catch { return new ThumbArchiveResult(null, "write-error"); }
            }
        }

        private static bool IsImageBytes(byte[] b)
        {
            if (b.Length < 4) return false;
            if (b[0] == 0xFF && b[1] == 0xD8) return true; // JPEG
            if (b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47) return true; // PNG
            if (b[0] == 0x47 && b[1] == 0x49 && b[2] == 0x46) return true; // GIF
            if (b[0] == 0x42 && b[1] == 0x4D) return true; // BMP
            if (b.Length >= 12 && b[0] == 0x52 && b[1] == 0x49 && b[2] == 0x46 && b[3] == 0x46
                && b[8] == 0x57 && b[9] == 0x45 && b[10] == 0x42 && b[11] == 0x50) return true; // WEBP
            return false;
        }

        /// <summary>
        /// Saves a cleaned article copy + its images. Returns (archiveDir, wordCount).
        /// Only call for article-ish types; video keeps thumbnail + metadata only.
        /// </summary>
        public async Task<(string? dir, int words)> ArchiveArticleAsync(
            string itemId, string pageUrl, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(itemId) || string.IsNullOrWhiteSpace(pageUrl))
                return (null, 0);
            try
            {
                using var res = await _http.GetAsync(pageUrl.Trim(),
                    HttpCompletionOption.ResponseHeadersRead, ct).ConfigureAwait(false);
                if (!res.IsSuccessStatusCode) return (null, 0);
                var media = res.Content.Headers.ContentType?.MediaType ?? string.Empty;
                if (!media.Contains("html", StringComparison.OrdinalIgnoreCase)
                    && !media.Contains("text", StringComparison.OrdinalIgnoreCase)
                    && !string.IsNullOrEmpty(media))
                    return (null, 0);

                var html = await res.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
                if (string.IsNullOrWhiteSpace(html)) return (null, 0);
                if (html.Length > 3_000_000) html = html[..3_000_000];

                var (cleanHtml, words) = OpenGraphParser.ExtractReadable(html, pageUrl);
                if (words < 10 || string.IsNullOrWhiteSpace(cleanHtml)) return (null, 0);

                var dir = Path.Combine(FileSystem.AppDataDirectory, "Archive", itemId);
                var imgDir = Path.Combine(dir, "images");
                Directory.CreateDirectory(imgDir);

                cleanHtml = await LocalizeArticleImages(cleanHtml, pageUrl, imgDir, ct).ConfigureAwait(false);

                var docHtml = "<!doctype html><html><head><meta charset=\"utf-8\">" +
                    "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
                    "<base href=\"" + System.Net.WebUtility.HtmlEncode(pageUrl) + "\">" +
                    "<style>body{max-width:760px;margin:0 auto;padding:24px;font-size:17px;line-height:1.8}" +
                    "img{max-width:100%;height:auto}</style></head><body>"
                    + cleanHtml + "</body></html>";
                await File.WriteAllTextAsync(Path.Combine(dir, "article.html"), docHtml, ct).ConfigureAwait(false);
                // Canonical local copy: Markdown (the in-app reader renders this file).
                try
                {
                    var md = HtmlToMarkdown.Convert(cleanHtml);
                    if (md.Trim().Length > 50)
                        await File.WriteAllTextAsync(Path.Combine(dir, "article.md"), md, ct).ConfigureAwait(false);
                }
                catch { /* html copy above is enough of a fallback */ }
                return (dir, words);
            }
            catch { return (null, 0); }
        }

        private async Task<string> LocalizeArticleImages(
            string cleanHtml, string pageUrl, string imgDir, CancellationToken ct)
        {
            try
            {
                var doc = new HtmlAgilityPack.HtmlDocument();
                doc.LoadHtml(cleanHtml);
                var imgs = doc.DocumentNode.SelectNodes("//img")?.Take(20).ToList()
                    ?? new System.Collections.Generic.List<HtmlAgilityPack.HtmlNode>();
                var i = 0;
                foreach (var img in imgs)
                {
                    ct.ThrowIfCancellationRequested();
                    var src = img.GetAttributeValue("src", string.Empty);
                    if (string.IsNullOrWhiteSpace(src) || IsLocalRef(src)) continue;
                    if (!src.StartsWith("http", StringComparison.OrdinalIgnoreCase)) continue;
                    try
                    {
                        using var res = await _http.GetAsync(src,
                            HttpCompletionOption.ResponseHeadersRead, ct).ConfigureAwait(false);
                        if (!res.IsSuccessStatusCode) continue;
                        var media = res.Content.Headers.ContentType?.MediaType ?? string.Empty;
                        if (!media.StartsWith("image/", StringComparison.OrdinalIgnoreCase)) continue;
                        var bytes = await res.Content.ReadAsByteArrayAsync(ct).ConfigureAwait(false);
                        if (bytes == null || bytes.Length == 0 || bytes.Length > MaxBytes) continue;
                        var path = Path.Combine(imgDir, $"img{i++}{ExtFrom(media, src)}");
                        await File.WriteAllBytesAsync(path, bytes, ct).ConfigureAwait(false);
                        // Keep the remote URL so the reader can fall back if file:// is blocked.
                        img.SetAttributeValue("data-remote-src", src);
                        img.SetAttributeValue("src", ToFileUri(path));
                        img.SetAttributeValue("onerror",
                            "this.onerror=null;this.src=this.dataset.remoteSrc||this.getAttribute('data-remote-src');");
                    }
                    catch { /* keep remote src */ }
                }
                return doc.DocumentNode.InnerHtml;
            }
            catch { return cleanHtml; }
        }

        private static string ExtFrom(string mediaType, string url)
        {
            if (mediaType.Contains("png", StringComparison.OrdinalIgnoreCase)) return ".png";
            if (mediaType.Contains("gif", StringComparison.OrdinalIgnoreCase)) return ".gif";
            if (mediaType.Contains("webp", StringComparison.OrdinalIgnoreCase)) return ".webp";
            if (mediaType.Contains("bmp", StringComparison.OrdinalIgnoreCase)) return ".bmp";
            if (mediaType.Contains("svg", StringComparison.OrdinalIgnoreCase)) return ".svg";
            var clean = url.Split('?', '#')[0].ToLowerInvariant();
            if (clean.EndsWith(".png")) return ".png";
            if (clean.EndsWith(".gif")) return ".gif";
            if (clean.EndsWith(".webp")) return ".webp";
            if (clean.EndsWith(".bmp")) return ".bmp";
            return ".jpg";
        }
    }
}
