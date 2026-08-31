import {
  applyStagedHypothetical,
  blockedTickets,
  activeStagedActions,
  getStation,
  getTicket,
} from "./selectors";
import type { KitchenState, Reason, Ticket, ValidationResult } from "./types";

function isProceeding(ticket: Ticket, state: KitchenState): boolean {
  const station = getStation(state, ticket.stationId);
  if (!station) {
    return false;
  }

  if (ticket.status === "held") {
    return false;
  }

  return station.status === "available";
}

function tableIsSplit(
  members: Ticket[],
  toleranceMinutes: number,
  state: KitchenState,
): boolean {
  if (members.length < 2) {
    return false;
  }

  const held = members.filter((ticket) => ticket.status === "held");
  const proceeding = members.filter((ticket) => isProceeding(ticket, state));

  if (held.length > 0 && proceeding.length > 0) {
    return true;
  }

  const stations = new Set(members.map((ticket) => ticket.stationId));
  if (stations.size > 1 && proceeding.length === members.length) {
    const ages = members.map((ticket) => ticket.ageMinutes);
    const spread = Math.max(...ages) - Math.min(...ages);
    return spread > toleranceMinutes;
  }

  return false;
}

export function validateRecovery(state: KitchenState): ValidationResult {
  const reasons: Reason[] = [];

  if (!state.incident) {
    reasons.push({
      code: "NO_INCIDENT",
      entityIds: [],
      message: "No incident is active.",
    });
    return { version: state.version, valid: false, reasons };
  }

  if (state.committedReceipt) {
    reasons.push({
      code: "ALREADY_COMMITTED",
      entityIds: [state.committedReceipt.receiptId],
      message: "Recovery is already committed.",
    });
    return { version: state.version, valid: false, reasons };
  }

  if (activeStagedActions(state).length === 0) {
    reasons.push({
      code: "NO_STAGED_ACTIONS",
      entityIds: [],
      message: "No staged recovery actions to validate.",
    });
  }

  const planned = applyStagedHypothetical(state);
  const plannedState: KitchenState = {
    ...state,
    tickets: planned.tickets,
    stations: planned.stations,
  };

  for (const action of activeStagedActions(state)) {
    const ticket = getTicket(state, action.ticketId);
    if (!ticket) {
      reasons.push({
        code: "MISSING_WORK",
        entityIds: [action.ticketId],
        message: `Staged action ${action.id} references missing ticket ${action.ticketId}.`,
      });
      continue;
    }

    if (action.kind === "reroute") {
      const target = action.targetStationId
        ? getStation(plannedState, action.targetStationId)
        : undefined;

      if (!target) {
        reasons.push({
          code: "UNKNOWN_STATION",
          entityIds: action.targetStationId ? [action.targetStationId] : [action.id],
          message: `Reroute ${action.id} has no target station.`,
        });
      } else if (target.status === "unavailable") {
        reasons.push({
          code: "STATION_UNAVAILABLE",
          entityIds: [target.id, ticket.id],
          message: `${target.name} is unavailable for ${ticket.displayNumber}.`,
        });
      } else if (!ticket.supportedStationIds.includes(target.id)) {
        reasons.push({
          code: "STATION_UNSUPPORTED",
          entityIds: [target.id, ticket.id],
          message: `${ticket.itemName} cannot run on ${target.name}.`,
        });
      }
    }
  }

  for (const ticket of blockedTickets(plannedState)) {
    reasons.push({
      code: "BLOCKED_TICKET_UNRESOLVED",
      entityIds: [ticket.id, ticket.stationId],
      message: `${ticket.displayNumber} is still assigned to an unavailable station.`,
    });
  }

  for (const constraint of state.tableConstraints) {
    if (!constraint.keepTogether) {
      continue;
    }

    const members = planned.tickets.filter(
      (ticket) => ticket.tableName === constraint.tableName,
    );

    if (tableIsSplit(members, constraint.readyTimeToleranceMinutes, plannedState)) {
      reasons.push({
        code: "KEEP_TOGETHER_SPLIT",
        entityIds: members.map((ticket) => ticket.id),
        message: `${constraint.tableName} would be split outside the ${constraint.readyTimeToleranceMinutes}-minute ready window.`,
      });
    }
  }

  const ticketIds = activeStagedActions(state).map((action) => action.ticketId);
  const duplicates = ticketIds.filter(
    (id, index) => ticketIds.indexOf(id) !== index,
  );
  if (duplicates.length > 0) {
    reasons.push({
      code: "DUPLICATE_TICKET_ACTION",
      entityIds: [...new Set(duplicates)],
      message: "The plan has more than one action for the same ticket.",
    });
  }

  return {
    version: state.version,
    valid: reasons.length === 0,
    reasons,
  };
}
