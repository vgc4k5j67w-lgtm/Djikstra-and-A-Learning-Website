using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PathfindingEdu.Models;

namespace PathfindingEdu.Data;

public static class SeedData
{
    public static void Initialise(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Create DB if it doesn't exist (simple dev initialization)
        db.Database.EnsureCreated();

        var quiz = db.Quizzes.FirstOrDefault(q => q.Title == "Quiz");
        if (quiz == null)
        {
            quiz = new Quiz
            {
                Title = "Quiz",
                Description = "Test your knowledge of pathfinding algorithms!",
                IsActive = true
            };

            db.Quizzes.Add(quiz);
            db.SaveChanges();
        }

        var existingQuestionTexts = db.Questions
            .AsNoTracking()
            .Where(q => q.QuizId == quiz.Id)
            .Select(q => q.Text)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var maxExistingOrder = db.Questions
            .AsNoTracking()
            .Where(q => q.QuizId == quiz.Id)
            .Select(q => (int?)q.Order)
            .Max() ?? 0;

        var seededQuestions = BuildDefaultQuestions();
        var nextOrder = maxExistingOrder;
        var addedCount = 0;

        foreach (var question in seededQuestions)
        {
            if (existingQuestionTexts.Contains(question.Text))
            {
                continue;
            }

            question.QuizId = quiz.Id;
            nextOrder++;
            question.Order = nextOrder;

            db.Questions.Add(question);
            existingQuestionTexts.Add(question.Text);
            addedCount++;
        }

        if (addedCount > 0)
        {
            db.SaveChanges();
        }
    }

    private static List<Question> BuildDefaultQuestions()
    {
        return new List<Question>
        {
            new()
            {
                Type = QuestionType.MultipleChoice,
                Text = "Which data structure is most appropriate for efficiently selecting the next node in Dijkstra's algorithm?",
                Points = 1,
                Choices = new[]
                {
                    new Choice { Text = "A standard queue", IsCorrect = false, Explanation = "A standard queue is FIFO, which is used for Breadth-First Search, not Dijkstra's." },
                    new Choice { Text = "A priority queue", IsCorrect = true, Explanation = "A priority queue allows us to efficiently extract the node with the lowest current distance." },
                    new Choice { Text = "A stack", IsCorrect = false, Explanation = "A stack is LIFO, which is used for Depth-First Search." },
                    new Choice { Text = "A hash table", IsCorrect = false, Explanation = "A hash table is used for fast lookups, not for prioritizing nodes based on cost." }
                }
            },
            new()
            {
                Type = QuestionType.LongAnswer,
                Text = "Explain what is meant by a shortest path algorithm",
                Points = 2,
                ModelAnswer = "A shortest path algorithm finds the path between two nodes in a graph that has the smallest total weight or cost, an example of where they are used is for network routing.",
                Hints = new[]
                {
                    new Hint { Text = "When are these algorithm used?", Order = 1 },
                }
            },
            new()
            {
                Type = QuestionType.LongAnswer,
                Text = "In the context of the A* algorithm, explain the purpose of the function f(x) = g(x) + h(x) and define both g(x) and h(x).",
                Points = 3,
                ModelAnswer = "The function f(x) calculates the total estimated cost of a path through node x. It prioritises which node to explore next. g(x) is the actual known cost from the start node to node x. h(x) is the heuristic, which is an estimated cost from node x to the goal.",
                Hints = new[]
                {
                    new Hint { Text = "What determines the priority of nodes?", Order = 1 },
                    new Hint { Text = "Define what the 'g' part tracks from the start.", Order = 2 },
                    new Hint { Text = "Define what the 'h' part guesses about the end.", Order = 3 }
                }
            },
            new()
            {
                Type = QuestionType.MultipleChoice,
                Text = "Which of these algorithms uses heuristics to calculate the shortest path?",
                Points = 1,
                Choices = new[]
                {
                    new Choice { Text = "A* algorithm", IsCorrect = true, Explanation = "A* uses heuristics to estimate the cost to reach the goal, guiding the search more efficiently." },
                    new Choice { Text = "Dijkstra's algorithm", IsCorrect = false, Explanation = "Dijkstra's algorithm does not use heuristics; it explores all possible paths equally." },
                    new Choice { Text = "Breadth-First Search", IsCorrect = false, Explanation = "Breadth-First Search explores all nodes at the current depth before moving deeper, without using heuristics." },
                    new Choice { Text = "Depth-First Search", IsCorrect = false, Explanation = "Depth-First Search explores as far as possible along each branch before backtracking, without using heuristics." }
                }
            },
            new()
            {
                Type = QuestionType.MultipleChoice,
                Text = "What Big-O time complexity represents Dijkstra's algorithm when implemented simply using an adjacency matrix and searching an array for the minimum distance?",
                Points = 1,
                Choices = new[]
                {
                    new Choice { Text = "O(V + E)", IsCorrect = false, Explanation = "This is the time complexity for Breadth-First Search on an adjacency list." },
                    new Choice { Text = "O(V^2)", IsCorrect = true, Explanation = "With a matrix and basic array, we check V nodes, and each node takes O(V) time to find the minimum unvisited distance." },
                    new Choice { Text = "O(1)", IsCorrect = false, Explanation = "O(1) implies the time taken is constant, regardless of the map size." },
                    new Choice { Text = "O(log V)", IsCorrect = false, Explanation = "O(log V) is typically for operations like binary search, not full graph traversals." }
                }
            },
            new()
            {
                Type = QuestionType.LongAnswer,
                Text = "Compare A* and Dijkstra's algorithm. Explain why A* is generally considered more efficient for finding a route between two towns on a map.",
                Points = 4,
                ModelAnswer = "Dijkstra's algorithm explores equally in all directions, regardless of where the goal is. A* uses a heuristic (like straight-line distance) to estimate the distance to the target. This heuristic directs the search towards the goal, meaning A* evaluates significantly fewer irrelevant nodes, making it faster and more memory efficient for map routing.",
                Hints = new[]
                {
                    new Hint { Text = "Think about how Dijkstra expands (like a circle).", Order = 1 },
                    new Hint { Text = "Mention the 'heuristic' and what it does in A*.", Order = 2 },
                    new Hint { Text = "Mention the effect on the number of nodes checked.", Order = 3 }
                }
            },
            new()
            {
                Type = QuestionType.MultipleChoice,
                Text = "For A* to guarantee that it finds the optimal (shortest) path, what condition must its heuristic h(x) meet?",
                Points = 1,
                Choices = new[]
                {
                    new Choice { Text = "It must be admissible (never overestimate the real cost)", IsCorrect = true, Explanation = "If the heuristic overestimates, A* might ignore the true shortest path thinking it is too expensive." },
                    new Choice { Text = "It must always overestimate the real cost", IsCorrect = false, Explanation = "Overestimating makes the algorithm fast but breaks its guarantee to find the best path." },
                    new Choice { Text = "It must equal 0 everywhere", IsCorrect = false, Explanation = "If h(x) is 0, A* simply becomes Dijkstra's algorithm, losing its speed advantage." },
                    new Choice { Text = "It must be calculated using a tree structure", IsCorrect = false, Explanation = "The data structure used doesn't affect the mathematical admissibility of the heuristic." }
                }
            },
            new()
            {
                Type = QuestionType.LongAnswer,
                Text = "A student is tracing Dijkstra's algorithm on an exam paper. Explain the purpose of keeping a list of 'visited' or 'closed' nodes during this trace.",
                Points = 3,
                ModelAnswer = "The visited list prevents the algorithm from processing the same node multiple times. This stops the algorithm from getting stuck in an infinite loop (a cycle). It also ensures efficiency by only expanding outwards to new frontiers, confirming the shortest route to a node is finalised once it enters the visited list.",
                Hints = new[]
                {
                    new Hint { Text = "What would happen if nodes linked back to each other?", Order = 1 },
                    new Hint { Text = "Mention the word 'cycle' or 'infinite loop'.", Order = 2 }
                }
            },
            new()
            {
                Type = QuestionType.MultipleChoice,
                Text = "Which of the following is NOT a common application of shortest path algorithms?",
                Points = 1,
                Choices = new[]
                {
                    new Choice { Text = "GPS navigation systems", IsCorrect = false, Explanation = "Shortest path algorithms are fundamental to GPS navigation for finding the best route." },
                    new Choice { Text = "Network routing protocols", IsCorrect = false, Explanation = "Shortest path algorithms help determine the most efficient paths for data packets in networks." },
                    new Choice { Text = "Social network analysis", IsCorrect = false, Explanation = "Shortest path algorithms can analyze connections and influence in social networks." },
                    new Choice { Text = "Image compression", IsCorrect = true, Explanation = "Image compression typically relies on different techniques like transform coding, not shortest path algorithms." }
                }
            },
            new()
             {
                 Type = QuestionType.MultipleChoice,
                 Text = "Which of the following statements about the A* algorithm is true?",
                 Points = 1,
                 Choices = new[]
                 {
                     new Choice { Text = "A* can only be used on unweighted graphs.", IsCorrect = false, Explanation = "A* can be used on both weighted and unweighted graphs." },
                     new Choice { Text = "A* guarantees the shortest path if the heuristic is admissible.", IsCorrect = true, Explanation = "An admissible heuristic ensures A* will find the optimal path." },
                     new Choice { Text = "A* is always faster than Dijkstra's algorithm.", IsCorrect = false, Explanation = "A* can be slower than Dijkstra's if the heuristic is poor or if the graph is small." },
                     new Choice { Text = "A* does not use a priority queue.", IsCorrect = false, Explanation = "A* typically uses a priority queue to manage nodes based on their f(x) values." }
                 }
             },
            new()
            {
                Type = QuestionType.MultipleChoice,
                Text = "In Dijkstra's algorithm, what happens when a node is marked as 'visited'?",
                Points = 1,
                Choices = new[]
                {
                    new Choice { Text = "It is added to the priority queue for further exploration.", IsCorrect = false, Explanation = "Visited nodes are not added back to the priority queue." },
                    new Choice { Text = "Its shortest path from the start node is finalized.", IsCorrect = true, Explanation = "Once a node is visited, its shortest path is determined and won't change." },
                    new Choice { Text = "It is removed from the graph.", IsCorrect = false, Explanation = "Visited nodes remain in the graph but are not processed again." },
                    new Choice { Text = "All of its neighbors are marked as visited as well.", IsCorrect = false, Explanation = "Only the current node is marked as visited; neighbors are processed separately." }
                }
            },
            new()
             {
                 Type = QuestionType.MultipleChoice,
                 Text = "Which of the following is a key difference between Dijkstra's algorithm and A* algorithm?",
                 Points = 1,
                 Choices = new[]
                 {
                     new Choice { Text = "Dijkstra's algorithm uses a heuristic to estimate the cost to reach the goal, while A* does not.", IsCorrect = false, Explanation = "A* uses a heuristic, while Dijkstra's does not." },
                     new Choice { Text = "Dijkstra's algorithm guarantees the shortest path regardless of the graph, while A* only guarantees it if the heuristic is admissible.", IsCorrect = true, Explanation = "Dijkstra's always finds the shortest path, while A* depends on the heuristic." },
                     new Choice { Text = "A* can only be used on directed graphs, while Dijkstra's can be used on both directed and undirected graphs.", IsCorrect = false, Explanation = "Both algorithms can be used on directed and undirected graphs." },
                     new Choice { Text = "Dijkstra's algorithm is more efficient than A* in all cases.", IsCorrect = false, Explanation = "A* can be more efficient than Dijkstra's when a good heuristic is used." }
                 }
             },
             new()
             {
                 Type = QuestionType.MultipleChoice,
                 Text = "Which condition must be true for Dijkstra’s algorithm to guarantee a correct shortest path?",
                 Points = 1,
                 Choices = new[]
                 {
                     new Choice { Text = "All edge weights must be non-negative.", IsCorrect = true, Explanation = "Dijkstra's algorithm requires non-negative edge weights to guarantee the shortest path." },
                     new Choice { Text = "The graph must be directed.", IsCorrect = false, Explanation = "Dijkstra's algorithm works on both directed and undirected graphs." },
                     new Choice { Text = "A* isalways faster than Dijkstra's algorithm.", IsCorrect = false, Explanation = "A* can be slower than Dijkstra's if the heuristic is poor or if the graph is small." },
                     new Choice { Text = "A* does not use a priority queue.", IsCorrect = false, Explanation = "A* typically uses a priority queue to manage nodes based on their f(x) values." }
                 }
             },
             new()
             {
                 Type = QuestionType.MultipleChoice,
                 Text = "Which of the following is NOT a common application of shortest path algorithms?",
                 Points = 1,
                 Choices = new[]
                 {
                     new Choice { Text = "GPS navigation systems", IsCorrect = false, Explanation = "Shortest path algorithms are fundamental to GPS navigation for finding the best route." },
                     new Choice { Text = "Network routing protocols", IsCorrect = false, Explanation = "Shortest path algorithms help determine the most efficient paths for data packets in networks." },
                     new Choice { Text = "Social network analysis", IsCorrect = false, Explanation = "Shortest path algorithms can analyze connections and influence in social networks." },
                     new Choice { Text = "Image compression", IsCorrect = true, Explanation = "Image compression typically relies on different techniques like transform coding, not shortest path algorithms." }
                 }
             },
             new()
             {
                 Type = QuestionType.MultipleChoice,
                 Text = "Which of the following statements about Djikstra's algorithm is true?",
                 Points = 1, 
                    Choices = new[]
                    {
                        new Choice { Text = "Dijkstra's algorithm can only be used on unweighted graphs.", IsCorrect = false, Explanation = "Dijkstra's algorithm is designed for weighted graphs." },
                        new Choice { Text = "Dijkstra's algorithm guarantees the shortest path regardless of the graph.", IsCorrect = true, Explanation = "Dijkstra's algorithm will always find the shortest path as long as there are no negative weight edges." },
                        new Choice { Text = "Dijkstra's algorithm is more efficient than A* in all cases.", IsCorrect = false, Explanation = "A* can be more efficient than Dijkstra's when a good heuristic is used." },
                        new Choice { Text = "Dijkstra's algorithm does not use a priority queue.", IsCorrect = false, Explanation = "Dijkstra's algorithm typically uses a priority queue to manage nodes based on their current shortest distance." }
                    }
             },
             new()
             {
                 Type = QuestionType.MultipleChoice,
                 Text = "What is the primary reason that Dijkstra's algorithm may perform poorly on large graphs compared to A*?",
                 Points = 1,
                Choices = new[]
                {
                    new Choice { Text = "Dijkstra's algorithm does not use a heuristic to guide the search, leading to more nodes being explored.", IsCorrect = true, Explanation = "Without a heuristic, Dijkstra's algorithm explores all possible paths equally, which can be inefficient on large graphs." },
                    new Choice { Text = "Dijkstra's algorithm is designed for unweighted graphs, making it less efficient on weighted graphs.", IsCorrect = false, Explanation = "Dijkstra's algorithm is specifically designed for weighted graphs." },
                    new Choice { Text = "Dijkstra's algorithm uses more memory than A* due to its data structures.", IsCorrect = false, Explanation = "While Dijkstra's can use more memory in some cases, the primary reason for poor performance is the lack of a heuristic." },
                    new Choice { Text = "Dijkstra's algorithm is not guaranteed to find the shortest path on large graphs.", IsCorrect = false, Explanation = "Dijkstra's algorithm will always find the shortest path as long as there are no negative weight edges." }
                }

             },
             new()
             {
                 Type = QuestionType.LongAnswer,
                 Text = "What is a heuristic in the context of pathfinding algorithms, and how does it influence the performance of the A* algorithm?",
                 Points = 3,
                 ModelAnswer = "A heuristic is an estimate of the cost to reach the goal from a given node. In A*, the heuristic helps prioritize which nodes to explore next. A good heuristic can significantly reduce the number of nodes A* needs to evaluate, improving performance. However, if the heuristic is poor (e.g., overestimates the cost), it can lead to inefficient searches and may even cause A* to fail to find the optimal path.",
                 Hints = new[]
                 {
                        new Hint { Text = "Define what a heuristic is in simple terms.", Order = 1 },
                        new Hint { Text = "Explain how A* uses the heuristic to decide which node to explore next.", Order = 2 },
                        new Hint { Text = "Discuss the impact of a good vs. poor heuristic on A*'s performance.", Order = 3 }
                 }
             }
        };
    }
}

