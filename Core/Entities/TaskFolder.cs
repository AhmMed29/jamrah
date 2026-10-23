using System;
using SQLite;

namespace Jamrah.Core.Entities
{
    [Table("TaskFolders")]
    public class TaskFolder
    {
        [PrimaryKey]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        public string Name { get; set; } = string.Empty;
        public string Color { get; set; } = "#000000";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
