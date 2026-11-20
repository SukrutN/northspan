# ADR 0001: A heuristic tour, not an exact solver

## Status

Accepted.

## Context

The service plans one cart walk. The distance is an aisle metric: along a run, or out to a cross-aisle and across. The tour starts at the gate and, by default, ends there. The number a floor lead compares against is not the optimal tour. It is a serpentine sweep with no look-ahead, measured before two-opt.

The published Kiln Annex ticket, MR-204, is five stops. The other sample tickets are one, four, and five. A working pick ticket is a cart, not a day's work for the whole building.

## Decision

Build the tour with nearest neighbour. Break distance ties by location code. Shorten it with two-opt, first improvement, endpoints fixed, and stop when a pass saves nothing. Run the same improvement on the serpentine sweep. Keep the shorter improved tour. Report the sweep from before that improvement.

Do not ship an exact solver.

## Consequences

The walk is deterministic. MR-204 is 110.0 m against a 150.8 m sweep on every call. Two-opt cannot return a longer tour than the one it was given, and it can stop at a local improvement. For a ticket of a handful of stops the gap to optimal is small next to the sweep the plan is judged against. For a ticket of one to about forty stops the search is instant and the result is stable.

Held-Karp, or another exact algorithm, would certify optimality up to roughly twenty stops and would not change the sweep figure. It is a reasonable later addition if a caller needs a certificate. It is not required for the walk this service promises, and it would be the wrong default once a ticket grows past a few dozen stops: the exact algorithms stop being cheap, while the heuristic stays fast and still has the sweep as the comparison that matters.

The two-opt search is capped at eighty improving passes. A correct improvement check finishes sooner. The cap is there so a bug cannot loop.
