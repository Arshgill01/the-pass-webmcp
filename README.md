# The Pass

The Pass is a live kitchen recovery desk built for the WebMCP Challenge.

The page does not pause for the agent. Tickets keep aging and restaurant staff keep changing physical reality while the agent reasons. Agent mutations carry an expected state version; stale operations fail instead of overwriting newer human decisions.

This repository currently contains **scaffolding only**. The static application shell, canonical fixture, initial WebMCP compatibility adapter, tests, product specifications, and implementation plan are present. The recovery workflow is intentionally not implemented yet.

## Canonical journey

1. Friday service is running across expo, grill, fryer, and cold prep.
2. The expediter reports the fryer unavailable for 12 minutes.
3. The browser agent inspects the live board and stages atomic recovery actions.
4. Before those actions commit, the expediter locks Table 12 together.
5. The page rejects the agent's stale action.
6. The agent reads current state, repairs the plan, and validates it.
7. The expediter approves the valid recovery through the human UI.

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

## Start here for implementation

- [`AGENTS.md`](AGENTS.md) — binding repository instructions
- [`docs/GROK_HANDOFF.md`](docs/GROK_HANDOFF.md) — concise Cursor/Grok handoff
- [`docs/EXEC_PLAN.md`](docs/EXEC_PLAN.md) — ordered implementation plan
- [`docs/WEBMCP_TOOL_CONTRACT.md`](docs/WEBMCP_TOOL_CONTRACT.md) — exact tool surface and receipts
- [`docs/PRODUCT.md`](docs/PRODUCT.md) — product promise, audience, and scope
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — state ownership and module boundaries
- [`docs/DESIGN_DIRECTION.md`](docs/DESIGN_DIRECTION.md) — visual and interaction direction
- [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) — judge-visible story
- [`docs/SUBMISSION_CHECKLIST.md`](docs/SUBMISSION_CHECKLIST.md) — challenge delivery requirements

## Runtime target

Use `document.modelContext` when available, with `navigator.modelContext` as a compatibility fallback. Register only tools legal for the current product state and retire obsolete registrations through `AbortController`.

The critical path must remain understandable and operable without WebMCP support.

## License

[MIT](LICENSE)
