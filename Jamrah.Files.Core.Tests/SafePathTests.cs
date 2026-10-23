using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class SafePathTests
{
    private static string NewRoot()
    {
        var root = Path.Combine(Path.GetTempPath(), "jamrah-safe-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        return root;
    }

    [Fact]
    public void ResolveUnderRoot_AllowsNormalRelativePath()
    {
        var root = NewRoot();
        try
        {
            var p = SafePath.ResolveUnderRoot(root, "Library/photo.jpg");
            Assert.Equal(Path.Combine(root, "Library", "photo.jpg"), p);
        }
        finally { try { Directory.Delete(root, true); } catch { } }
    }

    [Fact]
    public void ResolveUnderRoot_AllowsInternalTraversalThatStaysInside()
    {
        var root = NewRoot();
        try
        {
            var p = SafePath.ResolveUnderRoot(root, "Library/sub/../photo.jpg");
            Assert.Equal(Path.Combine(root, "Library", "photo.jpg"), p);
        }
        finally { try { Directory.Delete(root, true); } catch { } }
    }

    [Theory]
    [InlineData("../secret.txt")]
    [InlineData("Library/../../secret.txt")]
    [InlineData("..\\secret.txt")]
    [InlineData("Library\\..\\..\\secret.txt")]
    public void ResolveUnderRoot_RejectsTraversalOutsideRoot(string relative)
    {
        var root = NewRoot();
        try { Assert.Null(SafePath.ResolveUnderRoot(root, relative)); }
        finally { try { Directory.Delete(root, true); } catch { } }
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    [InlineData("C:\\Windows\\win.ini")]
    [InlineData("\\\\server\\share\\file.txt")]
    public void ResolveUnderRoot_RejectsEmptyOrRooted(string? relative)
    {
        var root = NewRoot();
        try { Assert.Null(SafePath.ResolveUnderRoot(root, relative)); }
        finally { try { Directory.Delete(root, true); } catch { } }
    }

    [Fact]
    public void ResolveUnderRoot_RejectsSymlinkThatEscapesRoot()
    {
        if (!OperatingSystem.IsWindows() && !OperatingSystem.IsLinux() && !OperatingSystem.IsMacOS()) return;
        var root = NewRoot();
        var outside = NewRoot();
        try
        {
            File.WriteAllText(Path.Combine(outside, "secret.txt"), "secret");
            var link = Path.Combine(root, "link");
            try { Directory.CreateSymbolicLink(link, outside); }
            catch { return; }

            Assert.Null(SafePath.ResolveUnderRoot(root, "link/secret.txt"));
        }
        finally
        {
            try { Directory.Delete(root, true); } catch { }
            try { Directory.Delete(outside, true); } catch { }
        }
    }
}
