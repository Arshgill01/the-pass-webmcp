import type {
  KitchenState,
  ProductPhase,
  RecoveryAction,
  Station,
  Ticket,
  ToolName,
} from "./types";
import { TOOL_NAMES } from "./types";
import { ticketAgeSeconds } from "./clock";

export function activeStagedActions(state: KitchenState): RecoveryAction[] {
  return state.stagedActions.filter((action) => action.status === "staged");
}

export function stagedActionForTicket(
  state: KitchenState,
  ticketId: string,
): RecoveryAction | undefined {
  return activeStagedActions(state).find((action) => action.ticketId === ticketId);
}

export function getStation(
  state: KitchenState,
  stationId: string,
): Station | undefined {
  return state.stations.find((station) => station.id === stationId);
}

export function getTicket(
  state: KitchenState,
  ticketId: string,
): Ticket | undefined {
  return state.tickets.find((ticket) => ticket.id === ticketId);
}

export function isStationUnavailable(
  state: KitchenState,
  stationId: string,
): boolean {
  return getStation(state, stationId)?.status === "unavailable";
}

export function isTicketBlocked(state: KitchenState, ticket: Ticket): boolean {
  if (state.committedReceipt) {
    return false;
  }

  return isStationUnavailable(state, ticket.stationId) && ticket.status !== "held";
}

export function blockedTickets(state: KitchenState): Ticket[] {
  return state.tickets.filter((ticket) => isTicketBlocked(state, ticket));
}

export function derivePhase(state: KitchenState): ProductPhase {
  if (state.committedReceipt) {
    return "RECOVERY_COMMITTED";
  }

  if (!state.incident) {
    return "RUNNING";
  }

  const validationCurrent =
    state.validation?.valid === true &&
    state.validation.version === state.version &&
    activeStagedActions(state).length > 0;

  if (validationCurrent) {
    return "RECOVERY_VALID";
  }

  if (
    state.staleRejection &&
    state.staleRejection.currentVersion === state.version
  ) {
    return "RECOVERY_STALE";
  }

  if (activeStagedActions(state).length > 0) {
    return "RECOVERY_STAGED";
  }

  return "INCIDENT_ACTIVE";
}

export function legalToolNames(state: KitchenState): ToolName[] {
  const phase = derivePhase(state);

  switch (phase) {
    case "RUNNING":
      return [TOOL_NAMES.inspectServiceState, TOOL_NAMES.inspectTicket];
    case "INCIDENT_ACTIVE":
      return [
        TOOL_NAMES.inspectServiceState,
        TOOL_NAMES.inspectTicket,
        TOOL_NAMES.stageTicketHold,
        TOOL_NAMES.stageTicketReroute,
        TOOL_NAMES.stageTicketPriority,
      ];
    case "RECOVERY_STAGED":
    case "RECOVERY_STALE":
      return [
        TOOL_NAMES.inspectServiceState,
        TOOL_NAMES.inspectTicket,
        TOOL_NAMES.stageTicketHold,
        TOOL_NAMES.stageTicketReroute,
        TOOL_NAMES.stageTicketPriority,
        TOOL_NAMES.undoStagedAction,
        TOOL_NAMES.validateRecovery,
      ];
    case "RECOVERY_VALID":
      return [
        TOOL_NAMES.inspectServiceState,
        TOOL_NAMES.inspectTicket,
        TOOL_NAMES.stageTicketHold,
        TOOL_NAMES.stageTicketReroute,
        TOOL_NAMES.stageTicketPriority,
        TOOL_NAMES.undoStagedAction,
        TOOL_NAMES.validateRecovery,
      ];
    case "RECOVERY_COMMITTED":
      return [
        TOOL_NAMES.inspectServiceState,
        TOOL_NAMES.inspectTicket,
        TOOL_NAMES.readRecoveryReceipt,
      ];
  }
}

export function nextActions(state: KitchenState): string[] {
  return [...legalToolNames(state)];
}

export function ticketsForStation(
  state: KitchenState,
  stationId: string,
): Ticket[] {
  const tickets = state.tickets.filter((ticket) => ticket.stationId === stationId);

  return [...tickets].sort((left, right) => {
    const leftPriority = effectivePriority(state, left);
    const rightPriority = effectivePriority(state, right);

    if (leftPriority !== rightPriority) {
      return leftPriority === "urgent" ? -1 : 1;
    }

    return (
      ticketAgeSeconds(right.ageMinutes, state.elapsedMs) -
      ticketAgeSeconds(left.ageMinutes, state.elapsedMs)
    );
  });
}

export function effectivePriority(
  state: KitchenState,
  ticket: Ticket,
): "normal" | "urgent" {
  const staged = stagedActionForTicket(state, ticket.id);
  if (staged?.kind === "prioritize" && staged.priority) {
    return staged.priority;
  }

  return ticket.priority;
}

export function keepTogetherTables(state: KitchenState): string[] {
  const counts = new Map<string, number>();
  for (const ticket of state.tickets) {
    counts.set(ticket.tableName, (counts.get(ticket.tableName) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([tableName]) => tableName);
}

export function tableLocked(state: KitchenState, tableName: string): boolean {
  return (
    state.tableConstraints.find((constraint) => constraint.tableName === tableName)
      ?.keepTogether === true
  );
}

export function applyStagedHypothetical(state: KitchenState): {
  tickets: Ticket[];
  stations: Station[];
} {
  const tickets = structuredClone(state.tickets);
  const byId = new Map(tickets.map((ticket) => [ticket.id, ticket]));

  for (const action of activeStagedActions(state)) {
    const ticket = byId.get(action.ticketId);
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
  }

  return { tickets, stations: state.stations };
}
