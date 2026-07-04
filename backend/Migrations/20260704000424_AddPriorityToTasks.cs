using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jamrah.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddPriorityToTasks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "priority",
                table: "tasks",
                type: "TEXT",
                nullable: false,
                defaultValue: "none");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "priority",
                table: "tasks");
        }
    }
}
