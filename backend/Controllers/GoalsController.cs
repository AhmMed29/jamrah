using Jamrah.Backend.Data;
using Jamrah.Backend.DTOs;
using Jamrah.Backend.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Jamrah.Backend.Controllers;

[ApiController]
[Route("api/goals")]
public class GoalsController : ControllerBase
{
    private readonly AppDbContext _db;

    public GoalsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var goals = await _db.Goals.OrderBy(g => g.CreatedAt).ToListAsync();
        return Ok(goals);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id)
    {
        var goal = await _db.Goals.FindAsync(id);
        if (goal == null) return Ok(null as object);
        return Ok(goal);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateGoalDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(false);

        using var tx = await _db.Database.BeginTransactionAsync();

        try
        {
            var existingTag = await _db.Tags.FirstOrDefaultAsync(t => t.Name == dto.Name);

            string tagId;
            if (existingTag == null)
            {
                tagId = "tag_" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                _db.Tags.Add(new Tag
                {
                    Id = tagId,
                    Name = dto.Name,
                    Color = dto.Color,
                    CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                });
            }
            else
            {
                tagId = existingTag.Id;
            }

            var goal = new Goal
            {
                Id = dto.Id,
                Name = dto.Name,
                Description = dto.Description ?? "",
                Color = dto.Color,
                TagId = tagId,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Duration = dto.Duration,
                ParentGoalId = dto.ParentGoalId,
                CreatedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff")
            };

            _db.Goals.Add(goal);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(true);
        }
        catch (Exception ex)
        {
            // surface real failures instead of a silent 200 false — the
            // renderer treats anything but true as "quietly do nothing"
            await tx.RollbackAsync();
            return StatusCode(500, ex.Message);
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateGoalDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(false);

        var goal = await _db.Goals.FindAsync(id);
        if (goal == null) return Ok(false);

        goal.Name = dto.Name;
        goal.Description = dto.Description ?? "";
        goal.Color = dto.Color;
        // the edit form never sends tagId; overwriting with null here would
        // sever the goal↔tag link created at goal creation on every edit
        if (dto.TagId != null) goal.TagId = dto.TagId;
        goal.StartDate = dto.StartDate;
        goal.EndDate = dto.EndDate;
        goal.Duration = dto.Duration;
        goal.ParentGoalId = dto.ParentGoalId;

        await _db.SaveChangesAsync();
        return Ok(true);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var goal = await _db.Goals.FindAsync(id);
        if (goal == null) return Ok(false);

        // detach references explicitly rather than relying on ON DELETE SET
        // NULL: pre-migration DBs have plain FKs with no delete action, and
        // enforcement is on under Microsoft.Data.Sqlite
        await _db.Goals.Where(g => g.ParentGoalId == id)
            .ExecuteUpdateAsync(s => s.SetProperty(g => g.ParentGoalId, (string?)null));
        await _db.TaskItems.Where(t => t.GoalId == id)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.GoalId, (string?)null));
        await _db.Sessions.Where(s => s.GoalId == id)
            .ExecuteUpdateAsync(u => u.SetProperty(s => s.GoalId, (string?)null));
        await _db.GoalProgresses.Where(gp => gp.GoalId == id).ExecuteDeleteAsync();

        _db.Goals.Remove(goal);
        await _db.SaveChangesAsync();
        return Ok(true);
    }

    [HttpGet("{goalId}/progress")]
    public async Task<IActionResult> GetProgress(string goalId)
    {
        var progress = await _db.GoalProgresses
            .Where(p => p.GoalId == goalId)
            .OrderBy(p => p.Date)
            .ToListAsync();
        return Ok(progress);
    }

    [HttpPost("progress")]
    public async Task<IActionResult> SaveProgress([FromBody] SaveGoalProgressDto dto)
    {
        var existing = await _db.GoalProgresses
            .FirstOrDefaultAsync(p => p.GoalId == dto.GoalId && p.Date == dto.Date);

        if (existing != null)
        {
            existing.ProgressValue = dto.ProgressValue;
            existing.FocusMinutes = dto.FocusMinutes;
        }
        else
        {
            _db.GoalProgresses.Add(new GoalProgress
            {
                GoalId = dto.GoalId,
                Date = dto.Date,
                ProgressValue = dto.ProgressValue,
                FocusMinutes = dto.FocusMinutes
            });
        }

        await _db.SaveChangesAsync();
        return Ok(true);
    }
}
