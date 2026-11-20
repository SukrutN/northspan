namespace Northspan.Domain;

public sealed record WalkStop(
    int Order,
    string Stand,
    IReadOnlyList<string> Locations,
    string RunCode,
    double X,
    double Y,
    double MetresFromPrevious,
    string Via);

/// <summary>
/// A cart walk and the unimproved sweep it was compared with.
/// Distance is the path the cart travels, including the return to the gate when the rule says so.
/// </summary>
public sealed record Walk(
    IReadOnlyList<WalkStop> Stops,
    double DistanceM,
    double SweepDistanceM,
    bool ReturnedToGate,
    IReadOnlyList<Point> Polyline,
    IReadOnlyList<Point> SweepPolyline);
