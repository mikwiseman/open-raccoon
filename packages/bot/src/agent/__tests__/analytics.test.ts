import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@wai/core", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  recordPageView, getSiteStats, clearAnalytics,
  formatStats, generateAnalyticsSnippet,
} from "../analytics.js";
import { injectAnalytics } from "../site-builder.js";

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: vi.fn() },
  })),
}));

beforeEach(() => {
  clearAnalytics("test-site");
});

describe("recordPageView", () => {
  it("records a page view", () => {
    recordPageView("test-site", { path: "/", referrer: "direct", userAgent: "Mozilla/5.0" });
    const stats = getSiteStats("test-site");
    expect(stats.totalViews).toBe(1);
  });

  it("records multiple views", () => {
    recordPageView("test-site", { path: "/", referrer: "direct", userAgent: "Agent1" });
    recordPageView("test-site", { path: "/about", referrer: "google.com", userAgent: "Agent2" });
    recordPageView("test-site", { path: "/", referrer: "direct", userAgent: "Agent1" });
    const stats = getSiteStats("test-site");
    expect(stats.totalViews).toBe(3);
  });
});

describe("getSiteStats", () => {
  it("returns zero stats for unknown slug", () => {
    const stats = getSiteStats("unknown-site");
    expect(stats.totalViews).toBe(0);
    expect(stats.uniqueVisitors).toBe(0);
    expect(stats.lastVisit).toBeNull();
  });

  it("counts unique visitors by user agent", () => {
    recordPageView("test-site", { path: "/", referrer: "direct", userAgent: "Chrome/1" });
    recordPageView("test-site", { path: "/", referrer: "direct", userAgent: "Chrome/1" });
    recordPageView("test-site", { path: "/", referrer: "direct", userAgent: "Firefox/1" });
    const stats = getSiteStats("test-site");
    expect(stats.uniqueVisitors).toBe(2);
  });

  it("counts today views", () => {
    recordPageView("test-site", { path: "/", referrer: "direct", userAgent: "A" });
    const stats = getSiteStats("test-site");
    expect(stats.todayViews).toBe(1); // Just recorded = today
  });

  it("calculates top pages", () => {
    recordPageView("test-site", { path: "/", referrer: "direct", userAgent: "A" });
    recordPageView("test-site", { path: "/", referrer: "direct", userAgent: "B" });
    recordPageView("test-site", { path: "/about", referrer: "direct", userAgent: "A" });
    const stats = getSiteStats("test-site");
    expect(stats.topPages[0].path).toBe("/");
    expect(stats.topPages[0].views).toBe(2);
  });

  it("calculates top referrers", () => {
    recordPageView("test-site", { path: "/", referrer: "google.com", userAgent: "A" });
    recordPageView("test-site", { path: "/", referrer: "google.com", userAgent: "B" });
    recordPageView("test-site", { path: "/", referrer: "twitter.com", userAgent: "C" });
    recordPageView("test-site", { path: "/", referrer: "direct", userAgent: "D" }); // excluded
    const stats = getSiteStats("test-site");
    expect(stats.topReferrers[0].referrer).toBe("google.com");
    expect(stats.topReferrers[0].count).toBe(2);
    // "direct" should be excluded
    expect(stats.topReferrers.some((r) => r.referrer === "direct")).toBe(false);
  });

  it("tracks last visit", () => {
    recordPageView("test-site", { path: "/", referrer: "direct", userAgent: "A" });
    const stats = getSiteStats("test-site");
    expect(stats.lastVisit).toBeDefined();
    expect(stats.lastVisit!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("limits top pages to 5", () => {
    for (let i = 0; i < 10; i++) {
      recordPageView("test-site", { path: `/page-${i}`, referrer: "direct", userAgent: "A" });
    }
    const stats = getSiteStats("test-site");
    expect(stats.topPages.length).toBeLessThanOrEqual(5);
  });
});

describe("formatStats", () => {
  it("shows 'no visitors' for empty stats", () => {
    const text = formatStats(getSiteStats("empty-site"));
    expect(text).toContain("No visitors yet");
  });

  it("shows total views", () => {
    recordPageView("test-site", { path: "/", referrer: "direct", userAgent: "A" });
    recordPageView("test-site", { path: "/", referrer: "direct", userAgent: "B" });
    const text = formatStats(getSiteStats("test-site"));
    expect(text).toContain("2");
    expect(text).toContain("Total views");
  });

  it("shows unique visitors", () => {
    recordPageView("test-site", { path: "/", referrer: "direct", userAgent: "Chrome" });
    recordPageView("test-site", { path: "/", referrer: "direct", userAgent: "Firefox" });
    const text = formatStats(getSiteStats("test-site"));
    expect(text).toContain("Unique visitors");
  });

  it("includes slug in header", () => {
    recordPageView("test-site", { path: "/", referrer: "direct", userAgent: "A" });
    const text = formatStats(getSiteStats("test-site"));
    expect(text).toContain("test-site");
  });
});

describe("generateAnalyticsSnippet", () => {
  it("returns a script tag", () => {
    const snippet = generateAnalyticsSnippet("my-cafe", "https://track.example.com");
    expect(snippet).toContain("<script>");
    expect(snippet).toContain("</script>");
  });

  it("includes the slug", () => {
    const snippet = generateAnalyticsSnippet("my-cafe", "https://track.example.com");
    expect(snippet).toContain("my-cafe");
  });

  it("includes the tracking endpoint", () => {
    const snippet = generateAnalyticsSnippet("my-cafe", "https://track.example.com/api");
    expect(snippet).toContain("https://track.example.com/api");
  });

  it("uses sendBeacon", () => {
    const snippet = generateAnalyticsSnippet("test", "https://track.example.com");
    expect(snippet).toContain("sendBeacon");
  });

  it("tracks hash changes for SPA", () => {
    const snippet = generateAnalyticsSnippet("test", "https://track.example.com");
    expect(snippet).toContain("hashchange");
  });
});

describe("injectAnalytics", () => {
  it("injects before </body>", () => {
    const html = "<!DOCTYPE html><html><body><p>Hello</p></body></html>";
    const result = injectAnalytics(html, "test-slug");
    expect(result).toContain("<script>");
    expect(result).toContain("test-slug");
    expect(result.indexOf("<script>")).toBeLessThan(result.indexOf("</body>"));
  });

  it("appends at end if no </body>", () => {
    const html = "<!DOCTYPE html><html><p>No body tag</p></html>";
    const result = injectAnalytics(html, "test-slug");
    expect(result).toContain("<script>");
    expect(result).toContain("test-slug");
  });

  it("preserves original HTML", () => {
    const html = "<!DOCTYPE html><html><body><p>Content</p></body></html>";
    const result = injectAnalytics(html, "test");
    expect(result).toContain("Content");
  });
});

describe("clearAnalytics", () => {
  it("clears all events for a slug", () => {
    recordPageView("test-site", { path: "/", referrer: "direct", userAgent: "A" });
    clearAnalytics("test-site");
    expect(getSiteStats("test-site").totalViews).toBe(0);
  });
});
