using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class MigrationPlannerTests
{
    [Fact]
    public void BuildPlan_MapsEntriesAndKeepsDbFirst()
    {
        var plan = MigrationPlanner.BuildPlan(@"C:\appdata", @"C:\docs\Jamrah",
            new[] { "jamrah_bookmarks.db3", "bookmark-thumbs", "Archive", "clips" },
            "bookmark-thumbs", "Archive", "clips");

        Assert.Equal(4, plan.Count);
        Assert.Equal(@"C:\docs\Jamrah\jamrah_bookmarks.db3", plan[0].TargetPath);
        Assert.False(plan[0].IsDirectory);
        Assert.Equal(@"C:\appdata\bookmark-thumbs", plan[1].SourcePath);
        Assert.Equal("bookmark-thumbs", plan[1].RelativeEntry);
        Assert.True(plan[1].IsDirectory);
        Assert.All(plan.Skip(1), op => Assert.True(op.IsDirectory));
    }

    [Fact]
    public void BuildPlan_NormalizesTrailingSeparators()
    {
        var plan = MigrationPlanner.BuildPlan(@"C:\appdata\", @"C:\docs\Jamrah\",
            new[] { "clips" });
        Assert.Equal(@"C:\appdata\clips", plan[0].SourcePath);
        Assert.Equal(@"C:\docs\Jamrah\clips", plan[0].TargetPath);
    }

    [Fact]
    public void BuildPlan_MarksDirectories_CaseInsensitive_AndNormalizesKeys()
    {
        var plan = MigrationPlanner.BuildPlan(@"C:\appdata", @"C:\docs\Jamrah",
            new[] { "jamrah_bookmarks.db3", "bookmark-thumbs", "Archive", "clips" },
            "Bookmark-Thumbs ", @"Archive\", "clips");

        Assert.False(plan[0].IsDirectory);
        Assert.Equal(@"C:\docs\Jamrah\bookmark-thumbs", plan[1].TargetPath);
        Assert.True(plan[1].IsDirectory);
        Assert.True(plan[2].IsDirectory);
        Assert.True(plan[3].IsDirectory);
    }
}
