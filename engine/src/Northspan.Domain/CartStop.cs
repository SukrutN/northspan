namespace Northspan.Domain;

/// <summary>
/// Where the cart actually stops. One stand, which may cover more than one slot.
/// The gate has no run.
/// </summary>
public sealed record CartStop(
    string Key,
    string? RunCode,
    string? Stand,
    double X,
    double Y,
    IReadOnlyList<string> Locations);
