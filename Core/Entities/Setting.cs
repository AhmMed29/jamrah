using SQLite;

namespace Jamrah.Core.Entities
{
    [Table("Settings")]
    public class Setting
    {
        [PrimaryKey]
        public string Key { get; set; } = string.Empty;

        public string Value { get; set; } = string.Empty;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
