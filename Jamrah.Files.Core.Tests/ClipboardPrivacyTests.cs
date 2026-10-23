using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class ClipboardPrivacyTests
{
    [Theory]
    [InlineData(true, null, null, true)]
    [InlineData(false, false, null, true)]
    [InlineData(false, true, false, true)]
    [InlineData(false, true, true, false)]
    [InlineData(false, null, null, false)]
    public void ShouldSkip_RespectsExclusionFlags(bool exclude, bool? canInclude, bool? canUpload, bool expected)
        => Assert.Equal(expected, ClipboardPrivacy.ShouldSkip(exclude, canInclude, canUpload));
}
