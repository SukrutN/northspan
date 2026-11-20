namespace Northspan.Domain;

/// <summary>A walk that cannot be planned from the floor and the ticket as given.</summary>
public abstract class PlanningException : Exception
{
    protected PlanningException(string message)
        : base(message)
    {
    }
}

/// <summary>The building cannot be walked: a missing aisle, a slot off the map, or a broken measurement.</summary>
public sealed class FloorInvalidException : PlanningException
{
    public FloorInvalidException(string message)
        : base(message)
    {
    }
}

/// <summary>The ticket names a location the floor does not have. The planner does not invent a stop.</summary>
public sealed class UnknownLocationException : PlanningException
{
    public UnknownLocationException(string location, string floorName)
        : base($"No slot is marked '{location}' on {floorName}.")
    {
        Location = location;
    }

    public string Location { get; }
}

/// <summary>A cart walk needs somewhere to stop.</summary>
public sealed class EmptyTicketException : PlanningException
{
    public EmptyTicketException()
        : base("The ticket has no locations. A walk needs at least one stop.")
    {
    }
}
