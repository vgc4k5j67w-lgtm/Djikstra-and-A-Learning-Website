using System;
using System.Collections.Generic;

namespace PathfindingEdu.Models;

public enum QuestionType
{
    MultipleChoice = 0,
    LongAnswer = 1
}

public class Question
{
    public int Id { get; set; }
    public int QuizId { get; set; }
    public Quiz? Quiz { get; set; }
    public QuestionType Type { get; set; }
    public string Text { get; set; } = string.Empty;
    public int Points { get; set; } = 0;
    public int Order { get; set; } = 0;
    public string ModelAnswer { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Choice>? Choices { get; set; }
    public ICollection<Hint>? Hints { get; set; }
}
