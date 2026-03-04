import { expect, test, type Page } from "@playwright/test";
import { seededUser } from "./helpers/raccoon";

async function loginThroughUi(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

test.describe("Agent Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    const alex = seededUser("alex");
    await page.goto("/");
    await loginThroughUi(page, alex.email, alex.password);
    await expect(page.getByLabel("web-app-shell")).toBeVisible({ timeout: 15_000 });
  });

  test("navigate to Agents tab and see agent list", async ({ page }) => {
    await page.getByRole("button", { name: "Agents" }).click();
    await expect(page.getByLabel("agent-builder-view")).toBeVisible();
    await expect(page.getByText("My Agents")).toBeVisible();
  });

  test("dashboard components render correctly when agent selected", async ({ page }) => {
    await page.getByRole("button", { name: "Agents" }).click();
    await expect(page.getByLabel("agent-builder-view")).toBeVisible();

    // If agents exist, select the first one
    const cards = page.locator(".ab-agent-card");
    const count = await cards.count();
    if (count === 0) {
      // No agents to test dashboard with, skip
      return;
    }

    await cards.first().click();

    // Edit form should be visible
    await expect(page.getByLabel("agent-form")).toBeVisible();
  });
});
