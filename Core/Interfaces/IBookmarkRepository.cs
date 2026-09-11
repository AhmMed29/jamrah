using System.Collections.Generic;
using System.Threading.Tasks;
using Jamrah.Core.Entities;

namespace Jamrah.Core.Interfaces
{
    public interface IBookmarkRepository
    {
        Task InitAsync();

        Task<List<BookmarkItem>> GetItemsAsync();
        Task<BookmarkItem?> GetItemAsync(string id);
        Task SaveItemAsync(BookmarkItem item);
        Task DeleteItemAsync(string id);

        Task<List<BookmarkFolder>> GetFoldersAsync();
        Task SaveFolderAsync(BookmarkFolder folder);
        Task DeleteFolderAsync(string id);

        Task<List<BookmarkCollection>> GetCollectionsAsync();
        Task SaveCollectionAsync(BookmarkCollection collection);
        Task DeleteCollectionAsync(string id);

        Task<List<BookmarkTag>> GetTagsAsync();
        Task SaveTagAsync(BookmarkTag tag);
        Task DeleteTagAsync(string name);

        Task<List<BookmarkCustomType>> GetCustomTypesAsync();
        Task SaveCustomTypeAsync(BookmarkCustomType type);
        Task DeleteCustomTypeAsync(string id);

        Task<List<BookmarkTemplate>> GetTemplatesAsync();
        Task SaveTemplateAsync(BookmarkTemplate template);
        Task DeleteTemplateAsync(string id);

        Task<List<BookmarkQuranKhatm>> GetKhatmsAsync();
        Task SaveKhatmAsync(BookmarkQuranKhatm khatm);
        Task<List<BookmarkQuranLog>> GetQuranLogsAsync();
        Task SaveQuranLogAsync(BookmarkQuranLog log);
        Task DeleteQuranLogAsync(string id);

        Task<List<BookmarkClip>> GetClipsAsync();
        Task SaveClipAsync(BookmarkClip clip);
        Task DeleteClipAsync(string id);

        Task<BookmarkViewState?> GetViewStateAsync(string key);
        Task SaveViewStateAsync(BookmarkViewState state);

        Task<string> ExportJsonAsync();
        Task ImportJsonAsync(string json);
    }
}
