using SQLite;

namespace Jamrah.Models
{
    [Table("PrayerTimes")]
    public class PrayerTimeEntry
    {
        [PrimaryKey]
        public string DateKey { get; set; } = "";

        public string Fajr    { get; set; } = "";
        public string Sunrise { get; set; } = "";
        public string Dhuhr   { get; set; } = "";  
        public string Asr     { get; set; } = ""; 
        public string Maghrib { get; set; } = ""; 
        public string Isha    { get; set; } = ""; 

        public double Latitude  { get; set; }
        public double Longitude { get; set; }
        public int    Method    { get; set; }
    }
}