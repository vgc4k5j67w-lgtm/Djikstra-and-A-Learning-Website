using System;

namespace PathfindingEdu.Models;

public class Hint
{
    public int Id { get; set; }
    public int QuestionId { get; set; }
    public Question? Question { get; set; }
    public string Text { get; set; } = string.Empty;
    public int Order { get; set; }
}
