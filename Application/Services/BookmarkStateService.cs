using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Jamrah.Core.Entities;
using Jamrah.Core.Interfaces;

namespace Jamrah.Application.Services
{
    public class BookmarkRoute
    {
        public string Ctx { get; set; } = "home";
        public string? Id { get; set; }
        public string? Tag { get; set; }
        public string ViewKey => Ctx + (Id ?? "") + (Tag ?? "");
    }

    public class BookmarkFilters
    {
        public List<string> Types { get; set; } = new();
        public List<string> Tags { get; set; } = new();
        public bool Fav { get; set; }
        public bool Pin { get; set; }
        public double Rating { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool HasActive => Types.Count > 0 || Tags.Count > 0 || Fav || Pin || Rating > 0 || !string.IsNullOrEmpty(Status);
        public int ActiveCount => Types.Count + Tags.Count + (Fav ? 1 : 0) + (Pin ? 1 : 0) + (Rating > 0 ? 1 : 0) + (!string.IsNullOrEmpty(Status) ? 1 : 0);
        public void Clear() { Types.Clear(); Tags.Clear(); Fav = false; Pin = false; Rating = 0; Status = string.Empty; }
    }

    public class BookmarkStateService
    {
        private readonly IBookmarkRepository _repository;
        private readonly Dictionary<string, BookmarkViewState> _viewStates = new();

        public BookmarkStateService(IBookmarkRepository repository)
        {
            _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        public List<BookmarkItem> Items { get; private set; } = new();
        public List<BookmarkFolder> Folders { get; private set; } = new();
        public List<BookmarkCollection> Collections { get; private set; } = new();
        public List<BookmarkTag> Tags { get; private set; } = new();
        public List<BookmarkCustomType> CustomTypes { get; private set; } = new();
        public List<BookmarkTemplate> CustomTemplates { get; private set; } = new();
        public List<BookmarkQuranKhatm> Khatms { get; private set; } = new();
        public List<BookmarkQuranLog> QuranLogs { get; private set; } = new();
        public List<BookmarkClip> Clips { get; private set; } = new();

        // --- Session UI state (mirrors S in bookmark-design.html) ---
        public BookmarkRoute Route { get; private set; } = new();
        public string Search { get; private set; } = string.Empty;
        public BookmarkFilters Filters { get; } = new();
        public string? DetailId { get; private set; }

        public event Action? OnStateChanged;
        private void NotifyStateChanged() => OnStateChanged?.Invoke();

        public async Task InitAsync()
        {
            await _repository.InitAsync();
            await RefreshDataAsync();
        }

        public async Task RefreshDataAsync()
        {
            Items = await _repository.GetItemsAsync();
            Folders = await _repository.GetFoldersAsync();
            Collections = await _repository.GetCollectionsAsync();
            Tags = await _repository.GetTagsAsync();
            CustomTypes = await _repository.GetCustomTypesAsync();
            CustomTemplates = await _repository.GetTemplatesAsync();
            Khatms = await _repository.GetKhatmsAsync();
            QuranLogs = await _repository.GetQuranLogsAsync();
            Clips = await _repository.GetClipsAsync();
            NotifyStateChanged();
        }

        public void SetRoute(string ctx, string? id = null, string? tag = null)
        {
            Route = new BookmarkRoute { Ctx = ctx, Id = id, Tag = tag };
            DetailId = null;
            NotifyStateChanged();
        }

        public void SetSearch(string search) { Search = search ?? string.Empty; NotifyStateChanged(); }
        public void SetDetail(string? id) { DetailId = id; NotifyStateChanged(); }

        public async Task<(string View, string? Sort)> GetViewStateAsync(string key)
        {
            if (!_viewStates.TryGetValue(key, out var vs))
            {
                vs = await _repository.GetViewStateAsync(key) ?? new BookmarkViewState { Key = key };
                _viewStates[key] = vs;
            }
            return (vs.View, vs.Sort);
        }

        public async Task SetViewStateAsync(string key, string view, string? sort)
        {
            var vs = new BookmarkViewState { Key = key, View = view, Sort = sort };
            _viewStates[key] = vs;
            await _repository.SaveViewStateAsync(vs);
            NotifyStateChanged();
        }

        public async Task SaveItemAsync(BookmarkItem item)
        {
            await _repository.SaveItemAsync(item);
            await RefreshDataAsync();
        }

        public async Task DeleteItemAsync(string id, bool permanent)
        {
            if (permanent)
            {
                await _repository.DeleteItemAsync(id);
            }
            else
            {
                var item = Items.FirstOrDefault(i => i.Id == id);
                if (item != null) { item.Deleted = true; await _repository.SaveItemAsync(item); }
            }
            await RefreshDataAsync();
        }

        public async Task RestoreItemAsync(string id)
        {
            var item = Items.FirstOrDefault(i => i.Id == id);
            if (item != null)
            {
                item.Deleted = false;
                item.Archived = false;
                await _repository.SaveItemAsync(item);
                await RefreshDataAsync();
            }
        }

        public async Task ToggleFavoriteAsync(string id)
        {
            var item = Items.FirstOrDefault(i => i.Id == id);
            if (item != null) { item.Favorite = !item.Favorite; await _repository.SaveItemAsync(item); await RefreshDataAsync(); }
        }

        public async Task TogglePinAsync(string id)
        {
            var item = Items.FirstOrDefault(i => i.Id == id);
            if (item != null) { item.Pinned = !item.Pinned; await _repository.SaveItemAsync(item); await RefreshDataAsync(); }
        }

        public async Task TouchOpenedAsync(string id)
        {
            var item = Items.FirstOrDefault(i => i.Id == id);
            if (item != null) { item.LastOpenedAt = DateTime.UtcNow; await _repository.SaveItemAsync(item); }
        }

        public async Task SaveFolderAsync(BookmarkFolder folder)
        {
            await _repository.SaveFolderAsync(folder);
            await RefreshDataAsync();
        }

        public async Task DeleteFolderAsync(string id)
        {
            await _repository.DeleteFolderAsync(id);
            await RefreshDataAsync();
        }

        public async Task SaveCollectionAsync(BookmarkCollection collection)
        {
            await _repository.SaveCollectionAsync(collection);
            await RefreshDataAsync();
        }

        public async Task DeleteCollectionAsync(string id)
        {
            await _repository.DeleteCollectionAsync(id);
            await RefreshDataAsync();
        }

        public async Task SaveKhatmAsync(BookmarkQuranKhatm khatm)
        {
            await _repository.SaveKhatmAsync(khatm);
            await RefreshDataAsync();
        }

        public async Task SaveQuranLogAsync(BookmarkQuranLog log)
        {
            await _repository.SaveQuranLogAsync(log);
            await RefreshDataAsync();
        }

        public async Task DeleteQuranLogAsync(string id)
        {
            await _repository.DeleteQuranLogAsync(id);
            await RefreshDataAsync();
        }

        public async Task SaveClipAsync(BookmarkClip clip)
        {
            await _repository.SaveClipAsync(clip);
            await RefreshDataAsync();
        }

        public async Task DeleteClipAsync(string id)
        {
            await _repository.DeleteClipAsync(id);
            await RefreshDataAsync();
        }

        public async Task SaveTagAsync(BookmarkTag tag)
        {
            await _repository.SaveTagAsync(tag);
            await RefreshDataAsync();
        }

        public async Task<string> ExportJsonAsync() => await _repository.ExportJsonAsync();
        public async Task ImportJsonAsync(string json)
        {
            await _repository.ImportJsonAsync(json);
            await RefreshDataAsync();
        }
    }
}
