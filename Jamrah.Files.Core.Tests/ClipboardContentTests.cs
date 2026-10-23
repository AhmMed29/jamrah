using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class ClipboardContentTests
{
    [Fact]
    public void Resolve_prefers_an_existing_local_file()
    {
        var payload = ClipboardContent.Resolve(
            "https://example.com", null, null, @"C:\library\report.pdf", null, "Report",
            _ => true);

        Assert.NotNull(payload);
        Assert.Equal(ClipboardPayloadKind.File, payload!.Kind);
        Assert.Equal(@"C:\library\report.pdf", payload.FilePath);
        Assert.Equal(@"C:\library\report.pdf", payload.Text);
    }

    [Fact]
    public void Resolve_missing_local_file_falls_back_to_its_source_path()
    {
        var payload = ClipboardContent.Resolve(
            null, null, null, @"C:\library\gone.pdf", @"D:\source\gone.pdf", "Gone",
            _ => false);

        Assert.NotNull(payload);
        Assert.Equal(ClipboardPayloadKind.Text, payload!.Kind);
        Assert.Null(payload.FilePath);
        Assert.Equal(@"D:\source\gone.pdf", payload.Text);
    }

    [Fact]
    public void Resolve_uses_the_url_before_notes()
    {
        var payload = ClipboardContent.Resolve(
            "https://example.com/article", "my notes", "description", null, null, "Title");

        Assert.Equal(ClipboardPayloadKind.Text, payload!.Kind);
        Assert.Equal("https://example.com/article", payload.Text);
    }

    [Fact]
    public void Resolve_uses_notes_before_description()
    {
        var payload = ClipboardContent.Resolve(
            null, "my notes", "description", null, null, "Title");

        Assert.Equal("my notes", payload!.Text);
    }

    [Fact]
    public void Resolve_uses_description_when_notes_are_empty()
    {
        var payload = ClipboardContent.Resolve(
            null, " ", "description", null, null, "Title");

        Assert.Equal("description", payload!.Text);
    }

    [Fact]
    public void Resolve_uses_the_title_as_a_last_resort()
    {
        var payload = ClipboardContent.Resolve(
            null, null, null, null, null, "Only a title");

        Assert.Equal("Only a title", payload!.Text);
    }

    [Fact]
    public void Resolve_returns_null_when_everything_is_empty()
    {
        var payload = ClipboardContent.Resolve(
            null, " ", null, null, null, "  ", _ => false);

        Assert.Null(payload);
    }
}
