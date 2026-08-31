import {
  formatDuration,
  formatServiceTime,
  incidentRemainingMs,
} from "../domain/clock";
import { derivePhase } from "../domain/selectors";
import { isApprovalLegal } from "../domain/commands";
import type { KitchenState, ProductPhase } from "../domain/types";
import { useKitchenState, useKitchenStore } from "../app/KitchenProvider";
import { useWebMcpTools } from "../webmcp/useWebMcpTools";
import { ActivityLog } from "./ActivityLog";
import { IncidentStrip } from "./IncidentStrip";
import { RecoveryDrawer } from "./RecoveryDrawer";
import { StationLane } from "./StationLane";

export function KitchenBoard() {
  const store = useKitchenStore();
  const state = useKitchenState();
  const phase = derivePhase(state);
  const webmcpSupported = useWebMcpTools(store, phase);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>The Pass</h1>
          <p>{state.restaurantName}</p>
        </div>
        <div className="service-clock" aria-label="Service clock">
          <span>Service</span>
          <time dateTime={formatServiceTime(state.elapsedMs)}>
            {formatServiceTime(state.elapsedMs)}
          </time>
          <span className="version-chip">v{state.version}</span>
        </div>
        <div className="topbar-actions">
          <WebMcpBadge supported={webmcpSupported} phase={phase} />
          <button
            type="button"
            onClick={() => store.dispatch({ type: "RESET", actor: "human" })}
          >
            Reset Demo
          </button>
        </div>
      </header>

      <IncidentStrip />

      <section className="workspace" aria-label="Kitchen workspace">
        <div className="station-grid">
          {state.stations.map((station) => (
            <StationLane key={station.id} station={station} />
          ))}
        </div>
        <RecoveryDrawer
          canApprove={isApprovalLegal(state)}
          remainingLabel={remainingLabel(state)}
        />
      </section>

      <ActivityLog />
      <p className="legal-note">
        Synthetic Friday-service fixture. Not a production KDS, POS, or
        food-safety system.
      </p>
    </main>
  );
}

function remainingLabel(state: KitchenState): string | null {
  const remaining = incidentRemainingMs(state);
  if (remaining === null) {
    return null;
  }
  return formatDuration(remaining);
}

function WebMcpBadge({
  supported,
  phase,
}: {
  supported: boolean;
  phase: ProductPhase;
}) {
  return (
    <p
      className={supported ? "webmcp-badge" : "webmcp-badge is-offline"}
      aria-label="WebMCP status"
    >
      <span>{supported ? "WebMCP live" : "WebMCP off"}</span>
      <small>{supported ? phase.replaceAll("_", " ") : "Human controls active"}</small>
    </p>
  );
}
