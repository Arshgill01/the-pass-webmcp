import { applyCommand } from "./commands";
import { derivePhase } from "./selectors";
import { createCanonicalState } from "./state";
import { KitchenStore } from "./store";
import type { Command, KitchenState } from "./types";
import {
  TABLE_12,
  TICKET_FRIES,
  TICKET_POTATOES,
  TICKET_SANDWICH,
} from "../fixtures/canonical";

function report(state: KitchenState) {
  return applyCommand(state, {
    type: "REPORT_FRYER_INCIDENT",
    expectedVersion: state.version,
    actor: "human",
  });
}

function hold(state: KitchenState, ticketId: string, actor: "human" | "agent" = "agent") {
  return applyCommand(state, {
    type: "STAGE_HOLD",
    ticketId,
    expectedVersion: state.version,
    reason: "Fryer is unavailable; hold this ticket until the station returns.",
    actor,
  });
}

function lockTable(state: KitchenState) {
  return applyCommand(state, {
    type: "TOGGLE_KEEP_TOGETHER",
    tableName: TABLE_12,
    expectedVersion: state.version,
    actor: "human",
  });
}

function reroute(state: KitchenState, expectedVersion?: number) {
  return applyCommand(state, {
    type: "STAGE_REROUTE",
    ticketId: TICKET_POTATOES,
    targetStationId: "grill",
    expectedVersion: expectedVersion ?? state.version,
    reason: "Crispy potatoes can finish on grill beside the steak.",
    actor: "agent",
  });
}

describe("canonical domain contract", () => {
  it("starts at immutable version 1 matching a fresh reset", () => {
    const first = createCanonicalState();
    const second = createCanonicalState();

    expect(first.version).toBe(1);
    expect(first.incident).toBeNull();
    expect(first.stations.map((station) => station.id)).toEqual([
      "expo",
      "grill",
      "fryer",
      "cold-prep",
    ]);
    expect(first.tickets).toHaveLength(6);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });

  it("human reports the fryer incident against version 1 → accepted version 2", () => {
    const { result, state } = report(createCanonicalState());

    expect(result).toMatchObject({ status: "accepted", version: 2 });
    expect(state.version).toBe(2);
    expect(state.incident?.stationId).toBe("fryer");
    expect(state.stations.find((station) => station.id === "fryer")?.status).toBe(
      "unavailable",
    );
    expect(state.activity[0]?.actor).toBe("human");
    expect(derivePhase(state)).toBe("INCIDENT_ACTIVE");
  });

  it("agent stages a hold against version 2 → accepted version 3", () => {
    const afterIncident = report(createCanonicalState()).state;
    const { result, state } = hold(afterIncident, TICKET_FRIES);

    expect(result).toMatchObject({ status: "accepted", version: 3 });
    expect(state.stagedActions).toHaveLength(1);
    expect(state.stagedActions[0]).toMatchObject({
      kind: "hold",
      ticketId: TICKET_FRIES,
      actor: "agent",
      status: "staged",
    });
    expect(state.tickets.find((ticket) => ticket.id === TICKET_FRIES)?.stationId).toBe(
      "fryer",
    );
    expect(state.activity.some((entry) => entry.actor === "agent")).toBe(true);
    expect(derivePhase(state)).toBe("RECOVERY_STAGED");
  });

  it("human locks Table 12 against version 3 → accepted version 4", () => {
    const afterHold = hold(report(createCanonicalState()).state, TICKET_FRIES).state;
    const { result, state } = lockTable(afterHold);

    expect(result).toMatchObject({ status: "accepted", version: 4 });
    expect(
      state.tableConstraints.find((constraint) => constraint.tableName === TABLE_12)
        ?.keepTogether,
    ).toBe(true);
    expect(state.activity.at(-1)?.actor).toBe("human");
    expect(state.activity.at(-1)?.summary).toMatch(/Table 12 must stay together/);
  });

  it("agent stages a reroute against expected version 3 → rejected_stale, state remains version 4", () => {
    const v4 = lockTable(
      hold(report(createCanonicalState()).state, TICKET_FRIES).state,
    ).state;
    const ticketsBefore = structuredClone(v4.tickets);
    const stagedBefore = structuredClone(v4.stagedActions);

    const { result, state } = reroute(v4, 3);

    expect(result).toMatchObject({
      status: "rejected_stale",
      expectedVersion: 3,
      currentVersion: 4,
      nextActions: ["inspect_service_state"],
    });
    if (result.status !== "rejected_stale") {
      throw new Error("expected stale rejection");
    }
    expect(result.changedSince.some((change) => /Table 12/.test(change.description))).toBe(
      true,
    );
    expect(state.version).toBe(4);
    expect(state.tickets).toEqual(ticketsBefore);
    expect(state.stagedActions).toEqual(stagedBefore);
    expect(state.rejectedActions).toHaveLength(1);
    expect(state.rejectedActions[0]?.status).toBe("rejected_stale");
    expect(derivePhase(state)).toBe("RECOVERY_STALE");
  });

  it("reset → deep-equal canonical version 1", () => {
    const dirty = reroute(
      lockTable(hold(report(createCanonicalState()).state, TICKET_FRIES).state).state,
      3,
    ).state;

    const { result, state } = applyCommand(dirty, { type: "RESET", actor: "human" });

    expect(result).toMatchObject({ status: "accepted", version: 1 });
    expect(state).toEqual(createCanonicalState());
    expect(state.version).toBe(1);
  });

  it("rejects a second incident report", () => {
    const after = report(createCanonicalState()).state;
    const { result, state } = report(after);

    expect(result.status).toBe("rejected_invalid");
    expect(state.version).toBe(2);
  });

  it("rejects agent attempts at human-only approval", () => {
    const { result, state } = applyCommand(createCanonicalState(), {
      type: "APPROVE_RECOVERY",
      expectedVersion: 1,
      actor: "agent" as unknown as "human",
    });

    expect(result.status).toBe("rejected_invalid");
    if (result.status === "rejected_invalid") {
      expect(result.reasons[0]?.code).toBe("HUMAN_ONLY");
    }
    expect(state.version).toBe(1);
  });

  it("rejects unsupported reroutes without changing version", () => {
    const afterIncident = report(createCanonicalState()).state;
    const { result, state } = applyCommand(afterIncident, {
      type: "STAGE_REROUTE",
      ticketId: TICKET_FRIES,
      targetStationId: "grill",
      expectedVersion: afterIncident.version,
      reason: "Fries cannot move to grill.",
      actor: "agent",
    });

    expect(result.status).toBe("rejected_invalid");
    if (result.status === "rejected_invalid") {
      expect(result.reasons[0]?.code).toBe("STATION_UNSUPPORTED");
    }
    expect(state.version).toBe(afterIncident.version);
  });
});

describe("KitchenStore time vs version", () => {
  it("advances ticket age without incrementing version", () => {
    const store = new KitchenStore();
    const versions: number[] = [];
    store.subscribe(() => versions.push(store.getState().version));

    store.advanceTime(5000);

    expect(store.getState().elapsedMs).toBe(5000);
    expect(store.getState().version).toBe(1);
    expect(versions).toEqual([1]);
  });
});

describe("canonical recovery journey", () => {
  function dispatch(store: KitchenStore, command: Command) {
    const result = store.dispatch(command);
    expect(result.status, JSON.stringify(result)).toBe("accepted");
    return result;
  }

  it("repairs after a human lock, validates, and commits only from the human", () => {
    const store = new KitchenStore();

    dispatch(store, {
      type: "REPORT_FRYER_INCIDENT",
      expectedVersion: 1,
      actor: "human",
    });
    dispatch(store, {
      type: "STAGE_HOLD",
      ticketId: TICKET_FRIES,
      expectedVersion: 2,
      reason: "Shoestring fries have no alternative station.",
      actor: "agent",
    });
    dispatch(store, {
      type: "STAGE_HOLD",
      ticketId: TICKET_POTATOES,
      expectedVersion: 3,
      reason: "Hold potatoes while grill capacity is assessed.",
      actor: "agent",
    });
    dispatch(store, {
      type: "STAGE_PRIORITY",
      ticketId: TICKET_SANDWICH,
      priority: "urgent",
      expectedVersion: 4,
      reason: "Table 7 sandwich is waiting behind the disruption.",
      actor: "agent",
    });

    const beforeLockVersion = store.getState().version;
    dispatch(store, {
      type: "TOGGLE_KEEP_TOGETHER",
      tableName: TABLE_12,
      expectedVersion: beforeLockVersion,
      actor: "human",
    });

    const stale = store.dispatch({
      type: "STAGE_REROUTE",
      ticketId: TICKET_POTATOES,
      targetStationId: "grill",
      expectedVersion: beforeLockVersion,
      reason: "Move potatoes to grill.",
      actor: "agent",
    });
    expect(stale.status).toBe("rejected_stale");
    expect(store.getState().version).toBe(beforeLockVersion + 1);

    const invalid = store.dispatch({
      type: "VALIDATE_RECOVERY",
      expectedVersion: store.getState().version,
      actor: "agent",
    });
    expect(invalid.status).toBe("rejected_invalid");
    if (invalid.status === "rejected_invalid") {
      expect(invalid.reasons.some((reason) => reason.code === "KEEP_TOGETHER_SPLIT")).toBe(
        true,
      );
    }

    const holdPotatoes = store
      .getState()
      .stagedActions.find((action) => action.ticketId === TICKET_POTATOES);
    expect(holdPotatoes).toBeDefined();

    dispatch(store, {
      type: "UNDO_STAGED_ACTION",
      actionId: holdPotatoes!.id,
      expectedVersion: store.getState().version,
      reason: "Holding potatoes would split Table 12 from the steak.",
      actor: "agent",
    });
    dispatch(store, {
      type: "STAGE_REROUTE",
      ticketId: TICKET_POTATOES,
      targetStationId: "grill",
      expectedVersion: store.getState().version,
      reason: "Reroute crispy potatoes to grill so Table 12 stays together.",
      actor: "agent",
    });
    dispatch(store, {
      type: "VALIDATE_RECOVERY",
      expectedVersion: store.getState().version,
      actor: "agent",
    });

    expect(derivePhase(store.getState())).toBe("RECOVERY_VALID");

    dispatch(store, {
      type: "APPROVE_RECOVERY",
      expectedVersion: store.getState().version,
      actor: "human",
    });

    const committed = store.getState();
    expect(derivePhase(committed)).toBe("RECOVERY_COMMITTED");
    expect(committed.tickets.find((ticket) => ticket.id === TICKET_FRIES)?.status).toBe(
      "held",
    );
    expect(committed.tickets.find((ticket) => ticket.id === TICKET_POTATOES)?.stationId).toBe(
      "grill",
    );
    expect(committed.tickets.find((ticket) => ticket.id === TICKET_SANDWICH)?.priority).toBe(
      "urgent",
    );
    expect(committed.committedReceipt?.approvedBy).toBe("human");
    expect(
      committed.committedReceipt?.proposedAgentActions.every(
        (action) => action.actor === "agent",
      ),
    ).toBe(true);
    expect(committed.committedReceipt?.unresolvedTicketIds).toEqual([]);
  });
});
