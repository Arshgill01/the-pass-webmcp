import { expect, test } from "@playwright/test";
import {
  assertNoHumanOnlyTools,
  callTool,
  collectPageFaults,
  installWebMcpHost,
  toolNames,
  waitForTool,
} from "./helpers";

test("Chrome WebMCP host covers read, stale write, reinspect, validate, receipt, and teardown", async ({
  page,
}) => {
  const faults = collectPageFaults(page);
  await installWebMcpHost(page, "document");
  await page.goto("/");
  await expect(page.getByText("WebMCP live")).toBeVisible();
  await waitForTool(page, "inspect_service_state");

  const running = await toolNames(page);
  expect(running).toEqual(["inspect_service_state", "inspect_ticket"]);
  assertNoHumanOnlyTools(running);

  await page.getByRole("button", { name: "Report fryer unavailable" }).click();
  await waitForTool(page, "stage_ticket_hold");
  assertNoHumanOnlyTools(await toolNames(page));

  const inspect = await callTool(page, "inspect_service_state");
  expect(inspect).toMatchObject({ status: "ok", stateVersion: 2 });

  const ticket = await callTool(page, "inspect_ticket", {
    ticketId: "ticket-181",
  });
  expect(ticket).toMatchObject({
    status: "ok",
    ticket: { id: "ticket-181", stationId: "fryer" },
  });

  const accepted = await callTool(page, "stage_ticket_hold", {
    ticketId: "ticket-181",
    expectedVersion: 2,
    reason: "Hold fries because the fryer is down.",
  });
  expect(accepted).toMatchObject({ status: "accepted", stateVersion: 3 });

  await waitForTool(page, "undo_staged_action");

  const secondHold = await callTool(page, "stage_ticket_hold", {
    ticketId: "ticket-185",
    expectedVersion: 3,
    reason: "Hold potatoes while grill capacity is assessed.",
  });
  expect(secondHold).toMatchObject({ status: "accepted" });

  const priority = await callTool(page, "stage_ticket_priority", {
    ticketId: "ticket-187",
    priority: "urgent",
    expectedVersion: 4,
    reason: "Keep the sandwich moving during the fryer outage.",
  });
  expect(priority).toMatchObject({ status: "accepted" });

  await page.getByRole("button", { name: "Keep Table 12 together" }).click();

  const stale = await callTool(page, "stage_ticket_reroute", {
    ticketId: "ticket-185",
    targetStationId: "grill",
    expectedVersion: 4,
    reason: "Late reroute after the human lock.",
  });
  expect(stale).toMatchObject({
    status: "rejected_stale",
    nextActions: ["inspect_service_state"],
  });
  await expect(page.getByText("OUTDATED — NOT APPLIED").first()).toBeVisible();
  await expect(page.getByText("Human change: Table 12 must stay together.")).toBeVisible();

  const reinspect = (await callTool(page, "inspect_service_state")) as {
    stateVersion: number;
    nextActions: string[];
  };
  expect(reinspect.stateVersion).toBeGreaterThan(4);
  expect(reinspect.nextActions).toContain("inspect_service_state");

  const potatoes = await page.evaluate(() =>
    window.__THE_PASS__?.getState().stagedActions.find(
      (action) => action.ticketId === "ticket-185",
    ),
  );
  expect(potatoes?.id).toBeTruthy();

  await callTool(page, "undo_staged_action", {
    actionId: potatoes!.id,
    expectedVersion: reinspect.stateVersion,
    reason: "Holding potatoes would split Table 12 from the steak.",
  });

  const reroute = await callTool(page, "stage_ticket_reroute", {
    ticketId: "ticket-185",
    targetStationId: "grill",
    expectedVersion: await page.evaluate(() => window.__THE_PASS__!.getState().version),
    reason: "Reroute crispy potatoes to grill so Table 12 stays together.",
  });
  expect(reroute).toMatchObject({ status: "accepted" });

  await waitForTool(page, "validate_recovery");
  const validated = await callTool(page, "validate_recovery", {
    expectedVersion: await page.evaluate(() => window.__THE_PASS__!.getState().version),
  });
  expect(validated).toMatchObject({ status: "accepted" });
  await expect(page.getByText(/Valid for v/)).toBeVisible();

  const beforeApprove = await toolNames(page);
  expect(beforeApprove).not.toContain("read_recovery_receipt");
  assertNoHumanOnlyTools(beforeApprove);

  await page.getByRole("button", { name: "Approve recovery" }).click();
  await expect(page.getByText(/Committed receipt/)).toBeVisible();
  await waitForTool(page, "read_recovery_receipt");

  const receipt = await callTool(page, "read_recovery_receipt");
  expect(receipt).toMatchObject({
    status: "ok",
  });

  const committedTools = await toolNames(page);
  expect(committedTools).toEqual([
    "inspect_service_state",
    "inspect_ticket",
    "read_recovery_receipt",
  ]);
  assertNoHumanOnlyTools(committedTools);

  await page.getByRole("button", { name: "Reset Demo" }).click();
  await expect(page.getByText("v1", { exact: true })).toBeVisible();
  await waitForTool(page, "inspect_service_state");
  await page.waitForFunction(
    () =>
      Array.from(window.__WEBMCP_TOOLS__?.keys() ?? []).join(",") ===
      "inspect_service_state,inspect_ticket",
  );
  expect(await toolNames(page)).toEqual([
    "inspect_service_state",
    "inspect_ticket",
  ]);
  expect(faults, faults.join("\n")).toEqual([]);
});

test("navigator.modelContext fallback registers the same inspect tools", async ({
  page,
}) => {
  await installWebMcpHost(page, "navigator");
  await page.goto("/");
  await expect(page.getByText("WebMCP live")).toBeVisible();
  await waitForTool(page, "inspect_service_state");
  const inspect = await callTool(page, "inspect_service_state");
  expect(inspect).toMatchObject({ status: "ok", stateVersion: 1 });
});
