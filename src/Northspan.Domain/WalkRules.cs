namespace Northspan.Domain;

/// <summary>
/// How this cart walks. Speed and dwell are not part of the floor.
/// The demo clock is 1.15 m/s, back to the gate, with reach at the face left out of the time.
/// </summary>
public sealed record WalkRules(double SpeedMps, bool MustReturn, double DwellSecondsPerStop)
{
    public static WalkRules Demo { get; } = new(1.15, true, 0);

    public void Check()
    {
        if (!double.IsFinite(SpeedMps) || SpeedMps <= 0)
        {
            throw new InvalidRulesException("Walking speed must be a positive number of metres per second.");
        }

        if (!double.IsFinite(DwellSecondsPerStop) || DwellSecondsPerStop < 0)
        {
            throw new InvalidRulesException("Dwell per stop cannot be negative.");
        }
    }
}

public sealed class InvalidRulesException : PlanningException
{
    public InvalidRulesException(string message)
        : base(message)
    {
    }
}
