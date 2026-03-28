import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@wai/core", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  checkLimit, recordUsage, getUsageStats,
  getUserTier, setUserTier,
  formatUsageStats, formatLimitError,
  clearUsage,
} from "../ratelimit.js";

beforeEach(() => {
  clearUsage("user-1");
  clearUsage("user-2");
});

describe("checkLimit", () => {
  it("allows first build for free user", () => {
    const result = checkLimit("user-1", "build");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
    expect(result.limit).toBe(5);
  });

  it("allows first edit for free user", () => {
    const result = checkLimit("user-1", "edit");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(20);
  });

  it("denies after reaching build limit", () => {
    for (let i = 0; i < 5; i++) {
      recordUsage("user-1", "build");
    }
    const result = checkLimit("user-1", "build");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("denies after reaching edit limit", () => {
    for (let i = 0; i < 20; i++) {
      recordUsage("user-1", "edit");
    }
    const result = checkLimit("user-1", "edit");
    expect(result.allowed).toBe(false);
  });

  it("pro tier has higher limits", () => {
    setUserTier("user-1", "pro");
    const result = checkLimit("user-1", "build");
    expect(result.limit).toBe(50);
    expect(result.remaining).toBe(50);
  });

  it("returns reset time", () => {
    const result = checkLimit("user-1", "build");
    expect(result.resetIn).toMatch(/\d+h/);
  });

  it("tracks remaining correctly", () => {
    recordUsage("user-1", "build");
    recordUsage("user-1", "build");
    const result = checkLimit("user-1", "build");
    expect(result.remaining).toBe(3); // 5 - 2
  });
});

describe("recordUsage", () => {
  it("increments build count", () => {
    recordUsage("user-1", "build");
    const stats = getUsageStats("user-1");
    expect(stats.usage.builds).toBe(1);
  });

  it("increments edit count", () => {
    recordUsage("user-1", "edit");
    expect(getUsageStats("user-1").usage.edits).toBe(1);
  });

  it("increments clone count", () => {
    recordUsage("user-1", "clone");
    expect(getUsageStats("user-1").usage.clones).toBe(1);
  });

  it("tracks tokens", () => {
    recordUsage("user-1", "build", 1500);
    expect(getUsageStats("user-1").usage.tokensUsed).toBe(1500);
  });

  it("accumulates tokens", () => {
    recordUsage("user-1", "build", 1000);
    recordUsage("user-1", "edit", 500);
    expect(getUsageStats("user-1").usage.tokensUsed).toBe(1500);
  });

  it("increments sitesDeployed for builds", () => {
    recordUsage("user-1", "build");
    expect(getUsageStats("user-1").usage.sitesDeployed).toBe(1);
  });

  it("increments sitesDeployed for clones", () => {
    recordUsage("user-1", "clone");
    expect(getUsageStats("user-1").usage.sitesDeployed).toBe(1);
  });

  it("does NOT increment sitesDeployed for edits", () => {
    recordUsage("user-1", "edit");
    expect(getUsageStats("user-1").usage.sitesDeployed).toBe(0);
  });
});

describe("getUserTier / setUserTier", () => {
  it("defaults to free", () => {
    expect(getUserTier("new-user")).toBe("free");
  });

  it("sets to pro", () => {
    setUserTier("user-1", "pro");
    expect(getUserTier("user-1")).toBe("pro");
  });

  it("does not affect other users", () => {
    setUserTier("user-1", "pro");
    expect(getUserTier("user-2")).toBe("free");
  });
});

describe("formatUsageStats", () => {
  it("shows free tier label", () => {
    const text = formatUsageStats("user-1");
    expect(text).toContain("FREE");
    expect(text).toContain("🆓");
  });

  it("shows pro tier label", () => {
    setUserTier("user-1", "pro");
    const text = formatUsageStats("user-1");
    expect(text).toContain("PRO");
    expect(text).toContain("⭐");
  });

  it("shows usage counts", () => {
    recordUsage("user-1", "build");
    recordUsage("user-1", "edit");
    const text = formatUsageStats("user-1");
    expect(text).toContain("1/5");
    expect(text).toContain("1/20");
  });

  it("shows upgrade prompt for free", () => {
    const text = formatUsageStats("user-1");
    expect(text).toContain("/upgrade");
  });

  it("does not show upgrade for pro", () => {
    setUserTier("user-1", "pro");
    const text = formatUsageStats("user-1");
    expect(text).not.toContain("/upgrade");
  });

  it("shows all-time stats", () => {
    recordUsage("user-1", "build");
    recordUsage("user-1", "build");
    const text = formatUsageStats("user-1");
    expect(text).toContain("2 sites");
  });
});

describe("formatLimitError", () => {
  it("shows English error", () => {
    const text = formatLimitError("build", 0, 5, "12h", "en");
    expect(text).toContain("Daily limit reached");
    expect(text).toContain("12h");
  });

  it("shows Russian error", () => {
    const text = formatLimitError("build", 0, 5, "12h", "ru");
    expect(text).toContain("Лимит достигнут");
    expect(text).toContain("12h");
  });

  it("includes upgrade prompt", () => {
    const text = formatLimitError("build", 0, 5, "8h");
    expect(text).toContain("/upgrade");
  });
});

describe("clearUsage", () => {
  it("resets everything", () => {
    setUserTier("user-1", "pro");
    recordUsage("user-1", "build");
    clearUsage("user-1");
    expect(getUserTier("user-1")).toBe("free");
    expect(getUsageStats("user-1").usage.builds).toBe(0);
  });
});

describe("per-user isolation", () => {
  it("tracks users independently", () => {
    recordUsage("user-1", "build");
    recordUsage("user-1", "build");
    recordUsage("user-2", "build");

    expect(getUsageStats("user-1").usage.builds).toBe(2);
    expect(getUsageStats("user-2").usage.builds).toBe(1);
  });

  it("limits users independently", () => {
    for (let i = 0; i < 5; i++) recordUsage("user-1", "build");
    expect(checkLimit("user-1", "build").allowed).toBe(false);
    expect(checkLimit("user-2", "build").allowed).toBe(true);
  });
});
