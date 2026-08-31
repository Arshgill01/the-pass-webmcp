import type { KitchenStore } from "../domain/store";
import {
  inspectServiceState,
  inspectTicket,
  readRecoveryReceipt,
} from "../domain/inspect";
import { legalToolNames } from "../domain/selectors";
import type {
  CommandResult,
  Priority,
  StationId,
  ToolName,
  ToolReceipt,
} from "../domain/types";
import { TOOL_NAMES } from "../domain/types";
import type { WebMcpTool } from "./types";
import {
  inspectServiceStateSchema,
  inspectTicketSchema,
  readRecoveryReceiptSchema,
  stageHoldSchema,
  stagePrioritySchema,
  stageRerouteSchema,
  undoStagedActionSchema,
  validateRecoverySchema,
} from "./schemas";

function asRecord(input: unknown): Record<string, unknown> | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return null;
  }
  return input as Record<string, unknown>;
}

function readString(input: Record<string, unknown>, key: string): string | null {
  const value = input[key];
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readExpectedVersion(input: Record<string, unknown>): number | null {
  const value = input.expectedVersion;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return null;
  }
  return value;
}

function invalidInput(message: string): ToolReceipt {
  return {
    receiptId: "receipt-invalid-input",
    status: "rejected_invalid",
    stateVersion: 0,
    affectedIds: [],
    nextActions: [TOOL_NAMES.inspectServiceState],
    reasons: [
      {
        code: "EMPTY_REASON",
        entityIds: [],
        message,
      },
    ],
  };
}

function toReceipt(result: CommandResult): ToolReceipt {
  if (result.status === "accepted") {
    return {
      receiptId: result.receiptId,
      status: "accepted",
      stateVersion: result.version,
      affectedIds: result.affectedIds,
      nextActions: result.nextActions,
      actionId: result.actionId,
    };
  }

  if (result.status === "rejected_stale") {
    return {
      receiptId: result.receiptId,
      status: "rejected_stale",
      stateVersion: result.currentVersion,
      affectedIds: [],
      nextActions: result.nextActions,
      expectedVersion: result.expectedVersion,
      currentVersion: result.currentVersion,
      changedSince: result.changedSince,
    };
  }

  return {
    receiptId: result.receiptId,
    status: "rejected_invalid",
    stateVersion: result.version,
    affectedIds: result.reasons.flatMap((reason) => reason.entityIds),
    nextActions: result.nextActions,
    reasons: result.reasons,
  };
}

const STATIONS: StationId[] = ["expo", "grill", "fryer", "cold-prep"];

export function createToolset(store: KitchenStore): WebMcpTool[] {
  const allowed = new Set<ToolName>(legalToolNames(store.getState()));
  const tools: WebMcpTool[] = [];

  if (allowed.has(TOOL_NAMES.inspectServiceState)) {
    tools.push({
      name: TOOL_NAMES.inspectServiceState,
      description:
        "Read current kitchen version, incident, blocked tickets, staged plan, and legal next actions.",
      inputSchema: inspectServiceStateSchema,
      annotations: { readOnlyHint: true, idempotentHint: true },
      execute: () => inspectServiceState(store.getState()),
    });
  }

  if (allowed.has(TOOL_NAMES.inspectTicket)) {
    tools.push({
      name: TOOL_NAMES.inspectTicket,
      description:
        "Read one ticket's station, age, keep-together constraint, alternatives, and staged action.",
      inputSchema: inspectTicketSchema,
      annotations: { readOnlyHint: true, idempotentHint: true },
      execute: (input) => {
        const record = asRecord(input);
        const ticketId = record ? readString(record, "ticketId") : null;
        if (!ticketId) {
          return invalidInput("ticketId is required.");
        }
        return inspectTicket(store.getState(), ticketId);
      },
    });
  }

  if (allowed.has(TOOL_NAMES.stageTicketHold)) {
    tools.push({
      name: TOOL_NAMES.stageTicketHold,
      description: "Stage a temporary hold for one ticket on an unavailable station.",
      inputSchema: stageHoldSchema,
      annotations: { readOnlyHint: false, destructiveHint: false },
      execute: (input) => {
        const record = asRecord(input);
        const ticketId = record ? readString(record, "ticketId") : null;
        const reason = record ? readString(record, "reason") : null;
        const expectedVersion = record ? readExpectedVersion(record) : null;
        if (!record || !ticketId || !reason || expectedVersion === null) {
          return invalidInput("ticketId, expectedVersion, and reason are required.");
        }
        return toReceipt(
          store.dispatch({
            type: "STAGE_HOLD",
            ticketId,
            expectedVersion,
            reason,
            actor: "agent",
          }),
        );
      },
    });
  }

  if (allowed.has(TOOL_NAMES.stageTicketReroute)) {
    tools.push({
      name: TOOL_NAMES.stageTicketReroute,
      description: "Stage moving one ticket to a fixture-supported available station.",
      inputSchema: stageRerouteSchema,
      annotations: { readOnlyHint: false, destructiveHint: false },
      execute: (input) => {
        const record = asRecord(input);
        const ticketId = record ? readString(record, "ticketId") : null;
        const targetStationId = record ? readString(record, "targetStationId") : null;
        const reason = record ? readString(record, "reason") : null;
        const expectedVersion = record ? readExpectedVersion(record) : null;
        if (
          !record ||
          !ticketId ||
          !reason ||
          expectedVersion === null ||
          !targetStationId ||
          !STATIONS.includes(targetStationId as StationId)
        ) {
          return invalidInput(
            "ticketId, targetStationId, expectedVersion, and reason are required.",
          );
        }
        return toReceipt(
          store.dispatch({
            type: "STAGE_REROUTE",
            ticketId,
            targetStationId: targetStationId as StationId,
            expectedVersion,
            reason,
            actor: "agent",
          }),
        );
      },
    });
  }

  if (allowed.has(TOOL_NAMES.stageTicketPriority)) {
    tools.push({
      name: TOOL_NAMES.stageTicketPriority,
      description: "Stage a normal or urgent priority change for one ticket.",
      inputSchema: stagePrioritySchema,
      annotations: { readOnlyHint: false, destructiveHint: false },
      execute: (input) => {
        const record = asRecord(input);
        const ticketId = record ? readString(record, "ticketId") : null;
        const priority = record ? readString(record, "priority") : null;
        const reason = record ? readString(record, "reason") : null;
        const expectedVersion = record ? readExpectedVersion(record) : null;
        if (
          !record ||
          !ticketId ||
          !reason ||
          expectedVersion === null ||
          (priority !== "normal" && priority !== "urgent")
        ) {
          return invalidInput(
            "ticketId, priority, expectedVersion, and reason are required.",
          );
        }
        return toReceipt(
          store.dispatch({
            type: "STAGE_PRIORITY",
            ticketId,
            priority: priority as Priority,
            expectedVersion,
            reason,
            actor: "agent",
          }),
        );
      },
    });
  }

  if (allowed.has(TOOL_NAMES.undoStagedAction)) {
    tools.push({
      name: TOOL_NAMES.undoStagedAction,
      description: "Remove one staged recovery action and invalidate prior validation.",
      inputSchema: undoStagedActionSchema,
      annotations: { readOnlyHint: false, destructiveHint: false },
      execute: (input) => {
        const record = asRecord(input);
        const actionId = record ? readString(record, "actionId") : null;
        const reason = record ? readString(record, "reason") : null;
        const expectedVersion = record ? readExpectedVersion(record) : null;
        if (!record || !actionId || !reason || expectedVersion === null) {
          return invalidInput("actionId, expectedVersion, and reason are required.");
        }
        return toReceipt(
          store.dispatch({
            type: "UNDO_STAGED_ACTION",
            actionId,
            expectedVersion,
            reason,
            actor: "agent",
          }),
        );
      },
    });
  }

  if (allowed.has(TOOL_NAMES.validateRecovery)) {
    tools.push({
      name: TOOL_NAMES.validateRecovery,
      description:
        "Check whether the staged plan clears blocked work without splitting a locked table. Does not approve.",
      inputSchema: validateRecoverySchema,
      annotations: { readOnlyHint: false, idempotentHint: true },
      execute: (input) => {
        const record = asRecord(input);
        const expectedVersion = record ? readExpectedVersion(record) : null;
        if (!record || expectedVersion === null) {
          return invalidInput("expectedVersion is required.");
        }
        return toReceipt(
          store.dispatch({
            type: "VALIDATE_RECOVERY",
            expectedVersion,
            actor: "agent",
          }),
        );
      },
    });
  }

  if (allowed.has(TOOL_NAMES.readRecoveryReceipt)) {
    tools.push({
      name: TOOL_NAMES.readRecoveryReceipt,
      description:
        "Read the committed recovery receipt, including human approval and agent proposals.",
      inputSchema: readRecoveryReceiptSchema,
      annotations: { readOnlyHint: true, idempotentHint: true },
      execute: () => readRecoveryReceipt(store.getState()),
    });
  }

  return tools;
}
