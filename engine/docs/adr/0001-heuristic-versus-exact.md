# ADR 0001: A heuristic route

## Status

Accepted.

## Context

The service plans one cart walk. The distance is an aisle metric: along a run, or out to a cross-aisle and across. The route starts at the gate and, by default, ends there. The number a floor lead compares against is a serpentine sweep with no look-ahead, measured before two-opt. Optimality is not part of the claim.

The published demo ticket, MR-204, is five stops. The other sample tickets are one, four, and five. A working pick ticket is a cart, not a day's work for the whole building.

## Decision

Build the route with nearest neighbour. Break distance ties by location code. Shorten it with two-opt, first improvement, endpoints fixed, and stop when a pass saves nothing. Run the same improvement on the serpentine sweep. Keep the shorter improved route. Report the sweep from before that improvement.

Ship no exact solver.

## Consequences

The walk is deterministic. MR-204 is 110.0 m against a 150.8 m sweep on every call. Two-opt cannot return a longer route than the one it was given, and it can stop at a local improvement. For a ticket of a handful of stops the gap to optimal is small beside the sweep the plan is judged against. For a ticket of one to about forty stops the search is instant and the result is stable.

Held-Karp, or another exact algorithm, would certify optimality up to roughly twenty stops and would leave the sweep figure alone. It is a reasonable later addition if a caller needs a certificate. The walk this service promises does not require one. Past a few dozen stops the exact algorithms stop being cheap, while the heuristic stays fast and keeps the sweep as the comparison that matters.

The two-opt search is capped at eighty improving passes. A correct improvement check finishes sooner. The cap is there so a bug cannot loop.
