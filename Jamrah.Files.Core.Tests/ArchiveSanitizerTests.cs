using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class ArchiveSanitizerTests
{
    [Fact]
    public void Sanitize_RemovesScriptsAndKeepsSafeMarkup()
    {
        var html = "<p>Hello <strong>world</strong><script>alert(1)</script></p>";
        var result = ArchiveSanitizer.Sanitize(html);

        Assert.Contains("<p>", result, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("<strong>world</strong>", result, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("script", result, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Sanitize_RemovesEventHandlerAttributes()
    {
        var result = ArchiveSanitizer.Sanitize("<img src=\"https://x.test/a.jpg\" onerror=\"alert(1)\">");
        Assert.DoesNotContain("onerror", result, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Sanitize_RemovesJavascriptLinksButKeepsText()
    {
        var result = ArchiveSanitizer.Sanitize("<a href=\"javascript:alert(1)\">click</a>");
        Assert.DoesNotContain("javascript:", result, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("click", result);
    }

    [Fact]
    public void Sanitize_RemovesDangerousContainers()
    {
        var result = ArchiveSanitizer.Sanitize("<iframe src=\"https://x.test\"></iframe><form><input></form><p>ok</p>");
        Assert.DoesNotContain("iframe", result, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<form", result, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<input", result, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("<p>ok</p>", result, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Sanitize_RemovesStyleElementsAndDangerousInlineStyles()
    {
        var result = ArchiveSanitizer.Sanitize(
            "<style>body{display:none}</style><p style=\"background:url(javascript:alert(1))\">x</p>");
        Assert.DoesNotContain("<style", result, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("javascript:", result, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Sanitize_KeepsLocalImageSourceAndRemoteFallback()
    {
        var result = ArchiveSanitizer.Sanitize(
            "<img src=\"file:///C:/Jamrah/a.jpg\" data-remote-src=\"https://x.test/a.jpg\">");
        Assert.Contains("file:///C:/Jamrah/a.jpg", result, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("data-remote-src=\"https://x.test/a.jpg\"", result, StringComparison.OrdinalIgnoreCase);
    }
}
