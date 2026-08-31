import { expect, test } from "@playwright/test";

test("renders the canonical scaffold", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("The Pass");
  await expect(page.getByRole("heading", { name: "The Pass" })).toBeVisible();
  await expect(page.locator("article.ticket")).toHaveCount(6);
  await expect(page.getByRole("button", { name: "Approve recovery" })).toBeDisabled();
});
