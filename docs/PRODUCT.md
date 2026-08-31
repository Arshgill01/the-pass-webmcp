# Product specification

## Promise

The Pass helps a restaurant expediter recover service when a kitchen station becomes unavailable. It is not a POS, menu manager, kitchen display replacement, or general scheduling system.

The prototype demonstrates one future-facing interaction: a person and an agent act on the same operational page while the underlying world continues to change.

## Audience

Primary user: the expediter or shift lead coordinating a small restaurant kitchen during service.

Their responsibility is not merely to sort tickets. They reconcile what the software knows with physical truth: which station is unavailable, which work is already underway, which table must be served together, and which operational tradeoff is acceptable.

## Why an agent

During a rush, the expediter owns physical truth and guest judgment; the agent propagates those decisions across every affected ticket without silently overwriting newer kitchen state.

The agent reasons across atomic capabilities. The page owns facts, validation, versioning, and commitment. There is deliberately no one-call optimizer.

## Version-one scenario

At 19:42 on Friday service:

- six tickets are active across four stations;
- the fryer becomes unavailable for 12 minutes;
- fryer work must be held or rerouted using fixture-supported alternatives;
- Table 12 has components on grill and fryer and must ultimately remain synchronized;
- a human changes the Table 12 constraint after the agent starts planning;
- the first agent write must fail stale;
- the repaired plan must clear every blocked item without splitting a locked table;
- a human approves and commits the validated plan.

## Product states

```text
RUNNING
  → INCIDENT_ACTIVE
  → RECOVERY_STAGED
  → RECOVERY_STALE (after a newer human change)
  → RECOVERY_STAGED
  → RECOVERY_VALID
  → RECOVERY_COMMITTED
```

Reset is available from every state and restores `RUNNING` at fixture version 1.

## Success conditions

A recovery is valid only when:

- every ticket assigned to an unavailable station is explicitly held or rerouted;
- every target station is available and supports the target work;
- no keep-together table is split outside the allowed ready-time tolerance;
- no action references missing or completed work;
- all actions were staged against the current state version;
- the plan has no duplicate or contradictory action for the same ticket;
- approval occurs through the human interface.

## Explicit non-goals

- food safety, allergy, dietary, or regulatory advice;
- selecting recipe substitutions;
- autonomous customer communication;
- real restaurant integration;
- workforce or inventory optimization;
- predictive demand;
- production use.

The demo data is synthetic, and the product copy must say so.
