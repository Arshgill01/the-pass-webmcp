import {
  blockedTickets,
  derivePhase,
  effectivePriority,
  getTicket,
  keepTogetherTables,
  legalToolNames,
  stagedActionForTicket,
  tableLocked,
} from "./selectors";
import { formatServiceTime, formatTicketAge, incidentRemainingMs } from "./clock";
import type { KitchenState, Reason } from "./types";

export function inspectServiceState(state: KitchenState) {
  return {
    receiptId: `inspect-${state.version}`,
    status: "ok" as const,
    stateVersion: state.version,
    phase: derivePhase(state),
    serviceTime: formatServiceTime(state.elapsedMs),
    elapsedMs: state.elapsedMs,
    incident: state.incident
      ? {
          id: state.incident.id,
          stationId: state.incident.stationId,
          durationMinutes: state.incident.durationMinutes,
          remainingMs: incidentRemainingMs(state),
        }
      : null,
    stations: state.stations.map((station) => ({
      id: station.id,
      name: station.name,
      status: station.status,
      openCount: state.tickets.filter((ticket) => ticket.stationId === station.id)
        .length,
    })),
    blockedTickets: blockedTickets(state).map((ticket) => ({
      id: ticket.id,
      displayNumber: ticket.displayNumber,
      tableName: ticket.tableName,
      itemName: ticket.itemName,
      stationId: ticket.stationId,
      supportedStationIds: ticket.supportedStationIds,
    })),
    tableConstraints: keepTogetherTables(state).map((tableName) => ({
      tableName,
      keepTogether: tableLocked(state, tableName),
    })),
    stagedActionSummary: state.stagedActions.map((action) => ({
      id: action.id,
      kind: action.kind,
      ticketId: action.ticketId,
      actor: action.actor,
      status: action.status,
      targetStationId: action.targetStationId,
      priority: action.priority,
    })),
    rejectedActionSummary: state.rejectedActions.map((action) => ({
      id: action.id,
      kind: action.kind,
      ticketId: action.ticketId,
      expectedVersion: action.expectedVersion,
      status: action.status,
    })),
    staleRejection: state.staleRejection,
    validation: state.validation,
    committed: Boolean(state.committedReceipt),
    nextActions: legalToolNames(state),
  };
}

export function inspectTicket(state: KitchenState, ticketId: string) {
  const ticket = getTicket(state, ticketId);
  if (!ticket) {
    const reasons: Reason[] = [
      {
        code: "UNKNOWN_TICKET",
        entityIds: [ticketId],
        message: `Unknown ticket ${ticketId}.`,
      },
    ];
    return {
      receiptId: `inspect-ticket-${state.version}`,
      status: "rejected_invalid" as const,
      stateVersion: state.version,
      affectedIds: [ticketId],
      nextActions: legalToolNames(state),
      reasons,
    };
  }

  const staged = stagedActionForTicket(state, ticket.id);

  return {
    receiptId: `inspect-ticket-${ticket.id}-${state.version}`,
    status: "ok" as const,
    stateVersion: state.version,
    affectedIds: [ticket.id],
    nextActions: legalToolNames(state),
    ticket: {
      id: ticket.id,
      displayNumber: ticket.displayNumber,
      tableName: ticket.tableName,
      itemName: ticket.itemName,
      stationId: ticket.stationId,
      status: ticket.status,
      age: formatTicketAge(ticket.ageMinutes, state.elapsedMs),
      keepTogether: tableLocked(state, ticket.tableName),
      tableRelationship: ticket.keepTogether,
      supportedStationIds: ticket.supportedStationIds,
      priority: effectivePriority(state, ticket),
      stagedAction: staged
        ? {
            id: staged.id,
            kind: staged.kind,
            targetStationId: staged.targetStationId,
            priority: staged.priority,
            actor: staged.actor,
          }
        : null,
    },
  };
}

export function readRecoveryReceipt(state: KitchenState) {
  if (!state.committedReceipt) {
    return {
      receiptId: `receipt-missing-${state.version}`,
      status: "rejected_invalid" as const,
      stateVersion: state.version,
      affectedIds: [],
      nextActions: legalToolNames(state),
      reasons: [
        {
          code: "NO_STAGED_ACTIONS" as const,
          entityIds: [],
          message: "No committed recovery receipt is available yet.",
        },
      ],
    };
  }

  return {
    receiptId: state.committedReceipt.receiptId,
    status: "ok" as const,
    stateVersion: state.version,
    affectedIds: state.committedReceipt.committedActions.map(
      (action) => action.ticketId,
    ),
    nextActions: legalToolNames(state),
    receipt: state.committedReceipt,
  };
}
