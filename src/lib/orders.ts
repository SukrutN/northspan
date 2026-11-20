export interface TicketLine {
  faceId: string;
  qty: number;
}

export interface HouseOrder {
  id: string;
  house: string;
  /** A short label for captions and table rows. */
  short: string;
  /** One plain sentence about what the order is for. */
  ticket: string;
  lines: TicketLine[];
}

/** Sample tickets for the demo floor. Not a warehouse extract. */
export const ORDERS: HouseOrder[] = [
  {
    id: "MR-204",
    house: "Merrow Chandlery",
    short: "weekly restock",
    ticket: "Restocks through this warehouse every week, and the order ships out on Friday.",
    lines: [
      { faceId: "CIN-06-W", qty: 8 },
      { faceId: "LOA-01-E", qty: 6 },
      { faceId: "FLI-06-E", qty: 4 },
      { faceId: "REE-01-W", qty: 5 },
      { faceId: "COB-06-W", qty: 12 },
    ],
  },
  {
    id: "SH-118",
    house: "Salt House Hotel",
    short: "east-room lamps",
    ticket: "Lamp stock for the east rooms, all going up in one delivery.",
    lines: [
      { faceId: "FLI-01-W", qty: 2 },
      { faceId: "REE-02-E", qty: 10 },
      { faceId: "REE-04-W", qty: 4 },
      { faceId: "COB-05-E", qty: 8 },
      { faceId: "CIN-02-E", qty: 3 },
    ],
  },
  {
    id: "PD-077",
    house: "Plover & Daughter",
    short: "bench hold",
    ticket: "Small hardware held at the bench until someone collects it.",
    lines: [
      { faceId: "CIN-04-W", qty: 4 },
      { faceId: "LOA-03-W", qty: 2 },
      { faceId: "LOA-05-E", qty: 10 },
      { faceId: "FLI-04-W", qty: 6 },
    ],
  },
  {
    id: "NB-012",
    house: "Night desk",
    short: "night pickup",
    ticket: "One carton picked up at the start of the night shift.",
    lines: [{ faceId: "COB-01-E", qty: 1 }],
  },
];

export function getOrder(id: string): HouseOrder | undefined {
  return ORDERS.find((order) => order.id === id);
}
