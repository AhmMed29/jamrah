using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Nodes;
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

        public string MetaLine => string.Join(" · ",
            new[] { Who, Year, Dur, Site }.Where(s => !string.IsNullOrEmpty(s)));

        public static BookmarkCardData From(BookmarkItem it)
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
            var img = PickImage(it.Thumb) ?? PickImage(First("poster", "cover", "image", "photo")) ?? string.Empty;
            var desc = !string.IsNullOrEmpty(it.Description) ? it.Description : Str("content");

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
                Domain = HostOf(url),
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
                Type = BookmarkQuery.TypeName(it.Type),
                Icon = BookmarkQuery.TypeIcon(it.Type),
            };
        }

        private static string? PickImage(string? v)
        {
            if (string.IsNullOrEmpty(v)) return null;
            return v.StartsWith("data:image") || v.StartsWith("http") ? v : null;
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

        public static string FmtDate(DateTime t)
        {
            if (t == DateTime.MinValue) return string.Empty;
            return t.ToString("MMM d, yyyy", System.Globalization.CultureInfo.InvariantCulture);
        }

        public static string FmtAgo(DateTime t)
        {
            if (t == DateTime.MinValue) return string.Empty;
            var d = DateTime.UtcNow - t.ToUniversalTime();
            if (d.TotalHours < 1) return Math.Max(1, (int)Math.Round(d.TotalMinutes)) + "m ago";
            if (d.TotalDays < 1) return ((int)Math.Round(d.TotalHours)) + "h ago";
            if (d.TotalDays < 30) return ((int)Math.Round(d.TotalDays)) + "d ago";
            return FmtDate(t);
        }

        public static string FmtDur(string v)
        {
            if (!double.TryParse(v, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var n) || n == 0) return string.Empty;
            if (n < 60) return n + "m";
            return Math.Floor(n / 60) + "h " + (n % 60) + "m";
        }

        public static string Kfmt(double v) => v >= 1000 ? (Math.Round(v / 100) / 10).ToString(System.Globalization.CultureInfo.InvariantCulture) + "k" : v.ToString(System.Globalization.CultureInfo.InvariantCulture);
    }
}
