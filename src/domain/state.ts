import {
  FRYER_INCIDENT_MINUTES,
  READY_TIME_TOLERANCE_MINUTES,
} from "./clock";
import type { KitchenState, TableConstraint } from "./types";
import { canonicalFixture } from "../fixtures/canonical";

export function createCanonicalState(): KitchenState {
  const fixture = structuredClone(canonicalFixture);
  const tableNames = [...new Set(fixture.tickets.map((ticket) => ticket.tableName))];
  const tableConstraints: TableConstraint[] = tableNames.map((tableName) => ({
    tableName,
    keepTogether: false,
    readyTimeToleranceMinutes: READY_TIME_TOLERANCE_MINUTES,
  }));

  return {
    fixtureId: fixture.id,
    restaurantName: fixture.restaurantName,
    version: 1,
    elapsedMs: 0,
    stations: fixture.stations,
    tickets: fixture.tickets,
    tableConstraints,
    incident: null,
    stagedActions: [],
    rejectedActions: [],
    staleRejection: null,
    validation: null,
    committedReceipt: null,
    activity: [],
    changeLog: [],
    nextActionSeq: 1,
    nextReceiptSeq: 1,
    nextActivitySeq: 1,
  };
}

export function cloneState(state: KitchenState): KitchenState {
  return structuredClone(state);
}

export { FRYER_INCIDENT_MINUTES, READY_TIME_TOLERANCE_MINUTES };
