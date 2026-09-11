namespace Jamrah.Core.Interfaces
{
    /// <summary>Bridge for switching the active MAUI page from Blazor components.</summary>
    public interface IAppNavService
    {
        /// <summary>Id of the currently visible page: tasks | pomodoro | calendar | planning | bookmarks.</summary>
        string CurrentPage { get; }

        /// <summary>Raised on the caller thread when a Blazor component requests a page switch.</summary>
        event Action<string>? PageRequested;

        /// <summary>Request switching to a page by id.</summary>
        void Request(string page);

        /// <summary>Called by the shell (MainPage) when the visible page changes.</summary>
        void SetCurrent(string page);
    }
}
