import { expect, test, type Page } from "@playwright/test";
import { seededUser, uniqueLabel } from "./helpers/waiagents";

test("live smoke flow with screenshots: auth, chat, agents, feed, pages, marketplace, settings", async ({
  page
}, testInfo) => {
  const alex = seededUser("alex");
  const groupTitle = uniqueLabel("pw-group");
  const messageText = uniqueLabel("pw-message");
  const agentName = uniqueLabel("pw-agent");
  const pageTitle = uniqueLabel("pw-page");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "WaiAgents" })).toBeVisible();
  await capture(page, testInfo, "01-auth");

  await loginThroughUi(page, alex.email, alex.password);
  await expect(page.getByLabel("web-app-shell")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Chats" })).toBeVisible();
  await capture(page, testInfo, "02-chat-home");

  await page.getByTitle("New conversation").click();
  const newConversationModal = page.locator(".cv-modal").filter({
    has: page.getByRole("heading", { name: "New Conversation" })
  });
  await expect(newConversationModal).toBeVisible();
  await newConversationModal.getByRole("button", { name: "Group", exact: true }).click();
  await newConversationModal.getByPlaceholder("Group title...").fill(groupTitle);
  await newConversationModal.getByRole("button", { name: "Create Group", exact: true }).click();
  await expect(page.getByRole("heading", { name: groupTitle })).toBeVisible({ timeout: 15_000 });

  await page.getByPlaceholder("Type a message...").fill(messageText);
  await page.getByTitle("Send message").click();
  await expect(page.locator("[data-message-id]").filter({ hasText: messageText }).first()).toBeVisible();
  await capture(page, testInfo, "03-group-chat");

  await page.getByRole("button", { name: "Agents" }).click();
  await expect(page.getByLabel("agent-builder-view")).toBeVisible();
  await page.getByRole("button", { name: "+ New" }).click();
  await expect(page.getByLabel("agent-form")).toBeVisible();
  await page.getByLabel("Name").fill(agentName);
  await page.getByLabel("Description").fill("Playwright live smoke agent");
  await page.locator(".ab-system-prompt").fill("You are a concise assistant used for end-to-end smoke tests.");
  await page.getByRole("button", { name: "Create Agent" }).click();
  await expect(page.getByText(agentName)).toBeVisible({ timeout: 15_000 });
  await capture(page, testInfo, "04-agent-created");

  await page.getByRole("button", { name: "Test Agent" }).click();
  const sandbox = page.getByLabel("agent-test-sandbox");
  await expect(sandbox).toBeVisible();

  const sandboxPrompt = "Reply with a short confirmation.";
  await sandbox.getByPlaceholder("Type a test message...").fill(sandboxPrompt);
  await sandbox.getByRole("button", { name: "Send" }).click();

  const userMessage = sandbox.locator(".ab-sandbox-msg-user").last();
  await expect(userMessage.getByText("You", { exact: true })).toBeVisible();
  await expect(userMessage.getByText(sandboxPrompt, { exact: true })).toBeVisible();

  const agentReply = sandbox.locator(".ab-sandbox-msg-agent .ab-sandbox-msg-text").last();
  await expect(agentReply).toBeVisible({ timeout: 45_000 });
  await expect(agentReply).toContainText(/\S+/);
  await capture(page, testInfo, "05-agent-sandbox");

  await page.getByRole("button", { name: "Feed" }).click();
  await expect(page.getByLabel("feed-module")).toBeVisible();
  await expect(page.locator(".feed-card-polished").first()).toBeVisible();
  await page.locator(".feed-card-polished").first().click();
  await expect(page.getByRole("button", { name: "Like" }).or(page.getByRole("button", { name: "Liked" })).first()).toBeVisible();
  await capture(page, testInfo, "06-feed");

  await page.getByRole("button", { name: "Pages" }).click();
  await expect(page.getByLabel("pages-module")).toBeVisible();
  const pagesUnavailable = page.getByText("Pages are not available on the active public API deployment.");
  const loadingSkeleton = page.getByLabel("loading-skeleton");

  await Promise.race([
    pagesUnavailable.waitFor({ state: "visible", timeout: 10_000 }),
    loadingSkeleton.waitFor({ state: "hidden", timeout: 10_000 })
  ]).catch(() => undefined);

  const pagesSupported = !(await pagesUnavailable.isVisible().catch(() => false));

  if (pagesSupported) {
    await page.getByRole("button", { name: "Create Page" }).click();
    await page.getByLabel("pages-module").getByLabel("Title").fill(pageTitle);
    await page.getByLabel("pages-module").getByLabel("Slug").fill(pageTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    await page.getByLabel("pages-module").getByRole("button", { name: "Create" }).click();
    await expect(page.getByText(`Created page "${pageTitle}"`)).toBeVisible({ timeout: 15_000 });
  }
  await capture(page, testInfo, "07-pages");

  await page.getByRole("button", { name: "Marketplace" }).click();
  await expect(page.getByLabel("marketplace-module")).toBeVisible();
  await expect(page.getByLabel("agent-profile-panel")).toBeVisible();
  await capture(page, testInfo, "08-marketplace");

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByLabel("settings-module")).toBeVisible();
  await expect(page.getByText("Profile")).toBeVisible();
  await capture(page, testInfo, "09-settings");
});

async function loginThroughUi(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.locator("form").getByRole("button", { name: "Log In" }).click();
}

async function capture(page: Page, testInfo: { outputPath: (name: string) => string }, name: string) {
  await page.screenshot({
    path: testInfo.outputPath(`${name}.png`),
    fullPage: true
  });
}
