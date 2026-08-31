export type StationId = "expo" | "grill" | "fryer" | "cold-prep";

export interface Station {
  id: StationId;
  name: string;
  status: "available" | "unavailable";
}

export interface Ticket {
  id: string;
  displayNumber: string;
  tableName: string;
  itemName: string;
  stationId: StationId;
  ageMinutes: number;
  status: "queued" | "working" | "ready" | "held";
  keepTogether: boolean;
}

export interface KitchenFixture {
  id: string;
  restaurantName: string;
  stateVersion: number;
  stations: Station[];
  tickets: Ticket[];
}

export type RecoveryActionKind = "reroute" | "hold" | "prioritize";

export interface RecoveryAction {
  id: string;
  kind: RecoveryActionKind;
  ticketId: string;
  expectedVersion: number;
  reason: string;
  targetStationId?: StationId;
}

export interface ToolReceipt {
  receiptId: string;
  status: "accepted" | "rejected_stale" | "rejected_invalid";
  stateVersion: number;
  affectedIds: string[];
  nextActions: string[];
}
