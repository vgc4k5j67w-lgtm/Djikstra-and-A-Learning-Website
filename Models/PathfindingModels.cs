using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace PathfindingEdu.Models;

public class Coordinate
{
    [JsonPropertyName("x")]
    public int X { get; set; }
    
    [JsonPropertyName("y")]
    public int Y { get; set; }

    public Coordinate() { }

    public Coordinate(int x, int y)
    {
        X = x;
        Y = y;
    }

    public override bool Equals(object? obj)
    {
        if (obj is not Coordinate other) return false;
        return X == other.X && Y == other.Y;
    }

    public override int GetHashCode() => HashCode.Combine(X, Y);

    public static implicit operator (int X, int Y)(Coordinate c) => (c.X, c.Y);
    public static implicit operator Coordinate((int X, int Y) tuple) => new Coordinate(tuple.X, tuple.Y);
}

public class Cell
{
    public int X { get; set; }
    public int Y { get; set; }
    public CellType Type { get; set; }
    public double FCost { get; set; }
    public double GCost { get; set; }
    public double HCost { get; set; }
    public Cell? Parent { get; set; }

    public override bool Equals(object? obj)
    {
        if (obj is not Cell other) return false;
        return X == other.X && Y == other.Y;
    }

    public override int GetHashCode() => HashCode.Combine(X, Y);
}

public enum CellType
{
    Empty,
    Obstacle,
    Start,
    End,
    Path,
    Visited
}

public class GridConfiguration
{
    public int Width { get; set; }
    public int Height { get; set; }
    public List<Coordinate> Obstacles { get; set; } = new();
    public Coordinate StartPoint { get; set; } = new();
    public Coordinate EndPoint { get; set; } = new();
}

public class PathfindingResult
{
    [JsonPropertyName("path")]
    public List<Coordinate> Path { get; set; } = new();
    
    [JsonPropertyName("visitedCells")]
    public List<Coordinate> VisitedCells { get; set; } = new();
    
    [JsonPropertyName("found")]
    public bool Found { get; set; }
    
    [JsonPropertyName("stepsCount")]
    public int StepsCount { get; set; }
    
    [JsonPropertyName("pathCost")]
    public double PathCost { get; set; }
    
    [JsonPropertyName("algorithm")]
    public string Algorithm { get; set; } = string.Empty;
    
    [JsonPropertyName("executionTimeMs")]
    public long ExecutionTimeMs { get; set; }
}

public class PathfindingRequest
{
    [JsonPropertyName("width")]
    public int Width { get; set; }
    
    [JsonPropertyName("height")]
    public int Height { get; set; }
    
    [JsonPropertyName("obstacles")]
    public List<Coordinate> Obstacles { get; set; } = new();
    
    [JsonPropertyName("startPoint")]
    public Coordinate StartPoint { get; set; } = new();
    
    [JsonPropertyName("endPoint")]
    public Coordinate EndPoint { get; set; } = new();
    
    [JsonPropertyName("algorithm")]
    public string Algorithm { get; set; } = "astar"; // "astar" or "dijkstra"
}
