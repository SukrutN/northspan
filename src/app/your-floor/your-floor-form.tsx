"use client";

import { useRef, useState } from "react";
import { Eyebrow } from "@/components/eyebrow";
import { EngineFloorMap } from "@/components/engine-floor-map";
import { HexMark } from "@/components/eyebrow";
import {
  DEMO_RULES,
  floorFromDocument,
  formatClock,
  formatMetres,
  planTicket,
  rulesFromDocument,
  ticketFromDocument,
  type Floor,
  type FloorDocument,
  type PlannedWalk,
  type RulesDocument,
  type Ticket,
  type TicketDocument,
  type WalkRules,
} from "@/lib/engine/planner";
import {
  buildStandards,
  mixLabel,
  operationFromDocument,
  type MixKind,
  type Operation,
  type OperationDocument,
  type OperationStandards,
} from "@/lib/engine/standards";

const BUCKET_COLOR: Record<MixKind, string> = {
  travel: "#ff5b2e",
  grabPerLine: "#c9b8ad",
  grabPerUnit: "#f4df99",
  countAndGive: "#bce2ff",
  cartManeuver: "#4d2523",
  putAndVerify: "#504414",
  packSplit: "#2f0705",
};

const SAMPLE_BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type Status = { text: string; error: boolean };

function FileRow({
  label,
  labelText,
  button,
}: {
  label: string;
  labelText: string;
  button: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <HexMark className="text-accent" />
        <p className="eyebrow">{label}</p>
      </div>
      <div className="mt-2">{button}</div>
      <p className="mt-2 text-sm text-muted-foreground">{labelText}</p>
    </div>
  );
}

export function YourFloorForm() {
  const floorInput = useRef<HTMLInputElement>(null);
  const operationInput = useRef<HTMLInputElement>(null);
  const rulesInput = useRef<HTMLInputElement>(null);
  const ticketInput = useRef<HTMLInputElement>(null);

  const [floor, setFloor] = useState<Floor | null>(null);
  const [floorText, setFloorText] = useState("not loaded");
  const [operation, setOperation] = useState<Operation | null>(null);
  const [operationText, setOperationText] = useState("not loaded (needed for standards)");
  const [rules, setRules] = useState<WalkRules | null>(null);
  const [rulesText, setRulesText] = useState("default: 1.15 m/s, returns to the gate");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [ticketText, setTicketText] = useState("not loaded (or paste codes below)");
  const [locations, setLocations] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [walkResult, setWalkResult] = useState<PlannedWalk | null>(null);
  const [standards, setStandards] = useState<OperationStandards | null>(null);

  const say = (text: string, error = false) => setStatus({ text, error });

  async function readJson(file: File): Promise<unknown> {
    const text = await file.text();
    return JSON.parse(text);
  }

  function loadedFloor(next: Floor, label: string) {
    setFloor(next);
    setFloorText(label);
    setOperation(null);
    setOperationText("not loaded (needed for standards)");
    setTicket(null);
    setTicketText("not loaded (or paste codes below)");
    setWalkResult(null);
    setStandards(null);
  }

  async function onFloor(file: File) {
    try {
      const next = floorFromDocument((await readJson(file)) as FloorDocument);
      loadedFloor(
        next,
        `${next.name}: ${next.widthM % 1 === 0 ? next.widthM : next.widthM.toFixed(1)} × ${
          next.heightM % 1 === 0 ? next.heightM : next.heightM.toFixed(1)
        } m, ${next.runs.length} aisles`,
      );
      say(`${next.name} is loaded.`);
    } catch (error) {
      say(error instanceof Error ? error.message : "The floor file could not be read.", true);
    }
  }

  async function onOperation(file: File) {
    if (!floor) {
      say("Load a floor first; the operation is checked against it.", true);
      return;
    }
    try {
      const next = operationFromDocument((await readJson(file)) as OperationDocument, floor);
      setOperation(next);
      setOperationText(`${next.id}: ${next.name}`);
      say(`${next.name} is loaded.`);
    } catch (error) {
      say(error instanceof Error ? error.message : "The operation file could not be read.", true);
    }
  }

  async function onRules(file: File) {
    try {
      const next = rulesFromDocument((await readJson(file)) as RulesDocument);
      setRules(next);
      setRulesText(
        `${next.speedMps} m/s, ${next.mustReturn ? "returns to the gate" : "one way"}`
          + (next.dwellSecondsPerStop > 0 ? `, ${next.dwellSecondsPerStop} s a stop` : ""),
      );
      say("The rules are loaded.");
    } catch (error) {
      say(error instanceof Error ? error.message : "The rules file could not be read.", true);
    }
  }

  async function onTicket(file: File) {
    try {
      const next = ticketFromDocument((await readJson(file)) as TicketDocument);
      setTicket(next);
      setTicketText(
        `${next.id ?? "ticket"}: ${next.house ?? "no house"}, ${next.locations.length} locations`,
      );
      say(next.id ? `Ticket ${next.id} is loaded.` : "The ticket is loaded.");
    } catch (error) {
      say(error instanceof Error ? error.message : "The ticket file could not be read.", true);
    }
  }

  async function loadSample(which: "kiln-annex" | "dry-store") {
    const suffix = which === "kiln-annex" ? "mr-204" : "ds-014";
    try {
      const [floorDoc, operationDoc, ticketDoc] = await Promise.all([
        fetch(`${SAMPLE_BASE}/samples/${which}/floor.json`).then((r) => r.json()),
        fetch(`${SAMPLE_BASE}/samples/${which}/operation.json`).then((r) => r.json()),
        fetch(`${SAMPLE_BASE}/samples/${which}/tickets/${suffix}.json`).then((r) => r.json()),
      ]);
      const nextFloor = floorFromDocument(floorDoc as FloorDocument);
      loadedFloor(
        nextFloor,
        `${nextFloor.name}: ${nextFloor.widthM} × ${nextFloor.heightM} m, ${nextFloor.runs.length} aisles`,
      );
      const nextOperation = operationFromDocument(operationDoc as OperationDocument, nextFloor);
      setOperation(nextOperation);
      setOperationText(`${nextOperation.id}: ${nextOperation.name}`);
      const nextTicket = ticketFromDocument(ticketDoc as TicketDocument);
      setTicket(nextTicket);
      setTicketText(
        `${nextTicket.id ?? "ticket"}: ${nextTicket.house ?? "no house"}, ${nextTicket.locations.length} locations`,
      );
      say(`The ${nextFloor.name} sample is loaded.`);
    } catch (error) {
      say(error instanceof Error ? error.message : `The ${which} sample could not be read.`, true);
    }
  }

  function ticketForPlan(): Ticket | null {
    const typed = locations
      .split(/[\r\n,]+/)
      .map((code) => code.trim())
      .filter((code) => code.length > 0);
    if (typed.length > 0) {
      return { id: null, house: null, note: null, locations: typed };
    }
    return ticket;
  }

  function onPlanWalk() {
    if (!floor) {
      say("Load a floor first.", true);
      return;
    }
    const nextTicket = ticketForPlan();
    if (!nextTicket) {
      say("Load a ticket or paste locations.", true);
      return;
    }
    try {
      const planned = planTicket(floor, nextTicket, rules ?? DEMO_RULES);
      setWalkResult(planned);
      say(`Planned a route of ${formatMetres(planned.walk.distanceM)} over ${planned.walk.stops.length} stops.`);
    } catch (error) {
      say(error instanceof Error ? error.message : "The walk could not be planned.", true);
    }
  }

  function onBuildStandards() {
    if (!floor) {
      say("Load a floor first.", true);
      return;
    }
    if (!operation) {
      say("Load an operation file first.", true);
      return;
    }
    const nextTicket = ticketForPlan();
    try {
      const built = buildStandards(floor, operation, nextTicket);
      setStandards(built);
      say("The standards are built.");
    } catch (error) {
      say(error instanceof Error ? error.message : "The standards could not be built.", true);
    }
  }

  const walk = walkResult?.walk ?? null;
  const saved = walk ? walk.sweepDistanceM - walk.distanceM : 0;
  const shorter =
    walk && walk.sweepDistanceM > 0 ? Math.round((saved / walk.sweepDistanceM) * 100) : 0;
  const aisleNames = new Map(floor?.crossAisles.map((aisle) => [aisle.id, aisle.name]) ?? []);

  return (
    <div className="mx-auto max-w-[115rem] px-4 pb-20 md:px-8">
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="rounded-lg border border-border bg-white p-6 lg:col-span-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-secondary"
              onClick={() => loadSample("kiln-annex")}
            >
              Demo floor (example)
            </button>
            <button
              type="button"
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-secondary"
              onClick={() => loadSample("dry-store")}
            >
              Dry Store (example)
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-6">
            <FileRow
              label="FLOOR"
              labelText={floorText}
              button={
                <input
                  ref={floorInput}
                  type="file"
                  accept=".json,application/json"
                  className="block w-full max-w-full text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-border file:bg-transparent file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-foreground hover:file:bg-secondary"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onFloor(file);
                    event.target.value = "";
                  }}
                />
              }
            />

            <FileRow
              label="OPERATION"
              labelText={operationText}
              button={
                <input
                  ref={operationInput}
                  type="file"
                  accept=".json,application/json"
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-border file:bg-transparent file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-foreground hover:file:bg-secondary"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onOperation(file);
                    event.target.value = "";
                  }}
                />
              }
            />

            <FileRow
              label="RULES"
              labelText={rulesText}
              button={
                <input
                  ref={rulesInput}
                  type="file"
                  accept=".json,application/json"
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-border file:bg-transparent file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-foreground hover:file:bg-secondary"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onRules(file);
                    event.target.value = "";
                  }}
                />
              }
            />

            <div>
              <FileRow
                label="TICKET"
                labelText={ticketText}
                button={
                  <input
                    ref={ticketInput}
                    type="file"
                    accept=".json,application/json"
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-border file:bg-transparent file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-foreground hover:file:bg-secondary"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) onTicket(file);
                      event.target.value = "";
                    }}
                  />
                }
              />
              <textarea
                value={locations}
                onChange={(event) => setLocations(event.target.value)}
                rows={4}
                spellCheck={false}
                placeholder="LOA-01-E, REE-01-W, CIN-06-W"
                className="mt-3 w-full rounded-lg border border-border bg-white p-3 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="h-11 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={onPlanWalk}
              >
                Plan walk
              </button>
              <button
                type="button"
                className="h-11 rounded-lg bg-secondary px-5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-[#c9b8ad]"
                onClick={onBuildStandards}
              >
                Build standards
              </button>
            </div>

            {status ? (
              <p
                className={`border-t border-border pt-3 text-sm ${
                  status.error ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {status.text}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-8">
          {walk && walkResult ? (
            <>
              <div className="rounded-lg bg-floor px-6 py-5 text-floor-ink">
                <p className="text-[1.05rem] font-medium">
                  {walkResult.floor.name}:{" "}
                  {walkResult.house ?? walkResult.ticketId ?? "pasted locations"}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="font-mono text-[11px] tracking-[0.14em] text-floor-ink/60 uppercase">
                      Planned
                    </p>
                    <p className="mt-1 font-heading text-2xl font-normal tracking-[-0.02em]">
                      {formatMetres(walk.distanceM)}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] tracking-[0.14em] text-floor-ink/60 uppercase">
                      Sweep
                    </p>
                    <p className="mt-1 font-heading text-2xl font-normal tracking-[-0.02em]">
                      {formatMetres(walk.sweepDistanceM)}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] tracking-[0.14em] text-floor-ink/60 uppercase">
                      Shorter
                    </p>
                    <p className="mt-1 font-heading text-2xl font-normal tracking-[-0.02em] text-accent">
                      {Math.abs(saved) < 0.05 ? "Matches the sweep" : `${formatMetres(saved)} (${shorter}%)`}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] tracking-[0.14em] text-floor-ink/60 uppercase">
                      On the clock
                    </p>
                    <p className="mt-1 font-heading text-2xl font-normal tracking-[-0.02em]">
                      {formatClock(walkResult.durationSeconds)}
                    </p>
                  </div>
                </div>
              </div>

              <EngineFloorMap
                floor={walkResult.floor}
                walk={walk}
                marked={walkResult.walk.stops.flatMap((stop) => stop.locations)}
                caption={`${walkResult.floor.name}, ${walk.returnedToGate ? "gate to gate" : "one way"}`}
              />

              <div className="rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 px-4 pt-4">
                  <HexMark className="text-accent" />
                  <p className="eyebrow">Stops</p>
                </div>
                <ol className="mt-3 divide-y divide-border border-t border-border">
                  {walk.stops.map((stop) => (
                    <li key={`${stop.order}-${stop.stand}`} className="grid grid-cols-8 gap-2 px-4 py-3 text-sm">
                      <span className="font-mono text-xs text-accent">{stop.order}</span>
                      <div className="col-span-7">
                        <p className="font-medium">{stop.locations.join(", ")}</p>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                          {stop.runCode}, {formatMetres(stop.metresFromPrevious)}{" "}
                          {stop.via === "run" ? "along the run" : `by the ${aisleNames.get(stop.via) ?? stop.via}`}
                        </p>
                      </div>
                    </li>
                  ))}
                  {walk.returnedToGate ? (
                    <li className="grid grid-cols-8 gap-2 px-4 py-3 text-sm">
                      <span className="font-mono text-xs text-accent">↩</span>
                      <div className="col-span-7">
                        <p className="font-medium">{walkResult.floor.gate.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                          back to the gate
                        </p>
                      </div>
                    </li>
                  ) : null}
                </ol>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center text-sm text-muted-foreground">
              Load a floor and a ticket, then plan the walk.
            </div>
          )}

          {standards ? (
            <div className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6">
              <div>
                <Eyebrow>Zone standard per ticket</Eyebrow>
                <p className="mt-3 text-xl font-medium tracking-[-0.02em]">
                  {standards.operation.name}: {standards.floorName}
                </p>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Zone", "Stops", "Lines", "Units", "Route", "Cart", "MPU", "MPL", "UPH", "Util"].map(
                        (head, index) => (
                          <th
                            key={head}
                            className={`px-3 py-3 font-mono text-[11px] font-medium tracking-[0.14em] uppercase ${
                              index === 0 ? "text-left" : "text-right"
                            }`}
                          >
                            {head}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {standards.rows.map((row) => (
                      <tr key={row.zone.runCode} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-3 font-medium">{row.zone.runName}</td>
                        <td className="px-3 py-3 text-right font-mono text-[13px]">{row.zone.stopsPerTicket}</td>
                        <td className="px-3 py-3 text-right font-mono text-[13px]">{row.zone.linesPerTicket}</td>
                        <td className="px-3 py-3 text-right font-mono text-[13px]">{row.zone.unitsPerTicket}</td>
                        <td className="px-3 py-3 text-right font-mono text-[13px]">{row.zone.tourMetres.toFixed(1)}</td>
                        <td className="px-3 py-3 text-right font-mono text-[13px]">{row.zone.ticketsPerCart}</td>
                        <td className="px-3 py-3 text-right font-mono text-[13px]">{row.zone.mpuMinutes.toFixed(3)}</td>
                        <td className="px-3 py-3 text-right font-mono text-[13px]">{row.zone.mplMinutes.toFixed(3)}</td>
                        <td className="px-3 py-3 text-right font-mono text-[13px] text-accent">
                          {row.zone.unitsPerHour.toFixed(1)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-[13px]">
                          {row.zone.utilPercent.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <Eyebrow>Units per hour, zone by band</Eyebrow>
                <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-3 py-3 text-left font-mono text-[11px] font-medium tracking-[0.14em] uppercase">
                          Zone
                        </th>
                        {standards.operation.skills.map((band) => (
                          <th
                            key={band.id}
                            className="px-3 py-3 text-right font-mono text-[11px] font-medium tracking-[0.14em] uppercase"
                          >
                            {band.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {standards.rows.map((row) => (
                        <tr key={row.zone.runCode} className="border-b border-border last:border-b-0">
                          <td className="px-3 py-3 font-medium">{row.zone.runName}</td>
                          {row.skills.map((rate) => (
                            <td key={rate.bandId} className="px-3 py-3 text-right font-mono text-[13px]">
                              {rate.unitsPerHour.toFixed(1)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {standards.sample ? (
                <div>
                  <p className="text-lg font-medium tracking-[-0.02em]">
                    {standards.sampleHouse ?? standards.sampleTicketId ?? "pasted locations"}:{" "}
                    {formatClock(standards.sample.totalSeconds)} total
                  </p>
                  <div className="mt-4 flex h-12 w-full overflow-hidden rounded-lg border border-border">
                    {standards.sample.buckets.map((bucket) => (
                      <div
                        key={bucket.kind}
                        style={{
                          flexGrow: bucket.seconds,
                          flexBasis: 0,
                          backgroundColor: BUCKET_COLOR[bucket.kind],
                        }}
                        title={`${mixLabel(bucket.kind)}. ${formatClock(bucket.seconds)}`}
                      />
                    ))}
                  </div>
                  <div className="mt-3 grid gap-x-8 gap-y-1 sm:grid-cols-2">
                    {standards.sample.buckets.map((bucket) => (
                      <p key={bucket.kind} className="text-sm text-muted-foreground">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-[2px] align-middle" style={{ backgroundColor: BUCKET_COLOR[bucket.kind] }} />
                        <span className="font-mono text-xs">{mixLabel(bucket.kind)}</span>{" "}
                        {formatClock(bucket.seconds)}{" "}
                        {((100 * bucket.seconds) / standards.sample!.totalSeconds).toFixed(1)}%
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
