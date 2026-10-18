export interface TicketLine {
  faceId: string;
  qty: number;
}

export interface HouseOrder {
  id: string;
  house: string;
  ticket: string;
  lines: TicketLine[];
}

/** Worked tickets for Kiln Annex. Not a warehouse extract. */
export const ORDERS: HouseOrder[] = [
  {
    id: "MR-204",
    house: "Merrow Chandlery",
    ticket: "Counter refill, ship Friday",
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
    ticket: "Lamp stores for the east rooms",
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
    ticket: "Small hardware, hold at the bench",
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
    ticket: "One bell for the gate",
    lines: [{ faceId: "COB-01-E", qty: 1 }],
  },
];

export function getOrder(id: string): HouseOrder | undefined {
  return ORDERS.find((order) => order.id === id);
}
