# Execution plan

This is a living document. Keep Progress, Discoveries, Decisions, and Results current as implementation proceeds.

## Purpose

Deliver a deployed, resettable WebMCP product that proves safe human-agent collaboration on a non-pausing kitchen service board. The canonical fryer disruption must run ten consecutive times without manual repair.

## Progress

- [x] Repository scaffold, fixture, product documents, static shell, test harness, and CI configuration.
- [x] Baseline scaffold checks recorded.
- [x] Milestone 1 — pure versioned domain state.
- [x] Milestone 2 — moving service clock and human controls.
- [x] Milestone 3 — staged recovery and stale rejection.
- [x] Milestone 4 — real WebMCP lifecycle and tool flow.
- [x] Milestone 5 — canonical browser journey and product polish (local HTTPS deploy still pending).
- [ ] Milestone 6 — README screenshots, video, and Devpost submission (held for explicit approval).

## Milestone 1 — domain contract

Implement the smallest framework-free store and commands.

Acceptance:

- [x] canonical reset returns a fresh, immutable version-1 state;
- [x] accepted semantic mutation increments version once;
- [x] stale mutation changes nothing (tickets/staged plan/version) and returns a structured rejection;
- [x] human and agent actors appear in the activity record;
- [x] fixture IDs and transitions are runtime validated;
- [x] unit tests cover accepted, stale, invalid, and reset behavior.

Recommended first tests (all passing in `src/domain/commands.test.ts`):

1. human reports the fryer incident against version 1 → accepted version 2;
2. agent stages a hold against version 2 → accepted version 3;
3. human locks Table 12 against version 3 → accepted version 4;
4. agent stages a reroute against expected version 3 → `rejected_stale`, state remains version 4;
5. reset → deep-equal canonical version 1.

## Milestone 2 — moving page

Replace the static shell with state-backed controls and a deterministic clock.

Acceptance:

- [x] visible service time and ticket ages advance;
- [x] tests control time without sleeps (`KitchenStore.advanceTime`);
- [x] human can report the one fryer incident;
- [x] human can toggle Table 12 keep-together;
- [x] unavailable station and blocked tickets are visually obvious;
- [x] UI controls dispatch the same domain commands intended for tools.

## Milestone 3 — recovery workflow

Implement atomic staging, undo, deterministic validation, human approval, and reset.

Acceptance:

- [x] agent actions appear individually with reasons and expected version;
- [x] stale actions stay visible as not applied and name the intervening human change;
- [x] validation is invalidated by any semantic state change;
- [x] approval is disabled unless validation passes for the current version;
- [x] approval is absent from the agent command/tool surface;
- [x] committed receipt differentiates proposed agent actions and human approval.

## Milestone 4 — WebMCP

Create state-scoped tool definitions from `WEBMCP_TOOL_CONTRACT.md`.

Acceptance:

- [x] critical tools register through `document.modelContext` with fallback;
- [x] obsolete phase tools are aborted and removed;
- [x] JSON Schema and runtime validation agree;
- [x] tool outputs are compact and include stable reason codes;
- [x] tool handlers call the domain commands used by UI controls;
- [x] unsupported browsers show a non-blocking status while human UI works;
- [x] Chromium e2e with a mock `document.modelContext` exercises read, accepted mutation, stale mutation, reinspection, validation, and teardown.

## Milestone 5 — finish the product

Acceptance:

- [x] canonical journey succeeds ten times from Reset Demo (`tests/e2e/canonical.spec.ts`);
- [x] first meaningful state is visible without setup;
- [x] desktop and narrow CSS layouts are implemented (browser visual pass pending);
- [x] keyboard-visible focus and reduced-motion CSS are present;
- [x] no magic optimizer; human UI works with WebMCP off;
- [ ] deployed HTTPS URL (Netlify config is present; publish still pending);
- [x] static fallback remains coherent when WebMCP is unavailable.

## Milestone 6 — submission

Held until explicit approval. Not required for this implementation pass.

Acceptance:

- [x] MIT license (scaffold);
- [ ] public README screenshots and live URL;
- [ ] sub-three-minute public video;
- [ ] Devpost entry.

## Discoveries

- Scaffold created on 2026-09-01.
- Baseline re-verified 2026-08-31: `check`, `test` (1), `test:e2e` (1), `build` all passed on the empty shell.
- TypeScript 7 is not yet accepted by `typescript-eslint` 8.69; the scaffold pins TypeScript 6.0.3.
- Vitest must include only `src/**/*.test.{ts,tsx}` so it does not collect Playwright specs.
- Playwright Chromium 151 was installed locally for the scaffold browser check.
- Table 12 starts **unlocked**. Ticket `keepTogether` flags mark linked multi-item tables; the expediter lock is a separate constraint. The agent's first valid plan (hold both fryer tickets) becomes invalid after the lock because steak 184 would keep cooking while potatoes 185 wait. Repair is undo-hold + reroute 185 to grill.
- `ticket-185` crispy potatoes is the only fixture-supported fryer alternative (`fryer` + `grill`). Shoestring fries (`ticket-181`) can only hold.
- Clock ticks and validation snapshots do not increment `version`. Stale rejections record evidence (`rejectedActions`, `staleRejection`, activity) without changing versioned kitchen facts.
- React StrictMode double-mounts WebMCP registration. Host abort listeners must ignore stale aborts when a newer `registerTool` call owns the same name, or tools vanish while the badge still says live.

## Decisions

- React + TypeScript + Vite; local deterministic state; no backend.
- Semantic state versioning; time is derived from `elapsedMs` plus a 19:42:18 epoch.
- Atomic agent tool surface; human-only incident truth, table constraint, commitment, and reset.
- One canonical fryer disruption; no additional scenario before submission.
- `window.__THE_PASS__` is a rehearsal/test seam for attributing agent commands without presenting an in-page optimizer.
- Validate does not bump version; it stores a result tied to the current version. Approve is the next semantic mutation.
- Human ticket Hold / Send to grill / Urgent buttons call the same commands as WebMCP so the board is operable without an agent host.

## Results and risks

Current state: canonical journey implemented end to end in domain, UI, and mocked WebMCP Chromium tests.

Primary risks remaining:

- Real Chrome WebMCP (`document.modelContext` in the intended host browser) has not been exercised outside the Playwright mock.
- No hosted HTTPS URL yet.
- The stale rejection is readable in the recovery drawer; video/Devpost copy still needs a recording pass later.
- Agent latency in a live model session can still drift versions; the expectedVersion contract is the mitigation.
