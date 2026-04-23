using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PathfindingEdu.Data;
using PathfindingEdu.Models;

namespace PathfindingEdu.Controllers;

// [ApiController] identifies this class as a RESTful web API controller.
// It sets up automatic data validation and allows us to return model objects directly.
[ApiController]
// The base route for all endpoints in this controller will be "/api/Quizzes"
[Route("api/[controller]")]
public class QuizzesController : ControllerBase
{
    // The AppDbContext is our gateway to the database. It manages connections and queries via Entity Framework Core.
    private readonly AppDbContext _db;

    // We inject the database context into the controller's constructor. 
    // This process (Dependency Injection) lets the ASP.NET Core framework pass the database connection for us.
    public QuizzesController(AppDbContext db)
    {
        _db = db;
    }

    // [HttpGet] makes this endpoint listen for HTTP GET requests.
    // It is used to quickly read and list all available quizzes from the database.
    [HttpGet]
    public async Task<IActionResult> GetQuizzes()
    {
        try
        {
            // We query the "Quizzes" table from our database.
            // .AsNoTracking() improves performance because we are only reading the data, not updating it.
            // .Select(...) shapes the result so we only send the fields we need (id, title, description),
            // which reduces the amount of data sent over the network.
            var quizzes = await _db.Quizzes
                .AsNoTracking()
                .Select(q => new { id = q.Id, title = q.Title, description = q.Description })
                .ToListAsync();
            
            // Return HTTP 200 OK containing the list of quizzes as JSON.
            return Ok(quizzes);
        }
        catch (Exception ex)
        {
            // Return HTTP 400 Bad Request if a database error occurs.
            return BadRequest(new { error = ex.Message });
        }
    }

    // This endpoint retrieves the questions for a specific quiz.
    // "{id}" captures the ID from the URL (e.g., "/api/Quizzes/5/questions").
    // We also accept an optional query parameter "mode" to filter the type of questions.
    [HttpGet("{id}/questions")]
    public async Task<IActionResult> GetQuestions(int id, [FromQuery] string mode = "mixed")
    {
        try
        {
            // Query the database for questions that belong only to the requested quiz.
            // .Include() tells Entity Framework to "eagerly load" related data (Choices and Hints).
            // This prevents the application from making a lot of separate database queries later on.
            var questions = await _db.Questions
                .Where(q => q.QuizId == id)
                .Include(q => q.Choices)
                .Include(q => q.Hints)
                .AsNoTracking()
                .ToListAsync();

            // Depending on the "mode" query parameter, we can filter what questions get returned.
            // This is useful if a student only wants to practice Multiple Choice ("mc") or Long Answer ("long").
            if (mode == "mc")
            {
                questions = questions.Where(q => q.Type == QuestionType.MultipleChoice).ToList();
            }
            else if (mode == "long")
            {
                questions = questions.Where(q => q.Type == QuestionType.LongAnswer).ToList();
            }

            // We project (transform) the database models into "anonymous objects" tailored for the front-end string.
            // This lets us rename fields and ensure we only expose the necessary data (like stripping internal database IDs).
            var result = questions.Select(q => new
            {
                id = q.Id,
                text = q.Text,
                type = q.Type.ToString(),
                points = q.Points,
                modelAnswer = q.ModelAnswer,
                choices = q.Choices?.Select(c => new { 
                    id = c.Id, 
                    text = c.Text, 
                    isCorrect = c.IsCorrect,
                    explanation = c.Explanation
                }).ToList(),
                hints = q.Hints?.OrderBy(h => h.Order).Select(h => new {
                    id = h.Id,
                    text = h.Text,
                    order = h.Order
                }).ToList()
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // [HttpPost] is used because the client is sending data to the server (submitting answers).
    // The ID of the quiz being submitted is captured from the URL.
    [HttpPost("{id}/submit")]
    public async Task<IActionResult> SubmitQuiz(int id, [FromBody] SubmitRequest request)
    {
        try
        {
            // Here, you would typically process the submitted answers, grade them against the database, 
            // and save the student's score. For now, it simply acknowledges the submission.
            return Ok(new { success = true, message = "Quiz submitted locally." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}

// These classes represent the shape of the incoming data for submitting a quiz.
// They act as Data Transfer Objects (DTOs), specifically tailored for this API endpoint.
public class SubmitRequest
{
    public List<AnswerSubmit>? Answers { get; set; }
}

public class AnswerSubmit
{
    public int QuestionId { get; set; }
    // Object allows flexibility since the answer might be a choice ID (number) or text (string).
    public object? Answer { get; set; }
}
