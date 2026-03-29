import { describe, it, expect, vi } from "vitest";

vi.mock("@wai/core", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { extractBuildContext, buildRichDescription, type ConversationContext } from "../context.js";

describe("extractBuildContext", () => {
  it("extracts business name from quoted text", () => {
    const ctx = extractBuildContext([
      { role: "user", content: 'My cafe is called "Sunrise Coffee"' },
    ], "build me a site");
    expect(ctx.businessName).toBe("Sunrise Coffee");
  });

  it("extracts business name from Russian quotes", () => {
    const ctx = extractBuildContext([
      { role: "user", content: "Наше кафе называется «Рассвет»" },
    ], "сделай сайт");
    expect(ctx.businessName).toBe("Рассвет");
  });

  it("extracts business type (cafe)", () => {
    const ctx = extractBuildContext([
      { role: "user", content: "I have a small cafe downtown" },
    ], "build a site");
    expect(ctx.businessType).toBe("cafe");
  });

  it("extracts business type (Russian restaurant)", () => {
    const ctx = extractBuildContext([
      { role: "user", content: "У нас ресторан итальянской кухни" },
    ], "сделай сайт");
    expect(ctx.businessType).toBe("restaurant");
  });

  it("extracts products from list", () => {
    const ctx = extractBuildContext([
      { role: "user", content: "We have coffee, pastries, and sandwiches" },
    ], "build a site");
    expect(ctx.products.length).toBeGreaterThan(0);
    expect(ctx.products.some((p) => p.includes("coffee"))).toBe(true);
  });

  it("extracts email from conversation", () => {
    const ctx = extractBuildContext([
      { role: "user", content: "Our email is hello@sunrise.cafe" },
    ], "build a site");
    expect(ctx.contactInfo.some((c) => c.includes("@"))).toBe(true);
  });

  it("extracts phone from conversation", () => {
    const ctx = extractBuildContext([
      { role: "user", content: "Call us at +1 555-123-4567" },
    ], "build a site");
    expect(ctx.contactInfo.some((c) => /\d{3}/.test(c))).toBe(true);
  });

  it("extracts color preference", () => {
    const ctx = extractBuildContext([
      { role: "user", content: "I want color: dark green" },
    ], "build");
    expect(ctx.colorPreferences).toContain("dark green");
  });

  it("extracts style preference", () => {
    const ctx = extractBuildContext([
      { role: "user", content: "Our style: minimalist and clean" },
    ], "build");
    expect(ctx.stylePreferences).toContain("minimalist");
  });

  it("detects Russian language", () => {
    const ctx = extractBuildContext([
      { role: "user", content: "Привет, у нас кафе" },
    ], "сделай сайт");
    expect(ctx.language).toBe("ru");
  });

  it("detects English language", () => {
    const ctx = extractBuildContext([
      { role: "user", content: "Hello, we have a cafe" },
    ], "build me a site");
    expect(ctx.language).toBe("en");
  });

  it("extracts keywords", () => {
    const ctx = extractBuildContext([
      { role: "user", content: "Sunrise Coffee is the best place in Manhattan" },
    ], "build");
    expect(ctx.keywords.length).toBeGreaterThan(0);
  });

  it("generates rich description", () => {
    const ctx = extractBuildContext([
      { role: "user", content: 'We have a cafe called "Sunrise". We sell coffee and pastries.' },
    ], "build me a site");
    expect(ctx.richDescription).toContain("build me a site");
    expect(ctx.richDescription).toContain("Sunrise");
  });

  it("handles empty history", () => {
    const ctx = extractBuildContext([], "Build a portfolio site");
    expect(ctx.language).toBe("en");
    expect(ctx.richDescription).toContain("portfolio");
  });

  it("uses last 10 messages only", () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      role: "user" as const,
      content: `Message ${i}`,
    }));
    const ctx = extractBuildContext(history, "build");
    // Should not crash, and should process
    expect(ctx).toBeDefined();
  });
});

describe("buildRichDescription", () => {
  it("includes original message", () => {
    const ctx: ConversationContext = {
      keywords: [], language: "en", richDescription: "",
      products: [], features: [], contactInfo: [],
    };
    const desc = buildRichDescription(ctx, "Build my cafe site");
    expect(desc).toContain("Build my cafe site");
  });

  it("appends business name", () => {
    const ctx: ConversationContext = {
      businessName: "Sunrise", keywords: [], language: "en",
      richDescription: "", products: [], features: [], contactInfo: [],
    };
    const desc = buildRichDescription(ctx, "Build site");
    expect(desc).toContain("Sunrise");
  });

  it("appends products", () => {
    const ctx: ConversationContext = {
      products: ["coffee", "pastries"], keywords: [], language: "en",
      richDescription: "", features: [], contactInfo: [],
    };
    const desc = buildRichDescription(ctx, "Build site");
    expect(desc).toContain("coffee");
    expect(desc).toContain("pastries");
  });

  it("appends contact info", () => {
    const ctx: ConversationContext = {
      contactInfo: ["hello@test.com"], keywords: [], language: "en",
      richDescription: "", products: [], features: [],
    };
    const desc = buildRichDescription(ctx, "Build site");
    expect(desc).toContain("hello@test.com");
  });

  it("does not duplicate business name if in message", () => {
    const ctx: ConversationContext = {
      businessName: "Sunrise", keywords: [], language: "en",
      richDescription: "", products: [], features: [], contactInfo: [],
    };
    const desc = buildRichDescription(ctx, "Build site for Sunrise");
    // Should contain Sunrise only once (from message, not appended again)
    const count = (desc.match(/Sunrise/g) ?? []).length;
    expect(count).toBe(1);
  });
});
