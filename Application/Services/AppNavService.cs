using Jamrah.Core.Interfaces;

namespace Jamrah.Application.Services
{
    public class AppNavService : IAppNavService
    {
        public string CurrentPage { get; private set; } = "tasks";

        public event Action<string>? PageRequested;

        public void Request(string page) => PageRequested?.Invoke(page);

        public void SetCurrent(string page) => CurrentPage = page;
    }
}
