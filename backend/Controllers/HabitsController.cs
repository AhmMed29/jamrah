using Jamrah.Backend.Data;
using Jamrah.Backend.DTOs;
using Jamrah.Backend.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Jamrah.Backend.Controllers;

[ApiController]
[Route("api/habits")]
public class HabitsController : ControllerBase
{
    private readonly AppDbContext _db;

    public HabitsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var habits = await _db.Habits.OrderBy(h => h.CreatedAt).ToListAsync();
        return Ok(habits);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateHabitDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(false);

        _db.Habits.Add(new Habit
        {
            Id = dto.Id,
            Name = dto.Name,
            Color = dto.Color,
            DurationType = dto.DurationType,
            DurationStart = dto.DurationStart,
            DurationEnd = dto.DurationEnd
        });

        await _db.SaveChangesAsync();
        return Ok(true);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateHabitDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(false);

        var habit = await _db.Habits.FindAsync(id);
        if (habit == null) return Ok(false);

        habit.Name = dto.Name;
        habit.Color = dto.Color;
        habit.DurationType = dto.DurationType;
        habit.DurationStart = dto.DurationStart;
        habit.DurationEnd = dto.DurationEnd;

        await _db.SaveChangesAsync();
        return Ok(true);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var habit = await _db.Habits.FindAsync(id);
        if (habit == null) return Ok(false);

        await _db.HabitLogs.Where(l => l.HabitId == id).ExecuteDeleteAsync();
        _db.Habits.Remove(habit);
        await _db.SaveChangesAsync();
        return Ok(true);
    }

    [HttpGet("{habitId}/logs")]
    public async Task<IActionResult> GetLogs(string habitId, [FromQuery] string? startDate, [FromQuery] string? endDate)
    {
        var query = _db.HabitLogs.Where(l => l.HabitId == habitId);

        if (!string.IsNullOrEmpty(startDate))
            query = query.Where(l => string.Compare(l.Date, startDate) >= 0);

        if (!string.IsNullOrEmpty(endDate))
            query = query.Where(l => string.Compare(l.Date, endDate) <= 0);

        var logs = await query.OrderBy(l => l.Date).ToListAsync();
        return Ok(logs);
    }

    [HttpPost("{habitId}/logs")]
    public async Task<IActionResult> SetLog(string habitId, [FromBody] CreateHabitLogDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(false);

        var existing = await _db.HabitLogs
            .FirstOrDefaultAsync(l => l.HabitId == habitId && l.Date == dto.Date);

        if (existing != null)
        {
            existing.Value = dto.Value;
        }
        else
        {
            _db.HabitLogs.Add(new HabitLog
            {
                HabitId = habitId,
                Date = dto.Date,
                Value = dto.Value
            });
        }

        await _db.SaveChangesAsync();
        return Ok(true);
    }
}
