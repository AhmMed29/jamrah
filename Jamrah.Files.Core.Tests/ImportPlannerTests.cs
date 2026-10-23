using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class ImportPlannerTests
{
    [Fact]
    public void Plan_Copy_MapsIntoFolderChain_ResolvingCollisions()
    {
        var ops = ImportPlanner.Plan(
            new[] { @"C:\drop\photo.jpg", @"C:\drop\report.jpg" },
            new[] { "Personal", "Photos" },
            ImportMode.Copy,
            new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "Personal/Photos/photo.jpg" });

        Assert.Equal(2, ops.Count);
        Assert.Equal(@"C:\drop\photo.jpg", ops[0].SourcePath);
        Assert.Equal(@"Personal/Photos/photo (2).jpg", ops[0].TargetRelativePath);
        Assert.Equal(@"Personal/Photos/report.jpg", ops[1].TargetRelativePath);
    }

    [Fact]
    public void Plan_SameBatchSameName_AllocatesUniqueNames()
    {
        var ops = ImportPlanner.Plan(new[] { @"C:\a\photo.jpg", @"C:\b\photo.jpg" },
            new[] { "X" }, ImportMode.Copy, new HashSet<string>());
        Assert.Equal("X/photo.jpg", ops[0].TargetRelativePath);
        Assert.Equal("X/photo (2).jpg", ops[1].TargetRelativePath);
    }

    [Fact]
    public void Plan_Link_HasNoTarget()
    {
        var ops = ImportPlanner.Plan(new[] { @"D:\stuff\a.png" }, Array.Empty<string>(),
            ImportMode.Link, new HashSet<string>());
        Assert.Single(ops);
        Assert.Null(ops[0].TargetRelativePath);
        Assert.Equal(ImportMode.Link, ops[0].Mode);
        Assert.Equal(@"D:\stuff\a.png", ops[0].SourcePath);
    }

    [Fact]
    public void Plan_DedupesRepeatedDropOfSamePath()
    {
        var ops = ImportPlanner.Plan(new[] { @"C:\a.mp4", @"C:\a.mp4" }, Array.Empty<string>(),
            ImportMode.Move, new HashSet<string>());
        Assert.Single(ops);
    }

    [Fact]
    public void Plan_Copy_PreservesOrder()
    {
        var ops = ImportPlanner.Plan(new[] { @"C:\b.jpg", @"C:\a.jpg" }, new[] { "X" },
            ImportMode.Copy, new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "X/a.jpg" });
        Assert.Equal("X/b.jpg", ops[0].TargetRelativePath);
        Assert.Equal("X/a (2).jpg", ops[1].TargetRelativePath);
    }

    [Fact]
    public void Plan_SourcePathsDifferingOnlyByCase_DedupeFollowsOsCaseSensitivity()
    {
        var ops = ImportPlanner.Plan(new[] { @"C:\a\Report.txt", @"C:\a\report.txt" }, Array.Empty<string>(),
            ImportMode.Copy, new HashSet<string>());

        Assert.Equal("Report.txt", ops[0].TargetRelativePath);
        Assert.Equal(OperatingSystem.IsWindows() ? 1 : 2, ops.Count);
    }

    [Fact]
    public void Plan_FileCollidesWithExistingDirectoryEntry_AllocatesNumberedName()
    {
        var existing = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "photos" };

        var ops = ImportPlanner.Plan(new[] { @"C:\drop\photos" }, Array.Empty<string>(),
            ImportMode.Copy, existing);

        Assert.Equal("photos (2)", ops[0].TargetRelativePath);
    }

    [Fact]
    public void Plan_RootFileCollidesWithExistingFile_KeepsExtension()
    {
        var existing = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "notes.txt" };

        var ops = ImportPlanner.Plan(new[] { @"C:\drop\notes.txt" }, Array.Empty<string>(),
            ImportMode.Copy, existing);

        Assert.Equal("notes (2).txt", ops[0].TargetRelativePath);
    }

    [Fact]
    public void Plan_FileCollidesWithDirectoryEntryInFolderChain()
    {
        var existing = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "Docs/photos" };

        var ops = ImportPlanner.Plan(new[] { @"C:\drop\photos" }, new[] { "Docs" },
            ImportMode.Copy, existing);

        Assert.Equal("Docs/photos (2)", ops[0].TargetRelativePath);
    }

    [Fact]
    public void Plan_ArabicNames_PreservedWithoutMangling()
    {
        var ops = ImportPlanner.Plan(new[] { @"C:\drop\تقرير اجتماع.txt" }, new[] { "مجلد" },
            ImportMode.Copy, new HashSet<string>());

        Assert.Equal("مجلد/تقرير اجتماع.txt", ops[0].TargetRelativePath);
    }
}
