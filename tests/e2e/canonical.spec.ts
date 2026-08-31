import { expect, test, type Page } from "@playwright/test";

async function agent(page: Page, command: Record<string, unknown>) {
  return page.evaluate((nextCommand) => {
    const api = window.__THE_PASS__;
    if (!api) {
      throw new Error("window.__THE_PASS__ is missing");
    }
    return api.dispatch(nextCommand as never);
  }, command);
}

async function versionOf(page: Page): Promise<number> {
  return page.evaluate(() => {
    const api = window.__THE_PASS__;
    if (!api) {
      throw new Error("window.__THE_PASS__ is missing");
    }
    return api.getState().version;
  });
}

async function agentNow(
  page: Page,
  command: Record<string, unknown>,
) {
  const expectedVersion = await versionOf(page);
  return agent(page, { ...command, expectedVersion });
}

async function runCanonicalJourney(page: Page) {
  await page.getByRole("button", { name: "Reset Demo" }).click();
  await expect(page.getByText("v1", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Report fryer unavailable" }).click();
  await expect(page.getByText(/Fryer unavailable/)).toBeVisible();

  const holdFries = await agentNow(page, {
    type: "STAGE_HOLD",
    ticketId: "ticket-181",
    reason: "Shoestring fries have no alternative station.",
    actor: "agent",
  });
  expect(holdFries).toMatchObject({ status: "accepted" });

  const holdPotatoes = await agentNow(page, {
    type: "STAGE_HOLD",
    ticketId: "ticket-185",
    reason: "Hold potatoes while grill capacity is assessed.",
    actor: "agent",
  });
  expect(holdPotatoes).toMatchObject({ status: "accepted" });

  const prioritize = await agentNow(page, {
    type: "STAGE_PRIORITY",
    ticketId: "ticket-187",
    priority: "urgent",
    reason: "Keep the sandwich moving during the fryer outage.",
    actor: "agent",
  });
  expect(prioritize).toMatchObject({ status: "accepted" });

  const versionBeforeLock = await versionOf(page);
  await page.getByRole("button", { name: "Keep Table 12 together" }).click();
  await expect(
    page.getByRole("button", { name: "Keep Table 12 together" }),
  ).toHaveAttribute("aria-pressed", "true");

  const stale = await agent(page, {
    type: "STAGE_REROUTE",
    ticketId: "ticket-185",
    targetStationId: "grill",
    expectedVersion: versionBeforeLock,
    reason: "Late reroute of potatoes.",
    actor: "agent",
  });
  expect(stale).toMatchObject({ status: "rejected_stale" });
  await expect(page.getByText("OUTDATED — NOT APPLIED").first()).toBeVisible();
  await expect(page.getByText("Human change: Table 12 must stay together.")).toBeVisible();
  await expect(page.getByText("Next: inspect_service_state")).toBeVisible();

  const potatoesAction = await page.evaluate(() =>
    window.__THE_PASS__?.getState().stagedActions.find(
      (action) => action.ticketId === "ticket-185",
    ),
  );
  expect(potatoesAction?.id).toBeTruthy();

  await agentNow(page, {
    type: "UNDO_STAGED_ACTION",
    actionId: potatoesAction!.id,
    reason: "Holding potatoes would split Table 12 from the steak.",
    actor: "agent",
  });
  await agentNow(page, {
    type: "STAGE_REROUTE",
    ticketId: "ticket-185",
    targetStationId: "grill",
    reason: "Reroute crispy potatoes to grill so Table 12 stays together.",
    actor: "agent",
  });
  const validated = await agentNow(page, {
    type: "VALIDATE_RECOVERY",
    actor: "agent",
  });
  expect(validated).toMatchObject({ status: "accepted" });

  await expect(page.getByText(/Valid for v/)).toBeVisible();
  await page.getByRole("button", { name: "Approve recovery" }).click();
  await expect(page.getByText(/Committed receipt/)).toBeVisible();
  await expect(page.getByText(/Recovery committed/)).toBeVisible();
}

test("renders the live board from the canonical fixture", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("The Pass");
  await expect(page.getByRole("heading", { name: "The Pass" })).toBeVisible();
  await expect(page.locator("article.ticket")).toHaveCount(6);
  await expect(page.getByRole("button", { name: "Approve recovery" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Reset Demo" })).toBeVisible();
});

test("canonical stale-plan journey", async ({ page }) => {
  await page.goto("/");
  await runCanonicalJourney(page);
});

test("canonical journey resets cleanly ten times", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");

  for (let index = 0; index < 10; index += 1) {
    await runCanonicalJourney(page);
  }

  await page.getByRole("button", { name: "Reset Demo" }).click();
  await expect(page.getByText("v1", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Report fryer unavailable" })).toBeEnabled();
  await expect(page.locator("article.ticket")).toHaveCount(6);
});
