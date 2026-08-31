# WebMCP tool contract

The tool surface is intentionally atomic. The page exposes facts and bounded operations; the agent composes the recovery.

Exact names may change only if real agent evaluation demonstrates ambiguity.

## Shared conventions

Every mutating input includes:

```json
{
  "expectedVersion": 7,
  "reason": "Fryer is unavailable; hold ticket 181 while grill capacity is assessed."
}
```

Every output includes:

```json
{
  "receiptId": "receipt-014",
  "status": "accepted",
  "stateVersion": 8,
  "affectedIds": ["ticket-181"],
  "nextActions": ["inspect_service_state", "validate_recovery"]
}
```

Rejected stale writes must return `expectedVersion`, `currentVersion`, a compact change summary, and `nextActions: ["inspect_service_state"]`.

## Phase 1 — always readable

### `inspect_service_state`

Returns current version, service time, incident, stations, unresolved blocked tickets, staged action summary, validation status, and legal next actions.

- Read-only.
- Do not dump the full event log unless requested through a separate paginated read.
- This is the mandatory recovery action after a stale rejection.

### `inspect_ticket`

Input: `ticketId`.

Returns current station, age, status, table relationship, keep-together constraint, supported target stations, and any staged action.

- Read-only.
- Reject unknown fixture IDs.

## Phase 2 — incident active

### `stage_ticket_reroute`

Inputs: `ticketId`, `targetStationId`, `expectedVersion`, `reason`.

Stages one ticket move. It must not commit service state.

Reject when the target is unavailable, unsupported, identical to the current station, or based on a stale version.

### `stage_ticket_hold`

Inputs: `ticketId`, `expectedVersion`, `reason`.

Stages a temporary hold. A hold is not completion and must remain visibly unresolved until the incident ends or a later action replaces it.

### `stage_ticket_priority`

Inputs: `ticketId`, `priority` (`normal | urgent`), `expectedVersion`, `reason`.

Changes staged service order without marking work complete.

### `undo_staged_action`

Inputs: `actionId`, `expectedVersion`, `reason`.

Removes one current staged action and invalidates any prior validation.

## Phase 3 — staged plan

### `validate_recovery`

Input: `expectedVersion`.

Deterministically checks the product success conditions. Returns reason codes tied to ticket/table/station IDs.

This tool does not mutate tickets and does not approve or commit anything. A passing result is tied to the current version and becomes stale after any semantic state change.

## Phase 4 — committed

### `read_recovery_receipt`

Returns the committed incident, human approval time, exact action list, before/after versions, and resulting unresolved work.

Read-only.

## Human-only operations

These must never be registered as WebMCP tools:

- report/confirm the physical fryer failure;
- mark physical work complete;
- toggle **Keep Table together**;
- approve and commit a valid recovery;
- reset the demo.

That split is part of the product story: the agent propagates and stages; the expediter owns physical truth and final authority.

## Runtime behavior

- Prefer `document.modelContext`; fall back to `navigator.modelContext`.
- Register top-level imperative tools.
- Scope tool sets with `AbortController`.
- Keep names and descriptions concise.
- Set `readOnlyHint` accurately.
- Do not treat JSON Schema as runtime validation.
- Return stable IDs, reason codes, state version, and next legal actions.
