export type StationId = "expo" | "grill" | "fryer" | "cold-prep";
export type Actor = "human" | "agent" | "system";
export type TicketStatus = "queued" | "working" | "ready" | "held";
export type StationStatus = "available" | "unavailable";
export type Priority = "normal" | "urgent";
export type RecoveryActionKind = "reroute" | "hold" | "prioritize";
export type StagedActionStatus = "staged" | "rejected_stale" | "committed";

export type ProductPhase =
  | "RUNNING"
  | "INCIDENT_ACTIVE"
  | "RECOVERY_STAGED"
  | "RECOVERY_STALE"
  | "RECOVERY_VALID"
  | "RECOVERY_COMMITTED";

export type ReasonCode =
  | "STALE_VERSION"
  | "UNKNOWN_TICKET"
  | "UNKNOWN_STATION"
  | "UNKNOWN_ACTION"
  | "UNKNOWN_TABLE"
  | "STATION_UNAVAILABLE"
  | "STATION_UNSUPPORTED"
  | "SAME_STATION"
  | "INCIDENT_ALREADY_ACTIVE"
  | "NO_INCIDENT"
  | "DUPLICATE_TICKET_ACTION"
  | "CONTRADICTORY_ACTION"
  | "BLOCKED_TICKET_UNRESOLVED"
  | "KEEP_TOGETHER_SPLIT"
  | "VALIDATION_NOT_CURRENT"
  | "PLAN_NOT_VALID"
  | "EMPTY_REASON"
  | "HUMAN_ONLY"
  | "ALREADY_COMMITTED"
  | "NO_STAGED_ACTIONS"
  | "INVALID_PRIORITY"
  | "HOLD_NOT_ALLOWED"
  | "MISSING_WORK";

export const TOOL_NAMES = {
  inspectServiceState: "inspect_service_state",
  inspectTicket: "inspect_ticket",
  stageTicketReroute: "stage_ticket_reroute",
  stageTicketHold: "stage_ticket_hold",
  stageTicketPriority: "stage_ticket_priority",
  undoStagedAction: "undo_staged_action",
  validateRecovery: "validate_recovery",
  readRecoveryReceipt: "read_recovery_receipt",
} as const;

export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

export interface Station {
  id: StationId;
  name: string;
  status: StationStatus;
}

export interface Ticket {
  id: string;
  displayNumber: string;
  tableName: string;
  itemName: string;
  stationId: StationId;
  ageMinutes: number;
  status: TicketStatus;
  keepTogether: boolean;
  supportedStationIds: StationId[];
  priority: Priority;
}

export interface KitchenFixture {
  id: string;
  restaurantName: string;
  stateVersion: number;
  stations: Station[];
  tickets: Ticket[];
}

export interface TableConstraint {
  tableName: string;
  keepTogether: boolean;
  readyTimeToleranceMinutes: number;
}

export interface Incident {
  id: string;
  stationId: StationId;
  kind: "unavailable";
  durationMinutes: number;
  reportedAtElapsedMs: number;
  reportedBy: Actor;
}

export interface RecoveryAction {
  id: string;
  kind: RecoveryActionKind;
  ticketId: string;
  expectedVersion: number;
  reason: string;
  actor: Actor;
  status: StagedActionStatus;
  targetStationId?: StationId;
  priority?: Priority;
  createdAtVersion: number;
}

export interface Reason {
  code: ReasonCode;
  entityIds: string[];
  message: string;
}

export interface ChangeSummary {
  actor: Actor;
  description: string;
  version: number;
  atElapsedMs: number;
}

export interface ValidationResult {
  version: number;
  valid: boolean;
  reasons: Reason[];
}

export interface ActivityRecord {
  id: string;
  actor: Actor;
  atElapsedMs: number;
  version: number;
  kind: string;
  summary: string;
}

export interface StaleRejection {
  receiptId: string;
  expectedVersion: number;
  currentVersion: number;
  changedSince: ChangeSummary[];
  nextActions: ["inspect_service_state"];
  summary: string;
}

export interface CommittedReceipt {
  receiptId: string;
  incidentId: string;
  approvedBy: "human";
  approvedAtElapsedMs: number;
  fromVersion: number;
  toVersion: number;
  proposedAgentActions: RecoveryAction[];
  committedActions: RecoveryAction[];
  unresolvedTicketIds: string[];
}

export interface KitchenState {
  fixtureId: string;
  restaurantName: string;
  version: number;
  elapsedMs: number;
  stations: Station[];
  tickets: Ticket[];
  tableConstraints: TableConstraint[];
  incident: Incident | null;
  stagedActions: RecoveryAction[];
  rejectedActions: RecoveryAction[];
  staleRejection: StaleRejection | null;
  validation: ValidationResult | null;
  committedReceipt: CommittedReceipt | null;
  activity: ActivityRecord[];
  changeLog: ChangeSummary[];
  nextActionSeq: number;
  nextReceiptSeq: number;
  nextActivitySeq: number;
}

export type Command =
  | {
      type: "REPORT_FRYER_INCIDENT";
      expectedVersion: number;
      actor: "human";
    }
  | {
      type: "TOGGLE_KEEP_TOGETHER";
      tableName: string;
      expectedVersion: number;
      actor: "human";
    }
  | {
      type: "STAGE_HOLD";
      ticketId: string;
      expectedVersion: number;
      reason: string;
      actor: Actor;
    }
  | {
      type: "STAGE_REROUTE";
      ticketId: string;
      targetStationId: StationId;
      expectedVersion: number;
      reason: string;
      actor: Actor;
    }
  | {
      type: "STAGE_PRIORITY";
      ticketId: string;
      priority: Priority;
      expectedVersion: number;
      reason: string;
      actor: Actor;
    }
  | {
      type: "UNDO_STAGED_ACTION";
      actionId: string;
      expectedVersion: number;
      reason: string;
      actor: Actor;
    }
  | {
      type: "VALIDATE_RECOVERY";
      expectedVersion: number;
      actor: Actor;
    }
  | {
      type: "APPROVE_RECOVERY";
      expectedVersion: number;
      actor: "human";
    }
  | {
      type: "RESET";
      actor: "human" | "system";
    };

export type CommandResult =
  | {
      status: "accepted";
      receiptId: string;
      version: number;
      affectedIds: string[];
      nextActions: string[];
      actionId?: string;
    }
  | {
      status: "rejected_stale";
      receiptId: string;
      expectedVersion: number;
      currentVersion: number;
      changedSince: ChangeSummary[];
      nextActions: ["inspect_service_state"];
    }
  | {
      status: "rejected_invalid";
      receiptId: string;
      version: number;
      reasons: Reason[];
      nextActions: string[];
    };

export interface ToolReceipt {
  receiptId: string;
  status: "accepted" | "rejected_stale" | "rejected_invalid" | "ok";
  stateVersion: number;
  affectedIds: string[];
  nextActions: string[];
  expectedVersion?: number;
  currentVersion?: number;
  changedSince?: ChangeSummary[];
  reasons?: Reason[];
  actionId?: string;
}

export interface ApplyOutput {
  state: KitchenState;
  result: CommandResult;
}
