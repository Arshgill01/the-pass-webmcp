# Grok handoff

You are the implementation executor for **The Pass**, working through Cursor.

The repository was intentionally scaffolded without product behavior. Do not replace the plan with a broad rewrite or generate a second product concept. Follow the active vertical slice in `EXEC_PLAN.md`.

## Product in one sentence

An expediter and a browser agent recover a live restaurant service disruption together while tickets keep aging and newer human decisions invalidate stale agent actions.

## The memorable proof

The agent begins a recovery against state version 7. While it reasons, the expediter clicks **Keep Table 12 together**, producing version 8. The agent's next mutation carries `expectedVersion: 7`; the page rejects it as stale, visibly preserves the human decision, and returns the current version and next legal action. The agent reinspects version 8 and completes a valid recovery.

If this exact moment is not obvious in the interface, the build has missed its purpose.

## First work session

1. Run the existing checks and record the baseline in `EXEC_PLAN.md`.
2. Implement the framework-free reducer and command handlers in `src/domain/` using tests first.
3. Add a deterministic service clock that advances ticket age without introducing wall-clock flakiness in tests.
4. Wire the current static UI to the store.
5. Stop and validate before registering WebMCP tools.

Do not start with polish or tool registration. The stale-state contract is the product's foundation.

## Non-negotiable constraints

- One fixture and one fryer incident.
- No backend, auth, database, or external API.
- No hidden optimizer. The agent composes atomic actions.
- Human UI and WebMCP call the same domain commands.
- Every mutation validates `expectedVersion`.
- Only the human can approve the recovery.
- Tools appear and disappear with legal product state.
- A deterministic Reset Demo restores the exact fixture.

## Expected implementation order

```text
pure domain state and tests
  → deterministic moving clock
  → human incident and lock controls
  → staged atomic recovery actions
  → stale rejection and validation
  → human-only approval and reset
  → state-scoped WebMCP registration
  → browser/runtime verification
  → visual polish and submission assets
```

## Definition of done

The canonical journey runs ten times from reset without manual repair; the same behaviors pass through domain tests, UI controls, and real WebMCP invocation; the app is deployed; and the public README/video make the stale-plan moment understandable without architecture narration.
