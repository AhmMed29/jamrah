using System.Collections.Generic;
using System.Text;

namespace Jamrah.Presentation.Bookmarks
{
    // Port of the I_ icon map + ic()/fdIcon()/wave() from bookmark-design.html.
    public static class BookmarkIcons
    {
        public static readonly Dictionary<string, string> Paths = new()
        {
            ["home"] = "<path d=\"M3 10.5 12 3l9 7.5\"/><path d=\"M5 9.5V21h5v-6h4v6h5V9.5\"/>",
            ["star"] = "<path d=\"M12 3.5l2.6 5.6 6 .7-4.4 4.2 1.1 5.9L12 17l-5.3 2.9 1.1-5.9L3.4 9.8l6-.7z\"/>",
            ["heart"] = "<path d=\"M12 20.5s-7.6-4.7-9.6-9.1A5.4 5.4 0 0 1 12 6.5a5.4 5.4 0 0 1 9.6 4.9c-2 4.4-9.6 9.1-9.6 9.1z\"/>",
            ["bookmark"] = "<path d=\"M7 3h10a1 1 0 0 1 1 1v17l-6-4-6 4V4a1 1 0 0 1 1-1z\"/>",
            ["pin"] = "<path d=\"M12 16.5V22\"/><path d=\"M8.5 3h7l1 7.5 3 2.5h-15l3-2.5z\"/>",
            ["clock"] = "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3.5 2.5\"/>",
            ["archive"] = "<rect x=\"3\" y=\"4\" width=\"18\" height=\"4\" rx=\"1\"/><path d=\"M5 8v12h14V8\"/><path d=\"M10 12h4\"/>",
            ["trash"] = "<path d=\"M4 7h16\"/><path d=\"M9.5 7V4h5v3\"/><path d=\"M6 7l1 14h10l1-14\"/><path d=\"M10 11v6M14 11v6\"/>",
            ["tag"] = "<path d=\"M20.6 12.7 12.7 20.6a1.8 1.8 0 0 1-2.5 0L3 13.5V3h10.5l7.1 7.2a1.8 1.8 0 0 1 0 2.5z\"/><circle cx=\"7.5\" cy=\"7.5\" r=\"1.2\"/>",
            ["layout"] = "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M3 9h18M9 9v12\"/>",
            ["sliders"] = "<path d=\"M4 6h8M17 6h3M4 12h3M11 12h9M4 18h12M20 18h.5\"/><circle cx=\"14.5\" cy=\"6\" r=\"2\"/><circle cx=\"8.5\" cy=\"12\" r=\"2\"/><circle cx=\"17.5\" cy=\"18\" r=\"2\"/>",
            ["folder"] = "<path d=\"M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/>",
            ["layers"] = "<path d=\"M12 3l9 4.5-9 4.5-9-4.5z\"/><path d=\"M4.5 12 3 13l9 4.5 9-4.5-1.5-1\"/><path d=\"M4.5 16.5 3 17.5l9 4.5 9-4.5-1.5-1\"/>",
            ["spark"] = "<path d=\"M12 3l1.9 5.4 5.4 1.9-5.4 1.9L12 17.6l-1.9-5.4-5.4-1.9 5.4-1.9z\"/>",
            ["moon"] = "<path d=\"M20.4 14.2A8.8 8.8 0 1 1 9.8 3.6a7.2 7.2 0 1 0 10.6 10.6z\"/>",
            ["clipboard"] = "<rect x=\"5\" y=\"4\" width=\"14\" height=\"17\" rx=\"2\"/><path d=\"M9 4a3 3 0 0 1 6 0\"/><path d=\"M9 11h6M9 15h4\"/>",
            ["link"] = "<path d=\"M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4l-1.7 1.7\"/><path d=\"M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.7-1.7\"/>",
            ["globe"] = "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18\"/>",
            ["filetext"] = "<path d=\"M6 2.5h8l4 4V21.5H6z\"/><path d=\"M14 2.5v4.5h4\"/><path d=\"M9 12h6M9 15.5h6M9 8.5h2\"/>",
            ["file"] = "<path d=\"M6 2.5h8l4 4V21.5H6z\"/><path d=\"M14 2.5v4.5h4\"/>",
            ["play"] = "<path d=\"M7 4.5l12 7.5-12 7.5z\"/>",
            ["image"] = "<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2\"/><circle cx=\"8.5\" cy=\"9.5\" r=\"1.5\"/><path d=\"M4 17l5-5 4 4 3-3 4 4\"/>",
            ["film"] = "<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4\"/>",
            ["tv"] = "<rect x=\"3\" y=\"6\" width=\"18\" height=\"13\" rx=\"2\"/><path d=\"M8 2.5 12 6l4-3.5\"/>",
            ["bookopen"] = "<path d=\"M12 6.5C10.5 5 8.5 4.5 5.5 4.5c-.8 0-1.5.4-1.5 1.2v11.8c0 .8.7 1.2 1.5 1.2 3 0 5 .5 6.5 2 1.5-1.5 3.5-2 6.5-2 .8 0 1.5-.4 1.5-1.2V5.7c0-.8-.7-1.2-1.5-1.2-3 0-5 .5-6.5 2z\"/><path d=\"M12 6.5v14\"/>",
            ["music"] = "<path d=\"M9 18V5.5L19 4v12.5\"/><circle cx=\"6.5\" cy=\"18\" r=\"2.5\"/><circle cx=\"16.5\" cy=\"16.5\" r=\"2.5\"/>",
            ["podcast"] = "<circle cx=\"12\" cy=\"12\" r=\"2\"/><path d=\"M8.5 15.5a5 5 0 0 1 7 0M6 18a8.5 8.5 0 0 1 12 0M4.5 20.5a11 11 0 0 1 15 0\"/>",
            ["graduation"] = "<path d=\"M12 4 2.5 9 12 14l9.5-5z\"/><path d=\"M6.5 11.5V16c0 1.2 2.5 2.5 5.5 2.5s5.5-1.3 5.5-2.5v-4.5\"/><path d=\"M21.5 9v6\"/>",
            ["git"] = "<circle cx=\"6\" cy=\"6\" r=\"2.5\"/><circle cx=\"6\" cy=\"18\" r=\"2.5\"/><circle cx=\"18\" cy=\"8\" r=\"2.5\"/><path d=\"M6 8.5v7\"/><path d=\"M18 10.5c0 2.8-2.7 4-6.5 4.6\"/>",
            ["code"] = "<path d=\"M8.5 6.5 4 12l4.5 5.5M15.5 6.5 20 12l-4.5 5.5\"/>",
            ["api"] = "<path d=\"M9 4.5c-2.2 0-2 2.4-2 3.4 0 1.3-.7 2.1-2 2.6 1.3.5 2 1.3 2 2.6 0 1-.2 3.4 2 3.4\"/><path d=\"M15 4.5c2.2 0 2 2.4 2 3.4 0 1.3.7 2.1 2 2.6-1.3.5-2 1.3-2 2.6 0 1 .2 3.4-2 3.4\"/>",
            ["gamepad"] = "<path d=\"M6.5 11h4M8.5 9v4\"/><path d=\"M15.5 11.5h.01M18 13.5h.01\"/><path d=\"M17.3 5H6.7a4.2 4.2 0 0 0-4.1 4.9l.7 4.9a2.6 2.6 0 0 0 4.8 1.1L9.6 14h4.8l1.5 1.9a2.6 2.6 0 0 0 4.8-1.1l.7-4.9A4.2 4.2 0 0 0 17.3 5z\"/>",
            ["note"] = "<path d=\"M4 4h16v12l-4 4H4z\"/><path d=\"M16 20v-4h4\"/><path d=\"M8 9h8M8 13h5\"/>",
            ["bulb"] = "<path d=\"M9 18h6M10 21h4\"/><path d=\"M12 3a6 6 0 0 0-3.5 10.8V16h7v-2.2A6 6 0 0 0 12 3z\"/>",
            ["tool"] = "<path d=\"M14.5 6.5a4 4 0 0 0-5.4 5L4 16.6 7.5 20l5.1-5.1a4 4 0 0 0 5-5.4l-2.6 2.6-2.5-2.5z\"/>",
            ["info"] = "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v5M12 8h.01\"/>",
            ["plus"] = "<path d=\"M12 5v14M5 12h14\"/>",
            ["x"] = "<path d=\"M6 6l12 12M18 6 6 18\"/>",
            ["search"] = "<circle cx=\"11\" cy=\"11\" r=\"7.5\"/><path d=\"M21 21l-4.5-4.5\"/>",
            ["edit"] = "<path d=\"M4 20h4L19 9l-4-4L4 16v4z\"/><path d=\"M13 7l4 4\"/>",
            ["external"] = "<path d=\"M14 4h6v6\"/><path d=\"M20 4l-8.5 8.5\"/><path d=\"M19 14v5a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 19V5.5A1.5 1.5 0 0 1 5.5 4h5\"/>",
            ["dots"] = "<circle cx=\"5\" cy=\"12\" r=\"1.3\"/><circle cx=\"12\" cy=\"12\" r=\"1.3\"/><circle cx=\"19\" cy=\"12\" r=\"1.3\"/>",
            ["check"] = "<path d=\"M4.5 12.5l5 5 10-11\"/>",
            ["chevR"] = "<path d=\"M9.5 6l6 6-6 6\"/>",
            ["chevL"] = "<path d=\"M14.5 6l-6 6 6 6\"/>",
            ["chevD"] = "<path d=\"M6 9.5l6 6 6-6\"/>",
            ["arrowL"] = "<path d=\"M19 12H5.5\"/><path d=\"M11 5.5 4.5 12l6.5 6.5\"/>",
            ["grid"] = "<rect x=\"3.5\" y=\"3.5\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"13.5\" y=\"3.5\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"3.5\" y=\"13.5\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"13.5\" y=\"13.5\" width=\"7\" height=\"7\" rx=\"1.5\"/>",
            ["list"] = "<path d=\"M9 6h12M9 12h12M9 18h12\"/><circle cx=\"4.5\" cy=\"6\" r=\"1\"/><circle cx=\"4.5\" cy=\"12\" r=\"1\"/><circle cx=\"4.5\" cy=\"18\" r=\"1\"/>",
            ["compact"] = "<path d=\"M4 7h16M4 12h16M4 17h16\"/>",
            ["table"] = "<rect x=\"3\" y=\"4.5\" width=\"18\" height=\"15\" rx=\"1.5\"/><path d=\"M3 9.5h18M9 9.5v10\"/>",
            ["columns"] = "<rect x=\"3.5\" y=\"4\" width=\"5\" height=\"16\" rx=\"1\"/><rect x=\"9.5\" y=\"4\" width=\"5\" height=\"10\" rx=\"1\"/><rect x=\"15.5\" y=\"4\" width=\"5\" height=\"13\" rx=\"1\"/>",
            ["timeline"] = "<path d=\"M7 3v18\"/><circle cx=\"7\" cy=\"7\" r=\"1.7\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"7\" cy=\"12.5\" r=\"1.7\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"7\" cy=\"18\" r=\"1.7\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M10.5 7H20M10.5 12.5h7M10.5 18h6\"/>",
            ["download"] = "<path d=\"M12 3.5v11M8 10.5l4 4 4-4\"/><path d=\"M4 19.5h16\"/>",
            ["upload"] = "<path d=\"M12 14.5v-11M8 7l4-4 4 4\"/><path d=\"M4 19.5h16\"/>",
        };

        public static string Svg(string name, int size = 16)
        {
            var inner = Paths.TryGetValue(name, out var p) ? p : Paths["info"];
            return $"<svg width=\"{size}\" height=\"{size}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\">{inner}</svg>";
        }

        public static string FdIcon(string? name, string fallback = "folder")
        {
            if (string.IsNullOrEmpty(name)) return Svg(fallback, 15);
            if (Paths.ContainsKey(name)) return Svg(name, 15);
            return $"<span class=\"sb-emoji\">{System.Net.WebUtility.HtmlEncode(name)}</span>";
        }

        // Deterministic pseudo-random waveform bars (port of wave()).
        public static string Wave(int n = 22)
        {
            var sb = new StringBuilder();
            long s = 0;
            for (var i = 0; i < n; i++)
            {
                s = (s * 9301 + 49297) % 233280;
                var h = (int)System.Math.Round(5 + (s / 233280.0) * 20);
                sb.Append($"<i style=\"height:{h}px\"></i>");
            }
            return sb.ToString();
        }
    }
}
