import type { KitchenState } from "./types";

/** Friday service opens the board at 19:42:18. */
export const SERVICE_START = {
  hours: 19,
  minutes: 42,
  seconds: 18,
} as const;

export const SERVICE_START_MS =
  ((SERVICE_START.hours * 60 + SERVICE_START.minutes) * 60 +
    SERVICE_START.seconds) *
  1000;

export const FRYER_INCIDENT_MINUTES = 12;
export const READY_TIME_TOLERANCE_MINUTES = 3;
export const CLOCK_TICK_MS = 1000;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatClock(totalMs: number): string {
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = totalSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatServiceTime(elapsedMs: number): string {
  return formatClock(SERVICE_START_MS + elapsedMs);
}

export function ticketAgeSeconds(
  baseAgeMinutes: number,
  elapsedMs: number,
): number {
  return baseAgeMinutes * 60 + Math.floor(elapsedMs / 1000);
}

export function formatTicketAge(
  baseAgeMinutes: number,
  elapsedMs: number,
): string {
  const totalSeconds = ticketAgeSeconds(baseAgeMinutes, elapsedMs);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${pad(seconds)}`;
}

export function formatDuration(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.ceil(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${pad(seconds)}`;
}

export function incidentRemainingMs(state: KitchenState): number | null {
  if (!state.incident) {
    return null;
  }

  const elapsedSinceReport = state.elapsedMs - state.incident.reportedAtElapsedMs;
  const durationMs = state.incident.durationMinutes * 60 * 1000;
  return Math.max(0, durationMs - elapsedSinceReport);
}

export function advanceClock(state: KitchenState, ms: number): KitchenState {
  if (ms <= 0) {
    return state;
  }

  return {
    ...state,
    elapsedMs: state.elapsedMs + ms,
  };
}
