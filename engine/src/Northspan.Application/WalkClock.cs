namespace Northspan.Application;

public static class WalkClock
{
    public static int RoundSeconds(double seconds) =>
        (int)Math.Max(0, Math.Round(seconds, MidpointRounding.AwayFromZero));

    public static string Format(double seconds)
    {
        var whole = RoundSeconds(seconds);
        var minutes = whole / 60;
        var remain = whole % 60;
        if (minutes == 0)
        {
            return $"{remain} sec";
        }

        return $"{minutes} min {remain:00} sec";
    }
}

public static class MetresText
{
    public static double Tenths(double metres) =>
        Math.Round(metres, 1, MidpointRounding.AwayFromZero);

    public static string Format(double metres) =>
        Tenths(metres).ToString("0.0", System.Globalization.CultureInfo.InvariantCulture);
}
