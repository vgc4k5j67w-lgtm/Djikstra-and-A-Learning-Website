using System;
using System.Diagnostics;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using PathfindingEdu.Models;
using PathfindingEdu.Services;

namespace PathfindingEdu.Controllers;
// [ApiController] is an attribute that tells ASP.NET Core this controller is meant to serve as a RESTful API.
// it automatically handles things like binding incoming data and formatting errors.
[ApiController]
// [Route] defines the base URL for all actions in this controller. 
// "[controller]" is a placeholder that will be replaced by the controller's name, "Pathfinding".
// So, the URL for this controller will be "/api/Pathfinding"
[Route("api/[controller]")]
public class PathfindingController : ControllerBase
{
    // We use a private readonly field to hold our service. 
    // This allows the controller's methods to use the pathfinding logic without knowing its internal details.
    private readonly PathfindingService _pathfindingService;

    // The constructor initializes the controller. Here we instantiate the PathfindingService.
    // In a real-world enterprise application, we would usually use Dependency Injection instead of 'new', 
    // but this setup cleanly separates our HTTP handling (here) from our business logic (in the service).
    public PathfindingController()
    {
        _pathfindingService = new PathfindingService();
    }

    // [HttpPost] means this method will only respond to HTTP POST requests. 
    // POST is typically used when the client is sending a significant amount of data, like a detailed request body.
    // "solve" is appended to the base route, making the full endpoint URL: POST "/api/Pathfinding/solve"
    [HttpPost("solve")]
    public IActionResult SolvePath([FromBody] PathfindingRequest request)
    {
        // We use a try-catch block to handle any unexpected errors gracefully,
        // returning an error message to the client instead of crashing the server.
        try
        {
            // --- Input Validation ---
            // Before processing, we must always validate the client's input to ensure it meets our rules.
            // If any validation fails, we return a 400 Bad Request status with an explanation.

            if (request == null)
                return BadRequest(new { error = "Request cannot be null" });

            // Ensure the grid has positive dimensions. A 0x0 grid wouldn't make sense.
            if (request.Width <= 0 || request.Height <= 0)
                return BadRequest(new { error = "Grid dimensions must be positive" });

            // We put a cap on the grid size to prevent users from requesting gigantic grids 
            // that could consume too much memory or CPU and crash our server.
            if (request.Width > 200 || request.Height > 200)
                return BadRequest(new { error = "Grid dimensions too large (max 200x200)" });

            // Start and End points are essential for pathfinding. We can't proceed without them.
            if (request.StartPoint == null || request.EndPoint == null)
                return BadRequest(new { error = "Start and end points are required" });

            // Verify that the start point is actually inside the boundaries of our grid.
            if (request.StartPoint.X < 0 || request.StartPoint.X >= request.Width ||
                request.StartPoint.Y < 0 || request.StartPoint.Y >= request.Height)
                return BadRequest(new { error = "Start point is outside grid bounds" });

            // Similarly, the end point must also be valid and within the grid.
            if (request.EndPoint.X < 0 || request.EndPoint.X >= request.Width ||
                request.EndPoint.Y < 0 || request.EndPoint.Y >= request.Height)
                return BadRequest(new { error = "End point is outside grid bounds" });

            // If the user provided obstacles, we validate every single one of them.
            if (request.Obstacles != null)
            {
                foreach (var obstacle in request.Obstacles)
                {
                    // Obstacles must also be placed strictly within the grid.
                    if (obstacle.X < 0 || obstacle.X >= request.Width ||
                        obstacle.Y < 0 || obstacle.Y >= request.Height)
                        return BadRequest(new { error = "Obstacle is outside grid bounds" });
                    
                    // Pathfinding is impossible if the start or end is an obstacle.
                    if (obstacle.X == request.StartPoint.X && obstacle.Y == request.StartPoint.Y)
                        return BadRequest(new { error = "Obstacle cannot be at start point" });
                    
                    if (obstacle.X == request.EndPoint.X && obstacle.Y == request.EndPoint.Y)
                        return BadRequest(new { error = "Obstacle cannot be at end point" });
                }
            }

            // --- Business Logic ---
            // Now that we've confirmed the input is safe and valid, we hand it off to the service 
            // which performs the actual, heavy pathfinding logic (A* or Dijkstra).
            var result = _pathfindingService.FindPath(request);
            
            // We return a 200 OK HTTP status along with the result data (the found path).
            return Ok(result);
        }
        catch (Exception ex)
        {
            // If anything goes wrong inside the logic or validations, we catch it here 
            // and securely return the error message.
            return BadRequest(new { error = ex.Message });
        }
    }
}
