# Security notes: northspan

This note covers what the planner enforces, what it leaves out, and how
to place it. Read it alongside the API surface in
[Program.cs](engine/src/Northspan.Api/Program.cs) and the endpoints it maps.

## What this is

A labor-standards and pick-path engine with an HTTP API. The site is a
static export with no server-side runtime. The engine walks fixture floors;
it stores nothing, keeps no accounts, and collects no personal data. The
threat model is an operator's machine or a closed lab network. The public
internet is out of scope.

## What is enforced

- **A bearer-token gate** (`NORTHSPAN_TOKEN` or `Auth:Token`). When set,
  every route except `/health`, `/ready`, `/metrics`, and the built-in page at `/` answers 401 without
  `Authorization: Bearer …`. The comparison uses
  `CryptographicOperations.FixedTimeEquals`.
- **A per-client rate limit** built from ASP.NET Core's limiter
  (`NORTHSPAN_RATE_LIMIT`, default 600 per minute): fixed window per remote
  address, `Retry-After` on refusals, refusals rendered as
  `application/problem+json`.
- **A request body cap** (`NORTHSPAN_MAX_BODY`, default 1 MiB): refused
  before the body is read, and Kestrel's `MaxRequestBodySize` enforces the
  same number at the socket.
- **Strict input handling.** Planning refusals render as problem details
  with reasons. The location-master CSV importer validates every row against
  the floor it joins (runs, stands, building bounds) and refuses bad rows
  with a reason. No route writes to disk.
- **Escaped output everywhere.** Every engine-derived string that reaches
  a page passes through an HTML escaper before it renders.
- **No cross-origin surface.** The API sets no CORS policy, so browsers
  treat it same-origin only.

## What it leaves out

- **No per-user identity.** One shared token; the planner cannot scope by
  caller.
- **No audit trail.** Request logging is the structured line, not a record
  of who.
- **No TLS termination.** Kestrel here speaks plain HTTP; front it with a
  gateway if it leaves the loopback.

## Deployment guidance

The default bind is loopback with the gate off. For anything wider: set
`NORTHSPAN_TOKEN`, terminate TLS at a gateway, scrape `/metrics` from
inside. The Docker image and `compose.yaml` carry the same knobs.

## Fixture provenance

The published floors and their tickets carry a checksum manifest
(`engine/fixtures/MANIFEST`, `sha256sum -c` format, recursive paths),
verified by CI on every push. Regenerate over the committed bytes.
Line-ending conversion differs by platform, so the checked-out files can
hash differently: `git cat-file -p HEAD:<fixture> | sha256sum` is the
portable way, and the diff review is the checkpoint.

## Reporting

Open an issue in this repository. This is a portfolio project. These notes
describe the posture; they certify nothing.
