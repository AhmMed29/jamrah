using System;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using HtmlAgilityPack;

namespace Jamrah.Application.Services.LinkPreview
{
    /// <summary>
    /// Lightweight HTML fragment -&gt; Markdown (no new packages).
    /// Buttons degrade to their text (or inner link); images keep data-remote-src
    /// as raw inline HTML so the reader can fall back when file:// is blocked.
    /// </summary>
    public static class HtmlToMarkdown
    {
        public static string Convert(string htmlFragment)
        {
            if (string.IsNullOrWhiteSpace(htmlFragment)) return string.Empty;
            var doc = new HtmlDocument();
            try { doc.LoadHtml(htmlFragment); }
            catch { return string.Empty; }
            var sb = new StringBuilder();
            foreach (var n in doc.DocumentNode.ChildNodes)
                sb.Append(Block(n, 0));
            return Tidy(sb.ToString());
        }

        private static string Block(HtmlNode n, int depth)
        {
            if (n.NodeType == HtmlNodeType.Text) return InlineText(n.InnerText);
            if (n.NodeType != HtmlNodeType.Element) return string.Empty;
            var name = n.Name.ToLowerInvariant();
            switch (name)
            {
                case "script":
                case "style":
                case "noscript":
                case "nav":
                case "header":
                case "footer":
                case "aside":
                case "form":
                case "iframe":
                case "button": // handled below, listed to avoid default fallthrough confusion
                    if (name != "button") return string.Empty;
                    return "\n\n" + ButtonText(n) + "\n\n";
                case "h1":
                case "h2":
                case "h3":
                case "h4":
                case "h5":
                case "h6":
                {
                    var level = name[1] - '0';
                    var t = ChildrenInline(n).Trim();
                    return string.IsNullOrWhiteSpace(t) ? string.Empty
                        : "\n\n" + new string('#', level) + " " + t + "\n\n";
                }
                case "p":
                case "div":
                case "section":
                case "article":
                case "figure":
                case "figcaption":
                case "main":
                    return "\n\n" + ChildrenInline(n).Trim() + "\n\n";
                case "br":
                    return "  \n";
                case "hr":
                    return "\n\n---\n\n";
                case "ul":
                case "ol":
                    return "\n\n" + ListItems(n, name == "ol", depth) + "\n";
                case "blockquote":
                    return "\n\n" + Quote(ChildrenInline(n).Trim()) + "\n\n";
                case "pre":
                {
                    var code = WebUtility.HtmlDecode(n.InnerText ?? string.Empty)
                        .Replace("\r\n", "\n").Trim('\n');
                    return string.IsNullOrWhiteSpace(code) ? string.Empty
                        : "\n\n```\n" + code + "\n```\n\n";
                }
                case "table":
                    return "\n\n" + Table(n) + "\n";
                case "img":
                    return "\n\n" + ImageMd(n) + "\n\n";
                case "a":
                    return LinkMd(n);
                default:
                    return ChildrenInline(n);
            }
        }

        private static string ChildrenInline(HtmlNode n)
        {
            var sb = new StringBuilder();
            foreach (var c in n.ChildNodes)
            {
                if (c.NodeType == HtmlNodeType.Text) { sb.Append(InlineText(c.InnerText)); continue; }
                if (c.NodeType != HtmlNodeType.Element) continue;
                var name = c.Name.ToLowerInvariant();
                switch (name)
                {
                    case "script":
                    case "style":
                    case "noscript":
                    case "iframe":
                        break;
                    case "br":
                        sb.Append("  \n"); break;
                    case "strong":
                    case "b":
                        sb.Append("**").Append(ChildrenInline(c).Trim()).Append("**"); break;
                    case "em":
                    case "i":
                        sb.Append('*').Append(ChildrenInline(c).Trim()).Append('*'); break;
                    case "code":
                        sb.Append('`').Append((c.InnerText ?? string.Empty).Trim()).Append('`'); break;
                    case "a":
                        sb.Append(LinkMd(c)); break;
                    case "img":
                        sb.Append(ImageMd(c)); break;
                    case "button":
                        sb.Append(ButtonText(c)); break;
                    default:
                        if (IsBlock(name)) sb.Append(Block(c, 0));
                        else sb.Append(ChildrenInline(c));
                        break;
                }
            }
            return sb.ToString();
        }

        private static bool IsBlock(string name) => name is "p" or "div" or "section" or "article"
            or "h1" or "h2" or "h3" or "h4" or "h5" or "h6" or "ul" or "ol" or "blockquote" or "pre" or "table";

        private static string LinkMd(HtmlNode a)
        {
            var href = (a.GetAttributeValue("href", string.Empty) ?? string.Empty).Trim();
            var text = ChildrenInline(a).Trim();
            if (string.IsNullOrWhiteSpace(href) || href.StartsWith("javascript:", StringComparison.OrdinalIgnoreCase))
                return text;
            if (string.IsNullOrWhiteSpace(text)) text = href;
            text = text.Replace("[", "\\[").Replace("]", "\\]");
            return $"[{text}]({href})";
        }

        private static string ImageMd(HtmlNode img)
        {
            var src = (img.GetAttributeValue("src", string.Empty) ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(src)) return string.Empty;
            var alt = (img.GetAttributeValue("alt", string.Empty) ?? string.Empty).Trim()
                .Replace("[", "\\[").Replace("]", "\\]");
            var remote = (img.GetAttributeValue("data-remote-src", string.Empty) ?? string.Empty).Trim();
            if (!string.IsNullOrWhiteSpace(remote))
            {
                // Raw inline HTML survives Markdig and keeps the offline fallback chain.
                return $"<img src=\"{src}\" data-remote-src=\"{remote}\" alt=\"{alt}\" " +
                    "onerror=\"this.onerror=null;this.src=this.getAttribute('data-remote-src');\" />";
            }
            return $"![{alt}]({src})";
        }

        private static string ButtonText(HtmlNode btn)
        {
            var link = btn.SelectSingleNode(".//a[@href]");
            if (link != null) return LinkMd(link);
            return (WebUtility.HtmlDecode(btn.InnerText ?? string.Empty) ?? string.Empty).Trim();
        }

        private static string ListItems(HtmlNode list, bool ordered, int depth)
        {
            var sb = new StringBuilder();
            var i = 0;
            foreach (var li in list.ChildNodes.Where(c => c.Name.Equals("li", StringComparison.OrdinalIgnoreCase)))
            {
                i++;
                var pad = new string(' ', depth * 2);
                var mark = ordered ? $"{i}. " : "- ";
                var inner = new StringBuilder();
                foreach (var c in li.ChildNodes)
                {
                    if (c.Name.Equals("ul", StringComparison.OrdinalIgnoreCase)
                        || c.Name.Equals("ol", StringComparison.OrdinalIgnoreCase))
                        inner.Append('\n').Append(ListItems(c, c.Name == "ol", depth + 1));
                    else if (c.NodeType == HtmlNodeType.Element && IsBlock(c.Name.ToLowerInvariant()))
                        inner.Append(Block(c, depth + 1));
                    else if (c.NodeType == HtmlNodeType.Text)
                        inner.Append(InlineText(c.InnerText));
                    else if (c.NodeType == HtmlNodeType.Element)
                        inner.Append(InlineNode(c));
                }
                sb.Append(pad).Append(mark).Append(inner.ToString().Trim()).Append('\n');
            }
            return sb.ToString();
        }

        private static string InlineNode(HtmlNode c)
        {
            // Reuse ChildrenInline by wrapping the single node.
            var doc = new HtmlDocument();
            doc.LoadHtml(c.OuterHtml);
            return ChildrenInline(doc.DocumentNode);
        }

        private static string Quote(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return string.Empty;
            return string.Join("\n", text.Split('\n').Select(l => "> " + l.Trim()).Where(l => l.Length > 2));
        }

        private static string Table(HtmlNode table)
        {
            var rows = table.SelectNodes(".//tr")?.ToList()
                ?? table.ChildNodes.Where(c => c.Name.Equals("tr", StringComparison.OrdinalIgnoreCase)).ToList();
            if (rows == null || rows.Count == 0) return ChildrenInline(table);
            var sb = new StringBuilder();
            var first = true;
            foreach (var r in rows)
            {
                var cells = r.ChildNodes
                    .Where(c => c.Name.Equals("td", StringComparison.OrdinalIgnoreCase)
                        || c.Name.Equals("th", StringComparison.OrdinalIgnoreCase))
                    .Select(c => (WebUtility.HtmlDecode(c.InnerText ?? string.Empty) ?? string.Empty)
                        .Replace("|", "\\|").Replace("\n", " ").Trim())
                    .ToList();
                if (cells.Count == 0) continue;
                sb.Append("| ").Append(string.Join(" | ", cells)).Append(" |\n");
                if (first)
                {
                    sb.Append("| ").Append(string.Join(" | ", cells.Select(_ => "---"))).Append(" |\n");
                    first = false;
                }
            }
            return sb.ToString();
        }

        private static string InlineText(string? s)
        {
            if (string.IsNullOrEmpty(s)) return string.Empty;
            s = WebUtility.HtmlDecode(s);
            s = Regex.Replace(s, @"[ \t\xa0]+", " ");
            s = s.Replace("\r\n", "\n").Replace("\r", "\n");
            // Collapse single newlines inside inline flow; block handlers re-add breaks.
            s = Regex.Replace(s, @"\n{3,}", "\n\n");
            return s;
        }

        private static string Tidy(string md)
        {
            md = md.Replace("\r\n", "\n");
            md = Regex.Replace(md, @"[ \t]+(\n)", "$1");
            md = Regex.Replace(md, @"\n{3,}", "\n\n");
            return md.Trim() + "\n";
        }
    }
}
