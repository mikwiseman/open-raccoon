import { describe, it, expect, vi } from "vitest";

// Mock dependencies so we can import SITE_PROMPT
vi.mock("@wai/core", () => ({
  config: { anthropicApiKey: "", cloudflareApiToken: "", cloudflareAccountId: "" },
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({ messages: { create: vi.fn() } })),
}));

import { generateSlug } from "../site-builder.js";

describe("generateSlug", () => {
  it("generates slug from English name", () => {
    expect(generateSlug("My Cafe")).toBe("my-cafe");
  });

  it("transliterates Russian", () => {
    expect(generateSlug("Кафе Рассвет")).toBe("kafe-rassvet");
  });

  it("handles mixed languages", () => {
    const slug = generateSlug("Кафе Coffee");
    expect(slug).toContain("kafe");
    expect(slug).toContain("coffee");
  });

  it("removes special characters", () => {
    const slug = generateSlug("Café & Bar #1!");
    expect(slug).not.toContain("&");
    expect(slug).not.toContain("#");
  });

  it("collapses multiple dashes", () => {
    expect(generateSlug("My   Big   Cafe")).not.toContain("--");
  });

  it("limits to 50 chars", () => {
    expect(generateSlug("A".repeat(100)).length).toBeLessThanOrEqual(50);
  });

  it("handles empty string", () => {
    const slug = generateSlug("");
    expect(slug).toBeTruthy();
    expect(slug.startsWith("site-")).toBe(true);
  });

  it("trims dashes", () => {
    const slug = generateSlug("--hello--");
    expect(slug).not.toMatch(/^-/);
    expect(slug).not.toMatch(/-$/);
  });

  it("transliterates Cyrillic correctly", () => {
    expect(generateSlug("Жизнь")).toContain("zh");
    expect(generateSlug("Шоколад")).toContain("sh");
    expect(generateSlug("Чай")).toContain("ch");
  });

  it("preserves numbers", () => {
    expect(generateSlug("Cafe 42")).toContain("42");
  });

  it("produces URL-safe slugs", () => {
    const slug = generateSlug("Test / Site @ 2026");
    expect(slug).not.toContain("/");
    expect(slug).not.toContain("@");
    expect(slug).not.toContain(" ");
  });
});
