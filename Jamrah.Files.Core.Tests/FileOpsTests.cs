using System.Diagnostics;
using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class FileOpsTests
{
    private static string TempDir()
    {
        var d = Path.Combine(Path.GetTempPath(), "jamrah-files-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(d);
        return d;
    }

    private sealed class SyncProgress : IProgress<long>
    {
        public readonly List<long> Reports = new();
        public void Report(long value) => Reports.Add(value);
    }

    [Fact]
    public async Task CopyWithProgress_CopiesBytesAndReports()
    {
        var dir = TempDir();
        try
        {
            var src = Path.Combine(dir, "in.bin");
            var dst = Path.Combine(dir, "sub", "out.bin");
            var data = new byte[3 * 1024 * 1024 + 123];
            new Random(42).NextBytes(data);
            await File.WriteAllBytesAsync(src, data);

            var progress = new SyncProgress();
            await FileOps.CopyWithProgressAsync(src, dst, progress);

            Assert.Equal(data, await File.ReadAllBytesAsync(dst));
            Assert.True(progress.Reports.Count >= 2);
            Assert.NotEmpty(progress.Reports);
            Assert.Equal(data.LongLength, progress.Reports[^1]);
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public async Task CopyWithProgress_SameSourceAndTarget_Throws()
    {
        var dir = TempDir();
        try
        {
            var f = Path.Combine(dir, "same.bin");
            var data = new byte[16];
            new Random(7).NextBytes(data);
            await File.WriteAllBytesAsync(f, data);

            await Assert.ThrowsAsync<ArgumentException>(() => FileOps.CopyWithProgressAsync(f, f, null));

            Assert.Equal(data, await File.ReadAllBytesAsync(f));
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public async Task CopyWithProgress_OverwritesExistingTarget_AndAllowsNullProgress()
    {
        var dir = TempDir();
        try
        {
            var src = Path.Combine(dir, "src.bin");
            var dst = Path.Combine(dir, "dst.bin");
            var data = new byte[1024];
            new Random(9).NextBytes(data);
            await File.WriteAllBytesAsync(src, data);
            await File.WriteAllBytesAsync(dst, new byte[] { 1, 2, 3 });

            await FileOps.CopyWithProgressAsync(src, dst, null);

            Assert.Equal(data, await File.ReadAllBytesAsync(dst));
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public void CopyDirectory_CopiesNestedFilesAndEmptyFolders()
    {
        var dir = TempDir();
        try
        {
            var src = Path.Combine(dir, "src");
            var dst = Path.Combine(dir, "dst");
            Directory.CreateDirectory(Path.Combine(src, "nested"));
            Directory.CreateDirectory(Path.Combine(src, "empty"));
            File.WriteAllText(Path.Combine(src, "a.txt"), "alpha");
            File.WriteAllText(Path.Combine(src, "nested", "b.txt"), "beta");

            FileOps.CopyDirectory(src, dst);

            Assert.Equal("alpha", File.ReadAllText(Path.Combine(dst, "a.txt")));
            Assert.Equal("beta", File.ReadAllText(Path.Combine(dst, "nested", "b.txt")));
            Assert.True(Directory.Exists(Path.Combine(dst, "empty")));
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public void CopyDirectory_MissingSource_Throws()
    {
        var dir = TempDir();
        try
        {
            Assert.Throws<DirectoryNotFoundException>(() =>
                FileOps.CopyDirectory(Path.Combine(dir, "missing"), Path.Combine(dir, "dst")));
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public async Task Sha256_EmptyFile_KnownVector()
    {
        var dir = TempDir();
        try
        {
            var f = Path.Combine(dir, "empty.bin");
            await File.WriteAllBytesAsync(f, Array.Empty<byte>());
            Assert.Equal("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                await FileHasher.Sha256Async(f));
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public async Task Sha256_KnownVector()
    {
        var dir = TempDir();
        try
        {
            var f = Path.Combine(dir, "abc.txt");
            await File.WriteAllTextAsync(f, "abc");
            Assert.Equal("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
                await FileHasher.Sha256Async(f));
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public void CopyDirectory_SkipsDirectoryJunctions()
    {
        if (!OperatingSystem.IsWindows()) return;

        var dir = TempDir();
        var outside = TempDir();
        string? link = null;
        try
        {
            var src = Path.Combine(dir, "src");
            Directory.CreateDirectory(src);
            File.WriteAllText(Path.Combine(src, "keep.txt"), "keep");
            File.WriteAllText(Path.Combine(outside, "secret.txt"), "secret");

            link = Path.Combine(src, "linked");
            var psi = new ProcessStartInfo("cmd.exe",
                $"/c mklink /J \"{link}\" \"{outside}\"")
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            };
            using var p = Process.Start(psi)!;
            p.WaitForExit();
            Assert.Equal(0, p.ExitCode);

            var dst = Path.Combine(dir, "dst");
            FileOps.CopyDirectory(src, dst);

            Assert.True(File.Exists(Path.Combine(dst, "keep.txt")));
            Assert.False(Directory.Exists(Path.Combine(dst, "linked")));
            Assert.False(File.Exists(Path.Combine(dst, "linked", "secret.txt")));
        }
        finally
        {
            try { if (link != null && Directory.Exists(link)) Directory.Delete(link); } catch { }
            try { Directory.Delete(dir, true); } catch { }
            try { Directory.Delete(outside, true); } catch { }
        }
    }

    [Fact]
    public void DeletePermanently_removes_a_file()
    {
        var dir = TempDir();
        try
        {
            var f = Path.Combine(dir, "gone.txt");
            File.WriteAllText(f, "x");

            FileOps.DeletePermanently(f);

            Assert.False(File.Exists(f));
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public void DeletePermanently_removes_a_directory_tree()
    {
        var dir = TempDir();
        try
        {
            var nested = Path.Combine(dir, "nested");
            Directory.CreateDirectory(nested);
            File.WriteAllText(Path.Combine(nested, "a.txt"), "x");

            FileOps.DeletePermanently(dir);

            Assert.False(Directory.Exists(dir));
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }
}
