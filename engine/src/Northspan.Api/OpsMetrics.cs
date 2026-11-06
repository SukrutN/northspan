using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text;

namespace Northspan.Api;

/// <summary>
/// The engine's own work and its HTTP service, counted and rendered in
/// Prometheus text exposition format. Hand-rolled on purpose: the engine
/// keeps its zero-extra-package posture, and the metrics page matches the
/// rest of the family shape for shape.
/// </summary>
internal sealed class OpsMetrics
{
    private static readonly long[] LatencyBucketsMs = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

    private readonly long _startedAtTicks = Stopwatch.GetTimestamp();
    private long _walksPlanned;
    private long _walksRefused;

    // method|route|status -> count
    private readonly ConcurrentDictionary<string, long> _requests = new();
    // method|route -> one slot per bucket, then the sum, then the total
    private readonly ConcurrentDictionary<string, long[]> _latency = new();

    /// <summary>One walk planned and served.</summary>
    public void WalkPlanned() => Interlocked.Increment(ref _walksPlanned);

    /// <summary>One walk refused, for any reason the engine names.</summary>
    public void WalkRefused() => Interlocked.Increment(ref _walksRefused);

    /// <summary>One request observed on its way out.</summary>
    public void Observed(string method, string route, int status, double elapsedMs)
    {
        _requests.AddOrUpdate(method + "|" + route + "|" + status, 1, (_, count) => count + 1);
        long[] buckets = _latency.GetOrAdd(method + "|" + route,
            _ => new long[LatencyBucketsMs.Length + 2]);
        lock (buckets)
        {
            for (int i = 0; i < LatencyBucketsMs.Length; i++)
            {
                if (elapsedMs <= LatencyBucketsMs[i])
                {
                    buckets[i]++;
                }
            }
            buckets[LatencyBucketsMs.Length] += (long)elapsedMs;
            buckets[LatencyBucketsMs.Length + 1]++;
        }
    }

    /// <summary>The metrics page.</summary>
    public string Render()
    {
        StringBuilder out_ = new(2048);

        out_.Append("# HELP northspan_http_requests_total Requests served, by route, method, and status.\n")
            .Append("# TYPE northspan_http_requests_total counter\n");
        foreach (var row in _requests.OrderBy(pair => pair.Key, StringComparer.Ordinal))
        {
            string[] parts = row.Key.Split('|', 3);
            out_.Append("northspan_http_requests_total{method=\"").Append(Label(parts[0]))
                .Append("\",path=\"").Append(Label(parts[1]))
                .Append("\",status=\"").Append(Label(parts[2]))
                .Append("\"} ").Append(row.Value).Append('\n');
        }

        out_.Append("# HELP northspan_http_request_latency_ms Request latency in milliseconds, by route and method.\n")
            .Append("# TYPE northspan_http_request_latency_ms histogram\n");
        foreach (var row in _latency.OrderBy(pair => pair.Key, StringComparer.Ordinal))
        {
            string[] parts = row.Key.Split('|', 2);
            long[] buckets = row.Value;
            lock (buckets)
            {
                for (int i = 0; i < LatencyBucketsMs.Length; i++)
                {
                    out_.Append("northspan_http_request_latency_ms_bucket{method=\"").Append(Label(parts[0]))
                        .Append("\",path=\"").Append(Label(parts[1]))
                        .Append("\",le=\"").Append(LatencyBucketsMs[i]).Append("\"} ")
                        .Append(buckets[i]).Append('\n');
                }
                long count = buckets[LatencyBucketsMs.Length + 1];
                out_.Append("northspan_http_request_latency_ms_bucket{method=\"").Append(Label(parts[0]))
                    .Append("\",path=\"").Append(Label(parts[1]))
                    .Append("\",le=\"+Inf\"} ").Append(count).Append('\n');
                out_.Append("northspan_http_request_latency_ms_count{method=\"").Append(Label(parts[0]))
                    .Append("\",path=\"").Append(Label(parts[1])).Append("\"} ").Append(count).Append('\n');
                out_.Append("northspan_http_request_latency_ms_sum{method=\"").Append(Label(parts[0]))
                    .Append("\",path=\"").Append(Label(parts[1])).Append("\"} ")
                    .Append(buckets[LatencyBucketsMs.Length]).Append('\n');
            }
        }

        out_.Append("# HELP northspan_walks_planned_total Walks the engine planned and served.\n")
            .Append("# TYPE northspan_walks_planned_total counter\n")
            .Append("northspan_walks_planned_total ").Append(Interlocked.Read(ref _walksPlanned)).Append('\n');
        out_.Append("# HELP northspan_walks_refused_total Walks the engine refused, for any reason it named.\n")
            .Append("# TYPE northspan_walks_refused_total counter\n")
            .Append("northspan_walks_refused_total ").Append(Interlocked.Read(ref _walksRefused)).Append('\n');
        out_.Append("# HELP northspan_uptime_seconds Seconds this process has been serving.\n")
            .Append("# TYPE northspan_uptime_seconds gauge\n")
            .Append("northspan_uptime_seconds ")
            .Append((Stopwatch.GetTimestamp() - _startedAtTicks) / (double)Stopwatch.Frequency)
            .Append('\n');
        return out_.ToString();
    }

    private static string Label(string value) =>
        value.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", "\\n");
}
