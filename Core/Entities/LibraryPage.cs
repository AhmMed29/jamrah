using System;
using SQLite;

namespace Jamrah.Core.Entities
{
    // ADDITIVE (new): Page = container like a folder (name + icon).
    // A page can live directly under a collection, inside a folder,
    // or nested under another page. It holds saved items + sub-pages.
    // NOTE: named LibraryPage to avoid clashing with the existing
    // Jamrah.Presentation.Bookmarks.BookmarkPage Blazor component.
    [Table("BookmarkPages")]
    public class LibraryPage
    {
        [PrimaryKey]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public bool IsOpen { get; set; } = true;
        public bool IsArchived { get; set; } = false;
        public string? CollectionId { get; set; }
        public string? FolderId { get; set; }
        public string? ParentPageId { get; set; }
        public int SortOrder { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
