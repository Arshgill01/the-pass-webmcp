# The Pass

The Pass is a live kitchen recovery desk built for the WebMCP Challenge.

The page does not pause for the agent. Tickets keep aging and restaurant staff keep changing physical reality while the agent reasons. Agent mutations carry an expected state version; stale operations fail instead of overwriting newer human decisions.

This is a **synthetic Friday-service fixture**. It is not a production KDS, POS, or food-safety system.

## Canonical journey

1. Friday service is already running across expo, grill, fryer, and cold prep. The clock and ticket ages move.
2. The expediter reports the fryer unavailable for 12 minutes. Tickets 181 and 185 block.
3. The browser agent inspects the live board and stages atomic actions: hold fries, hold potatoes, raise the sandwich.
4. Before the next write lands, the expediter clicks **Keep Table 12 together**.
5. The agent's pending mutation arrives with the previous version. The page keeps the human lock and marks the write **OUTDATED — NOT APPLIED**.
6. The agent inspects current state, undoes the incompatible hold, reroutes crispy potatoes to grill, and validates.
7. The expediter approves the valid recovery through the human UI. Reset Demo restores version 1.

## 15-second proof

The board is already running. Report the fryer. Watch the agent stage holds. Click **Keep Table 12 together**. The next agent write fails in the recovery drawer: `OUTDATED — NOT APPLIED` / expected version vs current / `Human change: Table 12 must stay together` / `Next: inspect_service_state`.

## Local development

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Validation:

```bash
npm run check
npm run test
npm run test:e2e
npm run build
```

## Architecture

Human React controls and WebMCP tool handlers call the same domain commands in `src/domain/`. The store versions semantic kitchen facts, not clock ticks. Tools are registered from `src/webmcp/createToolset.ts` onto `document.modelContext` (falling back to `navigator.modelContext`) and retired with `AbortController` when the product phase changes.

Agent tools: `inspect_service_state`, `inspect_ticket`, `stage_ticket_hold`, `stage_ticket_reroute`, `stage_ticket_priority`, `undo_staged_action`, `validate_recovery`, `read_recovery_receipt`.

Never on the tool surface: report the fryer, keep-together, approve/commit, reset.

When WebMCP is unavailable the human board still works. Ticket Hold / Send to grill / Urgent buttons use the same commands.

## Limitations

- One fixture, one 12-minute fryer incident, four stations, six tickets.
- No backend, auth, persistence, or real restaurant integration.
- No food-safety, allergy, or substitution advice.
- A refresh recreates the fixture. Reset Demo is the deterministic restore.

## Start here

- [`AGENTS.md`](AGENTS.md) — binding repository instructions
- [`docs/GROK_HANDOFF.md`](docs/GROK_HANDOFF.md) — concise Cursor/Grok handoff
- [`docs/EXEC_PLAN.md`](docs/EXEC_PLAN.md) — ordered implementation plan
- [`docs/WEBMCP_TOOL_CONTRACT.md`](docs/WEBMCP_TOOL_CONTRACT.md) — exact tool surface and receipts
- [`docs/PRODUCT.md`](docs/PRODUCT.md) — product promise, audience, and scope
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — state ownership and module boundaries
- [`docs/DESIGN_DIRECTION.md`](docs/DESIGN_DIRECTION.md) — visual and interaction direction
- [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) — judge-visible story
- [`docs/SUBMISSION_CHECKLIST.md`](docs/SUBMISSION_CHECKLIST.md) — challenge delivery requirements

## License

[MIT](LICENSE)
