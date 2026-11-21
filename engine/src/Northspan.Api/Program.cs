using Northspan.Api;
using Northspan.Application;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<PlanningExceptionHandler>();

var fixturesRoot = builder.Configuration["Fixtures:Root"];
if (string.IsNullOrWhiteSpace(fixturesRoot))
{
    fixturesRoot = Environment.GetEnvironmentVariable("NORTHSPAN_FIXTURES");
}

if (string.IsNullOrWhiteSpace(fixturesRoot))
{
    fixturesRoot = FixtureLibrary.Discover();
}

builder.Services.AddSingleton(new FixtureLibrary(fixturesRoot));
builder.Services.AddSingleton<PlanWalk>();

var app = builder.Build();

app.UseExceptionHandler();
app.MapOpenApi();
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }))
    .WithName("Health")
    .WithTags("Health");
app.MapFloors();
app.MapWalks();
app.MapStandards();
app.MapWorkbench();

app.Run();

public partial class Program;
