using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PathfindingEdu.Migrations
{
    /// <inheritdoc />
    public partial class AddModelAnswerToQuestions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ModelAnswer",
                table: "Questions",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ModelAnswer",
                table: "Questions");
        }
    }
}
