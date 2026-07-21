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

        try
        {
            var goal = new Goal
            {
                Id = dto.Id,
                Name = dto.Name,
                Description = dto.Description ?? "",
                Color = dto.Color,
                TagId = null,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Duration = dto.Duration,
                DurationType = dto.DurationType,
                DurationValue = dto.DurationValue,
                ParentGoalId = dto.ParentGoalId,
                CreatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
            };

            _db.Goals.Add(goal);
            await _db.SaveChangesAsync();

            return Ok(true);
        }
        catch
        {
            await tx.RollbackAsync();
            return Ok(false);
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
        goal.TagId = dto.TagId;
        goal.StartDate = dto.StartDate;
        goal.EndDate = dto.EndDate;
        goal.Duration = dto.Duration;
        goal.DurationType = dto.DurationType;
        goal.DurationValue = dto.DurationValue;
        goal.ParentGoalId = dto.ParentGoalId;

        await _db.SaveChangesAsync();
        return Ok(true);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var goal = await _db.Goals.FindAsync(id);
        if (goal == null) return Ok(false);

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
