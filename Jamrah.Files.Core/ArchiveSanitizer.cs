using System.Net;
using HtmlAgilityPack;

namespace Jamrah.Files.Core;

/// <summary>
/// Removes active content from archived article HTML before it is written or rendered
/// through Blazor's MarkupString. Keeps normal article markup and local image sources.
/// </summary>
public static class ArchiveSanitizer
{
    private static readonly string[] DangerousElements =
    {
        "script", "style", "iframe", "frame", "frameset", "object", "embed", "applet",
        "form", "input", "button", "select", "option", "textarea", "meta", "link",
        "base", "svg", "math", "noscript", "template",
    };

    public static string Sanitize(string? html)
    {
        if (string.IsNullOrWhiteSpace(html)) return string.Empty;

        var doc = new HtmlDocument();
        doc.LoadHtml(html);

        var dangerous = doc.DocumentNode.SelectNodes(
            string.Join("|", DangerousElements.Select(e => "//" + e)));
        if (dangerous != null)
        {
            foreach (var node in dangerous.ToList()) node.Remove();
        }

        foreach (var node in doc.DocumentNode.Descendants().Where(n => n.NodeType == HtmlNodeType.Element))
        {
            foreach (var attribute in node.Attributes.ToList())
            {
                var name = attribute.Name.ToLowerInvariant();
                if (name.StartsWith("on", StringComparison.Ordinal)
                    || name is "srcdoc" or "formaction" or "xlink:href" or "http-equiv")
                {
                    attribute.Remove();
                    continue;
                }

                if (name == "style" && IsDangerousStyle(attribute.Value))
                {
                    attribute.Remove();
                    continue;
                }

                if (name is "href" or "src" or "data-remote-src" or "poster"
                    && !IsSafeUrl(attribute.Value, name))
                {
                    attribute.Remove();
                }
            }
        }

        return doc.DocumentNode.InnerHtml;
    }

    private static bool IsDangerousStyle(string? value)
    {
        var v = (value ?? string.Empty).ToLowerInvariant();
        return v.Contains("javascript:", StringComparison.Ordinal)
            || v.Contains("expression(", StringComparison.Ordinal)
            || v.Contains("@import", StringComparison.Ordinal)
            || v.Contains("url(", StringComparison.Ordinal);
    }

    private static bool IsSafeUrl(string? value, string attributeName)
    {
        var raw = WebUtility.HtmlDecode((value ?? string.Empty).Trim());
        if (raw.Length == 0 || raw.StartsWith('#')) return true;

        if (raw.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
            return attributeName is "src" or "poster";
        if (raw.StartsWith("mailto:", StringComparison.OrdinalIgnoreCase))
            return attributeName == "href";
        if (!Uri.TryCreate(raw, UriKind.Absolute, out var uri)) return false;

        return uri.Scheme switch
        {
            "http" or "https" => true,
            "file" => attributeName == "src",
            _ => false,
        };
    }
}
