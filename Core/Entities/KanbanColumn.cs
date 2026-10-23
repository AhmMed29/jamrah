using SQLite;
using System;

namespace Jamrah.Core.Entities
{
    [Table("KanbanColumns")]
    public class KanbanColumn
    {
        [PrimaryKey]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Title { get; set; } = string.Empty;
        public int Order { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
