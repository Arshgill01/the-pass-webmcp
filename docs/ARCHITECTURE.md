# Architecture

## Principle

There is one state machine and two adapters:

```text
Human React controls ─┐
                      ├─> domain commands ─> versioned store ─> React view
WebMCP tool handlers ─┘                         │
                                               └─> structured receipts
```

The WebMCP layer must not maintain a second state, bypass validation, or directly mutate React state.

## Proposed modules

```text
src/
  domain/
    types.ts                 shared types already scaffolded
    state.ts                 canonical state creator and immutable store
    clock.ts                 deterministic time advancement
    commands.ts              human and agent command handlers
    validateRecovery.ts      pure recovery validation
    selectors.ts             derived views and legal actions
    *.test.ts                contract-level unit tests
  fixtures/
    canonical.ts             one synthetic scenario
  webmcp/
    types.ts                 browser API compatibility declarations
    registerTools.ts         lifecycle helper already scaffolded
    createToolset.ts         state-scoped WebMCP definitions
    schemas.ts               reusable JSON schemas
  components/
    KitchenBoard.tsx
    IncidentStrip.tsx
    StationLane.tsx
    TicketCard.tsx
    RecoveryDrawer.tsx
    ActivityLog.tsx
  styles/
    base.css
```

Create files only when their responsibility becomes real. Do not pre-create empty component wrappers.

## State model

The canonical store should include:

- monotonic `version`;
- deterministic service time;
- stations and station availability;
- tickets and their current station/status;
- table constraints;
- active incident;
- staged recovery actions;
- validation result tied to a version;
- committed action receipt;
- activity records identifying `human`, `agent`, or `system`.

Every accepted mutation increments `version`. Derived clock ticks may be handled separately if incrementing every second makes agent actions unusably fragile; document the chosen rule. A recommended model is to version semantic state changes while time is calculated from an epoch, not committed as a mutation every second.

## Concurrency contract

Every mutating command accepts `expectedVersion`.

```ts
type CommandResult =
  | { status: "accepted"; version: number; receiptId: string }
  | {
      status: "rejected_stale";
      expectedVersion: number;
      currentVersion: number;
      changedSince: ChangeSummary[];
      nextActions: ["inspect_service_state"];
    }
  | { status: "rejected_invalid"; version: number; reasons: ReasonCode[] };
```

Stale recovery is intentional product behavior, not an exceptional crash.

## Tool lifecycle

Create a new `AbortController` whenever the legal tool phase changes. Abort the previous controller before registering the next phase's tool set.

Suggested phases:

- `RUNNING`: inspect state only.
- `INCIDENT_ACTIVE`: inspect plus stage atomic actions.
- `RECOVERY_STAGED`: inspect, stage/undo actions, validate.
- `RECOVERY_VALID`: inspect and continue staging; commitment remains human-only.
- `RECOVERY_COMMITTED`: inspect receipt only.

Tool registration belongs in a React effect or dedicated lifecycle adapter that responds to phase/version changes and cleans up on unmount.

## Persistence

Version one needs no server or browser persistence. A refresh may recreate the canonical fixture. Reset must be deterministic.

## Security and integrity

- Validate all runtime inputs independently of JSON Schema.
- Use stable allow-listed IDs from the fixture.
- Treat tool descriptions and outputs as untrusted boundaries.
- Never accept `approved: true` from a tool call; approval is not on the tool surface.
- Avoid broad outputs. Return only state necessary for the next decision.
