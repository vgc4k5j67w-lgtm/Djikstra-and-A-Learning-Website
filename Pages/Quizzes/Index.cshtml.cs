using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using PathfindingEdu.Data;
using PathfindingEdu.Models;

namespace PathfindingEdu.Pages.Quizzes;

public class IndexModel : PageModel
{
    private readonly AppDbContext _db;
    public List<Quiz> Quizzes { get; set; } = new();

    public IndexModel(AppDbContext db)
    {
        _db = db;
    }

    public async Task OnGetAsync()
    {
        Quizzes = await _db.Quizzes
            .AsNoTracking()
            .ToListAsync();
    }
}
