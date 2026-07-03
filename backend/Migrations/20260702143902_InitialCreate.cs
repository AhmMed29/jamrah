using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jamrah.Backend.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "habits",
                columns: table => new
                {
                    id = table.Column<string>(type: "TEXT", nullable: false),
                    name = table.Column<string>(type: "TEXT", nullable: false),
                    color = table.Column<string>(type: "TEXT", nullable: false, defaultValue: "#3b82f6"),
                    sortOrder = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    createdAt = table.Column<string>(type: "TEXT", nullable: false, defaultValueSql: "datetime('now')"),
                    durationType = table.Column<string>(type: "TEXT", nullable: false, defaultValue: "yearly"),
                    durationStart = table.Column<string>(type: "TEXT", nullable: true),
                    durationEnd = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_habits", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "settings",
                columns: table => new
                {
                    key = table.Column<string>(type: "TEXT", nullable: false),
                    value = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_settings", x => x.key);
                });

            migrationBuilder.CreateTable(
                name: "tags",
                columns: table => new
                {
                    id = table.Column<string>(type: "TEXT", nullable: false),
                    name = table.Column<string>(type: "TEXT", nullable: false),
                    color = table.Column<string>(type: "TEXT", nullable: false),
                    createdAt = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tags", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "habit_logs",
                columns: table => new
                {
                    id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    habitId = table.Column<string>(type: "TEXT", nullable: false),
                    date = table.Column<string>(type: "TEXT", nullable: false),
                    value = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 1),
                    createdAt = table.Column<string>(type: "TEXT", nullable: false, defaultValueSql: "datetime('now')")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_habit_logs", x => x.id);
                    table.ForeignKey(
                        name: "FK_habit_logs_habits_habitId",
                        column: x => x.habitId,
                        principalTable: "habits",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "goals",
                columns: table => new
                {
                    id = table.Column<string>(type: "TEXT", nullable: false),
                    name = table.Column<string>(type: "TEXT", nullable: false),
                    description = table.Column<string>(type: "TEXT", nullable: false, defaultValue: ""),
                    color = table.Column<string>(type: "TEXT", nullable: false),
                    tagId = table.Column<string>(type: "TEXT", nullable: true),
                    startDate = table.Column<string>(type: "TEXT", nullable: false),
                    endDate = table.Column<string>(type: "TEXT", nullable: false),
                    duration = table.Column<int>(type: "INTEGER", nullable: false),
                    createdAt = table.Column<string>(type: "TEXT", nullable: false, defaultValueSql: "datetime('now')"),
                    parentGoalId = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_goals", x => x.id);
                    table.ForeignKey(
                        name: "FK_goals_goals_parentGoalId",
                        column: x => x.parentGoalId,
                        principalTable: "goals",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_goals_tags_tagId",
                        column: x => x.tagId,
                        principalTable: "tags",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "goal_progress",
                columns: table => new
                {
                    id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    goalId = table.Column<string>(type: "TEXT", nullable: false),
                    date = table.Column<string>(type: "TEXT", nullable: false),
                    progressValue = table.Column<double>(type: "REAL", nullable: false, defaultValue: 0.0),
                    focusMinutes = table.Column<double>(type: "REAL", nullable: false, defaultValue: 0.0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_goal_progress", x => x.id);
                    table.ForeignKey(
                        name: "FK_goal_progress_goals_goalId",
                        column: x => x.goalId,
                        principalTable: "goals",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "sessions",
                columns: table => new
                {
                    id = table.Column<string>(type: "TEXT", nullable: false),
                    startTime = table.Column<long>(type: "INTEGER", nullable: false),
                    endTime = table.Column<long>(type: "INTEGER", nullable: false),
                    plannedMinutes = table.Column<double>(type: "REAL", nullable: false),
                    focusMinutes = table.Column<double>(type: "REAL", nullable: false),
                    taskName = table.Column<string>(type: "TEXT", nullable: false, defaultValue: ""),
                    note = table.Column<string>(type: "TEXT", nullable: false, defaultValue: ""),
                    tagId = table.Column<string>(type: "TEXT", nullable: true),
                    createdAt = table.Column<long>(type: "INTEGER", nullable: false),
                    taskId = table.Column<string>(type: "TEXT", nullable: true),
                    goalId = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sessions", x => x.id);
                    table.ForeignKey(
                        name: "FK_sessions_goals_goalId",
                        column: x => x.goalId,
                        principalTable: "goals",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_sessions_tags_tagId",
                        column: x => x.tagId,
                        principalTable: "tags",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "tasks",
                columns: table => new
                {
                    id = table.Column<string>(type: "TEXT", nullable: false),
                    name = table.Column<string>(type: "TEXT", nullable: false),
                    goalId = table.Column<string>(type: "TEXT", nullable: true),
                    completed = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    createdAt = table.Column<string>(type: "TEXT", nullable: false, defaultValueSql: "datetime('now')"),
                    parentTaskId = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tasks", x => x.id);
                    table.ForeignKey(
                        name: "FK_tasks_goals_goalId",
                        column: x => x.goalId,
                        principalTable: "goals",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_tasks_tasks_parentTaskId",
                        column: x => x.parentTaskId,
                        principalTable: "tasks",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_goal_progress_date",
                table: "goal_progress",
                column: "date");

            migrationBuilder.CreateIndex(
                name: "IX_goal_progress_goalId",
                table: "goal_progress",
                column: "goalId");

            migrationBuilder.CreateIndex(
                name: "IX_goals_parentGoalId",
                table: "goals",
                column: "parentGoalId");

            migrationBuilder.CreateIndex(
                name: "IX_goals_tagId",
                table: "goals",
                column: "tagId");

            migrationBuilder.CreateIndex(
                name: "IX_habit_logs_date",
                table: "habit_logs",
                column: "date");

            migrationBuilder.CreateIndex(
                name: "IX_habit_logs_habitId",
                table: "habit_logs",
                column: "habitId");

            migrationBuilder.CreateIndex(
                name: "IX_habit_logs_habitId_date",
                table: "habit_logs",
                columns: new[] { "habitId", "date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sessions_goalId",
                table: "sessions",
                column: "goalId");

            migrationBuilder.CreateIndex(
                name: "IX_sessions_tagId",
                table: "sessions",
                column: "tagId");

            migrationBuilder.CreateIndex(
                name: "IX_sessions_taskId",
                table: "sessions",
                column: "taskId");

            migrationBuilder.CreateIndex(
                name: "IX_tasks_goalId",
                table: "tasks",
                column: "goalId");

            migrationBuilder.CreateIndex(
                name: "IX_tasks_parentTaskId",
                table: "tasks",
                column: "parentTaskId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "goal_progress");

            migrationBuilder.DropTable(
                name: "habit_logs");

            migrationBuilder.DropTable(
                name: "sessions");

            migrationBuilder.DropTable(
                name: "settings");

            migrationBuilder.DropTable(
                name: "tasks");

            migrationBuilder.DropTable(
                name: "habits");

            migrationBuilder.DropTable(
                name: "goals");

            migrationBuilder.DropTable(
                name: "tags");
        }
    }
}
