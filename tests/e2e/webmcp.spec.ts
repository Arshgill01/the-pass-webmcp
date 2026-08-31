import { expect, test } from "@playwright/test";

test("mock WebMCP runtime covers read, stale write, reinspect, validate, and teardown", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const tools = new Map<
      string,
      { name: string; execute: (input?: unknown) => unknown }
    >();
    const modelContext = {
      registerTool: async (
        tool: { name: string; execute: (input?: unknown) => unknown },
        options?: { signal?: AbortSignal },
      ) => {
        tools.set(tool.name, tool);
        options?.signal?.addEventListener("abort", () => {
          if (tools.get(tool.name) === tool) {
            tools.delete(tool.name);
          }
        });
      },
    };
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: modelContext,
    });
    (
      window as unknown as {
        __WEBMCP_TOOLS__: typeof tools;
      }
    ).__WEBMCP_TOOLS__ = tools;
  });

  await page.goto("/");
  await expect(page.getByText("WebMCP live")).toBeVisible();
  await page.waitForFunction(() =>
    (
      window as unknown as { __WEBMCP_TOOLS__?: Map<string, unknown> }
    ).__WEBMCP_TOOLS__?.has("inspect_service_state"),
  );

  const runningTools = await page.evaluate(() =>
    Array.from(
      (window as unknown as { __WEBMCP_TOOLS__: Map<string, unknown> })
        .__WEBMCP_TOOLS__.keys(),
    ),
  );
  expect(runningTools).toEqual(["inspect_service_state", "inspect_ticket"]);

  await page.getByRole("button", { name: "Report fryer unavailable" }).click();
  await page.waitForFunction(() =>
    (
      window as unknown as { __WEBMCP_TOOLS__?: Map<string, unknown> }
    ).__WEBMCP_TOOLS__?.has("stage_ticket_hold"),
  );

  const inspect = await page.evaluate(async () => {
    const tool = (
      window as unknown as {
        __WEBMCP_TOOLS__: Map<string, { execute: () => unknown }>;
      }
    ).__WEBMCP_TOOLS__.get("inspect_service_state");
    return tool?.execute();
  });
  expect(inspect).toMatchObject({
    status: "ok",
    stateVersion: 2,
  });

  const accepted = await page.evaluate(async () => {
    const tool = (
      window as unknown as {
        __WEBMCP_TOOLS__: Map<
          string,
          { execute: (input: unknown) => unknown }
        >;
      }
    ).__WEBMCP_TOOLS__.get("stage_ticket_hold");
    return tool?.execute({
      ticketId: "ticket-181",
      expectedVersion: 2,
      reason: "Hold fries because the fryer is down.",
    });
  });
  expect(accepted).toMatchObject({ status: "accepted", stateVersion: 3 });

  await page.getByRole("button", { name: "Keep Table 12 together" }).click();

  const stale = await page.evaluate(async () => {
    const tool = (
      window as unknown as {
        __WEBMCP_TOOLS__: Map<
          string,
          { execute: (input: unknown) => unknown }
        >;
      }
    ).__WEBMCP_TOOLS__.get("stage_ticket_hold");
    return tool?.execute({
      ticketId: "ticket-185",
      expectedVersion: 3,
      reason: "Late hold after the human lock.",
    });
  });
  expect(stale).toMatchObject({
    status: "rejected_stale",
    nextActions: ["inspect_service_state"],
  });
  await expect(page.getByText("OUTDATED — NOT APPLIED").first()).toBeVisible();

  const reinspect = await page.evaluate(async () => {
    const tool = (
      window as unknown as {
        __WEBMCP_TOOLS__: Map<string, { execute: () => unknown }>;
      }
    ).__WEBMCP_TOOLS__.get("inspect_service_state");
    return tool?.execute();
  });
  expect(reinspect).toMatchObject({
    status: "ok",
    stateVersion: 4,
  });

  await page.evaluate(async () => {
    const hold = (
      window as unknown as {
        __WEBMCP_TOOLS__: Map<
          string,
          { execute: (input: unknown) => unknown }
        >;
      }
    ).__WEBMCP_TOOLS__.get("stage_ticket_hold");
    await hold?.execute({
      ticketId: "ticket-185",
      expectedVersion: 4,
      reason: "Hold potatoes after reinspect.",
    });
  });

  await page.getByRole("button", { name: "Validate plan" }).click();
  await expect(page.getByText(/Not valid for v/)).toBeVisible();

  await page.getByRole("button", { name: "Reset Demo" }).click();
  await expect(page.getByText("v1", { exact: true })).toBeVisible();
  await page.waitForFunction(
    () =>
      Array.from(
        (
          window as unknown as { __WEBMCP_TOOLS__?: Map<string, unknown> }
        ).__WEBMCP_TOOLS__?.keys() ?? [],
      ).join(",") === "inspect_service_state,inspect_ticket",
  );

  const afterReset = await page.evaluate(() =>
    Array.from(
      (window as unknown as { __WEBMCP_TOOLS__: Map<string, unknown> })
        .__WEBMCP_TOOLS__.keys(),
    ),
  );
  expect(afterReset).toEqual(["inspect_service_state", "inspect_ticket"]);
});
