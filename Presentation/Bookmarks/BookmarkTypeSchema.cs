using System.Collections.Generic;

namespace Jamrah.Presentation.Bookmarks
{
    // Port of BUILTIN type field definitions (lines 782-819) for forms + drawer metadata rows.
    public record BookmarkFieldDef(string Key, string Label, string Type, string[]? Opts = null, bool Required = false);

    public static class BookmarkTypeSchema
    {
        public static readonly string[] Langs = new[]
        {
            "JavaScript", "TypeScript", "Python", "C#", "Go", "Rust", "Java", "C", "C++", "Ruby", "Elixir", "Swift"
        };

        public static readonly Dictionary<string, string> Cats = new()
        {
            ["link"] = "Web", ["post"] = "Web", ["website"] = "Web", ["article"] = "Web",
            ["documentation"] = "Web", ["tool"] = "Web", ["video"] = "Media", ["image"] = "Media",
            ["movie"] = "Media", ["tvshow"] = "Media", ["anime"] = "Media", ["podcast"] = "Media",
            ["music"] = "Media", ["book"] = "Reading", ["ebook"] = "Reading", ["research"] = "Reading",
            ["repo"] = "Development", ["snippet"] = "Development", ["library"] = "Development",
            ["api"] = "Development", ["course"] = "Development", ["game"] = "Entertainment",
            ["pdf"] = "Files", ["document"] = "Files", ["audio"] = "Files", ["file"] = "Files",
            ["note"] = "Personal", ["idea"] = "Personal", ["project"] = "Personal", ["reference"] = "Personal",
        };

        public static readonly string[] CatOrder = new[] { "Web", "Media", "Reading", "Development", "Files", "Personal", "Entertainment", "Custom" };
        public static readonly string[] Quick = new[] { "link", "post", "video", "image", "book", "movie", "note", "file", "repo" };

        private static BookmarkFieldDef F(string k, string l, string t, bool req = false) => new(k, l, t, null, req);
        private static BookmarkFieldDef Sel(string k, string l, string[] opts) => new(k, l, "select", opts);

        private static readonly List<BookmarkFieldDef> BookF = new()
        {
            F("author", "Author", "text"), F("publisher", "Publisher", "text"), F("year", "Year", "number"),
            F("isbn", "ISBN", "text"), F("pages", "Pages", "number"),
            Sel("status", "Status", new[] { "Unread", "Reading", "Finished", "Abandoned" }),
            F("progress", "Progress", "progress"), F("rating", "Rating", "rating"), F("cover", "Cover", "image"),
        };

        private static readonly List<BookmarkFieldDef> TvF = new()
        {
            F("year", "Year", "number"), F("seasons", "Seasons", "number"), F("creator", "Creator", "text"),
            Sel("status", "Status", new[] { "Airing", "Ended", "Upcoming" }),
            F("rating", "Rating", "rating"), F("poster", "Poster", "image"),
        };

        public static readonly Dictionary<string, List<BookmarkFieldDef>> Fields = new()
        {
            ["link"] = new() { F("url", "URL", "url", true), F("site", "Site", "text") },
            ["post"] = new() { F("author", "Author", "text"), F("platform", "Platform", "text"), F("date", "Posted", "date") },
            ["website"] = new() { F("url", "URL", "url", true), F("site", "Site", "text") },
            ["article"] = new() { F("url", "URL", "url", true), F("author", "Author", "text"), F("source", "Source", "text"), F("date", "Published", "date") },
            ["documentation"] = new() { F("url", "URL", "url", true), F("source", "Maintainer", "text") },
            ["tool"] = new() { F("url", "URL", "url", true), F("platform", "Platform", "text") },
            ["video"] = new() { F("url", "URL", "url", true), F("channel", "Channel", "text"), F("duration", "Duration (min)", "number") },
            ["image"] = new() { F("file", "Image", "file"), F("source", "Source", "url") },
            ["movie"] = new()
            {
                F("year", "Year", "number"), F("genres", "Genres", "text"), F("director", "Director", "text"),
                F("duration", "Runtime (min)", "number"), F("rating", "Rating", "rating"), F("cover", "Cover", "image"),
            },
            ["tvshow"] = TvF, ["anime"] = TvF,
            ["podcast"] = new() { F("url", "URL", "url", true), F("host", "Host", "text"), Sel("status", "Status", new[] { "Airing", "Ended" }) },
            ["music"] = new() { F("artist", "Artist", "text"), F("year", "Year", "number"), F("url", "URL", "url"), F("rating", "Rating", "rating") },
            ["book"] = BookF,
            ["ebook"] = new List<BookmarkFieldDef>(BookF) { F("url", "URL", "url") },
            ["research"] = new() { F("authors", "Authors", "text"), F("year", "Year", "number"), F("venue", "Venue", "text"), F("url", "URL", "url") },
            ["repo"] = new() { F("url", "URL", "url", true), F("owner", "Owner", "text"), Sel("language", "Language", Langs), F("stars", "Stars", "number"), Sel("status", "Status", new[] { "Active", "Archived" }) },
            ["snippet"] = new() { Sel("language", "Language", Langs), F("url", "URL", "url"), F("content", "Code", "longtext") },
            ["library"] = new() { F("url", "URL", "url", true), F("language", "Language", "text") },
            ["api"] = new() { F("url", "URL", "url", true), Sel("pricing", "Pricing", new[] { "Free", "Freemium", "Paid" }) },
            ["course"] = new()
            {
                F("url", "URL", "url", true), F("platform", "Platform", "text"), F("instructor", "Instructor", "text"),
                F("duration", "Duration (min)", "number"), F("progress", "Progress", "progress"),
                Sel("status", "Status", new[] { "Not started", "In progress", "Completed" }),
            },
            ["game"] = new()
            {
                Sel("platform", "Platform", new[] { "PC", "PlayStation", "Xbox", "Switch", "Mobile" }),
                F("year", "Year", "number"), F("genre", "Genre", "text"),
                Sel("status", "Status", new[] { "Backlog", "Playing", "Finished" }),
                F("rating", "Rating", "rating"), F("poster", "Poster", "image"),
            },
            ["pdf"] = new() { F("file", "PDF file", "file"), F("pages", "Pages", "number"), F("author", "Author", "text") },
            ["document"] = new() { F("file", "Document", "file"), F("author", "Author", "text") },
            ["audio"] = new() { F("file", "Audio", "file") },
            ["file"] = new() { F("file", "File", "file") },
            ["note"] = new() { F("content", "Content", "longtext", true) },
            ["idea"] = new() { F("content", "Content", "longtext", true) },
            ["project"] = new() { F("url", "URL", "url"), Sel("status", "Status", new[] { "Planned", "Active", "Paused", "Done" }) },
            ["reference"] = new() { F("url", "URL", "url", true), F("source", "Source", "text") },
        };

        public static List<BookmarkFieldDef> For(string typeId) =>
            Fields.TryGetValue(typeId, out var f) ? f : new List<BookmarkFieldDef>();

        public static List<string> TplOrder(string type)
        {
            var ids = new List<string>
            {
                BookmarkQuery.TypeTpl.TryGetValue(type, out var first) ? first : "detailed",
                "minimal", "detailed", "horizontal", "note", "linkcard", "post", "photo", "landscape",
                "audio", "poster", "book", "magazine", "minimalImage", "compact", "dev", "file",
                "reading", "cinematic", "hero", "shelf", "thumbGrid", "metadata",
            };
            var seen = new HashSet<string>();
            var refer = new List<string>();
            foreach (var id in ids)
                if (seen.Add(id)) refer.Add(id);
            return refer;
        }
    }
}
