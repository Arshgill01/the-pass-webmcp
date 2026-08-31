import { FRYER_INCIDENT_MINUTES } from "./clock";
import { cloneState, createCanonicalState } from "./state";
import {
  activeStagedActions,
  derivePhase,
  getStation,
  getTicket,
  nextActions,
  stagedActionForTicket,
} from "./selectors";
import { validateRecovery } from "./validateRecovery";
import type {
  Actor,
  ApplyOutput,
  Command,
  CommandResult,
  KitchenState,
  Reason,
  ReasonCode,
  RecoveryAction,
  RecoveryActionKind,
} from "./types";
import { TOOL_NAMES } from "./types";

const HUMAN_ONLY = new Set<Command["type"]>([
  "REPORT_FRYER_INCIDENT",
  "TOGGLE_KEEP_TOGETHER",
  "APPROVE_RECOVERY",
  "RESET",
]);

function takeReceiptId(draft: KitchenState): string {
  const id = `receipt-${String(draft.nextReceiptSeq).padStart(3, "0")}`;
  draft.nextReceiptSeq += 1;
  return id;
}

function takeActionId(draft: KitchenState): string {
  const id = `action-${String(draft.nextActionSeq).padStart(3, "0")}`;
  draft.nextActionSeq += 1;
  return id;
}

function takeActivityId(draft: KitchenState): string {
  const id = `activity-${String(draft.nextActivitySeq).padStart(3, "0")}`;
  draft.nextActivitySeq += 1;
  return id;
}

function pushActivity(
  draft: KitchenState,
  actor: Actor,
  kind: string,
  summary: string,
): void {
  draft.activity.push({
    id: takeActivityId(draft),
    actor,
    atElapsedMs: draft.elapsedMs,
    version: draft.version,
    kind,
    summary,
  });
}

function bumpVersion(
  draft: KitchenState,
  actor: Actor,
  kind: string,
  summary: string,
): void {
  draft.version += 1;
  draft.validation = null;
  draft.changeLog.push({
    actor,
    description: summary,
    version: draft.version,
    atElapsedMs: draft.elapsedMs,
  });
  pushActivity(draft, actor, kind, summary);
}

function accepted(
  draft: KitchenState,
  receiptId: string,
  affectedIds: string[],
  actionId?: string,
): CommandResult {
  return {
    status: "accepted",
    receiptId,
    version: draft.version,
    affectedIds,
    nextActions: nextActions(draft),
    actionId,
  };
}

function invalid(
  state: KitchenState,
  code: ReasonCode,
  message: string,
  entityIds: string[] = [],
  extra: Reason[] = [],
): ApplyOutput {
  const receiptId = `receipt-${String(state.nextReceiptSeq).padStart(3, "0")}`;
  return {
    state,
    result: {
      status: "rejected_invalid",
      receiptId,
      version: state.version,
      reasons: [{ code, entityIds, message }, ...extra],
      nextActions: nextActions(state),
    },
  };
}

function requireReason(reason: string): string | null {
  const trimmed = reason.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed;
}

function stageKindFromCommand(command: Command): RecoveryActionKind | null {
  switch (command.type) {
    case "STAGE_HOLD":
      return "hold";
    case "STAGE_REROUTE":
      return "reroute";
    case "STAGE_PRIORITY":
      return "prioritize";
    default:
      return null;
  }
}

function rejectStale(state: KitchenState, command: Command): ApplyOutput {
  const draft = cloneState(state);
  const receiptId = takeReceiptId(draft);
  const expectedVersion =
    "expectedVersion" in command ? command.expectedVersion : draft.version;
  const changedSince = draft.changeLog.filter(
    (change) => change.version > expectedVersion,
  );
  const summary =
    changedSince.find((change) => change.actor === "human")?.description ??
    changedSince[0]?.description ??
    "State changed while the previous action was in flight.";

  const kind = stageKindFromCommand(command);
  if (kind && "ticketId" in command) {
    const rejected: RecoveryAction = {
      id: `stale-${receiptId}`,
      kind,
      ticketId: command.ticketId,
      expectedVersion,
      reason: "reason" in command ? command.reason : "",
      actor: command.actor,
      status: "rejected_stale",
      createdAtVersion: expectedVersion,
      targetStationId:
        command.type === "STAGE_REROUTE" ? command.targetStationId : undefined,
      priority: command.type === "STAGE_PRIORITY" ? command.priority : undefined,
    };
    draft.rejectedActions = [...draft.rejectedActions, rejected];
  }

  draft.staleRejection = {
    receiptId,
    expectedVersion,
    currentVersion: draft.version,
    changedSince,
    nextActions: [TOOL_NAMES.inspectServiceState],
    summary,
  };

  pushActivity(
    draft,
    command.actor,
    "stale_rejected",
    `OUTDATED — NOT APPLIED. Plan expected v${expectedVersion}. Current state is v${draft.version}. ${summary}`,
  );

  return {
    state: draft,
    result: {
      status: "rejected_stale",
      receiptId,
      expectedVersion,
      currentVersion: draft.version,
      changedSince,
      nextActions: [TOOL_NAMES.inspectServiceState],
    },
  };
}

function assertCanMutate(
  state: KitchenState,
  command: Command,
): ApplyOutput | null {
  if (HUMAN_ONLY.has(command.type) && command.actor === "agent") {
    return invalid(
      state,
      "HUMAN_ONLY",
      "This operation is owned by the expediter and is not on the agent tool surface.",
    );
  }

  if (command.type !== "RESET" && state.committedReceipt) {
    return invalid(
      state,
      "ALREADY_COMMITTED",
      "Recovery is already committed. Reset the demo to run it again.",
      [state.committedReceipt.receiptId],
    );
  }

  return null;
}

function requireIncident(state: KitchenState): ApplyOutput | null {
  if (!state.incident) {
    return invalid(state, "NO_INCIDENT", "Report the fryer incident before staging recovery.");
  }
  return null;
}

function requireNoDuplicate(
  state: KitchenState,
  ticketId: string,
): ApplyOutput | null {
  const existing = stagedActionForTicket(state, ticketId);
  if (existing) {
    return invalid(
      state,
      "DUPLICATE_TICKET_ACTION",
      `Ticket already has staged action ${existing.id}. Undo it before staging another.`,
      [ticketId, existing.id],
    );
  }
  return null;
}

function applyHold(draft: KitchenState, command: Extract<Command, { type: "STAGE_HOLD" }>): ApplyOutput {
  const blocked = requireIncident(draft);
  if (blocked) {
    return blocked;
  }

  const reason = requireReason(command.reason);
  if (!reason) {
    return invalid(draft, "EMPTY_REASON", "A reason is required for every staged action.");
  }

  const ticket = getTicket(draft, command.ticketId);
  if (!ticket) {
    return invalid(draft, "UNKNOWN_TICKET", `Unknown ticket ${command.ticketId}.`, [
      command.ticketId,
    ]);
  }

  const station = getStation(draft, ticket.stationId);
  if (!station || station.status !== "unavailable") {
    return invalid(
      draft,
      "HOLD_NOT_ALLOWED",
      `${ticket.displayNumber} is not on an unavailable station.`,
      [ticket.id],
    );
  }

  const duplicate = requireNoDuplicate(draft, ticket.id);
  if (duplicate) {
    return duplicate;
  }

  const actionId = takeActionId(draft);
  const receiptId = takeReceiptId(draft);
  draft.stagedActions.push({
    id: actionId,
    kind: "hold",
    ticketId: ticket.id,
    expectedVersion: command.expectedVersion,
    reason,
    actor: command.actor,
    status: "staged",
    createdAtVersion: draft.version + 1,
  });
  draft.staleRejection = null;
  bumpVersion(
    draft,
    command.actor,
    "stage_hold",
    `${command.actor === "agent" ? "Agent" : "Expediter"} staged hold on ${ticket.displayNumber}.`,
  );

  return { state: draft, result: accepted(draft, receiptId, [ticket.id], actionId) };
}

function applyReroute(
  draft: KitchenState,
  command: Extract<Command, { type: "STAGE_REROUTE" }>,
): ApplyOutput {
  const blocked = requireIncident(draft);
  if (blocked) {
    return blocked;
  }

  const reason = requireReason(command.reason);
  if (!reason) {
    return invalid(draft, "EMPTY_REASON", "A reason is required for every staged action.");
  }

  const ticket = getTicket(draft, command.ticketId);
  if (!ticket) {
    return invalid(draft, "UNKNOWN_TICKET", `Unknown ticket ${command.ticketId}.`, [
      command.ticketId,
    ]);
  }

  const target = getStation(draft, command.targetStationId);
  if (!target) {
    return invalid(draft, "UNKNOWN_STATION", `Unknown station ${command.targetStationId}.`, [
      command.targetStationId,
    ]);
  }

  if (target.id === ticket.stationId) {
    return invalid(
      draft,
      "SAME_STATION",
      `${ticket.displayNumber} is already on ${target.name}.`,
      [ticket.id, target.id],
    );
  }

  if (target.status === "unavailable") {
    return invalid(
      draft,
      "STATION_UNAVAILABLE",
      `${target.name} is unavailable.`,
      [target.id],
    );
  }

  if (!ticket.supportedStationIds.includes(target.id)) {
    return invalid(
      draft,
      "STATION_UNSUPPORTED",
      `${ticket.itemName} cannot run on ${target.name}.`,
      [ticket.id, target.id],
    );
  }

  const duplicate = requireNoDuplicate(draft, ticket.id);
  if (duplicate) {
    return duplicate;
  }

  const actionId = takeActionId(draft);
  const receiptId = takeReceiptId(draft);
  draft.stagedActions.push({
    id: actionId,
    kind: "reroute",
    ticketId: ticket.id,
    expectedVersion: command.expectedVersion,
    reason,
    actor: command.actor,
    status: "staged",
    targetStationId: target.id,
    createdAtVersion: draft.version + 1,
  });
  draft.staleRejection = null;
  bumpVersion(
    draft,
    command.actor,
    "stage_reroute",
    `${command.actor === "agent" ? "Agent" : "Expediter"} staged reroute of ${ticket.displayNumber} to ${target.name}.`,
  );

  return { state: draft, result: accepted(draft, receiptId, [ticket.id, target.id], actionId) };
}

function applyPriority(
  draft: KitchenState,
  command: Extract<Command, { type: "STAGE_PRIORITY" }>,
): ApplyOutput {
  const blocked = requireIncident(draft);
  if (blocked) {
    return blocked;
  }

  const reason = requireReason(command.reason);
  if (!reason) {
    return invalid(draft, "EMPTY_REASON", "A reason is required for every staged action.");
  }

  if (command.priority !== "normal" && command.priority !== "urgent") {
    return invalid(draft, "INVALID_PRIORITY", "Priority must be normal or urgent.");
  }

  const ticket = getTicket(draft, command.ticketId);
  if (!ticket) {
    return invalid(draft, "UNKNOWN_TICKET", `Unknown ticket ${command.ticketId}.`, [
      command.ticketId,
    ]);
  }

  const duplicate = requireNoDuplicate(draft, ticket.id);
  if (duplicate) {
    return duplicate;
  }

  const actionId = takeActionId(draft);
  const receiptId = takeReceiptId(draft);
  draft.stagedActions.push({
    id: actionId,
    kind: "prioritize",
    ticketId: ticket.id,
    expectedVersion: command.expectedVersion,
    reason,
    actor: command.actor,
    status: "staged",
    priority: command.priority,
    createdAtVersion: draft.version + 1,
  });
  draft.staleRejection = null;
  bumpVersion(
    draft,
    command.actor,
    "stage_priority",
    `${command.actor === "agent" ? "Agent" : "Expediter"} staged ${command.priority} priority on ${ticket.displayNumber}.`,
  );

  return { state: draft, result: accepted(draft, receiptId, [ticket.id], actionId) };
}

function applyUndo(
  draft: KitchenState,
  command: Extract<Command, { type: "UNDO_STAGED_ACTION" }>,
): ApplyOutput {
  const reason = requireReason(command.reason);
  if (!reason) {
    return invalid(draft, "EMPTY_REASON", "A reason is required to undo a staged action.");
  }

  const index = draft.stagedActions.findIndex(
    (action) => action.id === command.actionId && action.status === "staged",
  );
  if (index === -1) {
    return invalid(draft, "UNKNOWN_ACTION", `Unknown staged action ${command.actionId}.`, [
      command.actionId,
    ]);
  }

  const [removed] = draft.stagedActions.splice(index, 1);
  const receiptId = takeReceiptId(draft);
  draft.staleRejection = null;
  bumpVersion(
    draft,
    command.actor,
    "undo_staged",
    `${command.actor === "agent" ? "Agent" : "Expediter"} removed staged ${removed.kind} on ${removed.ticketId}.`,
  );

  return {
    state: draft,
    result: accepted(draft, receiptId, [removed.ticketId, removed.id], removed.id),
  };
}

function applyValidate(
  draft: KitchenState,
  command: Extract<Command, { type: "VALIDATE_RECOVERY" }>,
): ApplyOutput {
  const receiptId = takeReceiptId(draft);
  const validation = validateRecovery(draft);
  draft.validation = validation;
  pushActivity(
    draft,
    command.actor,
    "validate",
    validation.valid
      ? `Recovery plan is valid for v${draft.version}. Waiting on human approval.`
      : `Recovery plan is not valid: ${validation.reasons.map((reason) => reason.code).join(", ")}.`,
  );

  if (!validation.valid) {
    return {
      state: draft,
      result: {
        status: "rejected_invalid",
        receiptId,
        version: draft.version,
        reasons: validation.reasons,
        nextActions: nextActions(draft),
      },
    };
  }

  return {
    state: draft,
    result: accepted(
      draft,
      receiptId,
      activeStagedActions(draft).map((action) => action.id),
    ),
  };
}

function applyStagedToTickets(draft: KitchenState): void {
  for (const action of activeStagedActions(draft)) {
    const ticket = getTicket(draft, action.ticketId);
    if (!ticket) {
      continue;
    }

    if (action.kind === "hold") {
      ticket.status = "held";
    }

    if (action.kind === "reroute" && action.targetStationId) {
      ticket.stationId = action.targetStationId;
      if (ticket.status === "held") {
        ticket.status = "queued";
      }
    }

    if (action.kind === "prioritize" && action.priority) {
      ticket.priority = action.priority;
    }

    action.status = "committed";
  }
}

function unresolvedAfterCommit(draft: KitchenState): string[] {
  return draft.tickets
    .filter((ticket) => {
      const station = getStation(draft, ticket.stationId);
      return station?.status === "unavailable" && ticket.status !== "held";
    })
    .map((ticket) => ticket.id);
}

function applyApprove(
  draft: KitchenState,
  command: Extract<Command, { type: "APPROVE_RECOVERY" }>,
): ApplyOutput {
  if (!draft.incident) {
    return invalid(draft, "NO_INCIDENT", "There is no incident to recover.");
  }

  if (
    !draft.validation ||
    !draft.validation.valid ||
    draft.validation.version !== draft.version
  ) {
    return invalid(
      draft,
      "VALIDATION_NOT_CURRENT",
      "Approve is disabled until validation passes for the current state version.",
    );
  }

  const liveValidation = validateRecovery(draft);
  if (!liveValidation.valid) {
    draft.validation = liveValidation;
    return invalid(
      draft,
      "PLAN_NOT_VALID",
      "The staged plan no longer satisfies recovery conditions.",
      [],
      liveValidation.reasons,
    );
  }

  const fromVersion = draft.version;
  const staged = activeStagedActions(draft).map((action) => structuredClone(action));
  applyStagedToTickets(draft);
  const receiptId = takeReceiptId(draft);
  const unresolvedTicketIds = unresolvedAfterCommit(draft);

  bumpVersion(
    draft,
    command.actor,
    "approve",
    "Expediter approved the recovery. Agent proposals are now committed service state.",
  );

  draft.committedReceipt = {
    receiptId,
    incidentId: draft.incident.id,
    approvedBy: "human",
    approvedAtElapsedMs: draft.elapsedMs,
    fromVersion,
    toVersion: draft.version,
    proposedAgentActions: staged.filter((action) => action.actor === "agent"),
    committedActions: staged.map((action) => ({ ...action, status: "committed" })),
    unresolvedTicketIds,
  };
  draft.staleRejection = null;
  draft.validation = {
    version: draft.version,
    valid: true,
    reasons: [],
  };

  return {
    state: draft,
    result: accepted(
      draft,
      receiptId,
      staged.map((action) => action.ticketId),
    ),
  };
}

export function applyCommand(state: KitchenState, command: Command): ApplyOutput {
  const actorGuard = assertCanMutate(state, command);
  if (actorGuard) {
    return actorGuard;
  }

  if (command.type === "RESET") {
    const restored = createCanonicalState();
    return {
      state: restored,
      result: {
        status: "accepted",
        receiptId: "receipt-000",
        version: restored.version,
        affectedIds: restored.tickets.map((ticket) => ticket.id),
        nextActions: nextActions(restored),
      },
    };
  }

  if ("expectedVersion" in command && command.expectedVersion !== state.version) {
    return rejectStale(state, command);
  }

  const draft = cloneState(state);

  switch (command.type) {
    case "REPORT_FRYER_INCIDENT": {
      if (draft.incident) {
        return invalid(
          state,
          "INCIDENT_ALREADY_ACTIVE",
          "The fryer incident is already on the board.",
          [draft.incident.id],
        );
      }

      const fryer = getStation(draft, "fryer");
      if (!fryer) {
        return invalid(state, "UNKNOWN_STATION", "Fryer station is missing from the fixture.");
      }

      fryer.status = "unavailable";
      draft.incident = {
        id: "incident-fryer-001",
        stationId: "fryer",
        kind: "unavailable",
        durationMinutes: FRYER_INCIDENT_MINUTES,
        reportedAtElapsedMs: draft.elapsedMs,
        reportedBy: "human",
      };
      const receiptId = takeReceiptId(draft);
      bumpVersion(
        draft,
        command.actor,
        "report_incident",
        "Human reported fryer unavailable for 12 minutes.",
      );
      return {
        state: draft,
        result: accepted(draft, receiptId, ["fryer", "incident-fryer-001"]),
      };
    }

    case "TOGGLE_KEEP_TOGETHER": {
      const constraint = draft.tableConstraints.find(
        (item) => item.tableName === command.tableName,
      );
      if (!constraint) {
        return invalid(state, "UNKNOWN_TABLE", `Unknown table ${command.tableName}.`, [
          command.tableName,
        ]);
      }

      constraint.keepTogether = !constraint.keepTogether;

      const receiptId = takeReceiptId(draft);
      const summary = constraint.keepTogether
        ? `${command.tableName} must stay together.`
        : `${command.tableName} may be served separately.`;
      bumpVersion(draft, command.actor, "table_constraint", summary);
      draft.staleRejection = null;
      return {
        state: draft,
        result: accepted(
          draft,
          receiptId,
          draft.tickets
            .filter((ticket) => ticket.tableName === command.tableName)
            .map((ticket) => ticket.id),
        ),
      };
    }

    case "STAGE_HOLD":
      return applyHold(draft, command);
    case "STAGE_REROUTE":
      return applyReroute(draft, command);
    case "STAGE_PRIORITY":
      return applyPriority(draft, command);
    case "UNDO_STAGED_ACTION":
      return applyUndo(draft, command);
    case "VALIDATE_RECOVERY":
      return applyValidate(draft, command);
    case "APPROVE_RECOVERY":
      return applyApprove(draft, command);
  }
}

export function isApprovalLegal(state: KitchenState): boolean {
  return (
    derivePhase(state) === "RECOVERY_VALID" &&
    state.validation?.valid === true &&
    state.validation.version === state.version
  );
}
