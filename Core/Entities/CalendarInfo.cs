using SQLite;

namespace Jamrah.Core.Entities
{
    /// <summary>
    /// Represents a calendar category/group entity, fully compatible with tui.calendar CalendarInfo
    /// and persisted via SQLite-net ORM.
    /// </summary>
    [Table("CalendarInfos")]
    public class CalendarInfo
    {
        /// <summary>
        /// Unique calendar identifier (Primary Key).
        /// </summary>
        [PrimaryKey]
        public string Id { get; set; } = "1";

        /// <summary>
        /// Display name of the calendar (e.g., "Work", "Personal").
        /// </summary>
        public string Name { get; set; } = "Default Calendar";

        /// <summary>
        /// Default text color for events in this calendar (HEX/CSS).
        /// </summary>
        public string Color { get; set; } = "#FFFFFF";

        /// <summary>
        /// Default background color for events in this calendar (HEX/CSS).
        /// </summary>
        public string BackgroundColor { get; set; } = "#2196F3";

        /// <summary>
        /// Default drag handle background color (HEX/CSS).
        /// </summary>
        public string DragBackgroundColor { get; set; } = "#1976D2";

        /// <summary>
        /// Default border color for events in this calendar (HEX/CSS).
        /// </summary>
        public string BorderColor { get; set; } = "#0D47A1";

        /// <summary>
        /// Selection state in the UI sidebar filter list.
        /// </summary>
        public bool IsChecked { get; set; } = true;
    }
}
