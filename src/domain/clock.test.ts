import {
  advanceClock,
  formatServiceTime,
  formatTicketAge,
  incidentRemainingMs,
} from "./clock";
import { applyCommand } from "./commands";
import { createCanonicalState } from "./state";

describe("deterministic service clock", () => {
  it("opens Friday service at 19:42:18", () => {
    expect(formatServiceTime(0)).toBe("19:42:18");
  });

  it("formats ticket ages from fixture minutes plus elapsed time", () => {
    expect(formatTicketAge(11, 0)).toBe("11:00");
    expect(formatTicketAge(11, 5000)).toBe("11:05");
    expect(formatTicketAge(14, 60_000)).toBe("15:00");
  });

  it("advances elapsed time without changing versioned kitchen facts", () => {
    const start = createCanonicalState();
    const moved = advanceClock(start, 12_000);

    expect(moved.elapsedMs).toBe(12_000);
    expect(moved.version).toBe(start.version);
    expect(moved.tickets).toEqual(start.tickets);
    expect(formatServiceTime(moved.elapsedMs)).toBe("19:42:30");
  });

  it("counts down the 12-minute fryer window from the report timestamp", () => {
    const reported = applyCommand(createCanonicalState(), {
      type: "REPORT_FRYER_INCIDENT",
      expectedVersion: 1,
      actor: "human",
    }).state;
    const later = advanceClock(reported, 90_000);

    expect(incidentRemainingMs(later)).toBe(12 * 60 * 1000 - 90_000);
  });
});
