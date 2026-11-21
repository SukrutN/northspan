import type { Floor, Point, Walk } from "@/lib/engine/planner";

const S = 20;
const PAD_L = 58;
const PAD_T = 26;
const PAD_R = 24;
const PAD_B = 44;

function X(metres: number): number {
  return PAD_L + metres * S;
}

function Y(metres: number, floor: Floor): number {
  return PAD_T + (floor.heightM - metres) * S;
}

function pathD(points: Point[], floor: Floor): string {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${X(point.x).toFixed(2)} ${Y(point.y, floor).toFixed(2)}`)
    .join(" ");
}

function svgLength(points: Point[], floor: Floor): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(
      X(points[i].x) - X(points[i - 1].x),
      Y(points[i].y, floor) - Y(points[i - 1].y, floor),
    );
  }
  return length;
}

const MONO = "var(--font-mono), ui-monospace, monospace";

/**
 * The floor drawn from the engine's own model: runs as north-south bands,
 * cross-aisles as strips, slots as cells on their stands, the gate, and the
 * planned tour in brand orange against the dashed sweep. Any floor file the
 * engine accepts, this draws.
 */
export function EngineFloorMap({
  floor,
  walk,
  marked = [],
  caption,
}: {
  floor: Floor;
  walk: Walk | null;
  marked?: string[];
  caption: string;
}) {
  const vbW = PAD_L + floor.widthM * S + PAD_R;
  const vbH = PAD_T + floor.heightM * S + PAD_B;
  const routeD = walk ? pathD(walk.polyline, floor) : "";
  const sweepD = walk ? pathD(walk.sweepPolyline, floor) : "";
  const routeLength = walk ? svgLength(walk.polyline, floor) : 0;
  const markedSet = new Set(marked.map((code) => code.trim().toUpperCase()));
  const aisleLow = Math.min(...floor.crossAisles.map((aisle) => aisle.y));
  const aisleHigh = Math.max(...floor.crossAisles.map((aisle) => aisle.y));
  const runX = new Map(floor.runs.map((run) => [run.code, run.x]));
  const sameAsSweep =
    walk !== null &&
    walk.stops.length > 0 &&
    Math.abs(walk.distanceM - walk.sweepDistanceM) < 0.05;

  return (
    <figure className="min-w-0 bg-floor text-floor-ink">
      <figcaption className="flex flex-col gap-1 px-4 pt-4 sm:flex-row sm:items-baseline sm:justify-between md:px-5">
        <span className="font-mono text-[11px] tracking-[0.16em] text-floor-ink/70 uppercase">
          {caption}
        </span>
        <span className="font-mono text-[11px] tracking-[0.08em] text-floor-ink/55">
          {floor.widthM} × {floor.heightM} m
        </span>
      </figcaption>

      <div className="mt-2 overflow-x-auto px-2 pb-2 md:px-3">
        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          className="h-auto w-full min-w-[640px]"
          role="img"
          aria-label={caption}
        >
          <rect
            x={X(0)}
            y={Y(floor.heightM, floor)}
            width={floor.widthM * S}
            height={floor.heightM * S}
            fill="#210a07"
            stroke="#4d2523"
            strokeWidth="1.25"
          />

          {floor.crossAisles.map((aisle) => (
            <rect
              key={aisle.id}
              x={X(0)}
              y={Y(aisle.y, floor) - 0.75 * S}
              width={floor.widthM * S}
              height={1.5 * S}
              fill="#31100c"
            />
          ))}

          {floor.runs.map((run) => (
            <rect
              key={run.code}
              x={X(run.x) - 0.85 * S}
              y={Y(aisleHigh, floor)}
              width={1.7 * S}
              height={(aisleHigh - aisleLow) * S}
              fill="#2a0c09"
            />
          ))}

          {floor.landmarks.map((mark) => (
            <g key={mark.id}>
              <rect
                x={X(mark.x) - 2.5 * S}
                y={Y(mark.y + 1.2, floor)}
                width={5 * S}
                height={2.4 * S}
                fill="#31100c"
                stroke="#c9b8ad"
                strokeDasharray="4 3"
                strokeWidth="1"
              />
              <text
                x={X(mark.x)}
                y={Y(mark.y, floor) - 4}
                textAnchor="middle"
                fill="#c9b8ad"
                fontSize="11"
                fontFamily={MONO}
                letterSpacing="1.2"
              >
                {mark.name}
              </text>
            </g>
          ))}

          {floor.slots.map((slot) => {
            const isMarked = markedSet.has(slot.code);
            const stocked = slot.item !== null;
            return (
              <rect
                key={slot.code}
                className="face-cell"
                x={X(runX.get(slot.run) ?? 0) - 0.575 * S}
                y={Y(slot.alongM + 0.575, floor)}
                width={1.15 * S}
                height={1.15 * S}
                rx="1.5"
                fill={isMarked ? "#ff5b2e" : stocked ? "#4d2523" : "#3a0e0b"}
                stroke={isMarked ? "#f4df99" : "#54241b"}
                strokeWidth={isMarked ? 1.6 : 1}
              />
            );
          })}

          {walk && sweepD && !sameAsSweep ? (
            <path
              d={sweepD}
              fill="none"
              stroke="#c9b8ad"
              strokeWidth="3.4"
              strokeDasharray="8 7"
              strokeLinejoin="round"
              strokeLinecap="butt"
              pointerEvents="none"
            >
              <title>Aisle sweep</title>
            </path>
          ) : null}

          {routeD ? (
            <path
              className="route-path"
              d={routeD}
              fill="none"
              stroke="#ff5b2e"
              strokeWidth="3.1"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={routeLength}
              strokeDashoffset={routeLength}
              pointerEvents="none"
            />
          ) : null}

          <rect
            x={X(floor.gate.x) - 11}
            y={Y(floor.gate.y + 0.55, floor)}
            width={22}
            height={22}
            fill="#efe4d7"
            stroke="#2f0705"
            strokeWidth="1.2"
          />
          <text
            x={X(floor.gate.x)}
            y={Y(floor.gate.y, floor) + 1}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#2f0705"
            fontSize="7.5"
            fontFamily={MONO}
            fontWeight="500"
          >
            GATE
          </text>

          {walk
            ? walk.stops.map((stop) => (
                <g key={`${stop.order}-${stop.stand}`} className="stop-mark" pointerEvents="none">
                  <circle
                    cx={X(stop.x)}
                    cy={Y(stop.y, floor)}
                    r="9"
                    fill="#faf7f5"
                    stroke="#2f0705"
                    strokeWidth="1"
                  />
                  <text
                    x={X(stop.x)}
                    y={Y(stop.y, floor) + 0.5}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#2f0705"
                    fontSize="10"
                    fontFamily={MONO}
                    fontWeight="500"
                  >
                    {stop.order}
                  </text>
                </g>
              ))
            : null}

          {floor.runs.map((run) => (
            <text
              key={run.code}
              x={X(run.x)}
              y={Y(0, floor) + 24}
              textAnchor="middle"
              fill="#c9b8ad"
              fontSize="11"
              fontFamily={MONO}
              letterSpacing="0.8"
            >
              {run.name}
            </text>
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 pb-4 text-[11px] text-floor-ink/60 md:px-5">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-5 rounded-full bg-[#ff5b2e]" />
          Planned route
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-5 rounded-full border-t-[3px] border-dashed border-[#c9b8ad]" />
          Sweep, every aisle in order
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#ff5b2e] ring-1 ring-[#f4df99]" />
          Ticket locations
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#c9b8ad]" />
          Stocked location
        </span>
      </div>
    </figure>
  );
}
