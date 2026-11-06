using Microsoft.AspNetCore.Mvc;

namespace Northspan.Api;

/// <summary>
/// Serves the walk workbench: one HTML page embedded in this build, so the
/// engine ships with its own face and the page can never drift from the API.
/// </summary>
internal static class WorkbenchEndpoints
{
    public static void MapWorkbench(this WebApplication app)
    {
        app.MapGet("/", () => Results.Text(Page(), "text/html; charset=utf-8"))
            .WithName("Workbench")
            .WithTags("Workbench")
            .ExcludeFromDescription();
    }

    private static string? _page;

    private static string Page() => _page ??= ReadPage();

    private static string ReadPage()
    {
        var assembly = typeof(WorkbenchEndpoints).Assembly;
        using var stream = assembly.GetManifestResourceStream("Northspan.Api.web.index.html")
            ?? throw new InvalidOperationException("The workbench page is missing from this build.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}
