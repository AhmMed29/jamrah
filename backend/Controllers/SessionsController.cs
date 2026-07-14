using Jamrah.Backend.Data;
using Jamrah.Backend.DTOs;
using Jamrah.Backend.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Jamrah.Backend.Controllers;

[ApiController]
[Route("api/sessions")]
public class SessionsController : ControllerBase
{
    private readonly AppDbContext _db;

    public SessionsController(AppDbContext db) => _db = db;

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSessionDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(false);

        var session = new Session
        {
            Id = dto.Id,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            PlannedMinutes = dto.PlannedMinutes,
            FocusMinutes = dto.FocusMinutes,
            TaskName = dto.TaskName ?? "",
            Note = dto.Note ?? "",
            TagId = dto.TagId,
            CreatedAt = dto.CreatedAt ?? DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            TaskId = dto.TaskId,
            GoalId = dto.GoalId
        };

        _db.Sessions.Add(session);
        await _db.SaveChangesAsync();
        return Ok(true);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateSessionDto dto)
    {
        var session = await _db.Sessions.FindAsync(id);
        if (session == null) return Ok(false);

        session.TaskName = dto.TaskName ?? "";
        session.TagId = dto.TagId;
        session.Note = dto.Note ?? "";
        session.GoalId = dto.GoalId;

        await _db.SaveChangesAsync();
        return Ok(true);
    }

    [HttpGet("grouped")]
    public async Task<IActionResult> GetGrouped()
    {
        var sessions = await _db.Sessions.OrderByDescending(s => s.StartTime).ToListAsync();
        var grouped = new Dictionary<string, List<Session>>();

        foreach (var s in sessions)
        {
            var dateKey = DateTimeOffset.FromUnixTimeMilliseconds(s.StartTime).ToString("yyyy-MM-dd");
            if (!grouped.ContainsKey(dateKey))
                grouped[dateKey] = new List<Session>();
            grouped[dateKey].Add(s);
        }

        return Ok(grouped);
    }

    [HttpGet("stats/today")]
    public async Task<IActionResult> GetTodayStats()
    {
        var now = DateTime.UtcNow;
        var todayStart = new DateTimeOffset(now.Year, now.Month, now.Day, 0, 0, 0, TimeSpan.Zero).ToUnixTimeMilliseconds();
        var todayEnd = new DateTimeOffset(now.Year, now.Month, now.Day, 23, 59, 59, 999, TimeSpan.Zero).ToUnixTimeMilliseconds();

        var todaySessions = await _db.Sessions
            .Where(s => s.StartTime >= todayStart && s.StartTime <= todayEnd)
            .ToListAsync();

        return Ok(new TodayStatsDto
        {
            TodayPomos = todaySessions.Count,
            TodayFocusMinutes = todaySessions.Sum(s => s.FocusMinutes)
        });
    }

    [HttpGet("stats/total")]
    public async Task<IActionResult> GetTotalStats()
    {
        var allSessions = await _db.Sessions.ToListAsync();

        return Ok(new TotalStatsDto
        {
            TotalPomos = allSessions.Count,
            TotalFocusMinutes = allSessions.Sum(s => s.FocusMinutes)
        });
    }

    [HttpGet("by-tag/{tagId}")]
    public async Task<IActionResult> GetByTag(string tagId)
    {
        var sessions = await _db.Sessions
            .Where(s => s.TagId == tagId)
            .OrderBy(s => s.StartTime)
            .ToListAsync();
        return Ok(sessions);
    }

    [HttpGet("by-goal/{goalId}")]
    public async Task<IActionResult> GetByGoal(string goalId)
    {
        var goalIds = await GetDescendantGoalIds(goalId);

        var taskIds = await _db.TaskItems
            .Where(t => t.GoalId != null && goalIds.Contains(t.GoalId))
            .Select(t => t.Id)
            .ToListAsync();

        var sessions = await _db.Sessions
            .Where(s => (s.GoalId != null && goalIds.Contains(s.GoalId)) ||
                        (s.TaskId != null && taskIds.Contains(s.TaskId)))
            .OrderByDescending(s => s.StartTime)
            .ToListAsync();

        return Ok(sessions);
    }

    private async Task<List<string>> GetDescendantGoalIds(string goalId)
    {
        var allGoals = await _db.Goals
            .Select(g => new { g.Id, g.ParentGoalId })
            .ToListAsync();

        var result = new List<string> { goalId };
        var stack = new Stack<string>();
        stack.Push(goalId);

        while (stack.Count > 0)
        {
            var current = stack.Pop();
            foreach (var g in allGoals)
            {
                if (g.ParentGoalId == current)
                {
                    result.Add(g.Id);
                    stack.Push(g.Id);
                }
            }
        }

        return result;
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var session = await _db.Sessions.FindAsync(id);
        if (session == null) return Ok(false);

        _db.Sessions.Remove(session);
        await _db.SaveChangesAsync();
        return Ok(true);
    }
}
