import { isApprovalLegal } from "../domain/commands";
import { activeStagedActions, derivePhase } from "../domain/selectors";
import type { RecoveryAction } from "../domain/types";
import { useKitchenState, useKitchenStore } from "../app/KitchenProvider";

interface RecoveryDrawerProps {
  canApprove: boolean;
  remainingLabel: string | null;
}

export function RecoveryDrawer({
  canApprove,
  remainingLabel,
}: RecoveryDrawerProps) {
  const store = useKitchenStore();
  const state = useKitchenState();
  const phase = derivePhase(state);
  const staged = activeStagedActions(state);
  const stale = state.staleRejection;

  return (
    <aside className="recovery-drawer" aria-label="Recovery drawer">
      <header>
        <h2>Recovery</h2>
        <span>{phaseLabel(phase)}</span>
      </header>

      {stale ? (
        <section className="stale-card" aria-live="assertive">
          <p className="stale-kicker">OUTDATED — NOT APPLIED</p>
          <p>
            Plan expected v{stale.expectedVersion}. Current state is v
            {stale.currentVersion}.
          </p>
          <p>Human change: {stale.summary}</p>
          <p>Next: inspect_service_state</p>
        </section>
      ) : null}

      {state.rejectedActions.length > 0 ? (
        <ul className="rejected-list">
          {state.rejectedActions.map((action) => (
            <li key={action.id}>
              <span>OUTDATED — NOT APPLIED</span>
              <strong>
                {action.kind} {action.ticketId}
              </strong>
              <em>v{action.expectedVersion}</em>
            </li>
          ))}
        </ul>
      ) : null}

      {staged.length === 0 && !state.committedReceipt ? (
        <div className="empty-state">
          <p>Staged agent actions will appear here.</p>
          <p>
            Approval stays unavailable until the plan matches the current state
            version and passes validation.
          </p>
        </div>
      ) : (
        <ul className="staged-list">
          {staged.map((action) => (
            <li key={action.id} className="staged-item">
              <div>
                <strong>{actionTitle(action)}</strong>
                <span className="actor-tag">{action.actor}</span>
              </div>
              <p>{action.reason}</p>
              <p className="staged-meta">
                {action.id} · staged at v{action.createdAtVersion}
              </p>
              <button
                type="button"
                onClick={() =>
                  store.dispatch({
                    type: "UNDO_STAGED_ACTION",
                    actionId: action.id,
                    expectedVersion: state.version,
                    reason: `Removing ${action.id} from the staged plan.`,
                    actor: "human",
                  })
                }
              >
                Undo
              </button>
            </li>
          ))}
        </ul>
      )}

      {state.validation ? (
        <section
          className={state.validation.valid ? "validation is-valid" : "validation is-invalid"}
          aria-live="polite"
        >
          <strong>
            {state.validation.valid
              ? `Valid for v${state.validation.version}`
              : `Not valid for v${state.validation.version}`}
          </strong>
          {state.validation.reasons.length > 0 ? (
            <ul>
              {state.validation.reasons.map((reason) => (
                <li key={`${reason.code}-${reason.entityIds.join("-")}`}>
                  {reason.message}
                </li>
              ))}
            </ul>
          ) : (
            <p>Ready for human approval. This is not a commit.</p>
          )}
        </section>
      ) : null}

      {state.committedReceipt ? (
        <section className="receipt-card">
          <strong>Committed receipt {state.committedReceipt.receiptId}</strong>
          <p>
            Human approved at service +
            {Math.floor(state.committedReceipt.approvedAtElapsedMs / 1000)}s.
            Agent proposed {state.committedReceipt.proposedAgentActions.length}{" "}
            action(s); expediter committed{" "}
            {state.committedReceipt.committedActions.length}.
          </p>
          <p>
            Versions v{state.committedReceipt.fromVersion} → v
            {state.committedReceipt.toVersion}.
          </p>
        </section>
      ) : null}

      <div className="drawer-actions">
        {remainingLabel && state.incident ? (
          <p className="remaining">Fryer window {remainingLabel}</p>
        ) : null}
        <button
          type="button"
          disabled={!state.incident || Boolean(state.committedReceipt)}
          onClick={() =>
            store.dispatch({
              type: "VALIDATE_RECOVERY",
              expectedVersion: state.version,
              actor: "human",
            })
          }
        >
          Validate plan
        </button>
        <button
          type="button"
          disabled={!canApprove && !isApprovalLegal(state)}
          onClick={() =>
            store.dispatch({
              type: "APPROVE_RECOVERY",
              expectedVersion: state.version,
              actor: "human",
            })
          }
        >
          Approve recovery
        </button>
      </div>
    </aside>
  );
}

function phaseLabel(phase: string): string {
  return phase.replaceAll("_", " ");
}

function actionTitle(action: RecoveryAction): string {
  if (action.kind === "reroute") {
    return `Reroute ${action.ticketId} → ${action.targetStationId}`;
  }
  if (action.kind === "prioritize") {
    return `${action.priority ?? "priority"} ${action.ticketId}`;
  }
  return `Hold ${action.ticketId}`;
}
