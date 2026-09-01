import { formatDuration, incidentRemainingMs } from "../domain/clock";
import { derivePhase, tableLocked } from "../domain/selectors";
import { TABLE_12 } from "../fixtures/canonical";
import { useKitchenState, useKitchenStore } from "../app/KitchenProvider";

export function IncidentStrip() {
  const store = useKitchenStore();
  const state = useKitchenState();
  const phase = derivePhase(state);
  const remaining = incidentRemainingMs(state);
  const locked = tableLocked(state, TABLE_12);
  const incidentActive = Boolean(state.incident) && !state.committedReceipt;

  let title = "No active incident";
  let detail =
    "Six tickets on the board. Report the fryer failure when it happens in the kitchen.";

  if (state.incident && !state.committedReceipt) {
    title = "Fryer unavailable · 12 minutes";
    detail = `Two fryer tickets are blocked. Remaining ${formatDuration(remaining ?? 0)}. Synthetic Friday service fixture — not a real restaurant.`;
  }

  if (phase === "RECOVERY_STALE") {
    title = "Stale agent write";
    detail = `${state.staleRejection?.summary ?? "A human change landed first."} Agent must inspect current state.`;
  }

  if (phase === "RECOVERY_VALID") {
    title = "Recovery valid · waiting on the pass";
    detail =
      "The staged plan matches this version. Only the expediter can approve and commit it.";
  }

  if (phase === "RECOVERY_COMMITTED") {
    title = "Recovery committed";
    detail =
      "Human approval recorded. Fryer remains unavailable; held and rerouted work is now live on the board.";
  }

  return (
    <section
      className={`incident-strip is-${phase.toLowerCase()}`}
      aria-label="Incident status"
      aria-live="polite"
    >
      <div className="incident-copy">
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
      <div className="incident-actions">
        {incidentActive ? (
          <button
            type="button"
            aria-pressed={locked}
            onClick={() =>
              store.dispatch({
                type: "TOGGLE_KEEP_TOGETHER",
                tableName: TABLE_12,
                expectedVersion: state.version,
                actor: "human",
              })
            }
          >
            Keep Table 12 together
          </button>
        ) : null}
        <button
          type="button"
          disabled={Boolean(state.incident)}
          onClick={() =>
            store.dispatch({
              type: "REPORT_FRYER_INCIDENT",
              expectedVersion: state.version,
              actor: "human",
            })
          }
        >
          Report fryer unavailable
        </button>
      </div>
    </section>
  );
}
