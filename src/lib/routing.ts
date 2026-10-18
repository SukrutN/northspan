/**
 * Aisle walk for one picker on Kiln Annex.
 *
 * Distance is the cart's path, not a straight line through the racks.
 * On one run it is the gap along the aisle. Between runs the cart takes
 * the apron aisle or the rear aisle, whichever is shorter.
 *
 * The tour starts and ends at the apron gate. A nearest-neighbour pass
 * builds a first tour. Two-opt then reverses any stretch that shortens
 * it. The same improvement is applied to a serpentine aisle sweep, and
 * the shorter improved tour is the one we keep. The sweep itself, before
 * improvement, is the naive comparison.
 */

import { DOCK, FLOOR, getFace, type Face } from "@/lib/warehouse";

export const WALK_MPS = 1.15;

export interface WalkPoint {
  key: string;
  x: number;
  y: number;
  /** Run index, or -1 for the apron gate. */
  aisle: number;
  faceIds: string[];
}

export interface Point {
  x: number;
  y: number;
}

export type Corridor = "aisle" | "south" | "north" | "start";

export interface PlannedStop {
  key: string;
  faceIds: string[];
  x: number;
  y: number;
  label: string;
  metresFromPrev: number;
  via: Corridor;
}

export interface WalkPlan {
  stops: PlannedStop[];
  distanceM: number;
  sweepDistanceM: number;
  savedM: number;
  returnM: number;
  polyline: Point[];
  sweepPolyline: Point[];
  sameAsSweep: boolean;
}

const dockPoint = (): WalkPoint => ({
  key: DOCK.id,
  x: DOCK.x,
  y: DOCK.y,
  aisle: -1,
  faceIds: [],
});

export function walkingDistance(a: WalkPoint | Point & { aisle: number }, b: WalkPoint | Point & { aisle: number }): number {
  if (Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9) return 0;
  if (a.aisle >= 0 && a.aisle === b.aisle) return Math.abs(a.y - b.y);
  const horizontal = Math.abs(a.x - b.x);
  const viaSouth = Math.abs(a.y - FLOOR.south) + horizontal + Math.abs(b.y - FLOOR.south);
  const viaNorth = Math.abs(a.y - FLOOR.north) + horizontal + Math.abs(b.y - FLOOR.north);
  return Math.min(viaSouth, viaNorth);
}

function corridorBetween(a: WalkPoint, b: WalkPoint): Exclude<Corridor, "start"> {
  if (a.aisle >= 0 && a.aisle === b.aisle) return "aisle";
  const horizontal = Math.abs(a.x - b.x);
  const viaSouth = Math.abs(a.y - FLOOR.south) + horizontal + Math.abs(b.y - FLOOR.south);
  const viaNorth = Math.abs(a.y - FLOOR.north) + horizontal + Math.abs(b.y - FLOOR.north);
  return viaSouth <= viaNorth ? "south" : "north";
}

export function legPoints(a: WalkPoint, b: WalkPoint): Point[] {
  if (a.aisle >= 0 && a.aisle === b.aisle) {
    return [
      { x: a.x, y: a.y },
      { x: b.x, y: b.y },
    ];
  }
  const via = corridorBetween(a, b);
  const y = via === "south" ? FLOOR.south : FLOOR.north;
  const pts: Point[] = [{ x: a.x, y: a.y }];
  if (Math.abs(a.y - y) > 1e-6) pts.push({ x: a.x, y });
  if (Math.abs(a.x - b.x) > 1e-6) pts.push({ x: b.x, y });
  const last = pts[pts.length - 1];
  if (Math.abs(last.x - b.x) > 1e-6 || Math.abs(last.y - b.y) > 1e-6) {
    pts.push({ x: b.x, y: b.y });
  }
  return pts;
}

function dedupe(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const point of points) {
    const prev = out[out.length - 1];
    if (!prev || Math.abs(prev.x - point.x) > 1e-6 || Math.abs(prev.y - point.y) > 1e-6) {
      out.push(point);
    }
  }
  return out;
}

export function tourLength(tour: WalkPoint[]): number {
  let total = 0;
  for (let i = 0; i < tour.length - 1; i++) total += walkingDistance(tour[i], tour[i + 1]);
  return total;
}

export function polylineFor(tour: WalkPoint[]): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < tour.length - 1; i++) {
    const leg = legPoints(tour[i], tour[i + 1]);
    if (points.length) leg.shift();
    points.push(...leg);
  }
  return dedupe(points);
}

function standKey(face: Face): string {
  return `${face.runIndex}:${face.bay}`;
}

function labelFor(faces: Face[]): string {
  const first = faces[0];
  if (faces.length === 1) return first.id;
  return `${first.runCode}-${String(first.bay).padStart(2, "0")}`;
}

export function standsFor(faceIds: string[]): WalkPoint[] {
  const grouped = new Map<string, Face[]>();
  for (const id of faceIds) {
    const face = getFace(id);
    if (!face) throw new Error(`Kiln Annex has no face marked ${id}.`);
    const key = standKey(face);
    const list = grouped.get(key);
    if (list) list.push(face);
    else grouped.set(key, [face]);
  }
  return [...grouped.entries()].map(([key, faces]) => ({
    key,
    x: faces[0].xStand,
    y: faces[0].yStand,
    aisle: faces[0].runIndex,
    faceIds: faces.map((face) => face.id),
  }));
}

/** Serpentine sweep: runs west to east, direction alternating, no look-ahead. */
export function aisleSweep(stops: WalkPoint[], dock: WalkPoint): WalkPoint[] {
  const byAisle = new Map<number, WalkPoint[]>();
  for (const stop of stops) {
    const list = byAisle.get(stop.aisle);
    if (list) list.push(stop);
    else byAisle.set(stop.aisle, [stop]);
  }
  const ordered: WalkPoint[] = [];
  const aisles = [...byAisle.keys()].sort((a, b) => a - b);
  aisles.forEach((aisle, index) => {
    const southToNorth = index % 2 === 0;
    const row = byAisle.get(aisle)!;
    row.sort((a, b) => {
      const dy = southToNorth ? a.y - b.y : b.y - a.y;
      if (Math.abs(dy) > 1e-9) return dy;
      return a.key < b.key ? -1 : 1;
    });
    ordered.push(...row);
  });
  return [dock, ...ordered, dock];
}

export function nearestNeighbour(stops: WalkPoint[], dock: WalkPoint): WalkPoint[] {
  const remaining = [...stops];
  const tour: WalkPoint[] = [dock];
  let current = dock;
  while (remaining.length) {
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const distance = walkingDistance(current, remaining[i]);
      const closer = distance < bestDistance - 1e-9;
      const tie = Math.abs(distance - bestDistance) <= 1e-9 && remaining[i].key < remaining[best].key;
      if (closer || tie) {
        best = i;
        bestDistance = distance;
      }
    }
    current = remaining.splice(best, 1)[0];
    tour.push(current);
  }
  tour.push(dock);
  return tour;
}

/** Reverse stretches of an open tour whose ends stay fixed. */
export function twoOpt(tour: WalkPoint[]): WalkPoint[] {
  const next = tour.slice();
  let guard = 0;
  let improved = true;
  while (improved && guard < 80) {
    improved = false;
    guard += 1;
    const n = next.length;
    for (let i = 1; i < n - 2 && !improved; i++) {
      for (let k = i + 1; k < n - 1; k++) {
        const before =
          walkingDistance(next[i - 1], next[i]) + walkingDistance(next[k], next[k + 1]);
        const after =
          walkingDistance(next[i - 1], next[k]) + walkingDistance(next[i], next[k + 1]);
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

function describe(tour: WalkPoint[]): PlannedStop[] {
  const stops: PlannedStop[] = [];
  for (let i = 1; i < tour.length - 1; i++) {
    const point = tour[i];
    const faces = point.faceIds.map((id) => getFace(id)!);
    stops.push({
      key: point.key,
      faceIds: point.faceIds,
      x: point.x,
      y: point.y,
      label: labelFor(faces),
      metresFromPrev: walkingDistance(tour[i - 1], point),
      via: i === 1 ? corridorBetween(tour[0], point) : corridorBetween(tour[i - 1], point),
    });
  }
  return stops;
}

function sameSequence(a: WalkPoint[], b: WalkPoint[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((point, index) => point.key === b[index].key);
}

export function planWalk(faceIds: string[]): WalkPlan {
  const unique = [...new Set(faceIds.map((id) => id.trim().toUpperCase()))];
  if (unique.length === 0) {
    return {
      stops: [],
      distanceM: 0,
      sweepDistanceM: 0,
      savedM: 0,
      returnM: 0,
      polyline: [],
      sweepPolyline: [],
      sameAsSweep: true,
    };
  }
  const stops = standsFor(unique);
  const dock = dockPoint();
  const seeded = twoOpt(nearestNeighbour(stops, dock));
  const sweep = aisleSweep(stops, dock);
  const sweepImproved = twoOpt(sweep.map((point) => point));
  const planned = tourLength(seeded) <= tourLength(sweepImproved) ? seeded : sweepImproved;
  const distanceM = tourLength(planned);
  const sweepDistanceM = tourLength(sweep);
  const returnM = walkingDistance(planned[planned.length - 2], planned[planned.length - 1]);
  return {
    stops: describe(planned),
    distanceM,
    sweepDistanceM,
    savedM: sweepDistanceM - distanceM,
    returnM,
    polyline: polylineFor(planned),
    sweepPolyline: polylineFor(sweep),
    sameAsSweep: sameSequence(planned, sweep),
  };
}

export function formatMetres(metres: number): string {
  return `${metres.toFixed(1)} m`;
}

export function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(whole / 60);
  const remain = whole % 60;
  if (minutes === 0) return `${remain} sec`;
  return `${minutes} min ${remain.toString().padStart(2, "0")} sec`;
}

export function walkSeconds(metres: number): number {
  return metres / WALK_MPS;
}

export function viaPhrase(via: Corridor): string {
  if (via === "south") return "by the apron aisle";
  if (via === "north") return "by the rear aisle";
  if (via === "aisle") return "along the run";
  return "from the gate";
}
