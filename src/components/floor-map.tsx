"use client";

import { useMemo, useState } from "react";
import {
  BAY_COUNT,
  DOCK,
  FACES,
  FLOOR,
  PACK_BENCH,
  RUNS,
  bayCentre,
  faceLabel,
  runCenter,
  type Face,
} from "@/lib/warehouse";
import type { Point } from "@/lib/routing";

/*
 * Kiln Annex, drawn in the Northspan theme: the slab is oxblood, the racks sit
 * a shade lighter, stocked faces carry the dark brown of the palette, and the
 * tour is drawn in the same brand orange that accents every other figure.
 */
const SLAB = "#210a07";
const SLAB_EDGE = "#4d2523";
const AISLE = "#31100c";
const RUN_FILL = "#2a0c09";
const BENCH = "#31100c";
const BENCH_EDGE = "#c9b8ad";
const LABEL_STRONG = "#c9b8ad";
const LABEL_DIM = "#8f7a6c";
const FACE_STOCKED = "#4d2523";
const FACE_OPEN = "#3a0e0b";
const FACE_EDGE = "#54241b";
const FACE_ON = "#ff5b2e";
const FACE_ON_EDGE = "#f4df99";
const STOCK_DOT = "#c9b8ad";
const SWEEP_INK = "#c9b8ad";
const ROUTE_INK = "#ff5b2e";
const GATE_FILL = "#efe4d7";
const INK = "#2f0705";
const STOP_FILL = "#faf7f5";

const S = 20;
const PAD_L = 58;
const PAD_T = 26;
const PAD_R = 20;
const PAD_B = 46;

function X(metres: number) {
  return PAD_L + metres * S;
}
function Y(metres: number) {
  return PAD_T + (FLOOR.height - metres) * S;
}

const VB_W = PAD_L + FLOOR.width * S + PAD_R;
const VB_H = PAD_T + FLOOR.height * S + PAD_B;

function pathD(points: Point[]): string {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${X(point.x).toFixed(2)} ${Y(point.y).toFixed(2)}`)
    .join(" ");
}

function svgLength(points: Point[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(X(points[i].x) - X(points[i - 1].x), Y(points[i].y) - Y(points[i - 1].y));
  }
  return length;
}

export interface FloorStop {
  x: number;
  y: number;
  n: number;
}

interface FloorMapProps {
  selectedIds: string[];
  polyline?: Point[];
  sweepPolyline?: Point[];
  showSweep?: boolean;
  stops?: FloorStop[];
  interactive?: boolean;
  pending?: boolean;
  caption: string;
  compact?: boolean;
  onToggle?: (faceId: string) => void;
}

export function FloorMap({
  selectedIds,
  polyline = [],
  sweepPolyline = [],
  showSweep = false,
  stops = [],
  interactive = false,
  pending = false,
  caption,
  compact = false,
  onToggle,
}: FloorMapProps) {
  const [hovered, setHovered] = useState<Face | null>(null);
  const [large, setLarge] = useState(false);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const routeD = pathD(polyline);
  const sweepD = pathD(sweepPolyline);
  const routeLength = svgLength(polyline);
  const routeKey = polyline.map((point) => `${point.x.toFixed(1)}:${point.y.toFixed(1)}`).join("|");

  const detail = hovered
    ? `${hovered.id}, ${hovered.item ?? "Open location"}, ${hovered.runName}`
    : "Faces with a mark are stocked. Empty cells are open.";

  return (
    <figure className="min-w-0 bg-floor text-floor-ink">
      {compact ? null : (
        <figcaption className="flex flex-col gap-1 px-4 pt-4 sm:flex-row sm:items-baseline sm:justify-between md:px-5">
          <span className="font-mono text-[11px] tracking-[0.16em] text-floor-ink/70 uppercase">
            {caption}
          </span>
          <span className="font-mono text-[11px] tracking-[0.08em] text-floor-ink/55">
            {FLOOR.width} × {FLOOR.height} m
          </span>
        </figcaption>
      )}

      {compact ? null : (
        <div className="flex items-center justify-between gap-3 px-4 pt-3 md:px-5">
        <p className="min-h-5 font-mono text-[11px] tracking-wide text-floor-ink/80" aria-live="polite">
          {pending ? "Measuring the walk…" : detail}
        </p>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className={`cursor-pointer px-2 py-1 font-mono text-[10px] tracking-[0.14em] uppercase ${large ? "text-floor-ink/50" : "text-route"}`}
            onClick={() => setLarge(false)}
            aria-pressed={!large}
          >
            Fit
          </button>
          <button
            type="button"
            className={`cursor-pointer px-2 py-1 font-mono text-[10px] tracking-[0.14em] uppercase ${large ? "text-route" : "text-floor-ink/50"}`}
            onClick={() => setLarge(true)}
            aria-pressed={large}
          >
            Large
          </button>
        </div>
      </div>
      )}

      <div className={compact ? "overflow-hidden" : `mt-2 overflow-x-auto px-2 pb-2 md:px-3 ${pending ? "opacity-70" : ""}`}>
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className={compact ? "h-auto w-full" : large ? "h-auto min-w-[1080px]" : "h-auto w-full min-w-[640px]"}
          role={interactive ? "group" : "img"}
          aria-label={caption}
        >
          <rect
            x={X(0.35)}
            y={Y(24.4)}
            width={37.3 * S}
            height={23.1 * S}
            fill={SLAB}
            stroke={SLAB_EDGE}
            strokeWidth="1.25"
          />
          <rect
            x={X(0.55)}
            y={Y(FLOOR.south + 0.9)}
            width={36.8 * S}
            height={1.8 * S}
            fill={AISLE}
          />
          <rect
            x={X(0.55)}
            y={Y(FLOOR.north + 0.9)}
            width={36.8 * S}
            height={1.8 * S}
            fill={AISLE}
          />
          {RUNS.map((run) => {
            const cx = runCenter(run.index);
            return (
              <rect
                key={run.code}
                x={X(cx - 0.95)}
                y={Y(FLOOR.north + 0.15)}
                width={1.9 * S}
                height={(FLOOR.north - FLOOR.south + 0.3) * S}
                fill={RUN_FILL}
              />
            );
          })}
          <rect
            x={X(PACK_BENCH.x)}
            y={Y(PACK_BENCH.y + PACK_BENCH.h)}
            width={PACK_BENCH.w * S}
            height={PACK_BENCH.h * S}
            fill={BENCH}
            stroke={BENCH_EDGE}
            strokeDasharray="4 3"
            strokeWidth="1"
          />
          <text
            x={X(PACK_BENCH.x + PACK_BENCH.w / 2)}
            y={Y(PACK_BENCH.y + PACK_BENCH.h / 2)}
            textAnchor="middle"
            dominantBaseline="central"
            fill={LABEL_STRONG}
            fontSize="11"
            fontFamily="var(--font-mono), ui-monospace, monospace"
            letterSpacing="1.4"
          >
            PACK
          </text>

          {FACES.map((face) => {
            const isOn = selected.has(face.id);
            const stocked = Boolean(face.item);
            return (
              <g key={face.id}>
                <rect
                  className="face-cell"
                  x={X(face.cell.x)}
                  y={Y(face.cell.y + face.cell.h)}
                  width={face.cell.w * S}
                  height={face.cell.h * S}
                  rx="1.5"
                  fill={isOn ? FACE_ON : stocked ? FACE_STOCKED : FACE_OPEN}
                  stroke={isOn ? FACE_ON_EDGE : FACE_EDGE}
                  strokeWidth={isOn ? 1.6 : 1}
                  data-selected={isOn ? "true" : "false"}
                  role={interactive ? "button" : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  aria-label={interactive ? faceLabel(face) : undefined}
                  aria-pressed={interactive ? isOn : undefined}
                  style={{ cursor: interactive ? "pointer" : "default" }}
                  onMouseEnter={() => setHovered(face)}
                  onMouseLeave={() => setHovered((current) => (current?.id === face.id ? null : current))}
                  onFocus={() => setHovered(face)}
                  onBlur={() => setHovered((current) => (current?.id === face.id ? null : current))}
                  onClick={() => interactive && onToggle?.(face.id)}
                  onKeyDown={(event) => {
                    if (!interactive) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onToggle?.(face.id);
                    }
                  }}
                />
                {stocked && !isOn ? (
                  <circle
                    className="face-dot"
                    cx={X(face.cell.x + face.cell.w / 2)}
                    cy={Y(face.cell.y + face.cell.h / 2)}
                    r="2.2"
                    fill={STOCK_DOT}
                    style={{ animationDelay: `${(face.bay % 8) * 0.55}s` }}
                    pointerEvents="none"
                  />
                ) : null}
              </g>
            );
          })}

          {showSweep && sweepD ? (
            <path
              d={sweepD}
              fill="none"
              stroke={SWEEP_INK}
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
              key={routeKey}
              className="route-path"
              d={routeD}
              fill="none"
              stroke={ROUTE_INK}
              strokeWidth="3.1"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={routeLength}
              strokeDashoffset={routeLength}
              pointerEvents="none"
            />
          ) : null}

          <rect
            x={X(DOCK.x) - 11}
            y={Y(DOCK.y) - 11}
            width="22"
            height="22"
            fill={GATE_FILL}
            stroke={INK}
            strokeWidth="1.2"
          />
          <text
            x={X(DOCK.x)}
            y={Y(DOCK.y) + 1}
            textAnchor="middle"
            dominantBaseline="central"
            fill={INK}
            fontSize="7.5"
            fontFamily="var(--font-mono), ui-monospace, monospace"
            fontWeight="500"
          >
            GATE
          </text>

          {stops.map((stop) => (
            <g
              key={`${stop.n}-${stop.x}`}
              className="stop-mark"
              style={{ animationDelay: `${stop.n * 70}ms` }}
              pointerEvents="none"
            >
              <circle cx={X(stop.x)} cy={Y(stop.y)} r="9" fill={STOP_FILL} stroke={INK} strokeWidth="1" />
              <text
                x={X(stop.x)}
                y={Y(stop.y) + 0.5}
                textAnchor="middle"
                dominantBaseline="central"
                fill={INK}
                fontSize="10"
                fontFamily="var(--font-mono), ui-monospace, monospace"
                fontWeight="500"
              >
                {stop.n}
              </text>
            </g>
          ))}

          {RUNS.map((run) => (
            <text
              key={run.code}
              x={X(runCenter(run.index))}
              y={Y(-0.55)}
              textAnchor="middle"
              fill={LABEL_STRONG}
              fontSize="11"
              fontFamily="var(--font-mono), ui-monospace, monospace"
              letterSpacing="0.8"
            >
              {run.name}
            </text>
          ))}
          {Array.from({ length: BAY_COUNT }, (_, index) => {
            const bay = index + 1;
            return (
              <text
                key={bay}
                x={X(-0.35)}
                y={Y(bayCentre(bay)) + 1}
                textAnchor="end"
                dominantBaseline="central"
                fill={LABEL_DIM}
                fontSize="10"
                fontFamily="var(--font-mono), ui-monospace, monospace"
              >
                {String(bay).padStart(2, "0")}
              </text>
            );
          })}
          <text
            x={X(0.5)}
            y={Y(FLOOR.north + 2.3)}
            fill={LABEL_DIM}
            fontSize="10"
            fontFamily="var(--font-mono), ui-monospace, monospace"
            letterSpacing="1.2"
          >
            REAR AISLE
          </text>
          <text
            x={X(8.2)}
            y={Y(FLOOR.south - 1.35)}
            fill={LABEL_DIM}
            fontSize="10"
            fontFamily="var(--font-mono), ui-monospace, monospace"
            letterSpacing="1.2"
          >
            APRON AISLE
          </text>
          <text
            x={X(36.6)}
            y={Y(24.9)}
            textAnchor="end"
            fill={LABEL_DIM}
            fontSize="10"
            fontFamily="var(--font-mono), ui-monospace, monospace"
          >
            N
          </text>
        </svg>
      </div>

      {compact ? null : (
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
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#c9c2b2]" />
            Stocked location
          </span>
        </div>
      )}
    </figure>
  );
}
