using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Nodes;
using Jamrah.Application.Services;
using Jamrah.Core.Entities;

namespace Jamrah.Presentation.Bookmarks
{
    // Port of G(it) + fmt helpers from bookmark-design.html.
    public class BookmarkCardData
    {
        public BookmarkItem Item { get; set; } = null!;
        public JsonObject Meta { get; set; } = new();
        public List<string> Tags { get; set; } = new();
        public string Img { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Desc { get; set; } = string.Empty;
        public string DescShort => Jamrah.Files.Core.NoteText.Excerpt(Desc);
        public string Url { get; set; } = string.Empty;
        public string Domain { get; set; } = string.Empty;
        public string Who { get; set; } = string.Empty;
        public string Year { get; set; } = string.Empty;
        public string Dur { get; set; } = string.Empty;
        public string Site { get; set; } = string.Empty;
        public string Rating { get; set; } = string.Empty;
        public int? Progress { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Lang { get; set; } = string.Empty;
        public string Stars { get; set; } = string.Empty;
        public string Pages { get; set; } = string.Empty;
        public bool Fav { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public string SiteIcon { get; set; } = string.Empty;
        // ADDITIVE: managed local-library file visuals (program icon / first-page preview).
        public string AppIcon { get; set; } = string.Empty;
        public string FileIconKind { get; set; } = string.Empty;
        public string FileExt { get; set; } = string.Empty;
        public string FileKind { get; set; } = string.Empty;
        public bool IsLocalFile { get; set; }
        public bool IsProgram { get; set; }
        public bool IsPdf { get; set; }

        public string MetaLine => string.Join(" · ",
            new[] { Who, Year, Dur, Site }.Where(s => !string.IsNullOrEmpty(s)));

        public static BookmarkCardData From(BookmarkItem it) => From(it, LocalizationService.CurrentLang);

        // PERF: the bookmarks page rebuilds every card on each render (the grid
        // filter asks for the card data, then the card asks for it again), and
        // every rebuild re-parsed the metadata, re-deserialized the tags and
        // re-read the thumbnail from disk. The memo below makes From() a
        // dictionary hit; the key carries UpdatedAt and the language, so an
        // edited item or a language switch is picked up on the next render.
        private const int MemoLimit = 600;
        private static readonly ConcurrentDictionary<(string Id, long Updated, string Lang), BookmarkCardData> _memo = new();

        public static BookmarkCardData From(BookmarkItem it, string lang)
        {
            if (it is null) throw new ArgumentNullException(nameof(it));
            var key = (it.Id ?? string.Empty, it.UpdatedAt.Ticks, lang ?? string.Empty);
            if (_memo.Count > MemoLimit) _memo.Clear();
            return _memo.GetOrAdd(key, _ => Build(it, lang));
        }

        private static BookmarkCardData Build(BookmarkItem it, string lang)
        {
            JsonObject m;
            try { m = JsonNode.Parse(string.IsNullOrWhiteSpace(it.MetadataJson) ? "{}" : it.MetadataJson) as JsonObject ?? new JsonObject(); }
            catch { m = new JsonObject(); }

            List<string> tags;
            try { tags = JsonSerializer.Deserialize<List<string>>(string.IsNullOrWhiteSpace(it.TagsJson) ? "[]" : it.TagsJson) ?? new List<string>(); }
            catch { tags = new List<string>(); }

            string Str(string k)
            {
                var n = m[k];
                if (n == null) return string.Empty;
                try { return n.GetValue<string>(); } catch { return n.ToString(); }
            }
            string First(params string[] keys)
            {
                foreach (var k in keys) { var v = Str(k); if (!string.IsNullOrEmpty(v)) return v; }
                return string.Empty;
            }

            var url = !string.IsNullOrEmpty(it.Url) ? it.Url : Str("url");
            // Local archived thumb wins when the file is really on disk; remote stays as fallback.
            // (ResolveLocalImage on Thumb itself repairs items saved before the fix, whose
            // Thumb is already a file:// URI, by inlining small files as data: URIs.)
            var localFileRel = Str("localFile");
            var fileKind = Str("fileKind");
            if (string.IsNullOrEmpty(fileKind)) fileKind = LocalFileService.KindFor(localFileRel);
            var img = ResolvePdfCover(Str(Jamrah.Files.Core.PdfCover.MetaKey))
                ?? ResolveLocalImage(First("thumbLocal"))
                ?? LibraryImage(localFileRel)
                ?? ResolveLocalImage(it.Thumb)
                ?? PickImage(it.Thumb)
                ?? PickImage(First("poster", "cover", "image", "photo"))
                ?? string.Empty;
            // Notes are the body for note items; the card falls back to a short excerpt
            // when the user has not written a separate 100-char description.
            var desc = !string.IsNullOrEmpty(it.Description)
                ? it.Description
                : (string.Equals(it.Type, "note", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(it.Notes)
                    ? it.Notes
                    : Str("content"));
            var fileIcon = Str("fileIcon");
            var host = HostOf(url);
            var siteIcon = PickImage(First("siteIcon", "favicon", "icon")) ?? string.Empty;
            if (string.IsNullOrEmpty(siteIcon) && !string.IsNullOrEmpty(host))
                siteIcon = "https://" + host + "/favicon.ico";

            double ratingNum = SafeDouble(m["rating"]);
            int? progress = SafeInt(m["progress"]);
            double starsNum = SafeDouble(m["stars"]);

            static double SafeDouble(System.Text.Json.Nodes.JsonNode? n)
            {
                if (n == null) return double.NaN;
                try { return n.GetValue<double>(); } catch { return double.NaN; }
            }
            static int? SafeInt(System.Text.Json.Nodes.JsonNode? n)
            {
                if (n == null) return null;
                try { return n.GetValue<int>(); } catch { return null; }
            }

            return new BookmarkCardData
            {
                Item = it,
                Meta = m,
                Tags = tags,
                Img = img,
                Title = it.Title,
                Desc = desc,
                Url = url,
                Domain = host,
                Who = First("author", "director", "owner", "instructor", "channel", "host", "artist", "authors", "creator"),
                Year = Str("year"),
                Dur = FmtDur(First("duration")),
                Site = First("site", "platform", "publisher", "source", "venue"),
                Rating = double.IsNaN(ratingNum) ? string.Empty : ratingNum.ToString(System.Globalization.CultureInfo.InvariantCulture),
                Progress = progress,
                Status = Str("status"),
                Lang = Str("language"),
                Stars = double.IsNaN(starsNum) ? string.Empty : Kfmt(starsNum),
                Pages = Str("pages"),
                Fav = it.Favorite,
                Type = BookmarkQuery.TypeName(it.Type, lang),
                Icon = BookmarkQuery.TypeIcon(it.Type),
                SiteIcon = siteIcon,
                AppIcon = fileIcon.StartsWith("data:image", StringComparison.Ordinal) ? fileIcon : string.Empty,
                FileIconKind = Str("fileIconKind"),
                FileExt = System.IO.Path.GetExtension(localFileRel).TrimStart('.').ToUpperInvariant(),
                FileKind = fileKind,
                IsLocalFile = !string.IsNullOrEmpty(localFileRel),
                IsProgram = Jamrah.Files.Core.FileIcon.IsProgram(localFileRel),
                IsPdf = Jamrah.Files.Core.PdfCover.ShouldRender(fileKind),
            };
        }

        private static string? ResolvePdfCover(string? fileName)
        {
            if (!Jamrah.Files.Core.PdfCover.IsSafeFileName(fileName)) return null;
            var path = Jamrah.Files.Core.PdfCover.AbsolutePathFor(
                Jamrah.Infrastructure.AppPaths.Layout.ThumbsDir, fileName);
            return ResolveLocalImage(path);
        }

        private static string? PickImage(string? v)
        {
            if (string.IsNullOrEmpty(v)) return null;
            v = v.Trim();
            if (v.StartsWith("data:image") || v.StartsWith("http") || v.StartsWith("file://")) return v;
            // Raw local path (old archives) — expose as file:// for Blazor <img>.
            try { if (System.IO.File.Exists(v)) return new System.Uri(v).AbsoluteUri; } catch { }
            return null;
        }

        /// <summary>
        /// Archived thumb path -&gt; displayable src. Small files (&lt;=300KB) are inlined as
        /// data: URIs so they render even where the WebView blocks file://. Returns null
        /// when the file is missing so the caller falls back to the remote URL.
        /// </summary>
        // PERF: the data: URI was rebuilt on every render (read + base64 of the
        // whole file each time). The cache below keeps it keyed by the file's
        // mtime and size, so a regenerated cover is picked up automatically.
        private const int ImgCacheLimit = 800;
        private static readonly ConcurrentDictionary<string, string> _imgSrcCache = new();

        private static string? ResolveLocalImage(string? localPath)
        {
            if (string.IsNullOrWhiteSpace(localPath)) return null;
            localPath = localPath.Trim();
            if (localPath.StartsWith("data:image") || localPath.StartsWith("http"))
                return localPath;
            string path = localPath;
            if (localPath.StartsWith("file://"))
            {
                try { path = new System.Uri(localPath).LocalPath; }
                catch { return localPath; }
            }
            try
            {
                if (!System.IO.File.Exists(path)) return null;
                var info = new System.IO.FileInfo(path);
                var cacheKey = path + "|" + info.LastWriteTimeUtc.Ticks + "|" + info.Length;
                if (_imgSrcCache.TryGetValue(cacheKey, out var cached)) return cached;

                string src;
                // PERF: files inside the thumbnail folder are served over the WebView
                // virtual host, so the browser caches them and no base64 ends up in
                // the Blazor DOM. Falls back to the inline data: URI when the host
                // is unavailable (Android) or the file lives elsewhere.
                var hostUrl = Jamrah.Infrastructure.AppPaths.ThumbsUrlForPath(path);
                if (!string.IsNullOrEmpty(hostUrl))
                {
                    src = hostUrl;
                }
                else if (info.Length > 0 && info.Length <= 300 * 1024)
                {
                    var mime = info.Extension.ToLowerInvariant() switch
                    {
                        ".png" => "image/png",
                        ".gif" => "image/gif",
                        ".webp" => "image/webp",
                        ".bmp" => "image/bmp",
                        ".svg" => "image/svg+xml",
                        _ => "image/jpeg",
                    };
                    src = "data:" + mime + ";base64," + System.Convert.ToBase64String(System.IO.File.ReadAllBytes(path));
                }
                else
                {
                    src = new System.Uri(path).AbsoluteUri;
                }
                if (_imgSrcCache.Count > ImgCacheLimit) _imgSrcCache.Clear();
                _imgSrcCache[cacheKey] = src;
                return src;
            }
            catch { return null; }
        }

        /// <summary>Library-relative path -&gt; virtual-host URL for &lt;img&gt; when the file kind is image.</summary>
        private static string? LibraryImage(string localFileRel)
        {
            if (string.IsNullOrWhiteSpace(localFileRel)) return null;
            if (!OperatingSystem.IsWindows()) return null; // Android serving arrives with the Phase 3 asset loader
            if (System.IO.Path.IsPathRooted(localFileRel)) return null; // linked files (Phase 2) are not served yet
            if (Jamrah.Application.Services.LocalFileService.KindFor(localFileRel) != "image") return null;
            var abs = Jamrah.Files.Core.SafePath.ResolveUnderRoot(
                Jamrah.Infrastructure.AppPaths.Layout.Root, localFileRel);
            if (abs == null || !System.IO.File.Exists(abs)) return null; // stale/unsafe metadata -> fall back to template
            return Jamrah.Infrastructure.AppPaths.LibraryUrlFor(localFileRel);
        }

        public static string HostOf(string? u)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(u)) return string.Empty;
                var url = u.Contains("://") ? u : "https://" + u;
                return new Uri(url).Host.Replace("www.", "");
            }
            catch { return string.Empty; }
        }

        public static string FmtDate(DateTime t) => LocalizationService.FmtCardDate(t, LocalizationService.CurrentLang);
        public static string FmtDate(DateTime t, string lang) => LocalizationService.FmtCardDate(t, lang);

        public static string FmtAgo(DateTime t) => LocalizationService.FmtAgo(t, LocalizationService.CurrentLang);
        public static string FmtAgo(DateTime t, string lang) => LocalizationService.FmtAgo(t, lang);

        public static string FmtDur(string v)
        {
            if (!double.TryParse(v, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var n) || n == 0) return string.Empty;
            if (n < 60) return n + "m";
            return Math.Floor(n / 60) + "h " + (n % 60) + "m";
        }

        public static string Kfmt(double v) => v >= 1000 ? (Math.Round(v / 100) / 10).ToString(System.Globalization.CultureInfo.InvariantCulture) + "k" : v.ToString(System.Globalization.CultureInfo.InvariantCulture);
    }
}
