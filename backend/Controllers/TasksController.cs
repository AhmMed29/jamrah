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
            // string-comparable with legacy datetime('now') rows; without it EF
            // inserts "" and new tasks sort to the bottom of the DESC listing.
            // .fff keeps two creates in the same second in insertion order.
            CreatedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff")
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
        await _db.SaveChangesAsync();
        return Ok(true);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateTaskItemDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(false);

        var task = await _db.TaskItems.FindAsync(id);
        if (task == null) return Ok(false);

        task.Name = dto.Name;
        await _db.SaveChangesAsync();
        return Ok(true);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var exists = await _db.TaskItems.AnyAsync(t => t.Id == id);
        if (!exists) return Ok(false);

        // delete the whole subtree; FK is SET NULL, so anything below the
        // first level would otherwise survive as orphaned top-level tasks
        var all = await _db.TaskItems
            .Select(t => new { t.Id, t.ParentTaskId })
            .ToListAsync();

        var toDelete = new List<string> { id };
        var stack = new Stack<string>();
        stack.Push(id);

        while (stack.Count > 0)
        {
            var current = stack.Pop();
            foreach (var t in all)
            {
                if (t.ParentTaskId == current && !toDelete.Contains(t.Id))
                {
                    toDelete.Add(t.Id);
                    stack.Push(t.Id);
                }
            }
        }

        // break parent links first: legacy DBs enforce parentTaskId FKs with
        // no delete action, and a single multi-row DELETE can drop a parent
        // before its child mid-statement
        await _db.TaskItems.Where(t => toDelete.Contains(t.Id))
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.ParentTaskId, (string?)null));
        await _db.TaskItems.Where(t => toDelete.Contains(t.Id)).ExecuteDeleteAsync();
        return Ok(true);
    }
}
