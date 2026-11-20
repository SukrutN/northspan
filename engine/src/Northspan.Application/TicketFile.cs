using System.Text.Json;

using Northspan.Domain;

namespace Northspan.Application;

public static class TicketFile
{
    public static Ticket Read(string path)
    {
        string json;
        try
        {
            json = File.ReadAllText(path);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            throw new TicketInvalidException($"The ticket file could not be read: {ex.Message}");
        }

        try
        {
            return Parse(json);
        }
        catch (JsonException ex)
        {
            throw new TicketInvalidException($"The ticket file could not be read: {ex.Message}");
        }
    }

    public static Ticket Parse(string json)
    {
        TicketDocument? document;
        try
        {
            document = JsonSerializer.Deserialize<TicketDocument>(json, FloorFile.Options);
        }
        catch (JsonException ex)
        {
            throw new TicketInvalidException($"The ticket file could not be read: {ex.Message}");
        }

        return FromDocument(document);
    }

    public static Ticket FromDocument(TicketDocument? document)
    {
        if (document is null)
        {
            throw new TicketInvalidException("The ticket file was empty.");
        }

        if (document.Locations is null)
        {
            throw new TicketInvalidException("The ticket file has no locations.");
        }

        return new Ticket(
            string.IsNullOrWhiteSpace(document.Id) ? null : document.Id.Trim(),
            string.IsNullOrWhiteSpace(document.House) ? null : document.House.Trim(),
            string.IsNullOrWhiteSpace(document.Note) ? null : document.Note.Trim(),
            document.Locations);
    }
}

public sealed class TicketInvalidException : PlanningException
{
    public TicketInvalidException(string message)
        : base(message)
    {
    }
}
