import type { KitchenFixture } from "../domain/types";

interface KitchenBoardProps {
  fixture: KitchenFixture;
}

export function KitchenBoard({ fixture }: KitchenBoardProps) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>The Pass</h1>
          <p>{fixture.restaurantName}</p>
        </div>
        <div className="service-clock" aria-label="Service clock scaffold">
          <span>Service</span>
          <time>19:42:18</time>
        </div>
        <button type="button">Reset fixture</button>
      </header>

      <section className="incident-strip" aria-label="Incident status">
        <strong>No active incident</strong>
        <span>The canonical fryer disruption has not been implemented.</span>
        <button type="button" disabled>
          Report fryer unavailable
        </button>
      </section>

      <section className="workspace" aria-label="Kitchen workspace">
        <div className="station-grid">
          {fixture.stations.map((station) => {
            const tickets = fixture.tickets.filter(
              (ticket) => ticket.stationId === station.id,
            );

            return (
              <section className="station" key={station.id}>
                <header>
                  <h2>{station.name}</h2>
                  <span>{tickets.length} open</span>
                </header>
                <div className="ticket-stack">
                  {tickets.map((ticket) => (
                    <article className="ticket" key={ticket.id}>
                      <div className="ticket-heading">
                        <strong>{ticket.displayNumber}</strong>
                        <time>{ticket.ageMinutes}:00</time>
                      </div>
                      <p>{ticket.itemName}</p>
                      <span>{ticket.tableName}</span>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="recovery-drawer">
          <header>
            <h2>Recovery</h2>
            <span>Scaffold</span>
          </header>
          <div className="empty-state">
            <p>Staged agent actions will appear here.</p>
            <p>
              Approval stays unavailable until the plan matches the current state
              version and passes validation.
            </p>
          </div>
          <button type="button" disabled>
            Approve recovery
          </button>
        </aside>
      </section>
    </main>
  );
}
