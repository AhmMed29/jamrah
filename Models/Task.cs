using System;
using SQLite;

namespace Jamrah.Models
{
    [Table("TaskItems")]
    public class AppTask
    {
        [PrimaryKey]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        public string Title { get; set; } = string.Empty;
        public string Priority { get; set; } = "low";

        [Indexed]
        public bool IsDone { get; set; } = false;

        [Indexed]
        public DateTime? DueDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        [Indexed]
        public string ColumnId { get; set; } = string.Empty;
    }
}
