using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class StorageLayoutTests
{
    [Fact]
    public void FromRoot_ComposesAllPaths()
    {
        var root = Path.Combine(Path.GetTempPath(), "jamrah-test-root");
        var layout = StorageLayout.FromRoot(root);

        Assert.Equal(root, layout.Root);
        Assert.Equal(Path.Combine(root, "Library"), layout.LibraryDir);
        Assert.Equal(Path.Combine(root, "Backups"), layout.BackupsDir);
        Assert.Equal(Path.Combine(root, "bookmark-thumbs"), layout.ThumbsDir);
        Assert.Equal(Path.Combine(root, "Archive"), layout.ArchiveDir);
        Assert.Equal(Path.Combine(root, "clips"), layout.ClipsDir);
        Assert.Equal(Path.Combine(root, "jamrah_bookmarks.db3"), layout.DbPath);
    }

    [Fact]
    public void EnsureDirectories_CreatesAllAndIsIdempotent()
    {
        var root = Path.Combine(Path.GetTempPath(), "jamrah-test-" + Guid.NewGuid().ToString("N"));
        try
        {
            var layout = StorageLayout.FromRoot(root);
            layout.EnsureDirectories();
            layout.EnsureDirectories(); // second call must not throw
            Assert.True(Directory.Exists(layout.LibraryDir));
            Assert.True(Directory.Exists(layout.BackupsDir));
            Assert.True(Directory.Exists(layout.ThumbsDir));
            Assert.True(Directory.Exists(layout.ArchiveDir));
            Assert.True(Directory.Exists(layout.ClipsDir));
        }
        finally { try { Directory.Delete(root, true); } catch { } }
    }
}
