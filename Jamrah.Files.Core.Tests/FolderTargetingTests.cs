using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class FolderTargetingTests
{
    private static readonly string[] Folders = ["folder-a", "folder-b"];

    [Fact]
    public void NewItemFromFolderRoute_UsesThatFolder()
    {
        var result = FolderTargeting.ResolveNewItemFolder("folder", "folder-b", Folders);

        Assert.Equal("folder-b", result);
    }

    [Fact]
    public void ExplicitFolder_OverridesTheRouteFolder()
    {
        var result = FolderTargeting.ResolveNewItemFolder("folder", "folder-a", Folders, "folder-b");

        Assert.Equal("folder-b", result);
    }

    [Fact]
    public void NewItemOutsideFolderRoute_HasNoFolder()
    {
        var result = FolderTargeting.ResolveNewItemFolder("collection", "folder-a", Folders);

        Assert.Null(result);
    }

    [Fact]
    public void UnknownRouteFolder_IsNotPreset()
    {
        var result = FolderTargeting.ResolveNewItemFolder("folder", "missing", Folders);

        Assert.Null(result);
    }
}
