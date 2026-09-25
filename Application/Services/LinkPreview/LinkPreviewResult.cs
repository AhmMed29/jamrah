namespace Jamrah.Application.Services.LinkPreview
{
    /// <summary>
    /// Unified preview for any URL: card data (outside shape) + hints for archiving.
    /// ImageUrl is still remote here; <see cref="LinkArchiver"/> downloads it local after Save.
    /// </summary>
    public sealed record LinkPreviewResult(
        string Title,
        string Desc,
        string ImageUrl,
        string Author,
        string Provider,
        string Otype,
        string Url,
        string Domain,
        string SuggestedType,
        double? DurationMinutes,
        string? PublishedDate,
        bool EmbedAvailable);
}
