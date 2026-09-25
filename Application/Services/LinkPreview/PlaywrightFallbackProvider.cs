using System.Threading;
using System.Threading.Tasks;

namespace Jamrah.Application.Services.LinkPreview
{
#if WINDOWS
    /// <summary>
    /// Last resort (Windows only): real Chromium render for JS-heavy pages
    /// (X/Twitter, Instagram, SPAs). Browser is created once and reused.
    /// Requires one-time: playwright.ps1 install chromium
    /// </summary>
    public sealed class PlaywrightFallbackProvider : ILinkPreviewProvider
    {
        private static readonly SemaphoreSlim _gate = new(1, 1);
        private static Microsoft.Playwright.IBrowser? _browser;

        public async Task<LinkPreviewResult?> TryFetchAsync(string url, CancellationToken ct)
        {
            try
            {
                var browser = await EnsureBrowserAsync().ConfigureAwait(false);
                var context = await browser.NewContextAsync(new Microsoft.Playwright.BrowserNewContextOptions
                {
                    UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
                    JavaScriptEnabled = true,
                }).ConfigureAwait(false);
                try
                {
                    var page = await context.NewPageAsync().ConfigureAwait(false);
                    try
                    {
                        var resp = await page.GotoAsync(url, new Microsoft.Playwright.PageGotoOptions
                        {
                            WaitUntil = Microsoft.Playwright.WaitUntilState.DOMContentLoaded,
                            Timeout = 15000,
                        }).ConfigureAwait(false);
                        if (resp == null || !resp.Ok)
                        {
                            // Still try to parse whatever rendered (e.g. client-side redirect pages).
                        }
                        try { await page.WaitForTimeoutAsync(1500).ConfigureAwait(false); } catch { }
                        ct.ThrowIfCancellationRequested();
                        var html = await page.ContentAsync().ConfigureAwait(false);
                        var parsed = OpenGraphParser.Parse(html, url);
                        if (parsed != null) return parsed;

                        // Ultimate fallback: document.title only.
                        string title = string.Empty;
                        try { title = (await page.TitleAsync().ConfigureAwait(false) ?? string.Empty).Trim(); } catch { }
                        if (string.IsNullOrWhiteSpace(title)) return null;
                        var domain = Presentation.Bookmarks.BookmarkCardData.HostOf(url);
                        var suggested = BookmarkEmbedService.SuggestType(domain, "link");
                        return new LinkPreviewResult(title, string.Empty, string.Empty, string.Empty,
                            BookmarkEmbedService.PlatformName(domain), "link", url, domain,
                            suggested, null, null,
                            Presentation.Bookmarks.BookmarkTemplates.EmbedHtml(url, domain) != null);
                    }
                    finally { try { await page.CloseAsync().ConfigureAwait(false); } catch { } }
                }
                finally { try { await context.CloseAsync().ConfigureAwait(false); } catch { } }
            }
            catch { return null; }
        }

        private static async Task<Microsoft.Playwright.IBrowser> EnsureBrowserAsync()
        {
            if (_browser != null && _browser.IsConnected) return _browser;
            await _gate.WaitAsync().ConfigureAwait(false);
            try
            {
                if (_browser != null && _browser.IsConnected) return _browser;
                try { if (_browser != null) await _browser.CloseAsync().ConfigureAwait(false); } catch { }
                var pw = await Microsoft.Playwright.Playwright.CreateAsync().ConfigureAwait(false);
                _browser = await pw.Chromium.LaunchAsync(new Microsoft.Playwright.BrowserTypeLaunchOptions
                {
                    Headless = true,
                }).ConfigureAwait(false);
                return _browser;
            }
            finally { _gate.Release(); }
        }
    }
#else
    /// <summary>Non-Windows stub: lightweight providers only (Android keeps working).</summary>
    public sealed class PlaywrightFallbackProvider : ILinkPreviewProvider
    {
        public Task<LinkPreviewResult?> TryFetchAsync(string url, CancellationToken ct)
            => Task.FromResult<LinkPreviewResult?>(null);
    }
#endif
}
