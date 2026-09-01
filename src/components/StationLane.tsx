import type { Station } from "../domain/types";
import {
  isTicketBlocked,
  ticketsForStation,
} from "../domain/selectors";
import { useKitchenState } from "../app/KitchenProvider";
import { TicketCard } from "./TicketCard";

interface StationLaneProps {
  station: Station;
}

export function StationLane({ station }: StationLaneProps) {
  const state = useKitchenState();
  const tickets = ticketsForStation(state, station.id);
  const blockedCount = tickets.filter((ticket) => isTicketBlocked(state, ticket)).length;
  const unavailable = station.status === "unavailable";

  return (
    <section
      className={unavailable ? "station is-unavailable" : "station"}
      role="region"
      aria-label={`${station.name} station`}
    >
      <header>
        <h2>{station.name}</h2>
        <span>
          {unavailable ? "Unavailable" : `${tickets.length} open`}
          {blockedCount > 0 ? ` · ${blockedCount} blocked` : ""}
        </span>
      </header>
      <div className="ticket-stack">
        {tickets.length === 0 ? (
          <p className="empty-lane">Clear</p>
        ) : (
          tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
        )}
      </div>
    </section>
  );
}
