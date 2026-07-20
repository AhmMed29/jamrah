using Jamrah.Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Jamrah.Backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Setting> Settings => Set<Setting>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<GoalProgress> GoalProgresses => Set<GoalProgress>();
    public DbSet<TaskItem> TaskItems => Set<TaskItem>();
    public DbSet<Habit> Habits => Set<Habit>();
    public DbSet<HabitLog> HabitLogs => Set<HabitLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Setting>(entity =>
        {
            entity.ToTable("settings");
            entity.HasKey(e => e.Key);
            entity.Property(e => e.Key).HasColumnName("key");
            entity.Property(e => e.Value).HasColumnName("value");
        });

        modelBuilder.Entity<Tag>(entity =>
        {
            entity.ToTable("tags");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Color).HasColumnName("color");
            entity.Property(e => e.CreatedAt).HasColumnName("createdAt");
        });

        modelBuilder.Entity<Session>(entity =>
        {
            entity.ToTable("sessions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.StartTime).HasColumnName("startTime");
            entity.Property(e => e.EndTime).HasColumnName("endTime");
            entity.Property(e => e.PlannedMinutes).HasColumnName("plannedMinutes");
            entity.Property(e => e.FocusMinutes).HasColumnName("focusMinutes");
            entity.Property(e => e.TaskName).HasColumnName("taskName").HasDefaultValue("");
            entity.Property(e => e.Note).HasColumnName("note").HasDefaultValue("");
            entity.Property(e => e.TagId).HasColumnName("tagId");
            entity.Property(e => e.CreatedAt).HasColumnName("createdAt");
            entity.Property(e => e.TaskId).HasColumnName("taskId");
            entity.Property(e => e.GoalId).HasColumnName("goalId");

            entity.HasOne(e => e.Tag)
                  .WithMany(t => t.Sessions)
                  .HasForeignKey(e => e.TagId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Goal)
                  .WithMany(g => g.Sessions)
                  .HasForeignKey(e => e.GoalId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.TagId);
            entity.HasIndex(e => e.GoalId);
            entity.HasIndex(e => e.TaskId);
        });

        modelBuilder.Entity<Goal>(entity =>
        {
            entity.ToTable("goals");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Description).HasColumnName("description").HasDefaultValue("");
            entity.Property(e => e.Color).HasColumnName("color");
            entity.Property(e => e.TagId).HasColumnName("tagId");
            entity.Property(e => e.StartDate).HasColumnName("startDate");
            entity.Property(e => e.EndDate).HasColumnName("endDate");
            entity.Property(e => e.Duration).HasColumnName("duration");
            entity.Property(e => e.DurationType).HasColumnName("durationType");
            entity.Property(e => e.DurationValue).HasColumnName("durationValue");
            entity.Property(e => e.CreatedAt).HasColumnName("createdAt").HasDefaultValueSql("datetime('now')");
            entity.Property(e => e.ParentGoalId).HasColumnName("parentGoalId");

            entity.HasOne(e => e.Tag)
                  .WithMany(t => t.Goals)
                  .HasForeignKey(e => e.TagId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.ParentGoal)
                  .WithMany(g => g.Children)
                  .HasForeignKey(e => e.ParentGoalId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.ParentGoalId);
        });

        modelBuilder.Entity<GoalProgress>(entity =>
        {
            entity.ToTable("goal_progress");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.GoalId).HasColumnName("goalId");
            entity.Property(e => e.Date).HasColumnName("date");
            entity.Property(e => e.ProgressValue).HasColumnName("progressValue").HasDefaultValue(0.0);
            entity.Property(e => e.FocusMinutes).HasColumnName("focusMinutes").HasDefaultValue(0.0);

            entity.HasOne(e => e.Goal)
                  .WithMany(g => g.ProgressRecords)
                  .HasForeignKey(e => e.GoalId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.GoalId);
            entity.HasIndex(e => e.Date);
        });

        modelBuilder.Entity<TaskItem>(entity =>
        {
            entity.ToTable("tasks");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.GoalId).HasColumnName("goalId");
            entity.Property(e => e.Completed).HasColumnName("completed").HasDefaultValue(0);
            entity.Property(e => e.CreatedAt).HasColumnName("createdAt").HasDefaultValueSql("datetime('now')");
            entity.Property(e => e.ScheduledTime).HasColumnName("scheduledTime");
            entity.Property(e => e.ParentTaskId).HasColumnName("parentTaskId");
            entity.Property(e => e.Priority).HasColumnName("priority").IsRequired().ValueGeneratedOnAdd().HasDefaultValue("none");

            entity.HasOne(e => e.Goal)
                  .WithMany(g => g.Tasks)
                  .HasForeignKey(e => e.GoalId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.ParentTask)
                  .WithMany(t => t.Subtasks)
                  .HasForeignKey(e => e.ParentTaskId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.GoalId);
            entity.HasIndex(e => e.ParentTaskId);
        });

        modelBuilder.Entity<Habit>(entity =>
        {
            entity.ToTable("habits");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Color).HasColumnName("color").HasDefaultValue("#3b82f6");
            entity.Property(e => e.SortOrder).HasColumnName("sortOrder").HasDefaultValue(0);
            entity.Property(e => e.CreatedAt).HasColumnName("createdAt").HasDefaultValueSql("datetime('now')");
            entity.Property(e => e.DurationType).HasColumnName("durationType").HasDefaultValue("yearly");
            entity.Property(e => e.DurationStart).HasColumnName("durationStart");
            entity.Property(e => e.DurationEnd).HasColumnName("durationEnd");
        });

        modelBuilder.Entity<HabitLog>(entity =>
        {
            entity.ToTable("habit_logs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.HabitId).HasColumnName("habitId");
            entity.Property(e => e.Date).HasColumnName("date");
            entity.Property(e => e.Value).HasColumnName("value").HasDefaultValue(1);
            entity.Property(e => e.CreatedAt).HasColumnName("createdAt").HasDefaultValueSql("datetime('now')");

            entity.HasOne(e => e.Habit)
                  .WithMany(h => h.Logs)
                  .HasForeignKey(e => e.HabitId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.HabitId);
            entity.HasIndex(e => e.Date);
            entity.HasIndex(e => new { e.HabitId, e.Date }).IsUnique();
        });
    }
}
