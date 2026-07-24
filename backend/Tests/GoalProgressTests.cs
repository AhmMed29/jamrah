using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jamrah.Backend.Entities;
using Jamrah.Backend.Tests.Setup;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Jamrah.Backend.Tests;

public class GoalProgressTests : IDisposable
{
    private readonly TestWebFactory _factory;
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public GoalProgressTests()
    {
        _factory = new TestWebFactory();
        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task SeedGoal(string id)
    {
        using var db = _factory.CreateDbContext();
        db.Goals.Add(new Goal
        {
            Id = id, Name = $"Goal {id}", Color = "#ff0000",
            StartDate = "2026-01-01", EndDate = "2026-12-31", Duration = 365,
            CreatedAt = "2026-01-01", Description = ""
        });
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task SaveProgress_NewEntry_Creates()
    {
        await SeedGoal("gp_goal1");

        var dto = new { goalId = "gp_goal1", date = "2026-06-01", progressValue = 0.5, focusMinutes = 25.0 };
        var response = await _client.PostAsJsonAsync("/api/goals/progress", dto);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<bool>(JsonOpts);
        Assert.True(result);

        using var db = _factory.CreateDbContext();
        var entries = await db.GoalProgresses.Where(p => p.GoalId == "gp_goal1").ToListAsync();
        var entry = Assert.Single(entries);
        Assert.Equal("2026-06-01", entry.Date);
        Assert.Equal(0.5, entry.ProgressValue);
        Assert.Equal(25.0, entry.FocusMinutes);
    }

    [Fact]
    public async Task SaveProgress_ExistingEntry_Updates()
    {
        await SeedGoal("gp_goal2");

        var dto = new { goalId = "gp_goal2", date = "2026-06-15", progressValue = 0.3, focusMinutes = 10.0 };
        var first = await _client.PostAsJsonAsync("/api/goals/progress", dto);
        first.EnsureSuccessStatusCode();

        var dto2 = new { goalId = "gp_goal2", date = "2026-06-15", progressValue = 0.8, focusMinutes = 40.0 };
        var second = await _client.PostAsJsonAsync("/api/goals/progress", dto2);
        second.EnsureSuccessStatusCode();

        using var db = _factory.CreateDbContext();
        var entries = await db.GoalProgresses.Where(p => p.GoalId == "gp_goal2").ToListAsync();
        var entry = Assert.Single(entries);
        Assert.Equal(0.8, entry.ProgressValue);
        Assert.Equal(40.0, entry.FocusMinutes);
    }

    [Fact]
    public async Task GetProgress_ReturnsEntries()
    {
        await SeedGoal("gp_goal3");

        var dto = new { goalId = "gp_goal3", date = "2026-07-01", progressValue = 1.0, focusMinutes = 50.0 };
        var post = await _client.PostAsJsonAsync("/api/goals/progress", dto);
        post.EnsureSuccessStatusCode();

        var response = await _client.GetAsync("/api/goals/gp_goal3/progress");
        response.EnsureSuccessStatusCode();

        var entries = await response.Content.ReadFromJsonAsync<List<GoalProgress>>(JsonOpts);
        Assert.NotNull(entries);
        var entry = Assert.Single(entries);
        Assert.Equal("gp_goal3", entry.GoalId);
        Assert.Equal("2026-07-01", entry.Date);
        Assert.Equal(1.0, entry.ProgressValue);
    }

    [Fact]
    public async Task GetProgress_NoEntries_ReturnsEmpty()
    {
        await SeedGoal("gp_goal_empty");

        var response = await _client.GetAsync("/api/goals/gp_goal_empty/progress");
        response.EnsureSuccessStatusCode();

        var entries = await response.Content.ReadFromJsonAsync<List<GoalProgress>>(JsonOpts);
        Assert.NotNull(entries);
        Assert.Empty(entries);
    }

    [Fact]
    public async Task GetProgress_MultipleEntries_OrderedByDate()
    {
        await SeedGoal("gp_goal_dates");

        var dates = new[] { "2026-08-01", "2026-07-01", "2026-09-01" };
        foreach (var date in dates)
        {
            var dto = new { goalId = "gp_goal_dates", date, progressValue = 0.5, focusMinutes = 20.0 };
            var post = await _client.PostAsJsonAsync("/api/goals/progress", dto);
            post.EnsureSuccessStatusCode();
        }

        var response = await _client.GetAsync("/api/goals/gp_goal_dates/progress");
        response.EnsureSuccessStatusCode();

        var entries = await response.Content.ReadFromJsonAsync<List<GoalProgress>>(JsonOpts);
        Assert.NotNull(entries);
        Assert.Equal(3, entries.Count);
        Assert.Equal("2026-07-01", entries[0].Date);
        Assert.Equal("2026-08-01", entries[1].Date);
        Assert.Equal("2026-09-01", entries[2].Date);
    }

    [Fact]
    public async Task SaveProgress_TwoGoals_Independent()
    {
        await SeedGoal("gp_indy_a");
        await SeedGoal("gp_indy_b");

        var dtoA = new { goalId = "gp_indy_a", date = "2026-10-01", progressValue = 0.7, focusMinutes = 35.0 };
        var postA = await _client.PostAsJsonAsync("/api/goals/progress", dtoA);
        postA.EnsureSuccessStatusCode();

        var dtoB = new { goalId = "gp_indy_b", date = "2026-10-01", progressValue = 0.2, focusMinutes = 10.0 };
        var postB = await _client.PostAsJsonAsync("/api/goals/progress", dtoB);
        postB.EnsureSuccessStatusCode();

        using var db = _factory.CreateDbContext();
        var entriesA = await db.GoalProgresses.Where(p => p.GoalId == "gp_indy_a").ToListAsync();
        var entriesB = await db.GoalProgresses.Where(p => p.GoalId == "gp_indy_b").ToListAsync();

        Assert.Single(entriesA);
        Assert.Single(entriesB);
        Assert.Equal(0.7, entriesA[0].ProgressValue);
        Assert.Equal(0.2, entriesB[0].ProgressValue);
    }
}
