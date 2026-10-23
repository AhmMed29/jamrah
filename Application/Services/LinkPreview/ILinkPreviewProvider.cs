using System.Threading;
using System.Threading.Tasks;

namespace Jamrah.Application.Services.LinkPreview
{
    /// <summary>One fetch strategy. Returns null when it cannot handle the URL.</summary>
    public interface ILinkPreviewProvider
    {
        Task<LinkPreviewResult?> TryFetchAsync(string url, CancellationToken ct);
    }
}
