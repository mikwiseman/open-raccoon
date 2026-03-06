import { expect, test, type Page } from "@playwright/test";
import { seededUser } from "./helpers/waiagents";

async function loginThroughUi(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

test.describe("Integration Settings", () => {
  test.beforeEach(async ({ page }) => {
    const alex = seededUser("alex");
    await page.goto("/");
    await loginThroughUi(page, alex.email, alex.password);
    await expect(page.getByLabel("web-app-shell")).toBeVisible({ timeout: 15_000 });
  });

  test("navigate to Settings tab", async ({ page }) => {
    await page.getByRole("button", { name: "Settings" }).click();
    // The settings view should be visible with profile section
    await expect(page.getByText("Profile")).toBeVisible();
  });

  test("agents tab is accessible from navigation", async ({ page }) => {
    // Verify the Agents tab exists in the nav
    const agentsButton = page.getByRole("button", { name: "Agents" });
    await expect(agentsButton).toBeVisible();
    await agentsButton.click();
    await expect(page.getByLabel("agent-builder-view")).toBeVisible();
  });

  test("all main navigation tabs exist", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Chats" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Agents" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Feed" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pages" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Marketplace" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
  });

  test("can navigate between all tabs", async ({ page }) => {
    // Agents
    await page.getByRole("button", { name: "Agents" }).click();
    await expect(page.getByLabel("agent-builder-view")).toBeVisible();

    // Feed
    await page.getByRole("button", { name: "Feed" }).click();
    await expect(page.getByRole("heading", { name: "Feed" })).toBeVisible();

    // Marketplace
    await page.getByRole("button", { name: "Marketplace" }).click();
    await expect(page.getByRole("heading", { name: "Marketplace" })).toBeVisible();

    // Settings
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByText("Profile")).toBeVisible();

    // Back to Chats
    await page.getByRole("button", { name: "Chats" }).click();
    await expect(page.getByRole("heading", { name: "Chats" })).toBeVisible();
  });
});
