using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PathfindingEdu.Migrations
{
    /// <inheritdoc />
    public partial class RemoveTimeLimitFromQuiz : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TimeLimitSeconds",
                table: "Quizzes");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TimeLimitSeconds",
                table: "Quizzes",
                type: "INTEGER",
                nullable: true);
        }
    }
}
