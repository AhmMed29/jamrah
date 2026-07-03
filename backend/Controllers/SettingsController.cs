using Jamrah.Backend.Data;
using Jamrah.Backend.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Jamrah.Backend.Controllers;

[ApiController]
[Route("api/settings")]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _db;

    public SettingsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var rows = await _db.Settings.ToListAsync();
        var result = new Dictionary<string, string>();
        foreach (var r in rows)
            result[r.Key] = r.Value;
        return Ok(result);
    }

    [HttpGet("{key}")]
    public async Task<IActionResult> Get(string key)
    {
        var row = await _db.Settings.FindAsync(key);
        if (row == null) return Ok(null as string);
        return Ok(row.Value);
    }

    [HttpPut("{key}")]
    public async Task<IActionResult> Set(string key, [FromBody] string value)
    {
        var existing = await _db.Settings.FindAsync(key);
        if (existing != null)
        {
            existing.Value = value;
        }
        else
        {
            _db.Settings.Add(new Entities.Setting { Key = key, Value = value });
        }
        await _db.SaveChangesAsync();
        return Ok(true);
    }
}
