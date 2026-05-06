using System;
using System.Collections.Generic;

namespace PathfindingEdu.Models;

public class Quiz
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Question>? Questions { get; set; }
}
