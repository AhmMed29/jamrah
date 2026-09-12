using Jamrah.Core.Interfaces;

namespace Jamrah.Application.Services
{
    public class AppNavService : IAppNavService
    {
        public string CurrentPage { get; private set; } = "tasks";
        public bool BookmarksExpanded { get; private set; }

        public event Action<string>? PageRequested;
        public event Action? Changed;
        public event Action<string>? CurrentChanged;

        public void Request(string page) => PageRequested?.Invoke(page);

        public void SetCurrent(string page)
        {
            CurrentPage = page;
            CurrentChanged?.Invoke(page);
        }

        public void SetBookmarksExpanded(bool expanded)
        {
            if (BookmarksExpanded == expanded) return;
            BookmarksExpanded = expanded;
            Changed?.Invoke();
        }
    }
}
