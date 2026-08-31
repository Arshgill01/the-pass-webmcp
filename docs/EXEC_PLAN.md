# Execution plan

This is a living document. Keep Progress, Discoveries, Decisions, and Results current as implementation proceeds.

## Purpose

Deliver a deployed, resettable WebMCP product that proves safe human-agent collaboration on a non-pausing kitchen service board. The canonical fryer disruption must run ten consecutive times without manual repair.

## Progress

- [x] Repository scaffold, fixture, product documents, static shell, test harness, and CI configuration.
- [x] Baseline scaffold checks recorded.
- [ ] Milestone 1 — pure versioned domain state.
- [ ] Milestone 2 — moving service clock and human controls.
- [ ] Milestone 3 — staged recovery and stale rejection.
- [ ] Milestone 4 — real WebMCP lifecycle and tool flow.
- [ ] Milestone 5 — canonical browser journey, polish, and deployment.
- [ ] Milestone 6 — README, video, and submission audit.

## Milestone 1 — domain contract

Implement the smallest framework-free store and commands.

Acceptance:

- canonical reset returns a fresh, immutable version-1 state;
- accepted semantic mutation increments version once;
- stale mutation changes nothing and returns a structured rejection;
- human and agent actors appear in the activity record;
- fixture IDs and transitions are runtime validated;
- unit tests cover accepted, stale, invalid, and reset behavior.

Recommended first tests:

1. human reports the fryer incident against version 1 → accepted version 2;
2. agent stages a hold against version 2 → accepted version 3;
3. human locks Table 12 against version 3 → accepted version 4;
4. agent stages a reroute against expected version 3 → `rejected_stale`, state remains version 4;
5. reset → deep-equal canonical version 1.

## Milestone 2 — moving page

Replace the static shell with state-backed controls and a deterministic clock.

Acceptance:

- visible service time and ticket ages advance;
- tests control time without sleeps;
- human can report the one fryer incident;
- human can toggle Table 12 keep-together;
- unavailable station and blocked tickets are visually obvious;
- UI controls dispatch the same domain commands intended for tools.

## Milestone 3 — recovery workflow

Implement atomic staging, undo, deterministic validation, human approval, and reset.

Acceptance:

- agent actions appear individually with reasons and expected version;
- stale actions stay visible as not applied and name the intervening human change;
- validation is invalidated by any semantic state change;
- approval is disabled unless validation passes for the current version;
- approval is absent from the agent command/tool surface;
- committed receipt differentiates proposed agent actions and human approval.

## Milestone 4 — WebMCP

Create state-scoped tool definitions from `WEBMCP_TOOL_CONTRACT.md`.

Acceptance:

- critical tools register through `document.modelContext` with fallback;
- obsolete phase tools are aborted and removed;
- JSON Schema and runtime validation agree;
- tool outputs are compact and include stable reason codes;
- tool handlers call the domain commands used by UI controls;
- unsupported browsers show a non-blocking status while human UI works;
- real Chrome execution exercises read, accepted mutation, stale mutation, reinspection, validation, and teardown.

## Milestone 5 — finish the product

Acceptance:

- canonical journey succeeds ten times from Reset Demo;
- first meaningful state is visible without setup;
- desktop recording viewport and narrow layout are legible;
- keyboard operation and reduced motion work;
- no console errors in a fresh session;
- deployed HTTPS URL passes the same journey;
- static fallback remains coherent when WebMCP is unavailable.

## Milestone 6 — submission

Acceptance:

- public repo and MIT license;
- reproducible setup and architecture notes;
- live URL;
- sub-three-minute public video with clear audio;
- description explicitly addresses all four judging criteria;
- limitations state synthetic data and no food-safety or production claims;
- final submission completed before the official deadline.

## Discoveries

- Scaffold created on 2026-09-01.
- TypeScript 7 is not yet accepted by `typescript-eslint` 8.69; the scaffold pins TypeScript 6.0.3.
- Vitest must include only `src/**/*.test.{ts,tsx}` so it does not collect Playwright specs.
- Playwright Chromium 151 was installed locally for the scaffold browser check.

## Decisions

- React + TypeScript + Vite; local deterministic state; no backend.
- Semantic state versioning; time should be derived rather than incrementing the version every second.
- Atomic agent tool surface; human-only incident truth, table constraint, commitment, and reset.
- One canonical fryer disruption; no additional scenario before submission.

## Results and risks

Current state: scaffolding only.

Baseline validation on 2026-09-01:

- `npm run check` — passed.
- `npm run test` — passed, 1 test.
- `npm run test:e2e` — passed, 1 Chromium test.
- `npm run build` — passed.

Primary risks:

- The stale rejection may look like ordinary error handling unless its intervening human change is visible.
- Agent latency can make the demo unpredictable; preserve a deterministic tool harness for rehearsal without presenting it as the agent.
- Tool lifecycle behavior must be verified in the actual target browser, not inferred from unit tests.
- Visual polish must not consume time before the full canonical journey works.
