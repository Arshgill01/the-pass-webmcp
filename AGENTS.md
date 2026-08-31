# AGENTS.md

This repository is the three-day WebMCP Challenge build for **The Pass**. These instructions apply to every file.

## Start here

Read, in order:

1. `docs/GROK_HANDOFF.md`
2. `docs/PRODUCT.md`
3. `docs/EXEC_PLAN.md`
4. `docs/WEBMCP_TOOL_CONTRACT.md`
5. `docs/ARCHITECTURE.md`
6. `docs/DESIGN_DIRECTION.md`

Do not begin broad implementation before the active ExecPlan reflects the actual repository state.

## Product invariant

The product proves one idea:

> The page does not pause for the agent. Tickets age and humans change physical reality while the agent works; stale writes must fail, and the agent must recover from the current page state.

If a change does not make that journey more convincing, reliable, or legible, it is out of scope.

## Hard scope

- Four stations: expo, grill, fryer, cold prep.
- Six seeded tickets.
- One incident: fryer unavailable for 12 minutes.
- One human intervention that invalidates the agent's staged work.
- Atomic WebMCP tools; no `optimize`, `fix_everything`, or `propose_recovery` tool.
- One human-only approval that commits the current valid staged plan.
- One reset action.
- Local deterministic data only.

Explicitly excluded: authentication, database, real POS/KDS integrations, notifications, menu management, staff scheduling, multiple incidents, settings, accounts, analytics, and mobile-native apps.

## Engineering rules

- Domain behavior lives in pure TypeScript under `src/domain/`.
- React renders and dispatches actions; it does not own business rules.
- WebMCP adapters call the same domain commands as human UI controls.
- Every mutation carries an expected state version.
- Return compact structured receipts with stable IDs, status, affected entities, current version, and next legal actions.
- Reject stale mutations explicitly. Never silently rebase or overwrite human state.
- Register only tools legal in the current state and retire obsolete tools with `AbortController`.
- Use `document.modelContext`, falling back to `navigator.modelContext` only for compatibility.
- The app must remain useful and understandable when WebMCP is unavailable.
- Do not add production dependencies without a clear need.

## Design rules

- Industrial, high-density kitchen display; not a generic SaaS dashboard.
- No gradients, glass effects, oversized radii, floating cards, decorative metrics, or blue/purple AI styling.
- Prioritize glanceability under pressure: ticket age, station ownership, blocked work, staged changes, and stale state.
- Interaction cannot depend on color alone.
- Respect reduced-motion preferences.

## Validation

Run the narrowest relevant test while working. Before handoff, run:

```bash
npm run check
npm run test
npm run test:e2e
npm run build
```

Update `docs/EXEC_PLAN.md` with completed work, discoveries, and remaining risks. Keep final reports concise and include exact command results.
