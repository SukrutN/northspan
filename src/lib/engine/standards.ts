/**
 * The engine's labour standards, ported for the browser. Mirrors
 * Northspan.Application's Operation and StandardsReport: the zone table, the
 * band matrix, and the sample decomposition are pure functions of the floor
 * and the operation file. The characterization test holds these tables to the
 * engine's published figures for the same fixture bytes.
 */

import {
  type Floor,
  type Ticket,
  type Walk,
  type WalkRules,
  DEMO_RULES,
  findSlot,
  planWalk,
  requireRun,
  walkSeconds,
} from "./planner";

export interface TaskMixDocument {
  grabPerLineSeconds?: number;
  grabPerUnitSeconds?: number;
  countAndGiveSeconds?: number;
  cartManeuverSeconds?: number;
  putAndVerifySeconds?: number;
  packSplitSeconds?: number;
}

export interface VelocityClassDocument {
  id?: string;
  name?: string;
  linesPerShift?: number;
}

export interface OperationZoneDocument {
  run?: string;
  velocity?: string;
  sampleStands?: string[];
}

export interface SkillDocument {
  id?: string;
  name?: string;
  rateFactor?: number;
}

export interface OperationDocument {
  id?: string;
  name?: string;
  note?: string;
  walk?: { speedMps?: number; mustReturn?: boolean; dwellSecondsPerStop?: number };
  shiftSeconds?: number;
  cartStops?: number;
  unitsPerLine?: number;
  tasks?: TaskMixDocument;
  velocityClasses?: VelocityClassDocument[];
  zones?: OperationZoneDocument[];
  skills?: SkillDocument[];
  sample?: { ticketId?: string };
}

export interface TaskMix {
  grabPerLineSeconds: number;
  grabPerUnitSeconds: number;
  countAndGiveSeconds: number;
  cartManeuverSeconds: number;
  putAndVerifySeconds: number;
  packSplitSeconds: number;
}

export interface VelocityClass {
  id: string;
  name: string;
  linesPerShift: number;
}

export interface OperationZone {
  runCode: string;
  velocityClassId: string;
  sampleFaces: string[];
}

export interface SkillBand {
  id: string;
  name: string;
  rateFactor: number;
}

export interface Operation {
  id: string;
  name: string;
  note: string | null;
  rules: WalkRules;
  shiftSeconds: number;
  cartStops: number;
  unitsPerLine: number;
  tasks: TaskMix;
  velocityClasses: VelocityClass[];
  zones: OperationZone[];
  skills: SkillBand[];
  sampleTicketId: string | null;
}

export interface ZoneStandard {
  runCode: string;
  runName: string;
  stopsPerTicket: number;
  linesPerTicket: number;
  unitsPerTicket: number;
  tourMetres: number;
  ticketsPerCart: number;
  travelSeconds: number;
  secondsPerTicket: number;
  mpuMinutes: number;
  mplMinutes: number;
  unitsPerHour: number;
  linesPerShift: number;
  utilPercent: number;
}

export interface SkillRate {
  bandId: string;
  bandName: string;
  rateFactor: number;
  unitsPerHour: number;
}

export interface StandardsRow {
  zone: ZoneStandard;
  skills: SkillRate[];
}

export type MixKind =
  | "travel"
  | "grabPerLine"
  | "grabPerUnit"
  | "countAndGive"
  | "cartManeuver"
  | "putAndVerify"
  | "packSplit";

export interface MixBucket {
  kind: MixKind;
  occurrences: number;
  seconds: number;
}

export interface MixDecomposition {
  name: string;
  buckets: MixBucket[];
  travelSeconds: number;
  totalSeconds: number;
}

export interface OperationStandards {
  operation: Operation;
  floorId: string;
  floorName: string;
  rows: StandardsRow[];
  sample: MixDecomposition | null;
  sampleTicketId: string | null;
  sampleHouse: string | null;
}

const MIX_LABELS: Record<MixKind, string> = {
  travel: "Travel",
  grabPerLine: "Grab per line",
  grabPerUnit: "Grab per unit",
  countAndGive: "Count and give",
  cartManeuver: "Cart maneuver",
  putAndVerify: "Put and verify",
  packSplit: "Pack split",
};

export function mixLabel(kind: MixKind): string {
  return MIX_LABELS[kind];
}

function blankToNull(value: string | null | undefined): string | null {
  return !value || value.trim().length === 0 ? null : value.trim();
}

function checkTasks(tasks: TaskMix): void {
  const labels: [number, string][] = [
    [tasks.grabPerLineSeconds, "grab per line"],
    [tasks.grabPerUnitSeconds, "grab per unit"],
    [tasks.countAndGiveSeconds, "count-and-give"],
    [tasks.cartManeuverSeconds, "cart maneuver"],
    [tasks.putAndVerifySeconds, "put-and-verify"],
    [tasks.packSplitSeconds, "pack split"],
  ];
  for (const [seconds, what] of labels) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      throw new Error(`The ${what} seconds cannot be negative or unmeasurable.`);
    }
  }
}

export function operationFromDocument(
  document: OperationDocument | null | undefined,
  floor: Floor,
): Operation {
  if (!document) {
    throw new Error("The operation file was empty.");
  }

  const id = blankToNull(document.id);
  if (!id) {
    throw new Error("The operation needs an id.");
  }
  const name = blankToNull(document.name) ?? "This operation";
  const operationName = !document.name || document.name.trim().length === 0 ? "This operation" : document.name.trim();

  const rules: WalkRules = document.walk
    ? {
        speedMps: document.walk.speedMps ?? DEMO_RULES.speedMps,
        mustReturn: document.walk.mustReturn ?? DEMO_RULES.mustReturn,
        dwellSecondsPerStop: document.walk.dwellSecondsPerStop ?? DEMO_RULES.dwellSecondsPerStop,
      }
    : DEMO_RULES;
  if (!Number.isFinite(rules.speedMps) || rules.speedMps <= 0) {
    throw new Error("Walking speed must be a positive number of meters per second.");
  }
  if (!Number.isFinite(rules.dwellSecondsPerStop) || rules.dwellSecondsPerStop < 0) {
    throw new Error("Dwell per stop cannot be negative.");
  }

  const shiftSeconds = document.shiftSeconds ?? 0;
  if (!Number.isFinite(shiftSeconds) || shiftSeconds <= 0) {
    throw new Error(`${operationName} needs a positive shift in seconds.`);
  }

  const cartStops = document.cartStops ?? 0;
  if (cartStops < 1) {
    throw new Error(`${operationName} needs a cart of at least one stop.`);
  }

  const unitsPerLine = document.unitsPerLine ?? 0;
  if (unitsPerLine < 1) {
    throw new Error(`${operationName} needs at least one unit per line.`);
  }

  const tasks: TaskMix = document.tasks
    ? {
        grabPerLineSeconds: document.tasks.grabPerLineSeconds ?? 0,
        grabPerUnitSeconds: document.tasks.grabPerUnitSeconds ?? 0,
        countAndGiveSeconds: document.tasks.countAndGiveSeconds ?? 0,
        cartManeuverSeconds: document.tasks.cartManeuverSeconds ?? 0,
        putAndVerifySeconds: document.tasks.putAndVerifySeconds ?? 0,
        packSplitSeconds: document.tasks.packSplitSeconds ?? 0,
      }
    : {
        grabPerLineSeconds: 0,
        grabPerUnitSeconds: 0,
        countAndGiveSeconds: 0,
        cartManeuverSeconds: 0,
        putAndVerifySeconds: 0,
        packSplitSeconds: 0,
      };
  checkTasks(tasks);

  const classIds = new Set<string>();
  const velocityClasses: VelocityClass[] = [];
  for (const entry of document.velocityClasses ?? []) {
    const classId = blankToNull(entry.id);
    if (!classId || classIds.has(classId)) {
      throw new Error(`${operationName} repeats or blanks a velocity class id.`);
    }
    classIds.add(classId);
    const linesPerShift = entry.linesPerShift ?? 0;
    if (linesPerShift <= 0) {
      throw new Error(`${operationName} pays velocity class ${classId} no lines per shift.`);
    }
    velocityClasses.push({ id: classId, name: blankToNull(entry.name) ?? classId, linesPerShift });
  }
  if (velocityClasses.length === 0) {
    throw new Error(`${operationName} has no velocity classes, so no zone carries demand.`);
  }

  const zoneRuns = new Set<string>();
  const zones: OperationZone[] = [];
  for (const zone of document.zones ?? []) {
    const runCode = blankToNull(zone.run);
    if (!runCode || zoneRuns.has(runCode)) {
      throw new Error(`${operationName} repeats or blanks a zone run.`);
    }
    zoneRuns.add(runCode);
    const velocityClassId = blankToNull(zone.velocity) ?? "";
    if (!velocityClasses.some((entry) => entry.id === velocityClassId)) {
      throw new Error(
        `${operationName} pays zone ${runCode} no velocity class it knows. Add the class or fix the zone.`,
      );
    }
    const sampleFaces = zone.sampleStands ?? [];
    if (sampleFaces.length === 0) {
      throw new Error(`${operationName} leaves zone ${runCode} no faces, so its tour cannot be walked.`);
    }
    zones.push({ runCode, velocityClassId, sampleFaces });
  }
  if (zones.length === 0) {
    throw new Error(`${operationName} has no zones, so there is no standard to build.`);
  }

  const bandIds = new Set<string>();
  const skills: SkillBand[] = [];
  for (const band of document.skills ?? []) {
    const bandId = blankToNull(band.id);
    if (!bandId || bandIds.has(bandId)) {
      throw new Error(`${operationName} repeats or blanks a skill band id.`);
    }
    bandIds.add(bandId);
    const rateFactor = band.rateFactor ?? 0;
    if (!Number.isFinite(rateFactor) || rateFactor <= 0 || rateFactor > 1) {
      throw new Error(`${operationName} pays skill band ${bandId} a rate factor outside 0 to 1.`);
    }
    skills.push({ id: bandId, name: blankToNull(band.name) ?? bandId, rateFactor });
  }
  if (skills.length === 0) {
    throw new Error(`${operationName} has no skill bands, so sheet 06 gets no matrix.`);
  }

  const operation: Operation = {
    id,
    name,
    note: blankToNull(document.note),
    rules,
    shiftSeconds,
    cartStops,
    unitsPerLine,
    tasks,
    velocityClasses,
    zones,
    skills,
    sampleTicketId: blankToNull(document.sample?.ticketId),
  };

  for (const zone of zones) {
    requireRun(floor, zone.runCode);
    for (const face of zone.sampleFaces) {
      if (!findSlot(floor, face)) {
        throw new Error(
          `${operationName} stands zone ${zone.runCode} on ${face}, which is not on ${floor.name}.`,
        );
      }
    }
  }

  const covered = new Set(zones.map((zone) => zone.runCode));
  for (const run of floor.runs) {
    if (!covered.has(run.code)) {
      throw new Error(
        `${operationName} prices no zone for run ${run.code}, so ${floor.name} has an unpriced aisle.`,
      );
    }
  }

  return operation;
}

function secondsPerTicket(
  tasks: TaskMix,
  lines: number,
  units: number,
  stops: number,
  travelSeconds: number,
  ticketsPerCart: number,
): number {
  return (
    travelSeconds / ticketsPerCart
    + tasks.grabPerLineSeconds * lines
    + (tasks.grabPerUnitSeconds + tasks.countAndGiveSeconds) * units
    + tasks.putAndVerifySeconds * lines
    + tasks.cartManeuverSeconds * stops
    + tasks.packSplitSeconds
  );
}

export function decompose(
  name: string,
  walk: Walk,
  tasks: TaskMix,
  unitsPerLine: number,
  rules: WalkRules,
  tickets: number,
): MixDecomposition {
  const lines = walk.stops.reduce((sum, stop) => sum + stop.locations.length, 0);
  const units = lines * unitsPerLine;
  const travel = walkSeconds(walk, rules);
  const buckets: MixBucket[] = [
    { kind: "travel", occurrences: 1, seconds: travel },
    { kind: "grabPerLine", occurrences: lines, seconds: tasks.grabPerLineSeconds * lines },
    { kind: "grabPerUnit", occurrences: units, seconds: tasks.grabPerUnitSeconds * units },
    { kind: "countAndGive", occurrences: units, seconds: tasks.countAndGiveSeconds * units },
    { kind: "cartManeuver", occurrences: walk.stops.length, seconds: tasks.cartManeuverSeconds * walk.stops.length },
    { kind: "putAndVerify", occurrences: lines, seconds: tasks.putAndVerifySeconds * lines },
    { kind: "packSplit", occurrences: tickets, seconds: tasks.packSplitSeconds * tickets },
  ];
  const totalSeconds = buckets.reduce((sum, bucket) => sum + bucket.seconds, 0);
  return { name, buckets, travelSeconds: travel, totalSeconds };
}

export function buildStandards(
  floor: Floor,
  operation: Operation,
  sampleTicket: Ticket | null,
): OperationStandards {
  const byRun = new Map(operation.zones.map((zone) => [zone.runCode, zone]));
  const classes = new Map(operation.velocityClasses.map((entry) => [entry.id, entry]));
  const rows: StandardsRow[] = [];

  for (const run of floor.runs) {
    const zone = byRun.get(run.code)!;
    const faces = zone.sampleFaces;
    const tour = planWalk(floor, faces, operation.rules.mustReturn);
    const lines = faces.length;
    const units = lines * operation.unitsPerLine;
    const stops = faces.length;
    const ticketsPerCart = Math.max(1, Math.floor(operation.cartStops / tour.stops.length));
    const travel = walkSeconds(tour, operation.rules);
    const seconds = secondsPerTicket(operation.tasks, lines, units, stops, travel, ticketsPerCart);
    const linesPerShift = classes.get(zone.velocityClassId)!.linesPerShift;
    const standard: ZoneStandard = {
      runCode: run.code,
      runName: run.name,
      stopsPerTicket: tour.stops.length,
      linesPerTicket: lines,
      unitsPerTicket: units,
      tourMetres: tour.distanceM,
      ticketsPerCart,
      travelSeconds: travel,
      secondsPerTicket: seconds,
      mpuMinutes: seconds / units / 60,
      mplMinutes: seconds / lines / 60,
      unitsPerHour: 3600 * units / seconds,
      linesPerShift,
      utilPercent: 100 * linesPerShift * seconds / lines / operation.shiftSeconds,
    };
    rows.push({
      zone: standard,
      skills: operation.skills.map((band) => ({
        bandId: band.id,
        bandName: band.name,
        rateFactor: band.rateFactor,
        unitsPerHour: standard.unitsPerHour * band.rateFactor,
      })),
    });
  }

  const sample = sampleTicket
    ? decompose(
        sampleTicket.id ?? "the sample",
        planWalk(floor, sampleTicket.locations, operation.rules.mustReturn),
        operation.tasks,
        operation.unitsPerLine,
        operation.rules,
        1,
      )
    : null;

  return {
    operation,
    floorId: floor.id,
    floorName: floor.name,
    rows,
    sample,
    sampleTicketId: sampleTicket?.id ?? null,
    sampleHouse: sampleTicket?.house ?? null,
  };
}
