/**
 * Task-mix labour standards for the counter-refill operation on Kiln Annex.
 *
 * One cart tour is planned per zone with the site's own router and priced
 * by the walk clock, exactly as a ticket walk is priced. A shift's worth
 * of demand is the fixed point: the tour's walking time is shared across
 * the tickets the cart carries, floor(cartStops / stops) of them. The
 * hands never share: grab, count-and-give, cart maneuver, put-and-verify,
 * and the pack split are charged per ticket.
 *
 * From that: minutes per unit, minutes per line, units per hour, and how
 * much of one picker's shift a zone's lines per shift take. The bands
 * scale the zone standard by a rate factor into a zone-times-band matrix.
 *
 * The coefficients are the engine's fixture operation (fixtures/
 * kiln-annex/operation.json), not constants invented for the page. The
 * characterization tests here lock the same table the engine's CLI
 * prints.
 */

import { ORDERS } from "@/lib/orders";
import { planWalk, walkSeconds } from "@/lib/routing";
import { RUNS } from "@/lib/warehouse";

export const OPERATION = {
  id: "counter-refill",
  name: "Counter refill",
  ticket: "Counter refill, ship Friday",
  shiftSeconds: 28800,
  cartStops: 10,
  unitsPerLine: 2,
} as const;

export const TASKS = {
  grabPerLine: 3.0,
  grabPerUnit: 2.0,
  countAndGive: 1.5,
  cartManeuver: 4.0,
  putAndVerify: 2.0,
  packSplit: 6.0,
} as const;

const VELOCITY_CLASSES = {
  hot: 1140,
  flow: 960,
  calm: 600,
} as const;

export type VelocityClassId = keyof typeof VELOCITY_CLASSES;

export interface ZoneSpec {
  run: string;
  velocity: VelocityClassId;
  faces: string[];
}

export const SKILLS = [
  { id: "veteran", name: "Veteran", factor: 1.0 },
  { id: "day", name: "Day", factor: 0.85 },
  { id: "night", name: "Night", factor: 0.7 },
] as const;

const ZONES: readonly ZoneSpec[] = [
  { run: "CIN", velocity: "hot", faces: ["CIN-02-W", "CIN-05-W"] },
  { run: "LOA", velocity: "flow", faces: ["LOA-03-W"] },
  { run: "FLI", velocity: "flow", faces: ["FLI-04-W"] },
  { run: "REE", velocity: "flow", faces: ["REE-02-E", "REE-04-W"] },
  { run: "COB", velocity: "calm", faces: ["COB-01-E"] },
] as const;

export interface SkillRate {
  id: string;
  name: string;
  factor: number;
  unitsPerHour: number;
}

export interface ZoneStandard {
  runCode: string;
  runName: string;
  velocity: string;
  linesPerShift: number;
  stops: number;
  lines: number;
  units: number;
  tourMetres: number;
  ticketsPerCart: number;
  travelSeconds: number;
  secondsPerTicket: number;
  mpuMinutes: number;
  mplMinutes: number;
  unitsPerHour: number;
  utilPercent: number;
  skills: SkillRate[];
}

export interface MixBucket {
  kind: string;
  label: string;
  /** How many times the hands do it: legs, lines, units, stops, or once. */
  occurrences: number;
  seconds: number;
}

export interface SampleMix {
  ticketId: string;
  house: string;
  ticket: string;
  stops: number;
  lines: number;
  units: number;
  travelSeconds: number;
  totalSeconds: number;
  buckets: MixBucket[];
}

const SAMPLE = ORDERS[0];

function handsSeconds(stops: number, lines: number, units: number): number {
  return (
    TASKS.grabPerLine * lines +
    (TASKS.grabPerUnit + TASKS.countAndGive) * units +
    TASKS.cartManeuver * stops +
    TASKS.putAndVerify * lines +
    TASKS.packSplit
  );
}

/** The ticket's chain: shared walking plus unshared hands, in seconds. */
function ticketSeconds(zone: ZoneSpec): {
  tourMetres: number;
  stops: number;
  ticketsPerCart: number;
  travelSeconds: number;
  secondsPerTicket: number;
} {
  const walk = planWalk([...zone.faces]);
  const stopCount = walk.stops.length;
  const ticketsPerCart = Math.floor(OPERATION.cartStops / stopCount);
  const travelSeconds = walkSeconds(walk.distanceM);
  if (ticketsPerCart < 1) {
    throw new Error(`A cart carries at least one stop; ${zone.run} tours ${stopCount}.`);
  }
  const lines = zone.faces.length;
  const units = lines * OPERATION.unitsPerLine;
  return {
    tourMetres: walk.distanceM,
    stops: stopCount,
    ticketsPerCart,
    travelSeconds,
    secondsPerTicket:
      travelSeconds / ticketsPerCart + handsSeconds(stopCount, lines, units),
  };
}

export function zoneStandard(zone: ZoneSpec): ZoneStandard {
  const priced = ticketSeconds(zone);
  const run = RUNS.find((entry) => entry.code === zone.run);
  if (!run) throw new Error(`${zone.run} is not a run of Kiln Annex.`);
  const lines = zone.faces.length;
  const units = lines * OPERATION.unitsPerLine;
  const linesPerShift = VELOCITY_CLASSES[zone.velocity];
  const sec = priced.secondsPerTicket;
  const unitsPerHour = (3600 * units) / sec;
  return {
    runCode: run.code,
    runName: run.name,
    velocity: zone.velocity,
    linesPerShift,
    stops: priced.stops,
    lines,
    units,
    tourMetres: priced.tourMetres,
    ticketsPerCart: priced.ticketsPerCart,
    travelSeconds: priced.travelSeconds,
    secondsPerTicket: sec,
    mpuMinutes: sec / units / 60,
    mplMinutes: sec / lines / 60,
    unitsPerHour,
    utilPercent: ((linesPerShift * sec) / lines / OPERATION.shiftSeconds) * 100,
    skills: SKILLS.map((band) => ({
      id: band.id,
      name: band.name,
      factor: band.factor,
      unitsPerHour: unitsPerHour * band.factor,
    })),
  };
}

export function sampleMix(): SampleMix {
  const faceIds = SAMPLE.lines.map((line) => line.faceId);
  const walk = planWalk(faceIds);
  const stops = walk.stops.length;
  const lines = faceIds.length;
  const units = lines * OPERATION.unitsPerLine;
  const travelSeconds = walkSeconds(walk.distanceM);
  const buckets: MixBucket[] = [
    { kind: "travel", label: "travel", occurrences: stops + 1, seconds: travelSeconds },
    { kind: "grabPerLine", label: "grab/line", occurrences: lines, seconds: TASKS.grabPerLine * lines },
    { kind: "grabPerUnit", label: "grab/unit", occurrences: units, seconds: TASKS.grabPerUnit * units },
    { kind: "countAndGive", label: "count/give", occurrences: units, seconds: TASKS.countAndGive * units },
    { kind: "cartManeuver", label: "maneuver", occurrences: stops, seconds: TASKS.cartManeuver * stops },
    { kind: "putAndVerify", label: "put/verify", occurrences: lines, seconds: TASKS.putAndVerify * lines },
    { kind: "packSplit", label: "pack split", occurrences: 1, seconds: TASKS.packSplit },
  ];
  return {
    ticketId: SAMPLE.id,
    house: SAMPLE.house,
    ticket: SAMPLE.ticket,
    stops,
    lines,
    units,
    travelSeconds,
    totalSeconds: buckets.reduce((total, bucket) => total + bucket.seconds, 0),
    buckets,
  };
}

export const ZONE_STANDARDS: ZoneStandard[] = ZONES.map(zoneStandard);
