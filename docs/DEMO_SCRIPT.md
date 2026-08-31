# Demo script

Target: 90–110 seconds inside a final video under three minutes.

## Opening proof: 0–15 seconds

The board is already running. Ticket ages visibly advance.

Narration:

> Most agent workflows pause the world while the model thinks. A restaurant does not. The Pass lets an expediter and an agent recover the same live service board without the agent overwriting newer human reality.

The human reports **Fryer unavailable · 12 minutes**. Two fryer tickets become blocked. The agent calls `inspect_service_state`.

## Agent stages recovery: 15–35 seconds

The agent inspects the affected tickets and calls atomic tools to hold one item, reroute another fixture-supported item, and raise one ticket's priority. The recovery drawer displays each staged action and its source.

Do not call a broad optimizer tool.

## Human invalidates plan: 35–50 seconds

Before the next agent mutation, the expediter toggles **Keep Table 12 together** on the page. The state version advances.

The agent's pending mutation arrives with the old expected version. The page rejects it visibly:

```text
OUTDATED — NOT APPLIED
Plan expected v7. Current state is v8.
Human change: Table 12 must stay together.
Next: inspect_service_state
```

## Agent recovers: 50–75 seconds

The agent reinspects current state, replaces the incompatible action, and calls `validate_recovery`. The page shows a valid staged plan without claiming it is committed.

## Human commits: 75–90 seconds

The expediter clicks **Approve recovery**. Tickets move, the incident receipt records human and agent actions, and the board continues running.

End on Reset Demo and the tool inventory changing with product phase.

## Supporting narration after the journey

- Synthetic fixture; no production restaurant or food-safety decisions.
- Human owns physical truth and final commitment.
- Page owns runtime validation, state versions, stale rejection, and receipts.
- WebMCP gives the agent precise, state-scoped operations instead of screenshot guessing.

Avoid architecture diagrams or framework logos during the critical journey.
