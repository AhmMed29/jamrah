using Jamrah.Backend.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jamrah.Backend.Tests.Setup;

public class TestWebFactory : WebApplicationFactory<Program>
{
    private readonly string _dbPath;

    public TestWebFactory()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"jamrah_test_{Guid.NewGuid():N}.db");
    }

    public string DbPath => _dbPath;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor != null) services.Remove(descriptor);

            services.AddDbContext<AppDbContext>(options =>
                options.UseSqlite($"Data Source={_dbPath}"));
        });

        builder.UseEnvironment("Development");
    }

    public AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite($"Data Source={_dbPath}")
            .Options;
        return new AppDbContext(options);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            try { if (File.Exists(_dbPath)) File.Delete(_dbPath); } catch { }
        }
        base.Dispose(disposing);
    }
}
