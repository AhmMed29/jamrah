namespace Jamrah.Core.Interfaces
{
    /// <summary>Bridge for switching the active MAUI page from Blazor components.</summary>
    public interface IAppNavService
    {
        /// <summary>Id of the currently visible page: tasks | pomodoro | calendar | planning | bookmarks.</summary>
        string CurrentPage { get; }

        /// <summary>Whether the library group under the Bookmarks button is expanded (shared across all pages).</summary>
        bool BookmarksExpanded { get; }

        /// <summary>Raised on the caller thread when a Blazor component requests a page switch.</summary>
        event Action<string>? PageRequested;

        /// <summary>Raised whenever shared sidebar UI state changes (e.g. Bookmarks group expanded/collapsed).</summary>
        event Action? Changed;

        /// <summary>Request switching to a page by id.</summary>
        void Request(string page);

        /// <summary>Called by the shell (MainPage) when the visible page changes.</summary>
        void SetCurrent(string page);

        /// <summary>Expand/collapse the library group under the Bookmarks button (shared across all pages).</summary>
        void SetBookmarksExpanded(bool expanded);
    }
}
