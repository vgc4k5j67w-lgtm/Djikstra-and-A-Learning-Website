using System.Globalization;
using Microsoft.AspNetCore.Mvc;

namespace PathfindingEdu.Controllers;

// API Contoller identifying it will serve up resources rather than views.
[ApiController]
// Sets the routing address to "/api/resources"
[Route("api/resources")]
public class ResourcesController : ControllerBase
{
    // IWebHostEnvironment gives us access to information about the web hosting environment, 
    // importantly the "WebRootPath", which points to the "wwwroot" folder where static files live.
    private readonly IWebHostEnvironment _environment;

    public ResourcesController(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    // Handles GET requests to "/api/resources/pdfs".
    // Its purpose is to scan an internal folder for PDF files and return their metadata to the client.
    [HttpGet("pdfs")]
    public IActionResult GetPdfs()
    {
        // First we find the absolute path to the "wwwroot" directory on the physical server.
        var webRootPath = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRootPath))
        {
            // If there's no web root set (e.g. some testing scenarios), return an empty list gracefully.
            return Ok(Array.Empty<object>());
        }

        // Combine the root path with the "pdfs" folder location.
        // Using Path.Combine ensures cross-platform compatibility (Windows vs Linux slashes).
        var pdfDirectory = Path.Combine(webRootPath, "pdfs");
        if (!Directory.Exists(pdfDirectory))
        {
            return Ok(Array.Empty<object>());
        }

        // Directory.EnumerateFiles is more efficient than GetFiles because it iterates one by one, 
        // useful if there are many files. We search specifically for "*.pdf".
        var pdfs = Directory
            .EnumerateFiles(pdfDirectory, "*.pdf", SearchOption.TopDirectoryOnly)
            .Select(path => new FileInfo(path)) // Get the properties of the file, like size and date modified
            .OrderBy(file => file.Name)         // Sort files alphabetically by name
            .Select(file => new
            {
                // We construct an anonymous object containing only the details the frontend needs for display.
                fileName = file.Name,
                // We dynamically generate a clean string for the 'title' from the often messy file names.
                title = BuildTitleFromFileName(file.Name),
                // We encode the filename to ensure it forms a valid URL link that the user can click.
                url = $"/pdfs/{Uri.EscapeDataString(file.Name)}",
                sizeBytes = file.Length,
                lastModifiedUtc = file.LastWriteTimeUtc
            })
            .ToList();

        // Return the list of file metadata back to the client as JSON format.
        return Ok(pdfs);
    }

    // Helper method to convert an ugly file name like "my-report_FINAL.pdf" into a neat "My Report Final".
    private static string BuildTitleFromFileName(string fileName)
    {
        // Remove the ".pdf" extension
        var baseName = Path.GetFileNameWithoutExtension(fileName);
        if (string.IsNullOrWhiteSpace(baseName))
        {
            return "Untitled PDF";
        }

        // Replace underscores and hyphens with sensible spaces, and clear outlying spaces.
        var normalized = baseName
            .Replace('_', ' ')
            .Replace('-', ' ')
            .Trim();

        // This resolves instances of double or triple spaces by splitting the string apart and gluing it with single spaces.
        normalized = string.Join(' ', normalized.Split(' ', StringSplitOptions.RemoveEmptyEntries));
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return "Untitled PDF";
        }

        // TitleCase capitalizes the first letter of every word (e.g., "algorithm intro" -> "Algorithm Intro").
        return CultureInfo.CurrentCulture.TextInfo.ToTitleCase(normalized.ToLowerInvariant());
    }
}
