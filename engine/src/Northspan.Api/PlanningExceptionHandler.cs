using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

using Northspan.Application;
using Northspan.Domain;

namespace Northspan.Api;

internal sealed class PlanningExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var problem = Describe(exception);
        if (problem is null)
        {
            return false;
        }

        problem.Instance = httpContext.Request.Path;
        problem.Extensions["traceId"] = httpContext.TraceIdentifier;
        await Results.Problem(
            title: problem.Title,
            detail: problem.Detail,
            statusCode: problem.Status,
            type: problem.Type,
            instance: problem.Instance,
            extensions: problem.Extensions).ExecuteAsync(httpContext);
        return true;
    }

    private static ProblemDetails? Describe(Exception exception) => exception switch
    {
        UnknownLocationException unknown => Problem(
            StatusCodes.Status400BadRequest,
            "Unknown location",
            unknown.Message,
            "/problems/unknown-location",
            new Dictionary<string, object?> { ["location"] = unknown.Location }),
        EmptyTicketException empty => Problem(
            StatusCodes.Status400BadRequest,
            "Empty ticket",
            empty.Message,
            "/problems/empty-ticket"),
        FloorInvalidException floor => Problem(
            StatusCodes.Status400BadRequest,
            "Floor cannot be walked",
            floor.Message,
            "/problems/invalid-floor"),
        TicketInvalidException ticket => Problem(
            StatusCodes.Status400BadRequest,
            "Ticket cannot be read",
            ticket.Message,
            "/problems/invalid-ticket"),
        InvalidRulesException rules => Problem(
            StatusCodes.Status400BadRequest,
            "Walking rules are not usable",
            rules.Message,
            "/problems/invalid-rules"),
        InvalidStandardsException standards => Problem(
            StatusCodes.Status400BadRequest,
            "Standards cannot be built",
            standards.Message,
            "/problems/invalid-standards"),
        FixtureNotFoundException missing => Problem(
            StatusCodes.Status404NotFound,
            "Fixture not found",
            missing.Message,
            "/problems/not-found"),
        _ => null,
    };

    private static ProblemDetails Problem(
        int status,
        string title,
        string detail,
        string type,
        Dictionary<string, object?>? extensions = null)
    {
        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = detail,
            Type = type,
        };
        if (extensions is not null)
        {
            foreach (var (key, value) in extensions)
            {
                problem.Extensions[key] = value;
            }
        }

        return problem;
    }
}
