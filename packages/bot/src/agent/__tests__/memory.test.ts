import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@wai/core", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  setIdentityMemory, setWorkingMemory,
  getUserMemory, getIdentityStrings, getWorkingStrings,
  clearMemory, extractMemoriesFromBuild, extractMemoriesFromEdit,
  buildMemoryContext,
} from "../memory.js";

beforeEach(() => {
  clearMemory("user-1");
  clearMemory("user-2");
});

describe("identity memory", () => {
  it("sets and retrieves identity memory", () => {
    setIdentityMemory("user-1", "business_name", "Cafe Sunrise");
    const mem = getUserMemory("user-1");
    expect(mem.identity).toHaveLength(1);
    expect(mem.identity[0].key).toBe("business_name");
    expect(mem.identity[0].value).toBe("Cafe Sunrise");
  });

  it("updates existing identity memory", () => {
    setIdentityMemory("user-1", "color", "blue");
    setIdentityMemory("user-1", "color", "red");
    const mem = getUserMemory("user-1");
    expect(mem.identity).toHaveLength(1);
    expect(mem.identity[0].value).toBe("red");
  });

  it("stores multiple identity entries", () => {
    setIdentityMemory("user-1", "name", "Mik");
    setIdentityMemory("user-1", "business", "WaiWai");
    expect(getUserMemory("user-1").identity).toHaveLength(2);
  });

  it("returns formatted strings", () => {
    setIdentityMemory("user-1", "business_name", "Cafe");
    const strings = getIdentityStrings("user-1");
    expect(strings).toContain("business_name: Cafe");
  });
});

describe("working memory", () => {
  it("sets and retrieves working memory", () => {
    setWorkingMemory("user-1", "last_build", "cafe site");
    const mem = getUserMemory("user-1");
    expect(mem.working).toHaveLength(1);
    expect(mem.working[0].value).toBe("cafe site");
  });

  it("bounds working memory to 20 entries", () => {
    for (let i = 0; i < 25; i++) {
      setWorkingMemory("user-1", `item-${i}`, `value-${i}`);
    }
    expect(getUserMemory("user-1").working.length).toBeLessThanOrEqual(20);
  });

  it("returns formatted strings", () => {
    setWorkingMemory("user-1", "last_site", "my-cafe");
    expect(getWorkingStrings("user-1")).toContain("last_site: my-cafe");
  });
});

describe("clearMemory", () => {
  it("clears all memory for a user", () => {
    setIdentityMemory("user-1", "name", "Mik");
    setWorkingMemory("user-1", "task", "building");
    clearMemory("user-1");
    const mem = getUserMemory("user-1");
    expect(mem.identity).toHaveLength(0);
    expect(mem.working).toHaveLength(0);
  });

  it("does not affect other users", () => {
    setIdentityMemory("user-1", "name", "Mik");
    setIdentityMemory("user-2", "name", "Alisa");
    clearMemory("user-1");
    expect(getUserMemory("user-2").identity).toHaveLength(1);
  });
});

describe("extractMemoriesFromBuild", () => {
  it("extracts business name from description", () => {
    extractMemoriesFromBuild("user-1", "Cafe Sunrise. Modern coffee shop with pastries.", "cafe-sunrise");
    const strings = getIdentityStrings("user-1");
    expect(strings.some((s) => s.includes("Cafe Sunrise"))).toBe(true);
  });

  it("detects Russian language preference", () => {
    extractMemoriesFromBuild("user-1", "Кафе Рассвет. Кофейня с десертами.", "kafe-rassvet");
    const strings = getIdentityStrings("user-1");
    expect(strings.some((s) => s.includes("ru"))).toBe(true);
  });

  it("stores slug in working memory", () => {
    extractMemoriesFromBuild("user-1", "Test site.", "test-site");
    const working = getWorkingStrings("user-1");
    expect(working.some((s) => s.includes("test-site"))).toBe(true);
  });

  it("extracts color preference when mentioned", () => {
    extractMemoriesFromBuild("user-1", "Portfolio site, color: dark blue, modern.", "portfolio");
    const strings = getIdentityStrings("user-1");
    expect(strings.some((s) => s.includes("dark blue"))).toBe(true);
  });

  it("extracts style preference when mentioned", () => {
    extractMemoriesFromBuild("user-1", "Landing page, style: minimalist.", "landing");
    const strings = getIdentityStrings("user-1");
    expect(strings.some((s) => s.includes("minimalist"))).toBe(true);
  });

  it("handles description without period", () => {
    extractMemoriesFromBuild("user-1", "Simple one-page site", "simple");
    // Should not crash, working memory should still have slug
    const working = getWorkingStrings("user-1");
    expect(working.some((s) => s.includes("simple"))).toBe(true);
  });
});

describe("extractMemoriesFromEdit", () => {
  it("extracts color change preference", () => {
    extractMemoriesFromEdit("user-1", "Change the color to dark green");
    const strings = getIdentityStrings("user-1");
    expect(strings.some((s) => s.includes("dark green"))).toBe(true);
  });

  it("detects dark mode preference", () => {
    extractMemoriesFromEdit("user-1", "Add dark mode to the site");
    const strings = getIdentityStrings("user-1");
    expect(strings.some((s) => s.includes("dark"))).toBe(true);
  });

  it("detects light mode preference", () => {
    extractMemoriesFromEdit("user-1", "Switch to light theme please");
    const strings = getIdentityStrings("user-1");
    expect(strings.some((s) => s.includes("light"))).toBe(true);
  });

  it("stores edit in working memory", () => {
    extractMemoriesFromEdit("user-1", "Make the hero bigger");
    const working = getWorkingStrings("user-1");
    expect(working.some((s) => s.includes("Make the hero bigger"))).toBe(true);
  });

  it("detects Russian dark theme preference", () => {
    extractMemoriesFromEdit("user-1", "Сделай тёмную тему");
    const strings = getIdentityStrings("user-1");
    expect(strings.some((s) => s.includes("dark"))).toBe(true);
  });
});

describe("buildMemoryContext", () => {
  it("returns empty string for user with no memories", () => {
    expect(buildMemoryContext("unknown-user")).toBe("");
  });

  it("includes identity section", () => {
    setIdentityMemory("user-1", "business_name", "WaiWai");
    const ctx = buildMemoryContext("user-1");
    expect(ctx).toContain("What I know about you");
    expect(ctx).toContain("WaiWai");
  });

  it("includes working memory section", () => {
    setWorkingMemory("user-1", "last_site", "my-cafe");
    const ctx = buildMemoryContext("user-1");
    expect(ctx).toContain("Recent context");
    expect(ctx).toContain("my-cafe");
  });

  it("includes both sections when both exist", () => {
    setIdentityMemory("user-1", "name", "Mik");
    setWorkingMemory("user-1", "task", "building");
    const ctx = buildMemoryContext("user-1");
    expect(ctx).toContain("What I know about you");
    expect(ctx).toContain("Recent context");
  });

  it("limits working memory to last 5", () => {
    for (let i = 0; i < 10; i++) {
      setWorkingMemory("user-1", `item-${i}`, `value-${i}`);
    }
    const ctx = buildMemoryContext("user-1");
    expect(ctx).toContain("item-9");
    expect(ctx).not.toContain("item-0");
  });
});
