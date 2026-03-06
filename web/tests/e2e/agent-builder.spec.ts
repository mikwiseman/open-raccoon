import { expect, test, type Page } from "@playwright/test";
import { seededUser, uniqueLabel } from "./helpers/waiagents";

async function loginThroughUi(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

test.describe("Agent Builder", () => {
  let agentName: string;
  let agentSlug: string;

  test.beforeEach(async ({ page }) => {
    agentName = uniqueLabel("test-agent");
    agentSlug = agentName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const alex = seededUser("alex");
    await page.goto("/");
    await loginThroughUi(page, alex.email, alex.password);

    // Wait for app to load
    await expect(page.getByLabel("web-app-shell")).toBeVisible({ timeout: 15_000 });
  });

  test("navigate to Agents tab", async ({ page }) => {
    await page.getByRole("button", { name: "Agents" }).click();
    await expect(page.getByLabel("agent-builder-view")).toBeVisible();
    await expect(page.getByText("My Agents")).toBeVisible();
  });

  test("create a new agent", async ({ page }) => {
    await page.getByRole("button", { name: "Agents" }).click();
    await expect(page.getByLabel("agent-builder-view")).toBeVisible();

    // Click New button
    await page.getByRole("button", { name: "+ New" }).click();
    await expect(page.getByLabel("agent-form")).toBeVisible();

    // Fill basic info
    await page.getByLabel("Name").fill(agentName);
    await expect(page.getByLabel("Slug")).toHaveValue(agentSlug);

    await page.getByLabel("Description").fill("A test agent created by Playwright");

    // Fill system prompt
    await page.locator(".ab-system-prompt").fill("You are a helpful test assistant.");

    // Check that character count updates
    await expect(page.getByText("characters")).toBeVisible();

    // Submit form
    await page.getByRole("button", { name: "Create Agent" }).click();

    // Agent should appear in the sidebar list
    await expect(page.getByLabel(`agent-card-${agentSlug}`)).toBeVisible({ timeout: 10_000 });
  });

  test("edit an existing agent", async ({ page }) => {
    await page.getByRole("button", { name: "Agents" }).click();
    await expect(page.getByLabel("agent-builder-view")).toBeVisible();

    // If there are agents, click the first one
    const cards = page.locator(".ab-agent-card");
    const count = await cards.count();
    if (count > 0) {
      await cards.first().click();
      await expect(page.getByLabel("agent-form")).toBeVisible();
      await expect(page.getByRole("button", { name: "Update Agent" })).toBeVisible();
    }
  });

  test("model selector shows options", async ({ page }) => {
    await page.getByRole("button", { name: "Agents" }).click();
    await page.getByRole("button", { name: "+ New" }).click();

    const modelSelect = page.getByLabel("Model");
    await expect(modelSelect).toBeVisible();

    const options = await modelSelect.locator("option").allTextContents();
    expect(options).toContain("Claude Sonnet 4");
    expect(options).toContain("GPT-4o");
  });

  test("visibility selector shows three options", async ({ page }) => {
    await page.getByRole("button", { name: "Agents" }).click();
    await page.getByRole("button", { name: "+ New" }).click();

    await expect(page.getByLabel("visibility-selector")).toBeVisible();
    await expect(page.getByText("Public")).toBeVisible();
    await expect(page.getByText("Unlisted")).toBeVisible();
    await expect(page.getByText("Private")).toBeVisible();
  });

  test("tool configurator toggles tools", async ({ page }) => {
    await page.getByRole("button", { name: "Agents" }).click();
    await page.getByRole("button", { name: "+ New" }).click();

    await expect(page.getByLabel("tool-configurator")).toBeVisible();

    // Toggle memory tool
    const memoryCheckbox = page.getByLabel("tool-configurator").getByText("memory").locator("..").locator("input[type=checkbox]");
    await memoryCheckbox.check();
    await expect(memoryCheckbox).toBeChecked();

    await memoryCheckbox.uncheck();
    await expect(memoryCheckbox).not.toBeChecked();
  });

  test("MCP server form opens and closes", async ({ page }) => {
    await page.getByRole("button", { name: "Agents" }).click();
    await page.getByRole("button", { name: "+ New" }).click();

    await page.getByRole("button", { name: "+ Add Server" }).click();
    await expect(page.getByLabel("mcp-server-form")).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).first().click();
  });

  test("system prompt variable insertion", async ({ page }) => {
    await page.getByRole("button", { name: "Agents" }).click();
    await page.getByRole("button", { name: "+ New" }).click();

    const promptArea = page.locator(".ab-system-prompt");
    await promptArea.fill("Hello ");
    await promptArea.click();

    // Click variable button
    await page.getByRole("button", { name: "User Name" }).click();

    await expect(promptArea).toHaveValue(/\{\{user\.name\}\}/);
  });
});
