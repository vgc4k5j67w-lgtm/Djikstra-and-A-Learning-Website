using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using PathfindingEdu.Data;
using PathfindingEdu.Models;

namespace PathfindingEdu.Pages.Quizzes;

public class TakeModel : PageModel
{
    private readonly AppDbContext _db;

    public Quiz? Quiz { get; set; }
    
    [BindProperty]
    public int QuizId { get; set; }
    
    [BindProperty]
    public int CurrentQuestionIndex { get; set; }
    
    public bool Submitted { get; set; }

    public string? Message { get; set; }

    // Store filtered questions for display
    public List<Question> FilteredQuestions { get; set; } = new();

    public TakeModel(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IActionResult> OnGetAsync(int id, string? mode)
    {
        // Check if submitted
        Submitted = Request.Query.ContainsKey("submitted");
        
        Quiz = await _db.Quizzes
            .Include(q => q.Questions!)
                .ThenInclude(qt => qt.Choices!)
            .Include(q => q.Questions!)
                .ThenInclude(qt => qt.Hints!)
            .AsNoTracking()
            .FirstOrDefaultAsync(q => q.Id == id);

        if (Quiz == null) return NotFound();
        
        // Apply question type filter based on mode parameter
        FilteredQuestions = Quiz.Questions?.OrderBy(q => q.Order).ToList() ?? new List<Question>();
        
        if (!string.IsNullOrEmpty(mode))
        {
            mode = mode.ToLower();
            if (mode == "mc")
            {
                FilteredQuestions = FilteredQuestions.Where(q => q.Type == QuestionType.MultipleChoice).ToList();
            }
            else if (mode == "long")
            {
                FilteredQuestions = FilteredQuestions.Where(q => q.Type == QuestionType.LongAnswer).ToList();
            }
            // "mixed" shows all questions (default behavior)
        }
        
        CurrentQuestionIndex = 0;
        return Page();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        // Check if navigating between questions
        if (!string.IsNullOrEmpty(Request.Form["currentQuestionIndex"]) && 
            Request.Form["submitButton"].FirstOrDefault() != "Submit Quiz")
        {
            // Navigation - just reload the page with the new question index
            CurrentQuestionIndex = int.Parse(Request.Form["currentQuestionIndex"].ToString());
            Quiz = await _db.Quizzes
                .Include(q => q.Questions!)
                    .ThenInclude(qt => qt.Choices!)
                .Include(q => q.Questions!)
                    .ThenInclude(qt => qt.Hints!)
                .AsNoTracking()
                .FirstOrDefaultAsync(q => q.Id == QuizId);

            if (Quiz == null) return NotFound();
            Quiz.Questions = Quiz.Questions?.OrderBy(q => q.Order).ToList();
            Submitted = false;
            return Page();
        }
        
        // Check if this is a navigation request (no submit button clicked)
        if (int.TryParse(Request.Form["currentQuestionIndex"].FirstOrDefault(), out var navIndex) &&
            string.IsNullOrEmpty(Request.Form["submitButton"].FirstOrDefault()))
        {
            CurrentQuestionIndex = navIndex;
            Quiz = await _db.Quizzes
                .Include(q => q.Questions!)
                    .ThenInclude(qt => qt.Choices!)
                .Include(q => q.Questions!)
                    .ThenInclude(qt => qt.Hints!)
                .AsNoTracking()
                .FirstOrDefaultAsync(q => q.Id == QuizId);

            if (Quiz == null) return NotFound();
            Quiz.Questions = Quiz.Questions?.OrderBy(q => q.Order).ToList();
            Submitted = false;
            return Page();
        }

        var quiz = await _db.Quizzes
            .AsNoTracking()
            .FirstOrDefaultAsync(q => q.Id == QuizId);
        if (quiz == null) return NotFound();

        Message = "Thank you! Your answers were saved locally.";
        return Redirect($"/Quizzes/Take?id={quiz.Id}&submitted=1");
    }
}