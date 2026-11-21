using System.Globalization;

using Northspan.Domain;

namespace Northspan.Application;

/// <summary>An import refusal: the CSV or the splice was refused, with words.</summary>
public sealed class ImportRefusalException(string message) : PlanningException(message);

/// <summary>One refused CSV row: the physical line, the location code if it
/// parsed, and the reasons in plain words.</summary>
public sealed record RowRejection(int Line, string Code, IReadOnlyList<string> Reasons);

/// <summary>
/// The import's paper trail: row counts, row refusions, and the notes worth
/// reading before walking the floor.
/// </summary>
public sealed record ImportReport(
    int RowsRead,
    int RowsAccepted,
    int RowsRejected,
    IReadOnlyList<RowRejection> Rejections,
    IReadOnlyList<string> Notes);

/// <summary>The import's result: the new floor document and the report.</summary>
public sealed record FloorImport(FloorDocument Floor, ImportReport Report);

/// <summary>
/// Reads a location master as CSV and splices it into a floor document. The
/// CSV is what a WMS location export actually carries: code, run, stand,
/// position along the run, and the SKU and item each face holds. The floor's
/// structure (runs, cross-aisles, the gate) stays with the document, because
/// the importer never invents geometry; every row is validated against the
/// floor it joins, with the engine's own rules as the words.
/// </summary>
public static class FloorCsv
{
    private static readonly string[] RequiredColumns = ["code", "run", "stand", "alongM"];
    private static readonly string[] OptionalColumns = ["sku", "item"];

    /// <summary>
    /// Replaces the floor's slots with the CSV's rows. The resulting document
    /// is proven through the engine's own floor reader by the caller, so
    /// what leaves here is a floor the walk planner accepts, or the refusal
    /// says why not.
    /// </summary>
    public static FloorImport Slots(FloorDocument floor, string csv)
    {
        List<string> problems = [];
        var rows = ParseCsv(csv, problems);
        if (problems.Count > 0)
        {
            throw new ImportRefusalException(string.Join(" ", problems));
        }

        // Map header names to column indexes; strict, because a typo'd column
        // would silently drop a location.
        var header = rows[0].Cells;
        var columns = new Dictionary<string, int>(StringComparer.Ordinal);
        for (var i = 0; i < header.Length; i++)
        {
            var name = header[i].Trim();
            if (!RequiredColumns.Contains(name) && !OptionalColumns.Contains(name))
            {
                problems.Add($"The CSV header has an unknown column: {name}.");
            }
            else if (columns.ContainsKey(name))
            {
                problems.Add($"The CSV header lists {name} twice.");
            }
            else
            {
                columns[name] = i;
            }
        }
        foreach (var need in RequiredColumns)
        {
            if (!columns.ContainsKey(need))
            {
                problems.Add($"The CSV header is missing the {need} column.");
            }
        }
        if (problems.Count > 0)
        {
            throw new ImportRefusalException(string.Join(" ", problems));
        }

        var runsOnFloor = floor.Runs?.Select(run => Floor.NormalizeCode(run.Code ?? "")).ToHashSet()
            ?? new HashSet<string>();
        var rejections = new List<RowRejection>();
        var slots = new List<SlotDocument>();
        var seenCodes = new HashSet<string>(StringComparer.Ordinal);
        var standClaims = new Dictionary<string, (string Run, double Along)>(StringComparer.Ordinal);

        for (var r = 1; r < rows.Count; r++)
        {
            var row = rows[r];
            var reasons = new List<string>();
            var code = Column(row.Cells, columns, "code").Trim();
            var run = Column(row.Cells, columns, "run").Trim();
            var stand = Column(row.Cells, columns, "stand").Trim();
            var sku = Column(row.Cells, columns, "sku").Trim();
            var item = Column(row.Cells, columns, "item").Trim();

            if (code.Length == 0)
            {
                reasons.Add("code is empty.");
            }
            else
            {
                var normalized = Floor.NormalizeCode(code);
                if (seenCodes.Contains(normalized))
                {
                    reasons.Add($"{code} is listed twice in this file.");
                }
            }
            if (stand.Length == 0)
            {
                reasons.Add("stand is empty.");
            }
            if (run.Length == 0)
            {
                reasons.Add("run is empty.");
            }
            else if (!runsOnFloor.Contains(Floor.NormalizeCode(run)))
            {
                reasons.Add($"run {run} is not on this floor; the runs are "
                    + string.Join(", ", floor.Runs?.Select(each => each.Code) ?? []) + ".");
            }
            if (!TryNumber(Column(row.Cells, columns, "alongM"), out var along))
            {
                reasons.Add("alongM is not a usable number.");
            }
            else if (along < 0 || along > floor.HeightM)
            {
                reasons.Add($"alongM {along} is outside the building; the floor is {floor.HeightM} m tall.");
            }
            if (columns.ContainsKey("sku") && sku.Length == 0)
            {
                reasons.Add("sku is present in the header but empty for this row; omit the column or name one.");
            }
            if (columns.ContainsKey("item") && item.Length == 0)
            {
                reasons.Add("item is present in the header but empty for this row; omit the column or name one.");
            }
            if (reasons.Count > 0)
            {
                rejections.Add(new RowRejection(row.Line, code, reasons));
                continue;
            }

            // a stand is one working position: two rows claiming the same
            // stand must agree on where it is
            if (standClaims.TryGetValue(stand, out var claim))
            {
                if (claim.Run != Floor.NormalizeCode(run) || Math.Abs(claim.Along - along) > 1e-9)
                {
                    reasons.Add($"stand {stand} is claimed by two different positions.");
                    rejections.Add(new RowRejection(row.Line, code, reasons));
                    continue;
                }
            }
            else
            {
                standClaims[stand] = (Floor.NormalizeCode(run), along);
            }

            seenCodes.Add(Floor.NormalizeCode(code));
            slots.Add(new SlotDocument
            {
                Code = code,
                Run = run,
                Stand = stand,
                AlongM = along,
                Sku = sku.Length > 0 ? sku : null,
                Item = item.Length > 0 ? item : null,
            });
        }

        if (rows.Count == 1)
        {
            // a header with no data rows: nothing to report, so a refusal
            throw new ImportRefusalException("The CSV carried no data rows.");
        }

        var replaced = floor.Slots?.Count ?? 0;
        var notes = new List<string>();
        if (slots.Count == 0)
        {
            // rows exist but every one was refused: the report is the answer,
            // and the floor keeps its published slots
            notes.Add("Every row was refused; the floor keeps its published slots.");
        }
        else
        {
            notes.Add($"The floor's {replaced} published slots were replaced by {slots.Count} imported locations.");
        }

        var next = new FloorDocument
        {
            Id = floor.Id,
            Name = floor.Name,
            WidthM = floor.WidthM,
            HeightM = floor.HeightM,
            CrossAisles = floor.CrossAisles,
            Gate = floor.Gate,
            Runs = floor.Runs,
            Slots = slots,
            Landmarks = floor.Landmarks,
        };

        var report = new ImportReport(
            rows.Count - 1,
            slots.Count,
            rejections.Count,
            rejections,
            notes);
        return new FloorImport(next, report);
    }

    private static string Column(string[] cells, Dictionary<string, int> columns, string name)
    {
        if (!columns.TryGetValue(name, out var index) || index >= cells.Length)
        {
            return "";
        }
        return cells[index];
    }

    private static bool TryNumber(string raw, out double value)
    {
        return double.TryParse(raw.Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out value)
            && double.IsFinite(value);
    }

    /// <summary>One parsed CSV row: its cells and the physical line it began on.</summary>
    private sealed record Row(string[] Cells, int Line);

    /// <summary>
    /// A small honest CSV reader: quoted fields, doubled quotes inside them,
    /// either line ending, blank lines skipped. Line numbers are physical.
    /// </summary>
    private static List<Row> ParseCsv(string csv, List<string> problems)
    {
        var rows = new List<Row>();
        var cells = new List<string>();
        var cell = new System.Text.StringBuilder();
        var line = 1;
        var inQuotes = false;
        var quotedCell = false;

        for (var i = 0; i <= csv.Length; i++)
        {
            char c = i < csv.Length ? csv[i] : '\n';
            if (inQuotes)
            {
                if (c == '"')
                {
                    if (i + 1 < csv.Length && csv[i + 1] == '"')
                    {
                        cell.Append('"');
                        i++;
                    }
                    else
                    {
                        inQuotes = false;
                    }
                }
                else
                {
                    cell.Append(c);
                    if (c == '\n')
                    {
                        line++;
                    }
                }
                continue;
            }
            switch (c)
            {
                case '"':
                    if (cell.Length == 0 && !quotedCell)
                    {
                        inQuotes = true;
                        quotedCell = true;
                    }
                    else
                    {
                        cell.Append(c);
                    }
                    break;
                case ',':
                    cells.Add(cell.ToString());
                    cell.Clear();
                    quotedCell = false;
                    break;
                case '\r':
                    if (i + 1 < csv.Length && csv[i + 1] == '\n')
                    {
                        continue;
                    }
                    FinishRow(rows, cells, cell, line);
                    line++;
                    break;
                case '\n':
                    FinishRow(rows, cells, cell, line);
                    line++;
                    break;
                default:
                    cell.Append(c);
                    break;
            }
        }
        if (inQuotes)
        {
            problems.Add("The CSV ends inside an unterminated quoted field.");
        }
        if (rows.Count == 0)
        {
            problems.Add("The CSV carried no header row.");
        }
        return rows;
    }

    private static void FinishRow(List<Row> rows, List<string> cells, System.Text.StringBuilder cell, int line)
    {
        var blank = cell.Length == 0 && cells.All(value => value.Length == 0);
        cells.Add(cell.ToString());
        cell.Clear();
        if (!blank)
        {
            rows.Add(new Row(cells.ToArray(), line));
        }
        cells.Clear();
    }
}
