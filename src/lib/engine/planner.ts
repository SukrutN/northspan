/**
 * The engine's general planner, ported for the browser.
 *
 * This mirrors Northspan.Domain and Northspan.Application: the same floor
 * document, the same aisle distance, nearest neighbour, two-opt, serpentine
 * sweep, the same clock, and the same plain-language failures. The
 * characterization test holds this port to the engine's published walks for
 * the same fixture bytes, so a browser walk and an engine walk agree.
 */

export interface CrossAisleDocument {
  id?: string;
  name?: string;
  y: number;
}

export interface GateDocument {
  id?: string;
  name?: string;
  x: number;
  y: number;
}

export interface RunDocument {
  code?: string;
  name?: string;
  x: number;
}

export interface SlotDocument {
  code?: string;
  run?: string;
  stand?: string;
  alongM: number;
  sku?: string;
  item?: string;
}

export interface LandmarkDocument {
  id?: string;
  name?: string;
  x: number;
  y: number;
}

export interface FloorDocument {
  id?: string;
  name?: string;
  widthM: number;
  heightM: number;
  crossAisles?: CrossAisleDocument[];
  gate?: GateDocument;
  runs?: RunDocument[];
  slots?: SlotDocument[];
  landmarks?: LandmarkDocument[];
}

export interface TicketDocument {
  id?: string;
  house?: string;
  note?: string;
  locations?: string[];
}

export interface RulesDocument {
  speedMps?: number;
  mustReturn?: boolean;
  dwellSecondsPerStop?: number;
}

export interface CrossAisle {
  id: string;
  name: string;
  y: number;
}

export interface Run {
  code: string;
  name: string;
  x: number;
}

export interface Slot {
  code: string;
  run: string;
  stand: string;
  alongM: number;
  sku: string | null;
  item: string | null;
}

export interface Landmark {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface Floor {
  id: string;
  name: string;
  widthM: number;
  heightM: number;
  crossAisles: CrossAisle[];
  gate: { id: string; name: string; x: number; y: number };
  runs: Run[];
  slots: Slot[];
  landmarks: Landmark[];
}

export interface WalkRules {
  speedMps: number;
  mustReturn: boolean;
  dwellSecondsPerStop: number;
}

export interface Ticket {
  id: string | null;
  house: string | null;
  note: string | null;
  locations: string[];
}

export interface WalkStop {
  order: number;
  stand: string;
  locations: string[];
  runCode: string;
  x: number;
  y: number;
  metresFromPrevious: number;
  via: string;
}

export interface Walk {
  stops: WalkStop[];
  distanceM: number;
  sweepDistanceM: number;
  returnedToGate: boolean;
  polyline: Point[];
  sweepPolyline: Point[];
}

export interface Point {
  x: number;
  y: number;
}

export interface PlannedWalk {
  floor: Floor;
  ticketId: string | null;
  house: string | null;
  note: string | null;
  walk: Walk;
  rules: WalkRules;
  durationSeconds: number;
}

export const DEMO_RULES: WalkRules = { speedMps: 1.15, mustReturn: true, dwellSecondsPerStop: 0 };

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function rulesFromDocument(document: RulesDocument | null | undefined): WalkRules {
  return {
    speedMps: document?.speedMps ?? DEMO_RULES.speedMps,
    mustReturn: document?.mustReturn ?? DEMO_RULES.mustReturn,
    dwellSecondsPerStop: document?.dwellSecondsPerStop ?? DEMO_RULES.dwellSecondsPerStop,
  };
}

function checkRules(rules: WalkRules): void {
  if (!Number.isFinite(rules.speedMps) || rules.speedMps <= 0) {
    throw new Error("Walking speed must be a positive number of meters per second.");
  }
  if (!Number.isFinite(rules.dwellSecondsPerStop) || rules.dwellSecondsPerStop < 0) {
    throw new Error("Dwell per stop cannot be negative.");
  }
}

export function ticketFromDocument(document: TicketDocument | null | undefined): Ticket {
  if (!document) {
    throw new Error("The ticket file was empty.");
  }
  if (!document.locations) {
    throw new Error("The ticket file has no locations.");
  }
  return {
    id: blankToNull(document.id),
    house: blankToNull(document.house),
    note: blankToNull(document.note),
    locations: document.locations,
  };
}

function blankToNull(value: string | undefined | null): string | null {
  return !value || value.trim().length === 0 ? null : value.trim();
}

function requireText(value: string | null | undefined, label: string, floorName: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`${floorName} has a blank ${label}.`);
  }
  return value.trim();
}

function requireCode(value: string | null | undefined, label: string, floorName: string): string {
  return normalizeCode(requireText(value, label, floorName));
}

function requireInside(value: number, limit: number, what: string, floorName: string): void {
  if (!Number.isFinite(value) || value < 0 || value > limit) {
    throw new Error(`${floorName} places ${what} outside the building.`);
  }
}

export function floorFromDocument(document: FloorDocument | null | undefined): Floor {
  if (!document) {
    throw new Error("The floor file was empty.");
  }
  if (!document.crossAisles || !document.gate || !document.runs || !document.slots) {
    throw new Error("The floor file is missing runs, cross-aisles, a gate, or slots.");
  }

  const name = blankToNull(document.name) ?? "This floor";
  const floorName = !document.name || document.name.trim().length === 0 ? "This floor" : document.name.trim();
  const id = blankToNull(document.id) ?? floorName;

  if (!Number.isFinite(document.widthM) || document.widthM <= 0
    || !Number.isFinite(document.heightM) || document.heightM <= 0) {
    throw new Error(`${floorName} needs a positive width and height.`);
  }

  if (document.crossAisles.length === 0) {
    throw new Error(
      `${floorName} cannot be walked: it has no cross-aisle, so the cart cannot move between runs.`,
    );
  }

  const aisleIds = new Set<string>();
  const crossAisles: CrossAisle[] = [];
  for (const aisle of document.crossAisles) {
    const aisleId = requireText(aisle.id, "cross-aisle id", floorName);
    const aisleName = requireText(aisle.name, "cross-aisle name", floorName);
    requireInside(aisle.y, document.heightM, `cross-aisle ${aisleId}`, floorName);
    if (aisleIds.has(aisleId)) {
      throw new Error(`${floorName} repeats cross-aisle '${aisleId}'.`);
    }
    aisleIds.add(aisleId);
    crossAisles.push({ id: aisleId, name: aisleName, y: aisle.y });
  }

  const gateId = requireText(document.gate.id, "gate id", floorName);
  const gateName = requireText(document.gate.name, "gate name", floorName);
  requireInside(document.gate.x, document.widthM, "the gate", floorName);
  requireInside(document.gate.y, document.heightM, "the gate", floorName);

  if (document.runs.length === 0) {
    throw new Error(`${floorName} has no runs.`);
  }

  const runCodes = new Set<string>();
  const runs: Run[] = [];
  for (const run of document.runs) {
    const code = requireCode(run.code, "run code", floorName);
    const runName = requireText(run.name, "run name", floorName);
    requireInside(run.x, document.widthM, `run ${code}`, floorName);
    if (runCodes.has(code)) {
      throw new Error(`${floorName} repeats run '${code}'.`);
    }
    runCodes.add(code);
    runs.push({ code, name: runName, x: run.x });
  }

  const slotCodes = new Set<string>();
  const stands = new Map<string, { run: string; along: number }>();
  const slots: Slot[] = [];
  for (const slot of document.slots) {
    const code = requireCode(slot.code, "slot code", floorName);
    const runCode = requireCode(slot.run, "slot run", floorName);
    const stand = requireCode(slot.stand, "stand", floorName);
    if (!runCodes.has(runCode)) {
      throw new Error(`${floorName} slot ${code} names run ${runCode}, which is not on this floor.`);
    }
    requireInside(slot.alongM, document.heightM, `slot ${code}`, floorName);
    if (slotCodes.has(code)) {
      throw new Error(`${floorName} repeats slot '${code}'.`);
    }
    slotCodes.add(code);

    const existing = stands.get(stand);
    if (existing && (existing.run !== runCode || Math.abs(existing.along - slot.alongM) > 1e-9)) {
      throw new Error(`${floorName} stand ${stand} is claimed by two different positions.`);
    }
    stands.set(stand, { run: runCode, along: slot.alongM });

    slots.push({
      code,
      run: runCode,
      stand,
      alongM: slot.alongM,
      sku: blankToNull(slot.sku),
      item: blankToNull(slot.item),
    });
  }

  const landmarkIds = new Set<string>();
  const landmarks: Landmark[] = [];
  for (const landmark of document.landmarks ?? []) {
    const landmarkId = requireText(landmark.id, "landmark id", floorName);
    const landmarkName = requireText(landmark.name, "landmark name", floorName);
    requireInside(landmark.x, document.widthM, `landmark ${landmarkId}`, floorName);
    requireInside(landmark.y, document.heightM, `landmark ${landmarkId}`, floorName);
    if (landmarkIds.has(landmarkId)) {
      throw new Error(`${floorName} repeats landmark '${landmarkId}'.`);
    }
    landmarkIds.add(landmarkId);
    landmarks.push({ id: landmarkId, name: landmarkName, x: landmark.x, y: landmark.y });
  }

  return {
    id,
    name,
    widthM: document.widthM,
    heightM: document.heightM,
    crossAisles,
    gate: { id: gateId, name: gateName, x: document.gate.x, y: document.gate.y },
    runs,
    slots,
    landmarks,
  };
}

export function findSlot(floor: Floor, code: string): Slot | null {
  return floor.slots.find((slot) => slot.code === normalizeCode(code)) ?? null;
}

export function requireRun(floor: Floor, code: string): Run {
  const run = floor.runs.find((entry) => entry.code === code);
  if (!run) {
    throw new Error(`Run ${code} is not on ${floor.name}.`);
  }
  return run;
}

interface CartStop {
  key: string;
  runCode: string | null;
  stand: string | null;
  x: number;
  y: number;
  locations: string[];
}

function gateOf(floor: Floor): CartStop {
  return { key: floor.gate.id, runCode: null, stand: null, x: floor.gate.x, y: floor.gate.y, locations: [] };
}

export function stopsFor(floor: Floor, locationCodes: string[]): CartStop[] {
  const seen = new Set<string>();
  const groups = new Map<string, Slot[]>();
  for (const raw of locationCodes) {
    if (!raw || raw.trim().length === 0) {
      throw new Error(`No slot is marked '${(raw ?? "").trim()}' on ${floor.name}.`);
    }
    const code = normalizeCode(raw);
    if (seen.has(code)) {
      continue;
    }
    seen.add(code);
    const slot = findSlot(floor, code);
    if (!slot) {
      throw new Error(`No slot is marked '${code}' on ${floor.name}.`);
    }
    const list = groups.get(slot.stand);
    if (list) list.push(slot);
    else groups.set(slot.stand, [slot]);
  }

  if (groups.size === 0) {
    throw new Error("The ticket has no locations. A walk needs at least one stop.");
  }

  const stops: CartStop[] = [];
  for (const [stand, slots] of groups) {
    slots.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
    const run = requireRun(floor, slots[0].run);
    stops.push({
      key: slots[0].code,
      runCode: run.code,
      stand,
      x: run.x,
      y: slots[0].alongM,
      locations: slots.map((slot) => slot.code),
    });
  }
  return stops;
}

function samePlace(a: CartStop, b: CartStop): boolean {
  return Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9;
}

function sameRun(a: CartStop, b: CartStop): boolean {
  return a.runCode !== null && a.runCode === b.runCode;
}

function crossing(floor: Floor, a: CartStop, b: CartStop): { aisle: CrossAisle; cost: number } {
  const horizontal = Math.abs(a.x - b.x);
  let best: CrossAisle | null = null;
  let bestCost = Number.POSITIVE_INFINITY;
  for (const aisle of floor.crossAisles) {
    const cost = Math.abs(a.y - aisle.y) + horizontal + Math.abs(b.y - aisle.y);
    if (cost < bestCost - 1e-9) {
      best = aisle;
      bestCost = cost;
    }
  }
  if (!best) {
    throw new Error(
      `${floor.name} cannot be walked: it has no cross-aisle, so the cart cannot move between runs.`,
    );
  }
  return { aisle: best, cost: bestCost };
}

function between(floor: Floor, a: CartStop, b: CartStop): number {
  if (samePlace(a, b)) return 0;
  if (sameRun(a, b)) return Math.abs(a.y - b.y);
  return crossing(floor, a, b).cost;
}

function viaOf(floor: Floor, a: CartStop, b: CartStop): string {
  if (samePlace(a, b) || sameRun(a, b)) return "run";
  return crossing(floor, a, b).aisle.id;
}

function leg(floor: Floor, a: CartStop, b: CartStop): Point[] {
  if (sameRun(a, b)) {
    return [
      { x: a.x, y: a.y },
      { x: b.x, y: b.y },
    ];
  }
  const y = crossing(floor, a, b).aisle.y;
  const points: Point[] = [{ x: a.x, y: a.y }];
  if (Math.abs(a.y - y) > 1e-6) points.push({ x: a.x, y });
  if (Math.abs(a.x - b.x) > 1e-6) points.push({ x: b.x, y });
  const last = points[points.length - 1];
  if (Math.abs(last.x - b.x) > 1e-6 || Math.abs(last.y - b.y) > 1e-6) {
    points.push({ x: b.x, y: b.y });
  }
  return points;
}

function lengthOf(floor: Floor, tour: CartStop[]): number {
  let total = 0;
  for (let i = 0; i < tour.length - 1; i++) {
    total += between(floor, tour[i], tour[i + 1]);
  }
  return total;
}

function polylineOf(floor: Floor, tour: CartStop[]): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < tour.length - 1; i++) {
    const legPoints = leg(floor, tour[i], tour[i + 1]);
    const start = points.length === 0 ? 0 : 1;
    for (let p = start; p < legPoints.length; p++) {
      points.push(legPoints[p]);
    }
  }
  const deduped: Point[] = [];
  for (const point of points) {
    const prev = deduped[deduped.length - 1];
    if (!prev || Math.abs(prev.x - point.x) > 1e-6 || Math.abs(prev.y - point.y) > 1e-6) {
      deduped.push(point);
    }
  }
  return deduped;
}

export function nearestNeighbour(floor: Floor, stops: CartStop[], gate: CartStop): CartStop[] {
  const remaining = [...stops];
  const tour: CartStop[] = [gate];
  let current = gate;
  while (remaining.length > 0) {
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i++) {
      const candidate = between(floor, current, remaining[i]);
      const closer = candidate < bestDistance - 1e-9;
      const tie = Math.abs(candidate - bestDistance) <= 1e-9 && remaining[i].key < remaining[best].key;
      if (closer || tie) {
        best = i;
        bestDistance = candidate;
      }
    }
    current = remaining.splice(best, 1)[0];
    tour.push(current);
  }
  tour.push(gate);
  return tour;
}

export function twoOpt(floor: Floor, tour: CartStop[]): CartStop[] {
  const PASS_LIMIT = 80;
  const next = [...tour];
  let guard = 0;
  let improved = true;
  while (improved && guard < PASS_LIMIT) {
    improved = false;
    guard += 1;
    const n = next.length;
    for (let i = 1; i < n - 2 && !improved; i++) {
      for (let k = i + 1; k < n - 1; k++) {
        const before =
          between(floor, next[i - 1], next[i]) + between(floor, next[k], next[k + 1]);
        const after =
          between(floor, next[i - 1], next[k]) + between(floor, next[i], next[k + 1]);
        if (before - after > 1e-6) {
          const reversed = next.slice(i, k + 1).reverse();
          next.splice(i, k - i + 1, ...reversed);
          improved = true;
          break;
        }
      }
    }
  }
  return next;
}

export function serpentineSweep(floor: Floor, stops: CartStop[], gate: CartStop): CartStop[] {
  const byRun = new Map<string, CartStop[]>();
  for (const stop of stops) {
    if (stop.runCode === null) {
      throw new Error("A pick stop has no run.");
    }
    const list = byRun.get(stop.runCode);
    if (list) list.push(stop);
    else byRun.set(stop.runCode, [stop]);
  }

  const runs = floor.runs
    .filter((run) => byRun.has(run.code))
    .sort((a, b) => (a.x !== b.x ? a.x - b.x : a.code < b.code ? -1 : 1));

  const ordered: CartStop[] = [];
  for (let index = 0; index < runs.length; index++) {
    const southToNorth = index % 2 === 0;
    const row = byRun.get(runs[index].code)!;
    row.sort((a, b) => {
      if (Math.abs(a.y - b.y) > 1e-9) {
        return southToNorth ? a.y - b.y : b.y - a.y;
      }
      return a.key < b.key ? -1 : 1;
    });
    ordered.push(...row);
  }

  return [gate, ...ordered, gate];
}

function describe(floor: Floor, tour: CartStop[], sweep: CartStop[], returnedToGate: boolean): Walk {
  const lastStop = returnedToGate ? tour.length - 1 : tour.length;
  const stops: WalkStop[] = [];
  for (let i = 1; i < lastStop; i++) {
    const point = tour[i];
    stops.push({
      order: stops.length + 1,
      stand: point.stand ?? point.key,
      locations: point.locations,
      runCode: point.runCode ?? "",
      x: point.x,
      y: point.y,
      metresFromPrevious: between(floor, tour[i - 1], point),
      via: viaOf(floor, tour[i - 1], point),
    });
  }
  return {
    stops,
    distanceM: lengthOf(floor, tour),
    sweepDistanceM: lengthOf(floor, sweep),
    returnedToGate,
    polyline: polylineOf(floor, tour),
    sweepPolyline: polylineOf(floor, sweep),
  };
}

export function planWalk(floor: Floor, locationCodes: string[], mustReturn: boolean): Walk {
  const stops = stopsFor(floor, locationCodes);
  const gate = gateOf(floor);

  const seeded = twoOpt(floor, nearestNeighbour(floor, stops, gate));
  const sweep = serpentineSweep(floor, stops, gate);
  const sweepImproved = twoOpt(floor, sweep);
  const planned = lengthOf(floor, seeded) <= lengthOf(floor, sweepImproved) ? seeded : sweepImproved;

  const reported = mustReturn ? planned : planned.slice(0, planned.length - 1);
  const reportedSweep = mustReturn ? sweep : sweep.slice(0, sweep.length - 1);

  return describe(floor, reported, reportedSweep, mustReturn);
}

export function walkSeconds(walk: Walk, rules: WalkRules): number {
  checkRules(rules);
  return walk.distanceM / rules.speedMps + walk.stops.length * rules.dwellSecondsPerStop;
}

export function planTicket(floor: Floor, ticket: Ticket, rules: WalkRules): PlannedWalk {
  checkRules(rules);
  const walk = planWalk(floor, ticket.locations, rules.mustReturn);
  return {
    floor,
    ticketId: ticket.id,
    house: ticket.house,
    note: ticket.note,
    walk,
    rules,
    durationSeconds: walkSeconds(walk, rules),
  };
}

export function shorterPercent(planned: PlannedWalk): number {
  const saved = planned.walk.sweepDistanceM - planned.walk.distanceM;
  if (planned.walk.sweepDistanceM === 0) return 0;
  return Math.round(saved / planned.walk.sweepDistanceM * 100);
}

export function roundSeconds(seconds: number): number {
  return Math.max(0, Math.round(seconds));
}

export function formatClock(seconds: number): string {
  const whole = roundSeconds(seconds);
  const minutes = Math.floor(whole / 60);
  const remain = whole % 60;
  if (minutes === 0) return `${remain} sec`;
  return `${minutes} min ${String(remain).padStart(2, "0")} sec`;
}

export function formatMetres(metres: number): string {
  return `${metres.toFixed(1)} m`;
}
