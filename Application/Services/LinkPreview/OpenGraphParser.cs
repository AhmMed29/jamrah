using System;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using HtmlAgilityPack;

namespace Jamrah.Application.Services.LinkPreview
{
    /// <summary>
    /// Shared HTML -&gt; preview parsing (used by Http provider and Playwright fallback).
    /// Priority: og:* then twitter:* then &lt;title&gt;/meta description/first long &lt;p&gt;.
    /// </summary>
    public static class OpenGraphParser
    {
        public static bool IsDirectImageUrl(string? url)
        {
            if (string.IsNullOrWhiteSpace(url)) return false;
            var clean = url.Split('?', '#')[0].ToLowerInvariant();
            return clean.EndsWith(".jpg") || clean.EndsWith(".jpeg") || clean.EndsWith(".png")
                || clean.EndsWith(".gif") || clean.EndsWith(".webp") || clean.EndsWith(".bmp");
            // Note: .svg excluded on purpose (Blazor card rendering is unreliable for svg).
        }

        public static LinkPreviewResult? ForDirectImage(string url, string domain)
        {
            var file = url.Split('?', '#')[0].Split('/').LastOrDefault() ?? string.Empty;
            file = WebUtility.UrlDecode(file);
            var title = string.IsNullOrWhiteSpace(file) ? domain : file;
            var suggested = BookmarkEmbedService.SuggestType(domain, "photo");
            return new LinkPreviewResult(title, string.Empty, url, string.Empty,
                BookmarkEmbedService.PlatformName(domain), "photo", url, domain,
                suggested, null, null, false);
        }

        public static LinkPreviewResult? Parse(string html, string url)
        {
            if (string.IsNullOrWhiteSpace(html)) return null;
            var domain = Presentation.Bookmarks.BookmarkCardData.HostOf(url);

            HtmlDocument doc = new();
            try { doc.LoadHtml(html); }
            catch { return null; }

            string Meta(params string[] names)
            {
                foreach (var n in names)
                {
                    var node = doc.DocumentNode.SelectSingleNode(
                        $"//meta[@property='{n}' or @name='{n}' or @itemprop='{n}']");
                    var c = node?.GetAttributeValue("content", string.Empty);
                    if (!string.IsNullOrWhiteSpace(c)) return WebUtility.HtmlDecode(c.Trim());
                }
                return string.Empty;
            }

            var title = Meta("og:title", "twitter:title");
            if (string.IsNullOrWhiteSpace(title))
            {
                var t = doc.DocumentNode.SelectSingleNode("//title");
                title = WebUtility.HtmlDecode(t?.InnerText?.Trim() ?? string.Empty);
            }

            var desc = Meta("og:description", "twitter:description", "description");
            if (string.IsNullOrWhiteSpace(desc))
                desc = FirstLongParagraph(doc);

            var image = Meta("og:image", "twitter:image", "twitter:image:src");
            if (string.IsNullOrWhiteSpace(image))
            {
                var linkImg = doc.DocumentNode.SelectSingleNode("//link[@rel='image_src']");
                image = linkImg?.GetAttributeValue("href", string.Empty) ?? string.Empty;
            }
            if (string.IsNullOrWhiteSpace(image))
                image = FirstContentImage(doc, url);
            image = ToAbsoluteUrl(image, url);

            var author = Meta("article:author", "author", "twitter:creator");
            var provider = Meta("og:site_name");
            if (string.IsNullOrWhiteSpace(provider))
                provider = LdJsonField(doc, "publisher", "provider", "sourceOrganization");
            if (string.IsNullOrWhiteSpace(author))
                author = LdJsonField(doc, "author", "creator", "accountablePerson");
            if (string.IsNullOrWhiteSpace(provider))
                provider = BookmarkEmbedService.PlatformName(domain);

            var otype = Meta("og:type", "twitter:card");
            if (string.IsNullOrWhiteSpace(otype)) otype = "link";
            var published = Meta("article:published_time", "datePublished", "publish_date");
            if (string.IsNullOrWhiteSpace(published))
                published = LdJsonField(doc, "datePublished", "dateCreated");

            double? durationMin = ParseDurationMinutes(Meta("og:video:duration", "duration"))
                ?? ParseDurationMinutes(LdJsonField(doc, "duration"));

            if (string.IsNullOrWhiteSpace(title) && string.IsNullOrWhiteSpace(desc)
                && string.IsNullOrWhiteSpace(image))
                return null;

            var suggested = BookmarkEmbedService.SuggestType(domain, otype);
            var embedAvailable = Presentation.Bookmarks.BookmarkTemplates.EmbedHtml(url, domain) != null;

            return new LinkPreviewResult(
                title.Trim(), desc.Trim(), image.Trim(), author.Trim(), provider.Trim(),
                otype.Trim(), url, domain, suggested, durationMin,
                string.IsNullOrWhiteSpace(published) ? null : published.Trim(), embedAvailable);
        }

        private static string FirstLongParagraph(HtmlDocument doc)
        {
            try
            {
                var ps = doc.DocumentNode.SelectNodes("//article//p | //main//p | //p");
                if (ps == null) return string.Empty;
                foreach (var p in ps)
                {
                    var t = WebUtility.HtmlDecode(p.InnerText?.Trim() ?? string.Empty);
                    t = Regex.Replace(t, @"\s+", " ");
                    if (t.Length >= 80 && t.Length <= 600) return t;
                }
            }
            catch { }
            return string.Empty;
        }

        private static string FirstContentImage(HtmlDocument doc, string pageUrl)
        {
            try
            {
                var imgs = doc.DocumentNode.SelectNodes("//article//img | //main//img | //img");
                if (imgs == null) return string.Empty;
                foreach (var img in imgs)
                {
                    var src = img.GetAttributeValue("src", string.Empty)
                        ?? img.GetAttributeValue("data-src", string.Empty);
                    if (string.IsNullOrWhiteSpace(src) || src.StartsWith("data:")) continue;
                    // Skip tiny tracking pixels / icons via width/height attrs when present.
                    var w = img.GetAttributeValue("width", string.Empty);
                    if (int.TryParse(w, out var wi) && wi < 120) continue;
                    return src.Trim();
                }
            }
            catch { }
            return string.Empty;
        }

        public static string ToAbsoluteUrl(string src, string pageUrl)
        {
            if (string.IsNullOrWhiteSpace(src)) return string.Empty;
            src = src.Trim();
            if (src.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
                || src.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
                || src.StartsWith("file://", StringComparison.OrdinalIgnoreCase)
                || src.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
                return src;
            try
            {
                var baseUri = new Uri(pageUrl.Contains("://") ? pageUrl : "https://" + pageUrl);
                return new Uri(baseUri, src).ToString();
            }
            catch { return src; }
        }

        private static string LdJsonField(HtmlDocument doc, params string[] wanted)
        {
            try
            {
                var scripts = doc.DocumentNode.SelectNodes("//script[@type='application/ld+json']");
                if (scripts == null) return string.Empty;
                foreach (var s in scripts)
                {
                    var json = s.InnerText;
                    if (string.IsNullOrWhiteSpace(json)) continue;
                    using var jdoc = JsonDocument.Parse(json);
                    foreach (var name in wanted)
                    {
                        var found = FindJsonString(jdoc.RootElement, name);
                        if (!string.IsNullOrWhiteSpace(found)) return WebUtility.HtmlDecode(found.Trim());
                    }
                }
            }
            catch { }
            return string.Empty;
        }

        private static string? FindJsonString(JsonElement el, string name)
        {
            if (el.ValueKind == JsonValueKind.Object)
            {
                foreach (var p in el.EnumerateObject())
                {
                    if (p.Name.Equals(name, StringComparison.OrdinalIgnoreCase))
                    {
                        if (p.Value.ValueKind == JsonValueKind.String) return p.Value.GetString();
                        if (p.Value.ValueKind == JsonValueKind.Object
                            && p.Value.TryGetProperty("name", out var n)
                            && n.ValueKind == JsonValueKind.String)
                            return n.GetString();
                        if (p.Value.ValueKind == JsonValueKind.Array)
                        {
                            var first = p.Value.EnumerateArray().FirstOrDefault();
                            if (first.ValueKind == JsonValueKind.String) return first.GetString();
                            if (first.ValueKind == JsonValueKind.Object
                                && first.TryGetProperty("name", out var fn)
                                && fn.ValueKind == JsonValueKind.String)
                                return fn.GetString();
                        }
                    }
                    var deep = FindJsonString(p.Value, name);
                    if (!string.IsNullOrWhiteSpace(deep)) return deep;
                }
            }
            else if (el.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in el.EnumerateArray())
                {
                    var deep = FindJsonString(item, name);
                    if (!string.IsNullOrWhiteSpace(deep)) return deep;
                }
            }
            return null;
        }

        private static double? ParseDurationMinutes(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;
            raw = raw.Trim();
            // Plain seconds ("754") or minutes ("25").
            if (double.TryParse(raw, System.Globalization.NumberStyles.Float,
                    System.Globalization.CultureInfo.InvariantCulture, out var num))
                return num > 1000 ? Math.Round(num / 60.0, 1) : num; // >1000 => likely seconds
            // ISO8601 PT1H25M / PT10M30S
            var m = Regex.Match(raw, @"^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$", RegexOptions.IgnoreCase);
            if (m.Success)
            {
                var h = m.Groups[1].Success ? double.Parse(m.Groups[1].Value) : 0;
                var mm = m.Groups[2].Success ? double.Parse(m.Groups[2].Value) : 0;
                var s = m.Groups[3].Success ? double.Parse(m.Groups[3].Value) : 0;
                return Math.Round(h * 60 + mm + s / 60.0, 1);
            }
            // mm:ss / hh:mm:ss
            var parts = raw.Split(':');
            if (parts.Length == 2 && double.TryParse(parts[0], out var a) && double.TryParse(parts[1], out var b))
                return Math.Round(a + b / 60.0, 1);
            if (parts.Length == 3 && double.TryParse(parts[0], out var h2)
                && double.TryParse(parts[1], out var m2) && double.TryParse(parts[2], out var s2))
                return Math.Round(h2 * 60 + m2 + s2 / 60.0, 1);
            return null;
        }

        /// <summary>
        /// Readability-lite: returns cleaned article HTML + word count.
        /// Removes script/style/nav/header/footer/aside/form, picks &lt;article&gt; or the
        /// div with most &lt;p&gt; text. Image src values are rewritten to absolute URLs.
        /// </summary>
        public static (string cleanHtml, int wordCount) ExtractReadable(string html, string pageUrl)
        {
            var doc = new HtmlDocument();
            try { doc.LoadHtml(html); }
            catch { return (string.Empty, 0); }

            foreach (var n in doc.DocumentNode.SelectNodes("//script|//style|//noscript|//nav|//header|//footer|//aside|//form|//iframe") ?? Enumerable.Empty<HtmlNode>())
                n.Remove();

            HtmlNode? root = doc.DocumentNode.SelectSingleNode("//article")
                ?? doc.DocumentNode.SelectSingleNode("//main");
            if (root == null)
            {
                HtmlNode? best = null;
                var bestLen = 0;
                var divs = doc.DocumentNode.SelectNodes("//div|//section") ?? Enumerable.Empty<HtmlNode>();
                foreach (var d in divs)
                {
                    var ptext = string.Concat((d.SelectNodes(".//p") ?? Enumerable.Empty<HtmlNode>())
                        .Select(p => p.InnerText ?? string.Empty));
                    if (ptext.Length > bestLen) { bestLen = ptext.Length; best = d; }
                }
                root = bestLen > 300 ? best : doc.DocumentNode.SelectSingleNode("//body") ?? doc.DocumentNode;
            }

            if (root == null) return (string.Empty, 0);
            foreach (var img in root.SelectNodes(".//img") ?? Enumerable.Empty<HtmlNode>())
            {
                var src = img.GetAttributeValue("src", string.Empty);
                if (string.IsNullOrWhiteSpace(src))
                    src = img.GetAttributeValue("data-src", string.Empty);
                img.SetAttributeValue("src", ToAbsoluteUrl(src, pageUrl));
                img.Attributes.Remove("data-src");
                img.Attributes.Remove("srcset");
            }
            foreach (var a in root.SelectNodes(".//a") ?? Enumerable.Empty<HtmlNode>())
                a.SetAttributeValue("href", ToAbsoluteUrl(a.GetAttributeValue("href", string.Empty), pageUrl));

            var clean = root.InnerHtml.Trim();
            var plain = WebUtility.HtmlDecode(Regex.Replace(root.InnerText ?? string.Empty, @"\s+", " ").Trim());
            var words = string.IsNullOrWhiteSpace(plain) ? 0 : plain.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
            return (clean, words);
        }
    }
}
