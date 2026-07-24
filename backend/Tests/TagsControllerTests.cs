using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jamrah.Backend.Data;
using Jamrah.Backend.Entities;
using Jamrah.Backend.Tests.Setup;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Jamrah.Backend.Tests;

public class TagsControllerTests : IDisposable
{
    private readonly TestWebFactory _factory;
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public TagsControllerTests()
    {
        _factory = new TestWebFactory();
        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    [Fact]
    public async Task GetAll_EmptyDb_ReturnsEmptyList()
    {
        var response = await _client.GetAsync("/api/tags");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var tags = await response.Content.ReadFromJsonAsync<List<Tag>>(JsonOpts);
        Assert.NotNull(tags);
        Assert.Empty(tags);
    }

    [Fact]
    public async Task CreateTag_ValidData_ReturnsOk()
    {
        var dto = new { id = "tag1", name = "Work", color = "#ff0000" };
        var response = await _client.PostAsJsonAsync("/api/tags", dto);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<bool>(JsonOpts);
        Assert.True(result);
    }

    [Fact]
    public async Task CreateTag_EmptyName_ReturnsBadRequest()
    {
        var dto = new { id = "tag2", name = "", color = "#ff0000" };
        var response = await _client.PostAsJsonAsync("/api/tags", dto);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetAll_AfterCreate_ReturnsTag()
    {
        var dto = new { id = "tag3", name = "Personal", color = "#00ff00" };
        var createResponse = await _client.PostAsJsonAsync("/api/tags", dto);
        createResponse.EnsureSuccessStatusCode();

        var getResponse = await _client.GetAsync("/api/tags");
        var tags = await getResponse.Content.ReadFromJsonAsync<List<Tag>>(JsonOpts);

        Assert.NotNull(tags);
        var tag = Assert.Single(tags);
        Assert.Equal("tag3", tag.Id);
        Assert.Equal("Personal", tag.Name);
        Assert.Equal("#00ff00", tag.Color);
    }

    [Fact]
    public async Task GetWithGoals_ReturnsTagsAndGoals()
    {
        using (var db = _factory.CreateDbContext())
        {
            db.Tags.Add(new Tag { Id = "gwt1", Name = "Dev", Color = "#0000ff", CreatedAt = 100 });
            db.Goals.Add(new Goal { Id = "goal_gwt1", Name = "Build App", Color = "#fff", StartDate = "2026-01-01", EndDate = "2026-12-31", Duration = 365, CreatedAt = "2026-01-01" });
            await db.SaveChangesAsync();
        }

        var response = await _client.GetAsync("/api/tags/with-goals");
        response.EnsureSuccessStatusCode();

        var data = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var tags = data.GetProperty("tags").EnumerateArray().ToList();
        var goals = data.GetProperty("goals").EnumerateArray().ToList();

        Assert.Single(tags);
        Assert.Single(goals);
        Assert.Equal("Dev", tags[0].GetProperty("name").GetString());
        Assert.Equal("Build App", goals[0].GetProperty("name").GetString());
    }

    [Fact]
    public async Task GetWithGoals_EmptyDb_ReturnsEmpty()
    {
        var response = await _client.GetAsync("/api/tags/with-goals");
        response.EnsureSuccessStatusCode();

        var data = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var tags = data.GetProperty("tags").EnumerateArray().ToList();
        var goals = data.GetProperty("goals").EnumerateArray().ToList();

        Assert.Empty(tags);
        Assert.Empty(goals);
    }

    [Fact]
    public async Task DeleteTag_ExistingId_Removes()
    {
        var dto = new { id = "del1", name = "Delete Me", color = "#ff00ff" };
        var createResponse = await _client.PostAsJsonAsync("/api/tags", dto);
        createResponse.EnsureSuccessStatusCode();

        var deleteResponse = await _client.DeleteAsync("/api/tags/del1");
        deleteResponse.EnsureSuccessStatusCode();
        var deleted = await deleteResponse.Content.ReadFromJsonAsync<bool>(JsonOpts);
        Assert.True(deleted);

        var getResponse = await _client.GetAsync("/api/tags");
        var tags = await getResponse.Content.ReadFromJsonAsync<List<Tag>>(JsonOpts);
        Assert.Empty(tags!);
    }

    [Fact]
    public async Task DeleteTag_NonExisting_ReturnsFalse()
    {
        var response = await _client.DeleteAsync("/api/tags/fake");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<bool>(JsonOpts);
        Assert.False(result);
    }

    [Fact]
    public async Task DeleteTag_ClearsSessionReferences()
    {
        using (var db = _factory.CreateDbContext())
        {
            db.Tags.Add(new Tag { Id = "tag_sess", Name = "SessionTag", Color = "#abc123", CreatedAt = 200 });
            db.Sessions.Add(new Session { Id = "sess1", StartTime = 1000, EndTime = 2000, PlannedMinutes = 25, FocusMinutes = 15, CreatedAt = 1000, TagId = "tag_sess" });
            await db.SaveChangesAsync();
        }

        var deleteResponse = await _client.DeleteAsync("/api/tags/tag_sess");
        deleteResponse.EnsureSuccessStatusCode();
        var deleted = await deleteResponse.Content.ReadFromJsonAsync<bool>(JsonOpts);
        Assert.True(deleted);

        using (var db = _factory.CreateDbContext())
        {
            var session = await db.Sessions.FirstAsync(s => s.Id == "sess1");
            Assert.Null(session.TagId);
        }
    }

    [Fact]
    public async Task CreateTag_DuplicateId_ReturnsError()
    {
        var dto = new { id = "dup1", name = "First", color = "#111111" };
        var first = await _client.PostAsJsonAsync("/api/tags", dto);
        first.EnsureSuccessStatusCode();

        var second = await _client.PostAsJsonAsync("/api/tags", dto);
        Assert.Equal(HttpStatusCode.InternalServerError, second.StatusCode);
    }
}
