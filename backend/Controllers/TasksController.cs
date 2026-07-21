using Jamrah.Backend.Data;
using Jamrah.Backend.DTOs;
using Jamrah.Backend.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Jamrah.Backend.Controllers;

[ApiController]
[Route("api/tasks")]
public class TasksController : ControllerBase
{
    private readonly AppDbContext _db;

    public TasksController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? goalId)
    {
        List<TaskItem> tasks;
        if (!string.IsNullOrEmpty(goalId))
            tasks = await _db.TaskItems.Where(t => t.GoalId == goalId).OrderByDescending(t => t.CreatedAt).ToListAsync();
        else
            tasks = await _db.TaskItems.OrderByDescending(t => t.CreatedAt).ToListAsync();

        return Ok(tasks);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTaskItemDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(false);

        _db.TaskItems.Add(new TaskItem
        {
            Id = dto.Id,
            Name = dto.Name,
            GoalId = dto.GoalId,
            ParentTaskId = dto.ParentTaskId,
            ScheduledTime = dto.ScheduledTime,
            Priority = dto.Priority ?? "Medium",
            Recurrence = dto.Recurrence,
            CustomDays = dto.CustomDays,
            DurationStart = dto.DurationStart,
            DurationEnd = dto.DurationEnd,
            Notes = dto.Notes,
            CreatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
        });

        await _db.SaveChangesAsync();
        return Ok(true);
    }

    [HttpPut("{id}/toggle")]
    public async Task<IActionResult> Toggle(string id)
    {
        var task = await _db.TaskItems.FindAsync(id);
        if (task == null) return Ok(false);

        task.Completed = task.Completed == 0 ? 1 : 0;
        task.CompletedAt = task.Completed == 1 ? DateTime.Now.ToString("yyyy-MM-dd") : null;
        await _db.SaveChangesAsync();
        return Ok(true);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateTaskItemDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(false);

        var task = await _db.TaskItems.FindAsync(id);
        if (task == null) return Ok(false);

        if (dto.Name != null) task.Name = dto.Name;
        if (dto.Priority != null) task.Priority = dto.Priority;
        if (dto.ScheduledTime != null) task.ScheduledTime = dto.ScheduledTime;
        if (dto.Recurrence != null) task.Recurrence = dto.Recurrence;
        if (dto.CustomDays != null) task.CustomDays = dto.CustomDays;
        if (dto.DurationStart != null) task.DurationStart = dto.DurationStart;
        if (dto.DurationEnd != null) task.DurationEnd = dto.DurationEnd;
        if (dto.Notes != null) task.Notes = dto.Notes;
        await _db.SaveChangesAsync();
        return Ok(true);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var task = await _db.TaskItems.FindAsync(id);
        if (task == null) return Ok(false);

        await _db.TaskItems.Where(t => t.ParentTaskId == id).ExecuteDeleteAsync();
        _db.TaskItems.Remove(task);
        await _db.SaveChangesAsync();
        return Ok(true);
    }
}
