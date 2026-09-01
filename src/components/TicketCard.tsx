import { formatTicketAge } from "../domain/clock";
import { KitchenStore } from "../domain/store";
import {
  derivePhase,
  effectivePriority,
  isTicketBlocked,
  stagedActionForTicket,
  tableLocked,
} from "../domain/selectors";
import type { StationId, Ticket } from "../domain/types";
import { useKitchenState, useKitchenStore } from "../app/KitchenProvider";

interface TicketCardProps {
  ticket: Ticket;
}

export function TicketCard({ ticket }: TicketCardProps) {
  const store = useKitchenStore();
  const state = useKitchenState();
  const phase = derivePhase(state);
  const blocked = isTicketBlocked(state, ticket);
  const staged = stagedActionForTicket(state, ticket.id);
  const locked = tableLocked(state, ticket.tableName);
  const linked = ticket.keepTogether;
  const priority = effectivePriority(state, ticket);
  const canStage =
    Boolean(state.incident) &&
    !state.committedReceipt &&
    phase !== "RECOVERY_COMMITTED";
  const alternatives = ticket.supportedStationIds.filter(
    (stationId) =>
      stationId !== ticket.stationId &&
      state.stations.find((station) => station.id === stationId)?.status ===
        "available",
  );

  const statusLabel = ticketStatusLabel(ticket, blocked, staged?.kind);

  return (
    <article
      className={[
        "ticket",
        blocked ? "is-blocked" : "",
        ticket.status === "held" ? "is-held" : "",
        staged ? "is-staged" : "",
        priority === "urgent" ? "is-urgent" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="ticket-heading">
        <strong>{ticket.displayNumber}</strong>
        <time>{formatTicketAge(ticket.ageMinutes, state.elapsedMs)}</time>
      </div>
      <p>{ticket.itemName}</p>
      <span>
        {ticket.tableName}
        {linked ? " · linked" : ""}
        {locked ? " · keep together" : ""}
      </span>
      <p className="ticket-status">
        {statusLabel}
        {priority === "urgent" ? " · URGENT" : ""}
        {staged
          ? ` · staged ${staged.kind}${staged.targetStationId ? ` → ${staged.targetStationId}` : ""} · ${staged.actor}`
          : ""}
      </p>
      {canStage && !staged ? (
        <div className="ticket-actions">
          {blocked ? (
            <button
              type="button"
              onClick={() =>
                store.dispatch({
                  type: "STAGE_HOLD",
                  ticketId: ticket.id,
                  expectedVersion: state.version,
                  reason: `Expediter holding ${ticket.displayNumber} while the fryer is down.`,
                  actor: "human",
                })
              }
            >
              Hold
            </button>
          ) : null}
          {alternatives.map((stationId) => (
            <button
              key={stationId}
              type="button"
              onClick={() => rerouteTo(store, state.version, ticket.id, stationId)}
            >
              Send to {stationLabel(stationId)}
            </button>
          ))}
          {!blocked && priority !== "urgent" ? (
            <button
              type="button"
              onClick={() =>
                store.dispatch({
                  type: "STAGE_PRIORITY",
                  ticketId: ticket.id,
                  priority: "urgent",
                  expectedVersion: state.version,
                  reason: `Expediter marking ${ticket.displayNumber} urgent.`,
                  actor: "human",
                })
              }
            >
              Urgent
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function stationLabel(stationId: StationId): string {
  switch (stationId) {
    case "cold-prep":
      return "cold prep";
    default:
      return stationId;
  }
}

function ticketStatusLabel(
  ticket: Ticket,
  blocked: boolean,
  stagedKind: string | undefined,
): string {
  if (blocked && !stagedKind) {
    return "BLOCKED · fryer down";
  }
  if (ticket.status === "held") {
    return "HELD";
  }
  return ticket.status.toUpperCase();
}

function rerouteTo(
  store: KitchenStore,
  version: number,
  ticketId: string,
  targetStationId: StationId,
): void {
  store.dispatch({
    type: "STAGE_REROUTE",
    ticketId,
    targetStationId,
    expectedVersion: version,
    reason: `Expediter rerouting ${ticketId} to ${targetStationId}.`,
    actor: "human",
  });
}
