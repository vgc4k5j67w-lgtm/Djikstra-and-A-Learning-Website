using System;
using System.Collections.Generic;
using System.Linq;
using PathfindingEdu.Models;

namespace PathfindingEdu.Services;

// This interface defines a contract for pathfinding algorithms. 
// Standardizing algorithms under one interface makes it easy to add new ones later without changing core code.
public interface IPathfindingAlgorithm
{
    PathfindingResult FindPath(GridConfiguration grid);
}

// AStar (A*) is an advanced algorithm that uses both distance from the start (GCost) AND
// an estimated distance to the goal (HCost/Heuristic) to search efficiently.
public class AStarAlgorithm : IPathfindingAlgorithm
{
    // Costs for movement. Traveling diagonally is longer than traveling straight.
    // Assuming a square with side 10, the diagonal is roughly 14 (due to Pythagorean theorem).
    private const int Diagonal = 14;
    private const int Straight = 10;

    public PathfindingResult FindPath(GridConfiguration grid)
    {
        var result = new PathfindingResult { Algorithm = "A*" };
        var startTime = DateTime.UtcNow;

        // openSet represents the boundary of cells that have been discovered but not yet evaluated.
        var openSet = new HashSet<Cell>();
        
        // closedSet holds cells that have already been evaluated. No need to look at them again.
        var closedSet = new HashSet<Cell>();
        
        // Convert obstacles to a HashSet. Doing this transforms a list lookup (O(N) time)
        // into a set lookup (O(1) time), massively speeding up collision checks.
        var obstacleSet = new HashSet<Coordinate>(
            grid.Obstacles.Where(o => o != null),
            new CoordinateEqualityComparer()
        );

        // Prepare the starting and ending nodes.
        var startCell = new Cell { X = grid.StartPoint.X, Y = grid.StartPoint.Y, GCost = 0 };
        var endCell = new Cell { X = grid.EndPoint.X, Y = grid.EndPoint.Y };

        // HCost (Heuristic Cost) guesses the remaining distance to the target. It directs the pathfinder.
        startCell.HCost = ManhattanDistance(startCell, endCell);
        // FCost = GCost (distance traveled so far) + HCost. We try to pick paths with the lowest FCost.
        startCell.FCost = startCell.HCost;

        openSet.Add(startCell);

        while (openSet.Count > 0)
        {
            // Among the cells we are considering, pick the one with the lowest total cost.
            var current = openSet.OrderBy(c => c.FCost).First();

            // If we've reached the target, reconstruct the path and break out of the loop.
            if (current.Equals(endCell))
            {
                result.Path = ReconstructPath(current);
                result.Found = true;
                result.StepsCount = closedSet.Count;
                result.VisitedCells = closedSet.Select(c => new Coordinate(c.X, c.Y)).ToList();
                break;
            }

            // Move the current cell from "to consider" to "evaluated"
            openSet.Remove(current);
            closedSet.Add(current);
            result.VisitedCells.Add(new Coordinate(current.X, current.Y));

            // Find all valid adjacent cells we can move to.
            var neighbors = GetNeighbors(current, grid.Width, grid.Height, obstacleSet);

            foreach (var neighbor in neighbors)
            {
                // Ignore neighbors we've already evaluated fully.
                if (closedSet.Any(c => c.X == neighbor.X && c.Y == neighbor.Y))
                    continue;

                // The GCost is what it's cost to get from the start, *through* the current node, to the neighbor.
                var tentativeGCost = current.GCost + GetDistance(current, neighbor);

                // See if this neighbor is already in the open set (maybe we found it a different way)
                var openNeighbor = openSet.FirstOrDefault(c => c.X == neighbor.X && c.Y == neighbor.Y);
                if (openNeighbor != null)
                {
                    // If this new path to the neighbor is faster (lower GCost) than the old one, update it.
                    if (tentativeGCost < openNeighbor.GCost)
                    {
                        openNeighbor.GCost = tentativeGCost;
                        openNeighbor.FCost = openNeighbor.GCost + openNeighbor.HCost;
                        openNeighbor.Parent = current; // Save where we came from to reconstruct the path!
                    }
                }
                else
                {
                    // If it wasn't in the open set, calculate its values and add it to be considered entirely.
                    neighbor.GCost = tentativeGCost;
                    neighbor.HCost = ManhattanDistance(neighbor, endCell);
                    neighbor.FCost = neighbor.GCost + neighbor.HCost;
                    neighbor.Parent = current; // Remember who our parent is for path tracking.
                    openSet.Add(neighbor);
                }
            }
        }

        // Measure how long execution took
        result.ExecutionTimeMs = (long)(DateTime.UtcNow - startTime).TotalMilliseconds;
        return result;
    }

    // Fetches all neighboring cells checking all 8 directions (including diagonals)
    private List<Cell> GetNeighbors(Cell cell, int width, int height, HashSet<Coordinate> obstacles)
    {
        var neighbors = new List<Cell>();
        var directions = new[] 
        {
            (-1, -1), (-1, 0), (-1, 1),
            (0, -1),           (0, 1),
            (1, -1),  (1, 0),  (1, 1)
        };

        foreach (var (dx, dy) in directions)
        {
            var newX = cell.X + dx;
            var newY = cell.Y + dy;

            var coord = new Coordinate(newX, newY);
            // Verify bounds and check that there's no obstacle here.
            if (newX >= 0 && newX < width && newY >= 0 && newY < height &&
                !obstacles.Contains(coord))
            {
                neighbors.Add(new Cell { X = newX, Y = newY });
            }
        }

        return neighbors;
    }

    // Helper to determine cost to adjacent cells (straight vs diagonal).
    private double GetDistance(Cell from, Cell to)
    {
        var dx = Math.Abs(from.X - to.X);
        var dy = Math.Abs(from.Y - to.Y);
        return dx + dy > 1 ? Diagonal : Straight;
    }

    // The heuristic. Manhattan distance is the distance in grids (x diff + y diff).
    private double ManhattanDistance(Cell from, Cell to)
    {
        return Math.Abs(from.X - to.X) + Math.Abs(from.Y - to.Y);
    }

    // Since each cell records its "Parent", we start at the end point and walk backwards 
    // to build the complete final path, reversing it to become Start -> End.
    private List<Coordinate> ReconstructPath(Cell cell)
    {
        var path = new List<Coordinate>();
        var current = cell;

        while (current != null)
        {
            path.Add(new Coordinate(current.X, current.Y));
            current = current.Parent;
        }

        path.Reverse();
        return path;
    }
}

// Dijkstra is much slower than A* because it doesn't try to guess where the end is (no Heuristics).
// It acts like water radiating outward, evaluating nodes uniformly in all directions.
public class DijkstraAlgorithm : IPathfindingAlgorithm
{
    private const int Diagonal = 14;
    private const int Straight = 10;

    public PathfindingResult FindPath(GridConfiguration grid)
    {
        var result = new PathfindingResult { Algorithm = "Dijkstra" };
        var startTime = DateTime.UtcNow;

        // Tracks the minimal distance from Start for every single point.
        var distances = new Dictionary<Coordinate, double>(new CoordinateEqualityComparer());
        
        // Keeps track of the "breadcrumbs" to reconstruct the path later.
        var previous = new Dictionary<Coordinate, Coordinate?>(new CoordinateEqualityComparer());
        
        // List of cells we haven't checked yet.
        var unvisited = new HashSet<Coordinate>(new CoordinateEqualityComparer());
        
        // High-performance obstacle lookup structure.
        var obstacleSet = new HashSet<Coordinate>(
            grid.Obstacles.Where(o => o != null),
            new CoordinateEqualityComparer()
        );

        // Initialization: populate grid, pretend all distances are basically infinite initially.
        for (int x = 0; x < grid.Width; x++)
        {
            for (int y = 0; y < grid.Height; y++)
            {
                var coord = new Coordinate(x, y);
                if (!obstacleSet.Contains(coord))
                {
                    distances[coord] = double.MaxValue;
                    previous[coord] = null;
                    unvisited.Add(coord);
                }
            }
        }

        // Distance to start is 0. 
        var startCoord = new Coordinate(grid.StartPoint.X, grid.StartPoint.Y);
        distances[startCoord] = 0;

        while (unvisited.Count > 0)
        {
            // Pick an unvisited cell with the smallest known distance from start.
            // (Note: finding the minimum this way is slow. In a production app you'd use a Priority Queue).
            var current = unvisited.OrderBy(c => distances[c]).First();

            // When we reach our destination, stop. We found the shortest valid path!
            if (current.Equals(grid.EndPoint))
                break;

            unvisited.Remove(current);
            result.VisitedCells.Add(new Coordinate(current.X, current.Y));

            // View valid open neighbors
            var neighbors = GetNeighbors(current, grid.Width, grid.Height, obstacleSet, unvisited);

            foreach (var neighbor in neighbors)
            {
                // Alt is the path distance from start traversing strictly through "current".
                var alt = distances[current] + GetDistance(current, neighbor);

                // If that's strictly shorter/faster than how we got to neighbor previously, use this alternate route!
                if (alt < distances[neighbor])
                {
                    distances[neighbor] = alt;
                    previous[neighbor] = current;
                }
            }
        }

        // Finish up: construct the output if a path succeeded.
        var endCoord = new Coordinate(grid.EndPoint.X, grid.EndPoint.Y);
        if (distances.ContainsKey(endCoord) && distances[endCoord] != double.MaxValue)
        {
            result.Path = ReconstructPath(endCoord, previous);
            result.Found = true;
            result.PathCost = distances[endCoord];
        }

        result.StepsCount = result.VisitedCells.Count;
        result.ExecutionTimeMs = (long)(DateTime.UtcNow - startTime).TotalMilliseconds;
        return result;
    }

    private List<Coordinate> GetNeighbors(Coordinate cell, int width, int height, 
        HashSet<Coordinate> obstacles, HashSet<Coordinate> unvisited)
    {
        var neighbors = new List<Coordinate>();
        var directions = new[] 
        {
            (-1, -1), (-1, 0), (-1, 1),
            (0, -1),           (0, 1),
            (1, -1),  (1, 0),  (1, 1)
        };

        foreach (var (dx, dy) in directions)
        {
            var newX = cell.X + dx;
            var newY = cell.Y + dy;
            var neighbor = new Coordinate(newX, newY);

            // Bounds hit-test and obstacle bypassing.
            if (newX >= 0 && newX < width && newY >= 0 && newY < height &&
                !obstacles.Contains(neighbor) && unvisited.Contains(neighbor))
            {
                neighbors.Add(neighbor);
            }
        }

        return neighbors;
    }

    private double GetDistance(Coordinate from, Coordinate to)
    {
        var dx = Math.Abs(from.X - to.X);
        var dy = Math.Abs(from.Y - to.Y);
        return dx + dy > 1 ? Diagonal : Straight;
    }

    // Traces backwards mapping out the full path by checking each node's "previous" trail.
    private List<Coordinate> ReconstructPath(Coordinate current, Dictionary<Coordinate, Coordinate?> previous)
    {
        var path = new List<Coordinate>();

        while (true)
        {
            path.Add(new Coordinate(current.X, current.Y));
            if (!previous.TryGetValue(current, out var prev) || prev == null)
                break;
            current = prev;
        }

        path.Reverse();
        return path;
    }
}

// Without this comparer, C# doesn't inherently test to see whether two different 
// "Coordinate" objects have matching X & Y values, it just checks if they sit at the same place in memory.
// This tells dictionaries and HashSets precisely how to calculate matches based on actual content (X and Y coordinates).
public class CoordinateEqualityComparer : IEqualityComparer<Coordinate>
{
    public bool Equals(Coordinate? x, Coordinate? y)
    {
        if (x == null || y == null) return false;
        return x.X == y.X && x.Y == y.Y; // Values are considered equal if their coordinates precisely match
    }

    // Gets a hashed integer reflecting the exact contents of the object for quick set comparisons.
    public int GetHashCode(Coordinate obj)
    {
        return HashCode.Combine(obj.X, obj.Y);
    }
}

// Our generic Service class serving as an orchestrator or entry point.
public class PathfindingService
{
    // Evaluates finding requests, builds out the problem configuration, builds out an instance 
    // of the specifically requested algorithm logic, and runs it to return real paths to the controller.
    public PathfindingResult FindPath(PathfindingRequest request)
    {
        var grid = new GridConfiguration
        {
            Width = request.Width,
            Height = request.Height,
            StartPoint = request.StartPoint,
            EndPoint = request.EndPoint,
            Obstacles = request.Obstacles
        };

        // We use the Strategy Pattern here. We decide at runtime which algorithm 
        // class to spawn, letting us hot-swap out behaviors just depending on a string.
        IPathfindingAlgorithm algorithm = request.Algorithm.ToLower() == "dijkstra"
            ? new DijkstraAlgorithm()
            : new AStarAlgorithm();

        return algorithm.FindPath(grid);
    }
}
