/** Kiln Annex, a worked floor. Coordinates are metres. North is +y. */

export type Side = "W" | "E";

export const FLOOR = {
  width: 38,
  height: 26,
  /** Centreline of the south cross-aisle, the apron aisle. */
  south: 3.8,
  /** Centreline of the north cross-aisle, the rear aisle. */
  north: 22.8,
} as const;

export const DOCK = {
  id: "APRON",
  name: "Apron gate",
  x: 1.5,
  y: FLOOR.south,
} as const;

export const RUNS = [
  { index: 0, code: "CIN", name: "Cinder" },
  { index: 1, code: "LOA", name: "Loam" },
  { index: 2, code: "FLI", name: "Flint" },
  { index: 3, code: "REE", name: "Reed" },
  { index: 4, code: "COB", name: "Cobalt" },
] as const;

export const BAY_COUNT = 6;
const BAY_Y0 = 6.15;
const BAY_PITCH = 2.45;

export function runCenter(index: number): number {
  return 5.6 + index * 5.7;
}

export function bayCentre(bay: number): number {
  return BAY_Y0 + (bay - 1) * BAY_PITCH;
}

const CELL_W = 1.55;
const CELL_H = 2.05;
const AISLE_HALF = 0.95;

export interface Face {
  id: string;
  runIndex: number;
  runCode: string;
  runName: string;
  bay: number;
  side: Side;
  xStand: number;
  yStand: number;
  cell: { x: number; y: number; w: number; h: number };
  sku: string | null;
  item: string | null;
}

const STOCK: Record<string, { sku: string; item: string }> = {
  "CIN-01-W": { sku: "KW-08", item: "Cotton wick, 8 mm" },
  "CIN-02-E": { sku: "CD-SH", item: "Cedar shavings" },
  "CIN-04-W": { sku: "JT-CD", item: "Jute cord" },
  "CIN-06-W": { sku: "BW-SH", item: "Beeswax sheet" },
  "LOA-01-E": { sku: "WL-DS", item: "Wool duster" },
  "LOA-03-W": { sku: "BR-SN", item: "Brass snuffer" },
  "LOA-05-E": { sku: "LN-TP", item: "Linen tape" },
  "LOA-06-W": { sku: "OK-40", item: "Oak peg, 40 mm" },
  "FLI-01-W": { sku: "ST-CK", item: "Stoneware crock" },
  "FLI-03-E": { sku: "CL-TP", item: "Clay taper" },
  "FLI-04-W": { sku: "IR-HK", item: "Iron hook" },
  "FLI-06-E": { sku: "LP-CH", item: "Lamp chimney" },
  "REE-01-W": { sku: "LP-OL", item: "Lamp oil tin" },
  "REE-02-E": { sku: "FX-TW", item: "Flax twine" },
  "REE-04-W": { sku: "SL-BR", item: "Salt brick" },
  "REE-06-E": { sku: "CK-DK", item: "Cork disk" },
  "COB-01-E": { sku: "NT-BL", item: "Night bell" },
  "COB-03-W": { sku: "CU-RV", item: "Copper rivet" },
  "COB-05-E": { sku: "SL-ND", item: "Sail needle" },
  "COB-06-W": { sku: "GR-ST", item: "Graphite stick" },
};

function buildFaces(): Face[] {
  const faces: Face[] = [];
  for (const run of RUNS) {
    const cx = runCenter(run.index);
    for (let bay = 1; bay <= BAY_COUNT; bay++) {
      const yStand = bayCentre(bay);
      for (const side of ["W", "E"] as const) {
        const id = `${run.code}-${String(bay).padStart(2, "0")}-${side}`;
        const stock = STOCK[id] ?? null;
        const x =
          side === "W" ? cx - AISLE_HALF - CELL_W : cx + AISLE_HALF;
        faces.push({
          id,
          runIndex: run.index,
          runCode: run.code,
          runName: run.name,
          bay,
          side,
          xStand: cx,
          yStand,
          cell: { x, y: yStand - CELL_H / 2, w: CELL_W, h: CELL_H },
          sku: stock?.sku ?? null,
          item: stock?.item ?? null,
        });
      }
    }
  }
  return faces;
}

export const FACES: Face[] = buildFaces();

const BY_ID = new Map(FACES.map((face) => [face.id, face]));

export function getFace(id: string): Face | undefined {
  return BY_ID.get(id.trim().toUpperCase());
}

export function faceLabel(face: Face): string {
  const side = face.side === "W" ? "west" : "east";
  return `${face.runName} ${face.id}, bay ${String(face.bay).padStart(2, "0")}, ${side}`;
}

export const PACK_BENCH = { x: 33.4, y: 2.15, w: 3.8, h: 2.5 };
