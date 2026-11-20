using System.Text.Json;

using Northspan.Domain;

namespace Northspan.Application;

public sealed class FixtureNotFoundException : PlanningException
{
    public FixtureNotFoundException(string message)
        : base(message)
    {
    }
}

public sealed record FixtureTicket(string Id, string? House, string? Note, int StopCount);

/// <summary>Named floors and tickets shipped as files. Kiln Annex is one of them, not a special case in the solver.</summary>
public sealed class FixtureLibrary
{
    private readonly string _root;

    public FixtureLibrary(string root)
    {
        if (string.IsNullOrWhiteSpace(root) || !Directory.Exists(root))
        {
            throw new DirectoryNotFoundException($"Fixture folder '{root}' was not found.");
        }

        _root = root;
    }

    public string Root => _root;

    public static string Discover()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var marker = Path.Combine(dir.FullName, "fixtures", "kiln-annex", "floor.json");
            if (File.Exists(marker))
            {
                return Path.Combine(dir.FullName, "fixtures");
            }

            dir = dir.Parent;
        }

        throw new DirectoryNotFoundException(
            "No fixtures folder was found. Set NORTHSPAN_FIXTURES to the fixtures directory.");
    }

    public IReadOnlyList<string> FloorIds()
    {
        return Directory.EnumerateDirectories(_root)
            .Where(dir => File.Exists(Path.Combine(dir, "floor.json")))
            .Select(dir => Path.GetFileName(dir)!)
            .OrderBy(name => name, StringComparer.Ordinal)
            .ToArray();
    }

    public Operation LoadOperation(string floorId)
    {
        var floor = LoadFloor(floorId);
        var dir = FloorDirectory(floorId);
        var path = Path.Combine(dir, "operation.json");
        if (!File.Exists(path))
        {
            throw new FixtureNotFoundException($"Floor '{floorId}' declares no operation, so it has no standard.");
        }

        return OperationFile.Read(path, floor);
    }

    public Floor LoadFloor(string id)
    {
        var dir = FloorDirectory(id);
        return FloorFile.Read(Path.Combine(dir, "floor.json"));
    }

    public FloorDocument ReadFloorDocument(string id)
    {
        var dir = FloorDirectory(id);
        var json = File.ReadAllText(Path.Combine(dir, "floor.json"));
        return JsonSerializer.Deserialize<FloorDocument>(json, FloorFile.Options)
            ?? throw new FloorInvalidException("The floor file was empty.");
    }

    public IReadOnlyList<FixtureTicket> Tickets(string floorId)
    {
        var dir = FloorDirectory(floorId);
        var tickets = Path.Combine(dir, "tickets");
        if (!Directory.Exists(tickets))
        {
            return [];
        }

        return Directory.EnumerateFiles(tickets, "*.json")
            .Select(TicketFile.Read)
            .Where(ticket => ticket.Id is not null)
            .Select(ticket => new FixtureTicket(ticket.Id!, ticket.House, ticket.Note, ticket.Locations.Count))
            .OrderBy(ticket => ticket.Id, StringComparer.Ordinal)
            .ToArray();
    }

    public Ticket LoadTicket(string floorId, string ticketId)
    {
        var dir = FloorDirectory(floorId);
        var tickets = Path.Combine(dir, "tickets");
        if (!Directory.Exists(tickets))
        {
            throw new FixtureNotFoundException($"Floor '{floorId}' has no tickets.");
        }

        Ticket? match = null;
        foreach (var file in Directory.EnumerateFiles(tickets, "*.json"))
        {
            var ticket = TicketFile.Read(file);
            var stem = Path.GetFileNameWithoutExtension(file);
            if (string.Equals(ticket.Id, ticketId, StringComparison.OrdinalIgnoreCase)
                || string.Equals(stem, ticketId, StringComparison.OrdinalIgnoreCase))
            {
                match = ticket;
                break;
            }
        }

        return match ?? throw new FixtureNotFoundException($"Floor '{floorId}' has no ticket '{ticketId}'.");
    }

    private string FloorDirectory(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            throw new FixtureNotFoundException("No fixture floor was named.");
        }

        foreach (var dir in Directory.EnumerateDirectories(_root))
        {
            var name = Path.GetFileName(dir);
            if (string.Equals(name, id, StringComparison.OrdinalIgnoreCase)
                && File.Exists(Path.Combine(dir, "floor.json")))
            {
                return dir;
            }
        }

        throw new FixtureNotFoundException($"No fixture floor is named '{id}'.");
    }
}
