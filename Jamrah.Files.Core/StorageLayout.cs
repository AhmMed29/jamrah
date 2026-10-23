namespace Jamrah.Files.Core;

/// <summary>Resolves every app storage path from a single root folder.</summary>
public sealed class StorageLayout
{
    public string Root { get; }
    public string LibraryDir => Path.Combine(Root, "Library");
    public string BackupsDir => Path.Combine(Root, "Backups");
    public string ThumbsDir => Path.Combine(Root, "bookmark-thumbs");
    public string ArchiveDir => Path.Combine(Root, "Archive");
    public string ClipsDir => Path.Combine(Root, "clips");
    public string DbPath => Path.Combine(Root, "jamrah_bookmarks.db3");

    private StorageLayout(string root) => Root = root;

    public static StorageLayout FromRoot(string root) => new(root);

    public void EnsureDirectories()
    {
        Directory.CreateDirectory(Root);
        Directory.CreateDirectory(LibraryDir);
        Directory.CreateDirectory(BackupsDir);
        Directory.CreateDirectory(ThumbsDir);
        Directory.CreateDirectory(ArchiveDir);
        Directory.CreateDirectory(ClipsDir);
    }
}
