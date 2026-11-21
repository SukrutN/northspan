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
 * The operation (task mix, shift, cart stops, velocity classes, zones,
 * and skill bands) is read from the engine's published fixture
 * (engine/fixtures/kiln-annex/operation.json), not constants invented
 * for the page. The characterization tests here lock the same table the
 * engine's CLI prints.
 */

import operationJson from "../../engine/fixtures/kiln-annex/operation.json";

import { ORDERS } from "@/lib/orders";
import { planWalk, walkSeconds } from "@/lib/routing";
import { RUNS } from "@/lib/warehouse";

/** The engine's operation document for Kiln Annex, exactly as its CLI reads it. */
const OPERATION_SPEC = operationJson;

export const OPERATION = {
  id: OPERATION_SPEC.id,
  name: OPERATION_SPEC.name,
  /** The worked ticket's house label, carried by the MR-204 ticket itself. */
  ticket: "Counter refill, ship Friday",
  shiftSeconds: OPERATION_SPEC.shiftSeconds,
  cartStops: OPERATION_SPEC.cartStops,
  unitsPerLine: OPERATION_SPEC.unitsPerLine,
};

export const TASKS = {
  grabPerLine: OPERATION_SPEC.tasks.grabPerLineSeconds,
  grabPerUnit: OPERATION_SPEC.tasks.grabPerUnitSeconds,
  countAndGive: OPERATION_SPEC.tasks.countAndGiveSeconds,
  cartManeuver: OPERATION_SPEC.tasks.cartManeuverSeconds,
  putAndVerify: OPERATION_SPEC.tasks.putAndVerifySeconds,
  packSplit: OPERATION_SPEC.tasks.packSplitSeconds,
};

export type VelocityClassId = "hot" | "flow" | "calm";

function velocityLines(id: VelocityClassId): number {
  const cls = OPERATION_SPEC.velocityClasses.find((entry) => entry.id === id);
  if (!cls) throw new Error(`The operation publishes no ${id} velocity class.`);
  return cls.linesPerShift;
}

const VELOCITY_CLASSES: Record<VelocityClassId, number> = {
  hot: velocityLines("hot"),
  flow: velocityLines("flow"),
  calm: velocityLines("calm"),
};

export interface ZoneSpec {
  run: string;
  velocity: VelocityClassId;
  faces: string[];
}

export const SKILLS = OPERATION_SPEC.skills.map((skill) => ({
  id: skill.id,
  name: skill.name,
  factor: skill.rateFactor,
}));

const ZONES: readonly ZoneSpec[] = OPERATION_SPEC.zones.map((zone) => ({
  run: zone.run,
  velocity: zone.velocity as VelocityClassId,
  faces: [...zone.sampleStands],
}));

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
