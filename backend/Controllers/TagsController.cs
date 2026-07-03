using Jamrah.Backend.Data;
using Jamrah.Backend.DTOs;
using Jamrah.Backend.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Jamrah.Backend.Controllers;

[ApiController]
[Route("api/tags")]
public class TagsController : ControllerBase
{
    private readonly AppDbContext _db;

    public TagsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tags = await _db.Tags.OrderBy(t => t.CreatedAt).ToListAsync();
        return Ok(tags);
    }

    [HttpGet("with-goals")]
    public async Task<IActionResult> GetWithGoals()
    {
        var tags = await _db.Tags.OrderBy(t => t.CreatedAt).ToListAsync();
        var goals = await _db.Goals.OrderBy(g => g.Name)
            .Select(g => new GoalBriefDto
            {
                GoalId = g.Id,
                Name = g.Name,
                Color = g.Color
            })
            .ToListAsync();

        return Ok(new TagsWithGoalsResponse
        {
            Tags = tags.Select(t => new TagDto
            {
                Id = t.Id,
                Name = t.Name,
                Color = t.Color,
                CreatedAt = t.CreatedAt
            }).ToList(),
            Goals = goals
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTagDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(false);

        var tag = new Tag
        {
            Id = dto.Id,
            Name = dto.Name,
            Color = dto.Color,
            CreatedAt = dto.CreatedAt ?? DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };

        _db.Tags.Add(tag);
        await _db.SaveChangesAsync();
        return Ok(true);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var tag = await _db.Tags.FindAsync(id);
        if (tag == null) return Ok(false);

        await _db.Sessions.Where(s => s.TagId == id)
            .ExecuteUpdateAsync(setters => setters.SetProperty(s => s.TagId, (string?)null));

        _db.Tags.Remove(tag);
        await _db.SaveChangesAsync();
        return Ok(true);
    }
}
