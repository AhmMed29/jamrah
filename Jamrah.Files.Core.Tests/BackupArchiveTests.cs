using System.IO.Compression;
using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class BackupArchiveTests
{
    [Fact]
    public async Task Create_ContainsDbAndLibraryFiles()
    {
        var dir = Path.Combine(Path.GetTempPath(), "jamrah-bak-" + Guid.NewGuid().ToString("N"));
        var lib = Path.Combine(dir, "Library");
        Directory.CreateDirectory(Path.Combine(lib, "Personal"));
        await File.WriteAllTextAsync(Path.Combine(dir, "jamrah_bookmarks.db3"), "db");
        await File.WriteAllTextAsync(Path.Combine(lib, "Personal", "a.txt"), "hello");
        var zip = Path.Combine(dir, "out.zip");
        try
        {
            await BackupArchive.CreateAsync(lib, Path.Combine(dir, "jamrah_bookmarks.db3"), zip);

            using var archive = ZipFile.OpenRead(zip);
            var names = archive.Entries.Select(e => e.FullName).ToList();
            Assert.Contains("jamrah_bookmarks.db3", names);
            Assert.Contains("Library/Personal/a.txt", names);
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public async Task Create_MissingDb_StillSucceeds()
    {
        var dir = Path.Combine(Path.GetTempPath(), "jamrah-bak-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(dir, "Library"));
        var zip = Path.Combine(dir, "out.zip");
        try
        {
            await BackupArchive.CreateAsync(Path.Combine(dir, "Library"), Path.Combine(dir, "nope.db3"), zip);
            Assert.True(File.Exists(zip));
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public async Task Create_OverwritesExistingZip()
    {
        var dir = Path.Combine(Path.GetTempPath(), "jamrah-bak-" + Guid.NewGuid().ToString("N"));
        var lib = Path.Combine(dir, "Library");
        Directory.CreateDirectory(lib);
        await File.WriteAllTextAsync(Path.Combine(dir, "jamrah_bookmarks.db3"), "db");
        var zip = Path.Combine(dir, "out.zip");
        await File.WriteAllBytesAsync(zip, new byte[] { 1, 2, 3, 4 });
        try
        {
            await BackupArchive.CreateAsync(lib, Path.Combine(dir, "jamrah_bookmarks.db3"), zip);

            using var archive = ZipFile.OpenRead(zip);
            Assert.Contains("jamrah_bookmarks.db3", archive.Entries.Select(e => e.FullName));
            Assert.False(File.Exists(zip + ".tmp"));
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public async Task Create_LockedLibraryFile_LeavesNoPartialDest()
    {
        var dir = Path.Combine(Path.GetTempPath(), "jamrah-bak-" + Guid.NewGuid().ToString("N"));
        var lib = Path.Combine(dir, "Library");
        Directory.CreateDirectory(lib);
        var locked = Path.Combine(lib, "locked.bin");
        await File.WriteAllTextAsync(locked, "x");
        var zip = Path.Combine(dir, "out.zip");
        await File.WriteAllBytesAsync(zip, new byte[] { 9 });
        try
        {
            using (new FileStream(locked, FileMode.Open, FileAccess.Read, FileShare.None))
            {
                await Assert.ThrowsAnyAsync<IOException>(() =>
                    BackupArchive.CreateAsync(lib, Path.Combine(dir, "nope.db3"), zip));
            }

            Assert.Equal(new byte[] { 9 }, await File.ReadAllBytesAsync(zip));
            Assert.False(File.Exists(zip + ".tmp"));
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public async Task Create_PreCanceledToken_LeavesDestUntouched_AndRemovesStaleTemp()
    {
        var dir = Path.Combine(Path.GetTempPath(), "jamrah-bak-" + Guid.NewGuid().ToString("N"));
        var lib = Path.Combine(dir, "Library");
        Directory.CreateDirectory(lib);
        var zip = Path.Combine(dir, "out.zip");
        await File.WriteAllBytesAsync(zip, new byte[] { 7, 7, 7 });
        await File.WriteAllTextAsync(zip + ".tmp", "stale");
        try
        {
            using var cts = new CancellationTokenSource();
            cts.Cancel();

            await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
                BackupArchive.CreateAsync(lib, Path.Combine(dir, "nope.db3"), zip, cts.Token));

            Assert.Equal(new byte[] { 7, 7, 7 }, await File.ReadAllBytesAsync(zip));
            Assert.False(File.Exists(zip + ".tmp"));
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public async Task Create_CancelMidCopy_LeavesDestUntouched_AndRemovesTemp()
    {
        var dir = Path.Combine(Path.GetTempPath(), "jamrah-bak-" + Guid.NewGuid().ToString("N"));
        var lib = Path.Combine(dir, "Library");
        Directory.CreateDirectory(lib);
        var payload = new byte[16 * 1024 * 1024];
        new Random(11).NextBytes(payload);
        await File.WriteAllBytesAsync(Path.Combine(lib, "a.bin"), payload);
        await File.WriteAllBytesAsync(Path.Combine(lib, "b.bin"), payload);
        var zip = Path.Combine(dir, "out.zip");
        await File.WriteAllBytesAsync(zip, new byte[] { 5 });
        try
        {
            using var cts = new CancellationTokenSource();
            cts.CancelAfter(TimeSpan.FromMilliseconds(10));

            await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
                BackupArchive.CreateAsync(lib, Path.Combine(dir, "nope.db3"), zip, cts.Token));

            Assert.Equal(new byte[] { 5 }, await File.ReadAllBytesAsync(zip));
            Assert.False(File.Exists(zip + ".tmp"));
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }
}
