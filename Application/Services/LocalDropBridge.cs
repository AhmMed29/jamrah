using System;
using System.Collections.Generic;

namespace Jamrah.Application.Services
{
    /// <summary>ADDITIVE: routes native file-drop paths from the shell into the Bookmarks UI.</summary>
    public sealed class LocalDropBridge
    {
        public event Action<IReadOnlyList<string>>? FilesDropped;
        public void Raise(IReadOnlyList<string> paths) => FilesDropped?.Invoke(paths);
    }
}
