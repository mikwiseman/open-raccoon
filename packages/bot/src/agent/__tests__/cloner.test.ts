import { describe, it, expect, vi } from "vitest";

vi.mock("@wai/core", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  extractUrls, isCloneRequest,
  analyzeReferenceUrl, analysisToSitePlan, buildClonePromptHints,
} from "../cloner.js";

describe("extractUrls", () => {
  it("extracts full URLs", () => {
    const urls = extractUrls("Check out https://example.com and https://airbnb.com/homes");
    expect(urls).toContain("https://example.com");
    expect(urls).toContain("https://airbnb.com/homes");
  });

  it("extracts bare domains", () => {
    const urls = extractUrls("Make it like airbnb.com but for my cafe");
    expect(urls.some((u) => u.includes("airbnb.com"))).toBe(true);
  });

  it("handles .io .dev .ru domains", () => {
    const devUrls = extractUrls("Like vercel.dev style");
    expect(devUrls.some((u) => u.includes("vercel.dev"))).toBe(true);
    const ruUrls = extractUrls("Как у yandex.ru");
    expect(ruUrls.some((u) => u.includes("yandex.ru"))).toBe(true);
  });

  it("returns empty for no URLs", () => {
    expect(extractUrls("Just a normal message")).toEqual([]);
  });

  it("deduplicates URLs", () => {
    const urls = extractUrls("See https://example.com and https://example.com again");
    expect(urls.filter((u) => u === "https://example.com").length).toBe(1);
  });
});

describe("isCloneRequest", () => {
  it("detects 'like airbnb.com'", () => {
    expect(isCloneRequest("Make a site like airbnb.com for my hotel")).toBe(true);
  });

  it("detects 'similar to stripe.com'", () => {
    expect(isCloneRequest("Create something similar to stripe.com")).toBe(true);
  });

  it("detects 'inspired by'", () => {
    expect(isCloneRequest("Site inspired by https://vercel.com")).toBe(true);
  });

  it("detects Russian 'как у'", () => {
    expect(isCloneRequest("Сделай как у airbnb.com но для кафе")).toBe(true);
  });

  it("detects Russian 'похожий на'", () => {
    expect(isCloneRequest("Похожий на notion.com сайт")).toBe(true);
  });

  it("detects URL + 'but for'", () => {
    expect(isCloneRequest("https://stripe.com but for my startup")).toBe(true);
  });

  it("detects URL + 'но для'", () => {
    expect(isCloneRequest("https://airbnb.com но для моего кафе")).toBe(true);
  });

  it("returns false for regular text", () => {
    expect(isCloneRequest("Build a landing page for my cafe")).toBe(false);
  });

  it("returns false for URL without clone intent", () => {
    // URL alone without clone keywords
    expect(isCloneRequest("Check https://example.com")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isCloneRequest("")).toBe(false);
  });
});

describe("analyzeReferenceUrl", () => {
  it("returns analysis with fallback data on fetch failure", async () => {
    // Will fail to fetch (no real network in tests)
    const analysis = await analyzeReferenceUrl("https://nonexistent-site-12345.invalid");
    expect(analysis.url).toBe("https://nonexistent-site-12345.invalid");
    expect(analysis.sections.length).toBeGreaterThan(0);
    expect(analysis.title).toBeTruthy();
  });

  it("extracts domain as fallback title", async () => {
    // Uses domain extraction since fetch will fail in test env
    const analysis = await analyzeReferenceUrl("https://nonexistent-test-987.invalid/page");
    expect(analysis.title).toBeTruthy();
    expect(analysis.title.length).toBeGreaterThan(0);
  });
});

describe("analysisToSitePlan", () => {
  it("converts analysis to SitePlan", () => {
    const plan = analysisToSitePlan({
      url: "https://example.com",
      title: "Example",
      sections: ["Hero", "Features", "Pricing"],
      colorHints: "Blue primary",
      layoutStyle: "Modern",
      features: ["Contact form", "Dark mode"],
    });

    expect(plan.sections.length).toBe(3);
    expect(plan.sections[0]).toContain("inspired by Example");
    expect(plan.colorScheme).toBe("Blue primary");
    expect(plan.interactiveElements).toContain("Contact form");
    expect(plan.interactiveElements).toContain("Dark mode");
  });

  it("includes default interactive elements", () => {
    const plan = analysisToSitePlan({
      url: "https://x.com", title: "X",
      sections: ["Hero"], colorHints: "", layoutStyle: "", features: [],
    });
    expect(plan.interactiveElements).toContain("Mobile hamburger menu");
    expect(plan.interactiveElements).toContain("Dark mode toggle");
  });

  it("sets complexity based on feature count", () => {
    const simple = analysisToSitePlan({
      url: "https://x.com", title: "X",
      sections: [], colorHints: "", layoutStyle: "", features: ["Form"],
    });
    expect(simple.estimatedComplexity).toBe("medium");

    const complex = analysisToSitePlan({
      url: "https://x.com", title: "X",
      sections: [], colorHints: "", layoutStyle: "",
      features: ["Form", "Carousel", "Pricing", "Dark mode"],
    });
    expect(complex.estimatedComplexity).toBe("complex");
  });
});

describe("buildClonePromptHints", () => {
  it("includes reference URL", () => {
    const hints = buildClonePromptHints({
      url: "https://airbnb.com", title: "Airbnb",
      sections: ["Hero", "Search"], colorHints: "Pink", layoutStyle: "Grid",
      features: ["Search"],
    }, "Hotel booking site");
    expect(hints).toContain("https://airbnb.com");
    expect(hints).toContain("Airbnb");
  });

  it("includes user description", () => {
    const hints = buildClonePromptHints({
      url: "https://x.com", title: "X",
      sections: [], colorHints: "", layoutStyle: "", features: [],
    }, "My cafe website");
    expect(hints).toContain("My cafe website");
  });

  it("includes originality warning", () => {
    const hints = buildClonePromptHints({
      url: "https://x.com", title: "X",
      sections: [], colorHints: "", layoutStyle: "", features: [],
    }, "Test");
    expect(hints).toContain("DESIGN INSPIRATION only");
    expect(hints).toContain("Do NOT copy");
  });

  it("includes detected sections", () => {
    const hints = buildClonePromptHints({
      url: "https://x.com", title: "X",
      sections: ["Hero", "Features", "Pricing"], colorHints: "", layoutStyle: "", features: [],
    }, "Test");
    expect(hints).toContain("Hero, Features, Pricing");
  });
});
