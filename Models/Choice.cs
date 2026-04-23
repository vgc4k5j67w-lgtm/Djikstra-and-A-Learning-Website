using System;

namespace PathfindingEdu.Models;

public class Choice
{
    public int Id { get; set; }
    public int QuestionId { get; set; }
    public Question? Question { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; } = false;
    public string? Explanation { get; set; }
}
