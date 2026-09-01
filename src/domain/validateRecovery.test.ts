import { applyCommand } from "./commands";
import { createCanonicalState } from "./state";
import { validateRecovery } from "./validateRecovery";
import {
  TABLE_12,
  TICKET_FRIES,
  TICKET_POTATOES,
  TICKET_SANDWICH,
} from "../fixtures/canonical";

function withIncident() {
  return applyCommand(createCanonicalState(), {
    type: "REPORT_FRYER_INCIDENT",
    expectedVersion: 1,
    actor: "human",
  }).state;
}

describe("validateRecovery", () => {
  it("fails while fryer tickets remain unresolved", () => {
    const result = validateRecovery(withIncident());
    expect(result.valid).toBe(false);
    expect(result.reasons.some((reason) => reason.code === "BLOCKED_TICKET_UNRESOLVED")).toBe(
      true,
    );
  });

  it("passes when both fryer tickets are held and Table 12 is unlocked", () => {
    let state = withIncident();
    state = applyCommand(state, {
      type: "STAGE_HOLD",
      ticketId: TICKET_FRIES,
      expectedVersion: state.version,
      reason: "No alternative for shoestring fries.",
      actor: "agent",
    }).state;
    state = applyCommand(state, {
      type: "STAGE_HOLD",
      ticketId: TICKET_POTATOES,
      expectedVersion: state.version,
      reason: "Hold potatoes during the fryer outage.",
      actor: "agent",
    }).state;

    const result = validateRecovery(state);
    expect(result.valid).toBe(true);
  });

  it("fails a hold-only plan after Table 12 is locked", () => {
    let state = withIncident();
    state = applyCommand(state, {
      type: "STAGE_HOLD",
      ticketId: TICKET_FRIES,
      expectedVersion: state.version,
      reason: "Hold fries.",
      actor: "agent",
    }).state;
    state = applyCommand(state, {
      type: "STAGE_HOLD",
      ticketId: TICKET_POTATOES,
      expectedVersion: state.version,
      reason: "Hold potatoes.",
      actor: "agent",
    }).state;
    state = applyCommand(state, {
      type: "TOGGLE_KEEP_TOGETHER",
      tableName: TABLE_12,
      expectedVersion: state.version,
      actor: "human",
    }).state;

    const result = validateRecovery(state);
    expect(result.valid).toBe(false);
    expect(result.reasons.some((reason) => reason.code === "KEEP_TOGETHER_SPLIT")).toBe(
      true,
    );
  });

  it("passes after potatoes are rerouted to grill to stay with the steak", () => {
    let state = withIncident();
    state = applyCommand(state, {
      type: "STAGE_HOLD",
      ticketId: TICKET_FRIES,
      expectedVersion: state.version,
      reason: "Hold fries.",
      actor: "agent",
    }).state;
    state = applyCommand(state, {
      type: "STAGE_REROUTE",
      ticketId: TICKET_POTATOES,
      targetStationId: "grill",
      expectedVersion: state.version,
      reason: "Finish potatoes on grill.",
      actor: "agent",
    }).state;
    state = applyCommand(state, {
      type: "STAGE_PRIORITY",
      ticketId: TICKET_SANDWICH,
      priority: "urgent",
      expectedVersion: state.version,
      reason: "Keep the sandwich moving.",
      actor: "agent",
    }).state;
    state = applyCommand(state, {
      type: "TOGGLE_KEEP_TOGETHER",
      tableName: TABLE_12,
      expectedVersion: state.version,
      actor: "human",
    }).state;

    const result = validateRecovery(state);
    expect(result.valid).toBe(true);
  });
});
