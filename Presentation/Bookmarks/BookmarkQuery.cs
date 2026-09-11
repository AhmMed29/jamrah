using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Jamrah.Application.Services;
using Jamrah.Core.Entities;

namespace Jamrah.Presentation.Bookmarks
{
    // Port of the QUERY section (types, TYPE_TPL, baseItems, parseQuery, SORTS) from bookmark-design.html.
    public static class BookmarkQuery
    {
        public static readonly Dictionary<string, (string Name, string Icon)> Types = new()
        {
            ["link"] = ("Link", "link"), ["post"] = ("Post", "link"), ["website"] = ("Website", "globe"),
            ["article"] = ("Article", "filetext"), ["documentation"] = ("Documentation", "bookopen"),
            ["tool"] = ("Tool", "tool"), ["video"] = ("Video", "play"), ["image"] = ("Image", "image"),
            ["movie"] = ("Movie", "film"), ["tvshow"] = ("TV Show", "tv"), ["anime"] = ("Anime", "tv"),
            ["podcast"] = ("Podcast", "podcast"), ["music"] = ("Music", "music"), ["book"] = ("Book", "bookopen"),
            ["ebook"] = ("E-book", "bookopen"), ["research"] = ("Research Paper", "filetext"),
            ["repo"] = ("Repository", "git"), ["snippet"] = ("Code Snippet", "code"), ["library"] = ("Library", "layers"),
            ["api"] = ("API", "api"), ["course"] = ("Course", "graduation"), ["game"] = ("Game", "gamepad"),
            ["pdf"] = ("PDF", "file"), ["document"] = ("Document", "file"), ["audio"] = ("Audio", "music"),
            ["file"] = ("File", "file"), ["note"] = ("Note", "note"), ["idea"] = ("Idea", "bulb"),
            ["project"] = ("Project", "layers"), ["reference"] = ("Reference", "info"),
        };

        public static string TypeName(string id) => Types.TryGetValue(id, out var t) ? t.Name : id;
        public static string TypeIcon(string id) => Types.TryGetValue(id, out var t) ? t.Icon : "note";

        public static readonly Dictionary<string, string> TypeTpl = new()
        {
            ["link"] = "linkcard", ["post"] = "post", ["website"] = "linkcard", ["article"] = "magazine",
            ["documentation"] = "linkcard", ["tool"] = "linkcard", ["video"] = "landscape", ["image"] = "photo",
            ["movie"] = "poster", ["tvshow"] = "poster", ["anime"] = "poster", ["game"] = "poster",
            ["podcast"] = "landscape", ["music"] = "audio", ["book"] = "book", ["ebook"] = "book",
            ["research"] = "magazine", ["repo"] = "dev", ["snippet"] = "dev", ["library"] = "dev",
            ["api"] = "dev", ["course"] = "landscape", ["pdf"] = "file", ["document"] = "file",
            ["audio"] = "audio", ["file"] = "file", ["note"] = "note", ["idea"] = "note",
            ["project"] = "detailed", ["reference"] = "linkcard",
        };

        public static string CardTplFor(BookmarkItem it, string view)
        {
            if (!string.IsNullOrEmpty(it.Tpl)) return it.Tpl;
            if (view == "list" || view == "timeline")
                return (it.Type == "note" || it.Type == "idea") ? "note" : "horizontal";
            return TypeTpl.TryGetValue(it.Type, out var t) ? t : "detailed";
        }

        public static readonly Dictionary<string, string> SortNames = new()
        {
            ["added"] = "Recently added", ["updated"] = "Recently updated", ["opened"] = "Recently opened",
            ["title"] = "Alphabetical", ["rating"] = "Rating", ["progress"] = "Progress",
        };

        public static string DefaultSort(string ctx) => ctx == "recent" ? "opened" : "added";

        private static double MetaNumber(BookmarkItem it, string key)
        {
            try
            {
                var m = JsonNode.Parse(string.IsNullOrWhiteSpace(it.MetadataJson) ? "{}" : it.MetadataJson) as JsonObject;
                return m?[key]?.GetValue<double>() ?? 0;
            }
            catch { return 0; }
        }

        public static List<string> TagsOf(BookmarkItem it)
        {
            try { return System.Text.Json.JsonSerializer.Deserialize<List<string>>(string.IsNullOrWhiteSpace(it.TagsJson) ? "[]" : it.TagsJson) ?? new List<string>(); }
            catch { return new List<string>(); }
        }

        public static List<string> FoldersOf(BookmarkItem it)
        {
            try { return System.Text.Json.JsonSerializer.Deserialize<List<string>>(string.IsNullOrWhiteSpace(it.FolderIdsJson) ? "[]" : it.FolderIdsJson) ?? new List<string>(); }
            catch { return new List<string>(); }
        }

        public static List<string> CollectionsOf(BookmarkItem it)
        {
            try { return System.Text.Json.JsonSerializer.Deserialize<List<string>>(string.IsNullOrWhiteSpace(it.CollectionIdsJson) ? "[]" : it.CollectionIdsJson) ?? new List<string>(); }
            catch { return new List<string>(); }
        }

        public static List<string> RelationsOf(BookmarkItem it)
        {
            try { return System.Text.Json.JsonSerializer.Deserialize<List<string>>(string.IsNullOrWhiteSpace(it.RelationsJson) ? "[]" : it.RelationsJson) ?? new List<string>(); }
            catch { return new List<string>(); }
        }

        public static bool SmartMatch(JsonObject? smart, BookmarkItem it)
        {
            if (smart == null) return false;
            var types = smart["types"]?.AsArray().Select(x => x?.ToString() ?? string.Empty).ToList() ?? new List<string>();
            var tags = smart["tags"]?.AsArray().Select(x => x?.ToString() ?? string.Empty).ToList() ?? new List<string>();
            var favOnly = smart["favorite"]?.GetValue<bool>() ?? false;
            if (types.Count > 0 && !types.Contains(it.Type)) return false;
            if (tags.Count > 0)
            {
                var mine = TagsOf(it);
                if (!tags.All(t => mine.Contains(t))) return false;
            }
            if (favOnly && !it.Favorite) return false;
            return !it.Deleted && !it.Archived;
        }

        public static JsonObject? ParseSmart(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return null;
            try { return JsonNode.Parse(json) as JsonObject; } catch { return null; }
        }

        private static HashSet<string> CollectionFolderIds(string cid, List<BookmarkFolder> folders)
        {
            var ids = new HashSet<string>();
            void Add(BookmarkFolder fd)
            {
                ids.Add(fd.Id);
                foreach (var kid in folders.Where(x => x.ParentId == fd.Id)) Add(kid);
            }
            foreach (var fd in folders.Where(fd => fd.CollectionId == cid && string.IsNullOrEmpty(fd.ParentId))) Add(fd);
            return ids;
        }

        public static List<BookmarkItem> ItemsInCollection(string cid, BookmarkStateService s)
        {
            var fids = CollectionFolderIds(cid, s.Folders);
            return s.Items.Where(i => !i.Deleted && !i.Archived &&
                (CollectionsOf(i).Contains(cid) || FoldersOf(i).Any(x => fids.Contains(x)))).ToList();
        }

        public static List<BookmarkItem> BaseItems(BookmarkRoute r, BookmarkStateService s)
        {
            var a = s.Items;
            return r.Ctx switch
            {
                "all" => a.Where(i => !i.Deleted && !i.Archived).ToList(),
                "favorites" => a.Where(i => !i.Deleted && !i.Archived && i.Favorite).ToList(),
                "pinned" => a.Where(i => !i.Deleted && !i.Archived && i.Pinned).ToList(),
                "recent" => a.Where(i => !i.Deleted && !i.Archived && i.LastOpenedAt != DateTime.MinValue).ToList(),
                "folder" => a.Where(i => !i.Deleted && !i.Archived && FoldersOf(i).Contains(r.Id ?? "")).ToList(),
                "collection" => CollectionItems(r.Id, s),
                "tag" => a.Where(i => !i.Deleted && !i.Archived && TagsOf(i).Contains(r.Tag ?? "")).ToList(),
                "archive" => a.Where(i => i.Archived && !i.Deleted).ToList(),
                "trash" => a.Where(i => i.Deleted).ToList(),
                _ => a.Where(i => !i.Deleted && !i.Archived).ToList(),
            };
        }

        private static List<BookmarkItem> CollectionItems(string? id, BookmarkStateService s)
        {
            var c = s.Collections.FirstOrDefault(c => c.Id == id);
            if (c == null) return new List<BookmarkItem>();
            var smart = ParseSmart(c.SmartJson);
            return smart != null
                ? s.Items.Where(i => SmartMatch(smart, i)).ToList()
                : ItemsInCollection(c.Id, s);
        }

        public class ParsedQuery
        {
            public string Text = string.Empty;
            public string? Type; public string? Tag; public string? Author;
            public bool Fav; public bool Pin; public string? Year;
        }

        public static ParsedQuery ParseQuery(string s)
        {
            var q = new ParsedQuery();
            var rest = " " + s + " ";
            foreach (Match m in Regex.Matches(" " + s + " ", "\\s(\\w+):(?:\"([^\"]+)\"|([^\\s\"]+))"))
            {
                var k = m.Groups[1].Value.ToLowerInvariant();
                var v = (m.Groups[2].Success ? m.Groups[2].Value : m.Groups[3].Value).Trim();
                if (k is "type" or "tag" or "author" or "favorite" or "fav" or "pinned" or "pin" or "year")
                {
                    rest = rest.Replace(m.Value, " ");
                    if (k == "type") q.Type = v.ToLowerInvariant();
                    else if (k == "tag") q.Tag = v.ToLowerInvariant();
                    else if (k == "author") q.Author = v.ToLowerInvariant();
                    else if (k is "fav" or "favorite") q.Fav = v.ToLowerInvariant() == "true";
                    else if (k is "pinned" or "pin") q.Pin = v.ToLowerInvariant() == "true";
                    else if (k == "year") q.Year = v;
                }
            }
            q.Text = Regex.Replace(rest, "\\s+", " ").Trim().ToLowerInvariant();
            return q;
        }

        public static bool MatchQuery(BookmarkItem it, ParsedQuery q, BookmarkCardData? g = null)
        {
            g ??= BookmarkCardData.From(it);
            if (q.Type != null && !(it.Type == q.Type || TypeName(it.Type).ToLowerInvariant() == q.Type)) return false;
            if (q.Tag != null && !TagsOf(it).Any(t => t.ToLowerInvariant() == q.Tag)) return false;
            if (q.Fav && !it.Favorite) return false;
            if (q.Pin && !it.Pinned) return false;
            if (q.Year != null && g.Year != q.Year) return false;
            if (q.Author != null && !g.Who.ToLowerInvariant().Contains(q.Author)) return false;
            if (!string.IsNullOrEmpty(q.Text))
            {
                var metaVals = g.Meta.Where(kv => kv.Value is not JsonObject).Select(kv => kv.Value?.ToString() ?? string.Empty);
                var hay = string.Join(" ", new[] { it.Title, it.Description, it.Notes, it.Url }.Concat(TagsOf(it)).Concat(metaVals)).ToLowerInvariant();
                if (!hay.Contains(q.Text)) return false;
            }
            return true;
        }

        public static bool MatchFilters(BookmarkItem it, BookmarkFilters f, BookmarkCardData? g = null)
        {
            g ??= BookmarkCardData.From(it);
            if (f.Types.Count > 0 && !f.Types.Contains(it.Type)) return false;
            if (f.Tags.Count > 0)
            {
                var mine = TagsOf(it);
                if (!f.Tags.All(t => mine.Contains(t))) return false;
            }
            if (f.Fav && !it.Favorite) return false;
            if (f.Pin && !it.Pinned) return false;
            if (f.Rating > 0)
            {
                if (!double.TryParse(g.Rating, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var r) || r < f.Rating) return false;
            }
            if (!string.IsNullOrEmpty(f.Status) && g.Status != f.Status) return false;
            return true;
        }

        public static List<BookmarkItem> RouteItems(BookmarkStateService s)
        {
            var items = BaseItems(s.Route, s).Where(i => MatchFilters(i, s.Filters)).ToList();
            if (!string.IsNullOrWhiteSpace(s.Search))
            {
                var q = ParseQuery(s.Search);
                items = items.Where(i => MatchQuery(i, q)).ToList();
            }
            return items;
        }

        public static void ApplySort(List<BookmarkItem> items, string? sort)
        {
            Comparison<BookmarkItem> cmp = sort switch
            {
                "updated" => (a, b) => b.UpdatedAt.CompareTo(a.UpdatedAt),
                "opened" => (a, b) => b.LastOpenedAt.CompareTo(a.LastOpenedAt),
                "title" => (a, b) => string.Compare(a.Title, b.Title, StringComparison.CurrentCulture),
                "rating" => (a, b) => MetaNumber(b, "rating").CompareTo(MetaNumber(a, "rating")),
                "progress" => (a, b) => MetaNumber(b, "progress").CompareTo(MetaNumber(a, "progress")),
                _ => (a, b) => b.CreatedAt.CompareTo(a.CreatedAt),
            };
            items.Sort(cmp);
        }

        public static readonly Dictionary<string, string> StatusColors = new()
        {
            ["Reading"] = "#4d7c0f", ["Finished"] = "#8a8580", ["Watching"] = "#1d4ed8", ["Playing"] = "#1d4ed8",
            ["In progress"] = "#1d4ed8", ["Active"] = "#0f766e", ["Airing"] = "#0f766e", ["Completed"] = "#4d7c0f",
            ["Not started"] = "#a5a199", ["Backlog"] = "#a5a199", ["Planned"] = "#a5a199", ["Unread"] = "#a5a199",
            ["Abandoned"] = "#b91c1c", ["Archived"] = "#a5a199", ["Ended"] = "#8a8580", ["Upcoming"] = "#b45309",
            ["Paused"] = "#a5a199", ["Done"] = "#4d7c0f",
        };

        public static string TagStyleAttr(string name, List<BookmarkTag> tags)
        {
            var t = tags.FirstOrDefault(t => t.Name == name);
            return t != null && !string.IsNullOrEmpty(t.Color)
                ? $"style=\"background:{t.Color}16;color:{t.Color}\""
                : string.Empty;
        }

        public static string TitleFor(BookmarkRoute r, BookmarkStateService s) => r.Ctx switch
        {
            "home" => "Home", "all" => "All Items", "quran" => "Quran", "clipboard" => "Clipboard",
            "favorites" => "Favorites", "pinned" => "Pinned", "recent" => "Recently Opened",
            "archive" => "Archive", "trash" => "Trash", "tags" => "Tags", "templates" => "Templates",
            "folder" => s.Folders.FirstOrDefault(f => f.Id == r.Id)?.Name ?? "Folder",
            "collection" => s.Collections.FirstOrDefault(c => c.Id == r.Id)?.Name ?? "Collection",
            "tag" => "#" + r.Tag,
            _ => "Library",
        };

        public static int CountFolder(string id, BookmarkStateService s) =>
            s.Items.Count(i => !i.Deleted && !i.Archived && FoldersOf(i).Contains(id));

        public static int CountCollection(BookmarkCollection c, BookmarkStateService s)
        {
            var smart = ParseSmart(c.SmartJson);
            return smart != null
                ? s.Items.Count(i => SmartMatch(smart, i))
                : ItemsInCollection(c.Id, s).Count;
        }

        public static int TagCount(string t, BookmarkStateService s) =>
            s.Items.Count(i => !i.Deleted && TagsOf(i).Contains(t));

        public static string Enc(string? s) => WebUtility.HtmlEncode(s ?? string.Empty);
    }
}
