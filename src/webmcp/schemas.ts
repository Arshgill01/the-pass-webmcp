export const expectedVersionSchema = {
  type: "integer",
  minimum: 1,
  description: "State version the caller last inspected.",
} as const;

export const reasonSchema = {
  type: "string",
  minLength: 1,
  description: "Why this atomic action is being taken.",
} as const;

export const inspectServiceStateSchema = {
  type: "object",
  additionalProperties: false,
  properties: {},
} as const;

export const inspectTicketSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ticketId"],
  properties: {
    ticketId: { type: "string", minLength: 1 },
  },
} as const;

export const stageHoldSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ticketId", "expectedVersion", "reason"],
  properties: {
    ticketId: { type: "string", minLength: 1 },
    expectedVersion: expectedVersionSchema,
    reason: reasonSchema,
  },
} as const;

export const stageRerouteSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ticketId", "targetStationId", "expectedVersion", "reason"],
  properties: {
    ticketId: { type: "string", minLength: 1 },
    targetStationId: {
      type: "string",
      enum: ["expo", "grill", "fryer", "cold-prep"],
    },
    expectedVersion: expectedVersionSchema,
    reason: reasonSchema,
  },
} as const;

export const stagePrioritySchema = {
  type: "object",
  additionalProperties: false,
  required: ["ticketId", "priority", "expectedVersion", "reason"],
  properties: {
    ticketId: { type: "string", minLength: 1 },
    priority: { type: "string", enum: ["normal", "urgent"] },
    expectedVersion: expectedVersionSchema,
    reason: reasonSchema,
  },
} as const;

export const undoStagedActionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["actionId", "expectedVersion", "reason"],
  properties: {
    actionId: { type: "string", minLength: 1 },
    expectedVersion: expectedVersionSchema,
    reason: reasonSchema,
  },
} as const;

export const validateRecoverySchema = {
  type: "object",
  additionalProperties: false,
  required: ["expectedVersion"],
  properties: {
    expectedVersion: expectedVersionSchema,
  },
} as const;

export const readRecoveryReceiptSchema = {
  type: "object",
  additionalProperties: false,
  properties: {},
} as const;
