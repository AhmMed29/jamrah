using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class FolderImportPlannerTests
{
    private static string TempDir()
    {
        var d = Path.Combine(Path.GetTempPath(), "jamrah-folder-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(d);
        return d;
    }

    [Fact]
    public void Plan_includes_root_nested_empty_folders_and_files()
    {
        var baseDir = TempDir();
        try
        {
            var root = Path.Combine(baseDir, "Photos");
            Directory.CreateDirectory(Path.Combine(root, "empty"));
            Directory.CreateDirectory(Path.Combine(root, "sub"));
            File.WriteAllText(Path.Combine(root, "a.jpg"), "a");
            File.WriteAllText(Path.Combine(root, "sub", "b.jpg"), "b");

            var entries = FolderImportPlanner.Plan(root, Array.Empty<string>(),
                new HashSet<string>(StringComparer.OrdinalIgnoreCase));

            Assert.Contains(entries, e => e.IsDirectory && e.RelativePath == "Photos");
            Assert.Contains(entries, e => e.IsDirectory && e.RelativePath == "Photos/empty");
            Assert.Contains(entries, e => e.IsDirectory && e.RelativePath == "Photos/sub");
            Assert.Contains(entries, e => !e.IsDirectory && e.RelativePath == "Photos/a.jpg");
            Assert.Contains(entries, e => !e.IsDirectory && e.RelativePath == "Photos/sub/b.jpg");
        }
        finally { try { Directory.Delete(baseDir, true); } catch { } }
    }

    [Fact]
    public void Plan_uses_a_unique_root_name_when_the_destination_name_is_taken()
    {
        var baseDir = TempDir();
        try
        {
            var root = Path.Combine(baseDir, "Photos");
            Directory.CreateDirectory(root);
            File.WriteAllText(Path.Combine(root, "a.jpg"), "a");
            var existing = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "Photos" };

            var entries = FolderImportPlanner.Plan(root, Array.Empty<string>(), existing);

            Assert.Contains(entries, e => e.IsDirectory && e.RelativePath == "Photos (2)");
            Assert.Contains(entries, e => !e.IsDirectory && e.RelativePath == "Photos (2)/a.jpg");
        }
        finally { try { Directory.Delete(baseDir, true); } catch { } }
    }

    [Fact]
    public void Plan_places_the_new_folder_under_the_destination_chain()
    {
        var baseDir = TempDir();
        try
        {
            var root = Path.Combine(baseDir, "Photos");
            Directory.CreateDirectory(root);
            File.WriteAllText(Path.Combine(root, "a.jpg"), "a");

            var entries = FolderImportPlanner.Plan(
                root, new[] { "Personal", "Media" },
                new HashSet<string>(StringComparer.OrdinalIgnoreCase));

            Assert.Contains(entries, e => e.IsDirectory && e.RelativePath == "Personal/Media/Photos");
            Assert.Contains(entries, e => !e.IsDirectory && e.RelativePath == "Personal/Media/Photos/a.jpg");
        }
        finally { try { Directory.Delete(baseDir, true); } catch { } }
    }

    [Fact]
    public void Plan_preserves_arabic_names()
    {
        var baseDir = TempDir();
        try
        {
            var root = Path.Combine(baseDir, "مشروع");
            Directory.CreateDirectory(Path.Combine(root, "صور"));
            File.WriteAllText(Path.Combine(root, "صور", "صورة.jpg"), "x");

            var entries = FolderImportPlanner.Plan(root, Array.Empty<string>(),
                new HashSet<string>(StringComparer.OrdinalIgnoreCase));

            Assert.Contains(entries, e => e.IsDirectory && e.RelativePath == "مشروع/صور");
            Assert.Contains(entries, e => !e.IsDirectory && e.RelativePath == "مشروع/صور/صورة.jpg");
        }
        finally { try { Directory.Delete(baseDir, true); } catch { } }
    }

    [Fact]
    public void Plan_skips_an_excluded_library_subtree()
    {
        var baseDir = TempDir();
        try
        {
            var root = Path.Combine(baseDir, "Documents");
            var privateDir = Path.Combine(root, "Jamrah");
            Directory.CreateDirectory(privateDir);
            File.WriteAllText(Path.Combine(root, "keep.txt"), "keep");
            File.WriteAllText(Path.Combine(privateDir, "secret.txt"), "secret");

            var entries = FolderImportPlanner.Plan(
                root, Array.Empty<string>(),
                new HashSet<string>(StringComparer.OrdinalIgnoreCase),
                privateDir);

            Assert.Contains(entries, e => !e.IsDirectory && e.RelativePath == "Documents/keep.txt");
            Assert.DoesNotContain(entries, e => e.RelativePath.Contains("Jamrah", StringComparison.Ordinal));
            Assert.DoesNotContain(entries, e => e.RelativePath.Contains("secret.txt", StringComparison.Ordinal));
        }
        finally { try { Directory.Delete(baseDir, true); } catch { } }
    }

    [Fact]
    public void Plan_rejects_a_missing_root()
    {
        var missing = Path.Combine(Path.GetTempPath(), "jamrah-missing-" + Guid.NewGuid().ToString("N"));

        Assert.Throws<DirectoryNotFoundException>(() =>
            FolderImportPlanner.Plan(missing, Array.Empty<string>(),
                new HashSet<string>(StringComparer.OrdinalIgnoreCase)));
    }
}
