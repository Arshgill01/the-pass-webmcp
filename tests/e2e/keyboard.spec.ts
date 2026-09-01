import { expect, test } from "@playwright/test";
import { collectPageFaults } from "./helpers";

test("keyboard can report the incident, lock Table 12, and reset", async ({
  page,
}) => {
  const faults = collectPageFaults(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Report fryer unavailable" }).press("Enter");
  await expect(page.getByText(/Fryer unavailable/)).toBeVisible();

  const lock = page.getByRole("button", { name: "Keep Table 12 together" });
  await lock.focus();
  await expect(lock).toBeFocused();
  await page.keyboard.press("Space");
  await expect(lock).toHaveAttribute("aria-pressed", "true");

  const fries = page
    .getByRole("region", { name: "Fryer station" })
    .getByRole("button", { name: "Hold" })
    .first();
  await fries.press("Enter");
  await expect(page.getByText(/Hold ticket-181/)).toBeVisible();

  await page.getByRole("button", { name: "Reset Demo" }).press("Enter");
  await expect(page.getByRole("button", { name: "Report fryer unavailable" })).toBeEnabled();
  expect(faults, faults.join("\n")).toEqual([]);
});
