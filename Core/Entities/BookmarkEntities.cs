using System;
using SQLite;

namespace Jamrah.Core.Entities
{
    // Mirrors bookmark-design.html normDB()/seedDB() shape.
    // Flexible per-type fields live in MetadataJson; string lists as JSON arrays.

    [Table("BookmarkItems")]
    public class BookmarkItem
    {
        [PrimaryKey]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Indexed]
        public string Type { get; set; } = "link";

        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public string Thumb { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;

        public string TagsJson { get; set; } = "[]";
        public string FolderIdsJson { get; set; } = "[]";
        public string CollectionIdsJson { get; set; } = "[]";
        public string RelationsJson { get; set; } = "[]";
        public string SessionsJson { get; set; } = "[]";
        public string MetadataJson { get; set; } = "{}";
        public string? Tpl { get; set; }

        [Indexed] public bool Favorite { get; set; }
        [Indexed] public bool Pinned { get; set; }
        [Indexed] public bool Archived { get; set; }
        [Indexed] public bool Deleted { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime LastOpenedAt { get; set; } = DateTime.MinValue;
    }

    [Table("BookmarkFolders")]
    public class BookmarkFolder
    {
        [PrimaryKey]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public bool IsOpen { get; set; } = true;
        public string? CollectionId { get; set; }
        public string? ParentId { get; set; }
    }

    [Table("BookmarkCollections")]
    public class BookmarkCollection
    {
        [PrimaryKey]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public string? SmartJson { get; set; }
    }

    [Table("BookmarkTags")]
    public class BookmarkTag
    {
        [PrimaryKey]
        public string Name { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
    }

    [Table("BookmarkCustomTypes")]
    public class BookmarkCustomType
    {
        [PrimaryKey]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } = string.Empty;
        public string FieldsJson { get; set; } = "[]";
    }

    [Table("BookmarkTemplates")]
    public class BookmarkTemplate
    {
        [PrimaryKey]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } = string.Empty;
        public string Cat { get; set; } = "Custom";
        public string ConfigJson { get; set; } = "{}";
    }

    [Table("BookmarkQuranKhatms")]
    public class BookmarkQuranKhatm
    {
        [PrimaryKey]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public DateTime StartedAt { get; set; } = DateTime.UtcNow;
        public int Page { get; set; } = 1;
    }

    [Table("BookmarkQuranLogs")]
    public class BookmarkQuranLog
    {
        [PrimaryKey]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string KhatmId { get; set; } = string.Empty;
        public DateTime At { get; set; } = DateTime.UtcNow;
        public int FromPage { get; set; }
        public int ToPage { get; set; }
    }

    [Table("BookmarkClips")]
    public class BookmarkClip
    {
        [PrimaryKey]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Text { get; set; } = string.Empty;
        public DateTime At { get; set; } = DateTime.UtcNow;
        public bool Pinned { get; set; }
    }

    [Table("BookmarkViewStates")]
    public class BookmarkViewState
    {
        [PrimaryKey]
        public string Key { get; set; } = string.Empty;
        public string View { get; set; } = "grid";
        public string? Sort { get; set; }
    }

    public class BookmarkBackup
    {
        public List<BookmarkItem> Items { get; set; } = new();
        public List<BookmarkFolder> Folders { get; set; } = new();
        public List<BookmarkCollection> Collections { get; set; } = new();
        public List<BookmarkTag> Tags { get; set; } = new();
        public List<BookmarkCustomType> CustomTypes { get; set; } = new();
        public List<BookmarkTemplate> CustomTemplates { get; set; } = new();
        public List<BookmarkViewState> ViewStates { get; set; } = new();
        public List<BookmarkQuranKhatm> Khatms { get; set; } = new();
        public List<BookmarkQuranLog> Logs { get; set; } = new();
        public List<BookmarkClip> Clipboard { get; set; } = new();
    }
}
