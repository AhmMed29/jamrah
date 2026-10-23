using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class FolderClonerTests
{
    private static readonly (string Id, string Name, string? ParentId)[] Tree =
    {
        ("root", "Projects", null),
        ("a", "Alpha", "root"),
        ("b", "Beta", "root"),
        ("c", "Gamma", "a"),
        ("other", "Other", null),
    };

    [Fact]
    public void Plan_CopiesWholeSubtree_WithRootRenameAndMappedParents()
    {
        var ids = new Queue<string>(new[] { "new-a", "new-b", "new-c" });

        var clones = FolderCloner.Plan(
            "root", Tree, "new-root", "Projects copy",
            new HashSet<string>(StringComparer.OrdinalIgnoreCase), () => ids.Dequeue());

        Assert.Equal(4, clones.Count);
        var root = clones[0];
        Assert.Equal("root", root.OldId);
        Assert.Equal("new-root", root.NewId);
        Assert.Equal("Projects copy", root.Name);
        Assert.Null(root.ParentId);
        Assert.True(root.IsRoot);

        var alpha = clones.Single(x => x.OldId == "a");
        Assert.Equal("new-root", alpha.ParentId);
        Assert.Equal("Alpha", alpha.Name);

        var gamma = clones.Single(x => x.OldId == "c");
        Assert.Equal("new-a", gamma.ParentId);
        Assert.Equal("Gamma", gamma.Name);

        Assert.DoesNotContain(clones, x => x.OldId == "other");
    }

    [Fact]
    public void Plan_NestedRoot_StaysUnderItsOriginalParent()
    {
        var clones = FolderCloner.Plan(
            "a", Tree, "new-a", "Alpha copy",
            new HashSet<string>(StringComparer.OrdinalIgnoreCase), () => "new-c");

        var root = clones[0];
        Assert.Equal("root", root.ParentId);
        var child = clones.Single(x => x.OldId == "c");
        Assert.Equal("new-a", child.ParentId);
    }

    [Fact]
    public void Plan_RootNameTaken_AppendsSuffix()
    {
        var taken = new HashSet<string>(new[] { "Projects copy" }, StringComparer.OrdinalIgnoreCase);

        var clones = FolderCloner.Plan(
            "root", Tree, "new-root", "Projects copy", taken, () => Guid.NewGuid().ToString());

        Assert.Equal("Projects copy (2)", clones[0].Name);
    }

    [Fact]
    public void Plan_UnknownRoot_ReturnsEmpty()
    {
        var clones = FolderCloner.Plan(
            "missing", Tree, "new-root", "copy",
            new HashSet<string>(StringComparer.OrdinalIgnoreCase), () => Guid.NewGuid().ToString());

        Assert.Empty(clones);
    }

    [Fact]
    public void Plan_CycleGuard_DoesNotLoop()
    {
        var cyclic = new (string Id, string Name, string? ParentId)[]
        {
            ("root", "Root", "a"),
            ("a", "A", "root"),
        };

        var clones = FolderCloner.Plan(
            "root", cyclic, "new-root", "copy",
            new HashSet<string>(StringComparer.OrdinalIgnoreCase), () => Guid.NewGuid().ToString());

        Assert.Equal(2, clones.Count);
        Assert.Equal(2, clones.Select(x => x.NewId).Distinct().Count());
    }
}
