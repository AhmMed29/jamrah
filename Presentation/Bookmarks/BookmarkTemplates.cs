using System.Collections.Generic;
using System.Linq;
using System.Net;
using Jamrah.Core.Entities;

namespace Jamrah.Presentation.Bookmarks
{
    // Port of TEMPLATES render functions from bookmark-design.html (lines 952-974 + helpers).
    // Returns raw HTML rendered via MarkupString (cards are non-interactive by design).
    public static class BookmarkTemplates
    {
        private static string E(string? s) => WebUtility.HtmlEncode(s ?? string.Empty);

        private static readonly Dictionary<string, List<(string Key, string Label)>> TypeFields = new()
        {
            ["link"] = new() { ("url", "URL"), ("site", "Site") },
            ["post"] = new() { ("author", "Author"), ("platform", "Platform"), ("date", "Posted") },
            ["website"] = new() { ("url", "URL"), ("site", "Site") },
            ["article"] = new() { ("url", "URL"), ("author", "Author"), ("source", "Source"), ("date", "Published") },
            ["documentation"] = new() { ("url", "URL"), ("source", "Maintainer") },
            ["tool"] = new() { ("url", "URL"), ("platform", "Platform") },
            ["video"] = new() { ("url", "URL"), ("channel", "Channel"), ("duration", "Duration (min)") },
            ["image"] = new() { ("source", "Source") },
            ["movie"] = new() { ("year", "Year"), ("genres", "Genres"), ("director", "Director"), ("duration", "Runtime (min)"), ("rating", "Rating") },
            ["tvshow"] = new() { ("year", "Year"), ("seasons", "Seasons"), ("creator", "Creator"), ("status", "Status"), ("rating", "Rating") },
            ["anime"] = new() { ("year", "Year"), ("seasons", "Seasons"), ("creator", "Creator"), ("status", "Status"), ("rating", "Rating") },
            ["podcast"] = new() { ("url", "URL"), ("host", "Host"), ("status", "Status") },
            ["music"] = new() { ("artist", "Artist"), ("year", "Year"), ("url", "URL"), ("rating", "Rating") },
            ["book"] = new() { ("author", "Author"), ("publisher", "Publisher"), ("year", "Year"), ("isbn", "ISBN"), ("pages", "Pages"), ("status", "Status"), ("progress", "Progress"), ("rating", "Rating") },
            ["ebook"] = new() { ("author", "Author"), ("publisher", "Publisher"), ("year", "Year"), ("pages", "Pages"), ("status", "Status"), ("progress", "Progress"), ("rating", "Rating"), ("url", "URL") },
            ["research"] = new() { ("authors", "Authors"), ("year", "Year"), ("venue", "Venue"), ("url", "URL") },
            ["repo"] = new() { ("url", "URL"), ("owner", "Owner"), ("language", "Language"), ("stars", "Stars"), ("status", "Status") },
            ["snippet"] = new() { ("language", "Language"), ("url", "URL"), ("content", "Code") },
            ["library"] = new() { ("url", "URL"), ("language", "Language") },
            ["api"] = new() { ("url", "URL"), ("pricing", "Pricing") },
            ["course"] = new() { ("url", "URL"), ("platform", "Platform"), ("instructor", "Instructor"), ("duration", "Duration (min)"), ("progress", "Progress"), ("status", "Status") },
            ["game"] = new() { ("platform", "Platform"), ("year", "Year"), ("genre", "Genre"), ("status", "Status"), ("rating", "Rating") },
            ["pdf"] = new() { ("pages", "Pages"), ("author", "Author") },
            ["document"] = new() { ("author", "Author") },
            ["audio"] = new(),
            ["file"] = new(),
            ["note"] = new() { ("content", "Content") },
            ["idea"] = new() { ("content", "Content") },
            ["project"] = new() { ("url", "URL"), ("status", "Status") },
            ["reference"] = new() { ("url", "URL"), ("source", "Source") },
        };

        public static string Chips(List<string> tags, int n, List<BookmarkTag> allTags)
        {
            if (tags == null || tags.Count == 0) return string.Empty;
            var inner = string.Concat(tags.Take(n).Select(t => $"<span class=\"chip\" {BookmarkQuery.TagStyleAttr(t, allTags)}>{E(t)}</span>"));
            return $"<span class=\"tags\">{inner}</span>";
        }

        public static string RatingH(BookmarkCardData g) =>
            string.IsNullOrEmpty(g.Rating) ? string.Empty : $"<span class=\"rt\">★ {E(g.Rating)}</span>";

        public static string StChip(string s)
        {
            if (string.IsNullOrEmpty(s)) return string.Empty;
            var c = BookmarkQuery.StatusColors.TryGetValue(s, out var col) ? col : "#a5a199";
            return $"<span class=\"st\" style=\"--c:{c}\">{E(s)}</span>";
        }

        private static string TypoPoster(BookmarkCardData g) =>
            $"<div class=\"pp-typo\"><span>{E(g.Type)}</span><strong>{E(g.Title)}</strong></div>";

        private static string BookFb(BookmarkCardData g) =>
            $"<div class=\"bk-fb\"><div class=\"bk-fb-t\">{E(g.Title)}</div><div class=\"bk-fb-a\">{E(string.IsNullOrEmpty(g.Who) ? g.Type : g.Who)}</div></div>";

        public static string Render(BookmarkItem it, string tid, List<BookmarkTag> allTags)
        {
            var g = BookmarkCardData.From(it);
            return tid switch
            {
                "minimal" => Minimal(g, allTags),
                "minimalImage" => MinimalImage(g, allTags),
                "linkcard" => Linkcard(g, allTags),
                "post" => Post(g, allTags),
                "compact" => Compact(g, allTags),
                "poster" => Poster(g),
                "cinematic" => Cinematic(g),
                "hero" => Hero(g),
                "landscape" => Landscape(g),
                "photo" => string.IsNullOrEmpty(g.Img) ? Minimal(g, allTags) : Photo(g),
                "audio" => Audio(g, allTags),
                "thumbGrid" => string.IsNullOrEmpty(g.Img) ? Minimal(g, allTags) : ThumbGrid(g),
                "book" => Book(g),
                "reading" => Reading(g),
                "shelf" => Shelf(g),
                "note" => Note(g, allTags),
                "dev" => Dev(g, allTags),
                "file" => File(g, allTags),
                "horizontal" => Horizontal(g, allTags),
                "magazine" => Magazine(g, allTags),
                "detailed" => Detailed(g, allTags),
                "metadata" => Metadata(g, it, allTags),
                _ => Minimal(g, allTags),
            };
        }

        private static string Minimal(BookmarkCardData g, List<BookmarkTag> t) =>
            $"<div class=\"mn\"><div class=\"mn-t\">{E(g.Title)}</div>" +
            (string.IsNullOrEmpty(g.Desc) ? "" : $"<p class=\"mn-d\">{E(g.Desc)}</p>") +
            $"{Chips(g.Tags, 3, t)}</div>";

        private static string MinimalImage(BookmarkCardData g, List<BookmarkTag> t) =>
            $"<div>{(string.IsNullOrEmpty(g.Img) ? "" : $"<div class=\"mi-i\"><img src=\"{E(g.Img)}\" loading=\"lazy\" alt=\"\"></div>")}" +
            $"<div class=\"mi-b\"><div class=\"mi-t\">{E(g.Title)}</div><div class=\"mi-m\">{E(g.MetaLine)}</div>{Chips(g.Tags, 2, t)}</div></div>";

        private static string Linkcard(BookmarkCardData g, List<BookmarkTag> t) =>
            $"<div class=\"lk\"><div class=\"lk-ic\">" +
            (string.IsNullOrEmpty(g.Domain) ? BookmarkIcons.Svg("link", 16) : E(g.Domain[..1].ToUpperInvariant())) +
            $"</div><div class=\"lk-b\"><div class=\"lk-t\">{E(g.Title)}</div>" +
            (string.IsNullOrEmpty(g.Desc) ? "" : $"<div class=\"lk-d\">{E(g.Desc)}</div>") +
            (string.IsNullOrEmpty(g.Domain) ? "" : $"<div class=\"lk-u\">{BookmarkIcons.Svg("globe", 11)} {E(g.Domain)}</div>") +
            $"{Chips(g.Tags, 2, t)}</div>" +
            (string.IsNullOrEmpty(g.Img) ? "" : $"<img class=\"lk-th\" src=\"{E(g.Img)}\" alt=\"\">") + "</div>";

        private static string Post(BookmarkCardData g, List<BookmarkTag> t) =>
            $"<div class=\"pst\"><div class=\"pst-h\">{BookmarkIcons.Svg("globe", 12)}<b>{E(string.IsNullOrEmpty(g.Site) ? (string.IsNullOrEmpty(g.Domain) ? g.Type : g.Domain) : g.Site)}</b>" +
            (string.IsNullOrEmpty(g.Who) ? "" : $"<span>· {E(g.Who)}</span>") +
            $"<span class=\"ago\">{E(BookmarkCardData.FmtAgo(g.Item.CreatedAt))}</span></div>" +
            (string.IsNullOrEmpty(g.Title) ? "" : $"<div class=\"pst-t\">{E(g.Title)}</div>") +
            (string.IsNullOrEmpty(g.Desc) ? "" : $"<div class=\"pst-c\">{E(g.Desc)}</div>") +
            (string.IsNullOrEmpty(g.Img) ? "" : $"<div class=\"pst-im\"><img src=\"{E(g.Img)}\" loading=\"lazy\" alt=\"\"></div>") +
            $"<div class=\"pst-f\">{Chips(g.Tags, 3, t)}</div></div>";

        private static string Compact(BookmarkCardData g, List<BookmarkTag> t) =>
            $"<div class=\"cp\">" +
            (string.IsNullOrEmpty(g.Img) ? $"<span class=\"cp-ic\">{BookmarkIcons.Svg(g.Icon, 15)}</span>" : $"<img class=\"cp-i\" src=\"{E(g.Img)}\" alt=\"\">") +
            $"<span class=\"cp-t\">{E(g.Title)}</span><span class=\"cp-m\">{E(g.Type)}</span>{Chips(g.Tags, 2, t)}</div>";

        private static string Poster(BookmarkCardData g) =>
            $"<div><figure class=\"pp-img\">" +
            (string.IsNullOrEmpty(g.Img) ? TypoPoster(g) : $"<img src=\"{E(g.Img)}\" loading=\"lazy\" alt=\"\">") +
            $"</figure><div class=\"pp-b\"><div class=\"pp-t\">{E(g.Title)}</div><div class=\"pp-m\">" +
            string.Join("", new[] { string.IsNullOrEmpty(g.Year) ? "" : $"<span>{E(g.Year)}</span>", RatingH(g) }.Where(s => s != "")) +
            "</div></div></div>";

        private static string Cinematic(BookmarkCardData g) =>
            $"<div class=\"cn\">" +
            (string.IsNullOrEmpty(g.Img) ? $"<div class=\"cn-fb\"><span>{E(g.Type)}</span><strong>{E(g.Title)}</strong></div>" : $"<img src=\"{E(g.Img)}\" loading=\"lazy\" alt=\"\">") +
            $"<div class=\"cn-ov\"><div class=\"cn-t\">{E(g.Title)}</div><div class=\"cn-m\">{E(g.MetaLine)} {RatingH(g)}</div></div></div>";

        private static string Hero(BookmarkCardData g) =>
            $"<div class=\"cn imghero\">" +
            (string.IsNullOrEmpty(g.Img) ? $"<div class=\"cn-fb\"><span>{E(g.Type)}</span><strong>{E(g.Title)}</strong></div>" : $"<img src=\"{E(g.Img)}\" loading=\"lazy\" alt=\"\">") +
            $"<div class=\"cn-ov\"><div class=\"cn-t\">{E(g.Title)}</div><div class=\"cn-m\">{E(g.MetaLine)} {RatingH(g)}</div></div></div>";

        private static string Landscape(BookmarkCardData g) =>
            $"<div><div class=\"ls-im\">" +
            (string.IsNullOrEmpty(g.Img) ? "" : $"<img src=\"{E(g.Img)}\" loading=\"lazy\" alt=\"\">") +
            (string.IsNullOrEmpty(g.Dur) ? "" : $"<span class=\"ls-d\">{E(g.Dur)}</span>") +
            $"</div><div class=\"ls-b\"><div class=\"ls-t\">{E(g.Title)}</div><div class=\"ls-m\">{E(string.Join(" · ", new[] { g.Who, g.Site }.Where(s => !string.IsNullOrEmpty(s))))}</div></div></div>";

        private static string Photo(BookmarkCardData g) =>
            $"<div><div class=\"ph-i\"><img src=\"{E(g.Img)}\" loading=\"lazy\" alt=\"\"></div>" +
            $"<div class=\"ph-b\"><span class=\"ph-t\">{E(g.Title)}</span><span class=\"ph-m\">{E(string.IsNullOrEmpty(g.Domain) ? BookmarkCardData.FmtAgo(g.Item.CreatedAt) : g.Domain)}</span></div></div>";

        private static string Audio(BookmarkCardData g, List<BookmarkTag> t) =>
            $"<div><div class=\"au-h\"><span class=\"au-btn\">{BookmarkIcons.Svg("play", 13)}</span><span class=\"au-wv\">{BookmarkIcons.Wave(22)}</span>" +
            (string.IsNullOrEmpty(g.Dur) ? "" : $"<span class=\"au-d\">{E(g.Dur)}</span>") +
            $"</div><div class=\"au-b\"><div class=\"au-t\">{E(g.Title)}</div><div class=\"au-m\">{E(g.MetaLine)}</div>{Chips(g.Tags, 3, t)}</div></div>";

        private static string ThumbGrid(BookmarkCardData g) =>
            $"<div><div class=\"tg-i\"><img src=\"{E(g.Img)}\" loading=\"lazy\" alt=\"\"></div><div class=\"tg-t\">{E(g.Title)}</div></div>";

        private static string Book(BookmarkCardData g) =>
            $"<div><figure class=\"bk-c\">" +
            (string.IsNullOrEmpty(g.Img) ? BookFb(g) : $"<img src=\"{E(g.Img)}\" loading=\"lazy\" alt=\"\">") +
            $"</figure><div class=\"bk-b\"><div class=\"bk-t\">{E(g.Title)}</div><div class=\"bk-a\">{E(g.Who)}</div>" +
            (string.IsNullOrEmpty(RatingH(g)) ? "" : $"<div class=\"bk-r\">{RatingH(g)}</div>") + "</div></div>";

        private static string Reading(BookmarkCardData g)
        {
            var pageInfo = string.Empty;
            if (!string.IsNullOrEmpty(g.Pages) && int.TryParse(g.Pages, out var pg) && g.Progress.HasValue)
                pageInfo = $" · page {System.Math.Round(pg * g.Progress.Value / 100.0)} / {E(g.Pages)}";
            var prog = g.Progress.HasValue
                ? $"<div class=\"bar\"><i style=\"width:{g.Progress}%\"></i></div><div class=\"rd-p\">{g.Progress}%{pageInfo}</div>"
                : string.Empty;
            return $"<div class=\"rd\"><div class=\"rd-c\">" +
                (string.IsNullOrEmpty(g.Img) ? BookFb(g) : $"<img src=\"{E(g.Img)}\" alt=\"\">") +
                $"</div><div class=\"rd-b\"><div class=\"rd-t\">{E(g.Title)}</div><div class=\"rd-a\">{E(g.Who)}</div>{prog}" +
                (string.IsNullOrEmpty(g.Status) ? "" : $"<div style=\"margin-top:8px\">{StChip(g.Status)}</div>") + "</div></div>";
        }

        private static string Shelf(BookmarkCardData g) =>
            $"<div class=\"sh\"><div class=\"sh-c\">" +
            (string.IsNullOrEmpty(g.Img) ? BookFb(g) : $"<img src=\"{E(g.Img)}\" loading=\"lazy\" alt=\"\">") +
            $"</div><div class=\"sh-t\">{E(g.Title)}</div></div>";

        private static string Note(BookmarkCardData g, List<BookmarkTag> t) =>
            $"<div class=\"nt\"><div class=\"nt-h\">{BookmarkIcons.Svg("note", 13)}<span>{E(g.Type)} · {E(BookmarkCardData.FmtAgo(g.Item.CreatedAt))}</span></div>" +
            $"<div class=\"nt-t\">{E(g.Title)}</div><div class=\"nt-c\">{E(g.Desc ?? string.Empty)}</div><div class=\"nt-f\">{Chips(g.Tags, 3, t)}</div></div>";

        private static string Dev(BookmarkCardData g, List<BookmarkTag> t) =>
            $"<div class=\"dev\">" +
            (string.IsNullOrEmpty(g.Domain) ? "" : $"<div class=\"dev-u\">{BookmarkIcons.Svg("git", 12)}{E(g.Domain + (!string.IsNullOrEmpty(g.Who) && g.Domain.Contains("github") ? "/" + g.Who : string.Empty))}</div>") +
            $"<div class=\"dev-t\">{E(g.Title)}</div>" +
            (string.IsNullOrEmpty(g.Desc) ? "" : $"<p class=\"dev-d\">{E(g.Desc)}</p>") +
            $"<div class=\"dev-s\">" +
            (string.IsNullOrEmpty(g.Lang) ? "" : $"<span class=\"lg\"><span class=\"dot\"></span>{E(g.Lang)}</span>") +
            (string.IsNullOrEmpty(g.Stars) ? "" : $"<span>{BookmarkIcons.Svg("star", 11)} {E(g.Stars)}</span>") +
            (string.IsNullOrEmpty(g.Status) ? "" : StChip(g.Status)) + "</div>" +
            $"{Chips(g.Tags, 4, t)}</div>";

        private static string File(BookmarkCardData g, List<BookmarkTag> t) =>
            $"<div class=\"fl\"><div class=\"fl-ic\">{BookmarkIcons.Svg(g.Icon, 20)}</div><div class=\"fl-b\"><div class=\"fl-n\">{E(g.Title)}</div>" +
            $"<div class=\"fl-m\">{E(string.Join(" · ", new[] { g.Site, g.Type }.Where(s => !string.IsNullOrEmpty(s))))}</div>{Chips(g.Tags, 3, t)}</div></div>";

        private static string Horizontal(BookmarkCardData g, List<BookmarkTag> t) =>
            $"<div class=\"hz\"><div class=\"hz-im\">" +
            (string.IsNullOrEmpty(g.Img) ? BookmarkIcons.Svg(g.Icon, 18) : $"<img src=\"{E(g.Img)}\" alt=\"\">") +
            $"</div><div class=\"hz-b\"><div class=\"hz-t\">{E(g.Title)}</div><div class=\"hz-m\">{E(g.MetaLine)}</div>" +
            (string.IsNullOrEmpty(g.Desc) ? "" : $"<p class=\"hz-d\">{E(g.Desc)}</p>") + $"{Chips(g.Tags, 3, t)}</div></div>";

        private static string Magazine(BookmarkCardData g, List<BookmarkTag> t) =>
            $"<div class=\"mg\"><div class=\"mg-b\"><div class=\"mg-k\">{E(g.Type)}" +
            (string.IsNullOrEmpty(g.Who) ? "" : " · " + E(g.Who)) + (string.IsNullOrEmpty(g.Year) ? "" : " · " + E(g.Year)) + "</div>" +
            $"<div class=\"mg-t\">{E(g.Title)}</div>" +
            (string.IsNullOrEmpty(g.Desc) ? "" : $"<p class=\"mg-d\">{E(g.Desc)}</p>") + $"{Chips(g.Tags, 3, t)}</div>" +
            (string.IsNullOrEmpty(g.Img) ? "" : $"<div class=\"mg-i\"><img src=\"{E(g.Img)}\" loading=\"lazy\" alt=\"\"></div>") + "</div>";

        private static string Detailed(BookmarkCardData g, List<BookmarkTag> t) =>
            $"<div>" + (string.IsNullOrEmpty(g.Img) ? "" : $"<div class=\"dt-i\"><img src=\"{E(g.Img)}\" loading=\"lazy\" alt=\"\"></div>") +
            $"<div class=\"dt-b\"><div class=\"dt-t\">{E(g.Title)}</div><div class=\"dt-k\">{E(g.Type)} · {E(g.MetaLine)}</div>" +
            (string.IsNullOrEmpty(g.Desc) ? "" : $"<p class=\"dt-d\">{E(g.Desc)}</p>") +
            $"<div class=\"dt-f\">{RatingH(g)}" +
            (string.IsNullOrEmpty(g.Status) ? "" : StChip(g.Status)) +
            (g.Progress.HasValue ? $"<span class=\"bar w120\"><i style=\"width:{g.Progress}%\"></i></span>" : "") +
            string.Concat(g.Tags.Take(2).Select(x => $"<span class=\"chip\" {BookmarkQuery.TagStyleAttr(x, t)}>{E(x)}</span>")) +
            "</div></div></div>";

        private static string Metadata(BookmarkCardData g, BookmarkItem it, List<BookmarkTag> t)
        {
            var fields = TypeFields.TryGetValue(it.Type, out var f) ? f : new List<(string Key, string Label)>();
            var rows = string.Concat(fields
                .Where(fd => !string.IsNullOrEmpty(NodeText(g.Meta[fd.Key])))
                .Take(4)
                .Select(fd => $"<div class=\"mt-r\"><span class=\"mt-k\">{E(fd.Label)}</span><span class=\"mt-v\">{E(NodeText(g.Meta[fd.Key]))}</span></div>"));
            return $"<div class=\"mt\"><div class=\"mt-t\">{E(g.Title)}</div><div class=\"mt-g\">{rows}</div>{Chips(g.Tags, 3, t)}</div>";
        }

        // Table body cells only (the page renders <tr> to attach @onclick).
        public static string TableCells(BookmarkItem it, List<BookmarkTag> allTags)
        {
            var g = BookmarkCardData.From(it);
            return $"<td><span class=\"tt\">" +
                (string.IsNullOrEmpty(g.Img) ? "" : $"<img src=\"{E(g.Img)}\" alt=\"\">") + $"{E(it.Title)}</span></td>" +
                $"<td><span class=\"st\">{E(g.Type)}</span></td>" +
                $"<td class=\"mono\" style=\"font-size:12px;color:var(--ink2)\">{E(g.MetaLine)}</td>" +
                $"<td>{Chips(BookmarkQuery.TagsOf(it), 3, allTags)}</td><td>{RatingH(g)}</td>" +
                $"<td style=\"color:var(--ink3);font-size:12px\">{E(BookmarkCardData.FmtAgo(it.CreatedAt))}</td>";
        }

        // Port of embedFrame(): live embeds for social/video URLs, else null.
        public static string? EmbedHtml(string? url, string? domain)
        {
            if (string.IsNullOrWhiteSpace(url)) return null;
            var d = ((domain ?? BookmarkCardData.HostOf(url)) ?? string.Empty).ToLowerInvariant();
            System.Text.RegularExpressions.Match m;
            if ((m = System.Text.RegularExpressions.Regex.Match(url, @"(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})")).Success)
                return $"<iframe src=\"https://www.youtube-nocookie.com/embed/{m.Groups[1].Value}\" style=\"height:340px\" title=\"video\" loading=\"lazy\" allow=\"accelerometer;autoplay;encrypted-media;picture-in-picture;fullscreen\" allowfullscreen></iframe>";
            if ((m = System.Text.RegularExpressions.Regex.Match(url, @"vimeo\.com\/(?:video\/)?(\d+)")).Success)
                return $"<iframe src=\"https://player.vimeo.com/video/{m.Groups[1].Value}\" style=\"height:340px\" title=\"video\" loading=\"lazy\" allow=\"autoplay;fullscreen;picture-in-picture\" allowfullscreen></iframe>";
            if (d.Contains("twitter.com") || d == "x.com")
            {
                m = System.Text.RegularExpressions.Regex.Match(url, @"status\/(\d+)");
                if (m.Success)
                    return $"<iframe src=\"https://platform.twitter.com/embed/Tweet.html?id={m.Groups[1].Value}\" style=\"height:520px\" title=\"tweet\" loading=\"lazy\" allow=\"autoplay; encrypted-media\" referrerpolicy=\"no-referrer\"></iframe>";
                return null;
            }
            if ((m = System.Text.RegularExpressions.Regex.Match(url, @"tiktok\.com\/[^?]*\/(?:video|photo)\/(\d+)")).Success)
                return $"<iframe src=\"https://www.tiktok.com/embed/v2/{m.Groups[1].Value}\" style=\"height:580px\" title=\"tiktok\" loading=\"lazy\" allow=\"encrypted-media\" allowfullscreen></iframe>";
            if ((m = System.Text.RegularExpressions.Regex.Match(url, @"instagram\.com\/(p|reel|tv)\/([\w-]+)")).Success)
                return $"<iframe src=\"https://www.instagram.com/{m.Groups[1].Value}/{m.Groups[2].Value}/embed\" style=\"height:560px\" title=\"instagram post\" loading=\"lazy\" allow=\"encrypted-media\" allowfullscreen></iframe>";
            if (d.Contains("facebook.") || d.Contains("fb.watch"))
            {
                var isV = url.Contains("fb.watch") || System.Text.RegularExpressions.Regex.IsMatch(url, @"\/(watch|videos|reel)\/");
                var src = (isV ? "https://www.facebook.com/plugins/video.php?href=" : "https://www.facebook.com/plugins/post.php?href=")
                    + Uri.EscapeDataString(url) + "&show_text=true&width=552";
                return $"<iframe src=\"{src}\" style=\"height:{(isV ? 360 : 580)}px\" title=\"facebook post\" loading=\"lazy\" allow=\"autoplay; encrypted-media; picture-in-picture\" allowfullscreen></iframe>";
            }
            return null;
        }

        // Port of fval(): typed metadata value rendering for the drawer.
        public static string? MetaValue(string typeId, string key, System.Text.Json.Nodes.JsonNode? node)
        {
            if (node == null) return null;
            var v = node.ToString();
            if (string.IsNullOrEmpty(v)) return null;
            var t = BookmarkTypeSchema.For(typeId).FirstOrDefault(f => f.Key == key)?.Type ?? "text";
            return t switch
            {
                "url" => $"<a class=\"dlink\" href=\"{E(v)}\" target=\"_blank\" rel=\"noopener\">{E(v)}</a>",
                "rating" => $"<span class=\"rt\">★ {E(v)}</span>",
                "progress" => $"<span style=\"display:flex;align-items:center;gap:10px\"><span class=\"bar w120\"><i style=\"width:{E(v)}%\"></i></span><span class=\"pv\">{E(v)}%</span></span>",
                "boolean" => (ToBool(node) ? "Yes" : "No"),
                "image" => (v.StartsWith("http") || v.StartsWith("data:")) ? $"<img class=\"dimg\" src=\"{E(v)}\" alt=\"\">" : null,
                "file" => $"<span class=\"mono\" style=\"font-size:12px\">{E(v)}</span>",
                "select" => BookmarkQuery.StatusColors.ContainsKey(v) ? StChip(v) : $"<span class=\"st\">{E(v)}</span>",
                "date" => BookmarkCardData.FmtDate(System.DateTime.TryParse(v, out var dt) ? dt : System.DateTime.MinValue),
                _ => E(v),
            };
        }

        private static bool ToBool(System.Text.Json.Nodes.JsonNode node)
        {
            try { return node.GetValue<bool>(); }
            catch { return bool.TryParse(node.ToString(), out var b) && b; }
        }

        private static string NodeText(System.Text.Json.Nodes.JsonNode? node)
        {
            if (node == null) return string.Empty;
            try { return node.GetValue<string>(); } catch { return node.ToString(); }
        }

        // Port of md(): minimal markdown (bold, ## headings, - lists, paragraphs).
        public static string Md(string? s)
        {
            s = E(s ?? string.Empty);
            s = System.Text.RegularExpressions.Regex.Replace(s, @"\*\*(.+?)\*\*", "<b>$1</b>");
            var lines = s.Split('\n');
            var sb = new System.Text.StringBuilder();
            var list = false;
            foreach (var ln in lines)
            {
                if (ln.StartsWith("- "))
                {
                    if (!list) { sb.Append("<ul>"); list = true; }
                    sb.Append("<li>").Append(ln[2..]).Append("</li>");
                }
                else
                {
                    if (list) { sb.Append("</ul>"); list = false; }
                    if (ln.StartsWith("## ")) sb.Append("<h5>").Append(ln[3..]).Append("</h5>");
                    else if (ln.Trim().Length > 0) sb.Append("<p>").Append(ln).Append("</p>");
                }
            }
            if (list) sb.Append("</ul>");
            return sb.ToString();
        }
    }
}
