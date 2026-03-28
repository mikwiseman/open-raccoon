import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@wai/core", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  recordContribution, getContributions, getContributors,
  formatContributors, getEffectiveOwnerId, isGroupChat,
  clearContributions,
} from "../collab.js";

beforeEach(() => {
  clearContributions("-100123");
  clearContributions("-100456");
});

describe("recordContribution", () => {
  it("records a contribution", () => {
    recordContribution("-100123", "user1", "Mik", "build", "Created cafe site");
    expect(getContributions("-100123")).toHaveLength(1);
  });

  it("records multiple contributions", () => {
    recordContribution("-100123", "user1", "Mik", "build", "Built site");
    recordContribution("-100123", "user2", "Alisa", "edit", "Changed color");
    expect(getContributions("-100123")).toHaveLength(2);
  });

  it("returns empty for unknown chat", () => {
    expect(getContributions("-999")).toEqual([]);
  });
});

describe("getContributors", () => {
  it("counts per-user contributions", () => {
    recordContribution("-100123", "user1", "Mik", "build", "Built");
    recordContribution("-100123", "user1", "Mik", "edit", "Edit 1");
    recordContribution("-100123", "user2", "Alisa", "edit", "Edit 2");

    const contributors = getContributors("-100123");
    expect(contributors).toHaveLength(2);

    const mik = contributors.find((c) => c.userId === "user1");
    expect(mik!.count).toBe(2);
    expect(mik!.userName).toBe("Mik");

    const alisa = contributors.find((c) => c.userId === "user2");
    expect(alisa!.count).toBe(1);
  });

  it("sorts by contribution count (most first)", () => {
    recordContribution("-100123", "user1", "Mik", "edit", "1");
    recordContribution("-100123", "user2", "Alisa", "edit", "1");
    recordContribution("-100123", "user2", "Alisa", "edit", "2");
    recordContribution("-100123", "user2", "Alisa", "edit", "3");

    const contributors = getContributors("-100123");
    expect(contributors[0].userId).toBe("user2");
    expect(contributors[0].count).toBe(3);
  });

  it("returns empty for unknown chat", () => {
    expect(getContributors("-999")).toEqual([]);
  });
});

describe("formatContributors", () => {
  it("shows 'no contributions' for empty", () => {
    expect(formatContributors("-999")).toContain("No contributions");
  });

  it("shows contributor count", () => {
    recordContribution("-100123", "u1", "Mik", "build", "Built");
    recordContribution("-100123", "u2", "Alisa", "edit", "Edited");
    const text = formatContributors("-100123");
    expect(text).toContain("2 people");
  });

  it("shows medals for top 3", () => {
    recordContribution("-100123", "u1", "Mik", "build", "B");
    recordContribution("-100123", "u1", "Mik", "edit", "E");
    recordContribution("-100123", "u1", "Mik", "edit", "E");
    recordContribution("-100123", "u2", "Alisa", "edit", "E");
    recordContribution("-100123", "u2", "Alisa", "edit", "E");
    recordContribution("-100123", "u3", "Bob", "edit", "E");
    const text = formatContributors("-100123");
    expect(text).toContain("🥇");
    expect(text).toContain("🥈");
    expect(text).toContain("🥉");
  });

  it("shows recent activity", () => {
    recordContribution("-100123", "u1", "Mik", "build", "Created cafe site");
    const text = formatContributors("-100123");
    expect(text).toContain("Recent");
    expect(text).toContain("Created cafe site");
  });
});

describe("getEffectiveOwnerId", () => {
  it("returns chatId for group chats (negative)", () => {
    expect(getEffectiveOwnerId(-100123, "user1")).toBe("-100123");
  });

  it("returns userId for private chats (positive)", () => {
    expect(getEffectiveOwnerId(12345, "user1")).toBe("user1");
  });

  it("returns userId for zero chatId", () => {
    expect(getEffectiveOwnerId(0, "user1")).toBe("user1");
  });
});

describe("isGroupChat", () => {
  it("returns true for negative chatId", () => {
    expect(isGroupChat(-100123)).toBe(true);
  });

  it("returns false for positive chatId", () => {
    expect(isGroupChat(12345)).toBe(false);
  });

  it("returns false for zero", () => {
    expect(isGroupChat(0)).toBe(false);
  });
});

describe("clearContributions", () => {
  it("clears all contributions", () => {
    recordContribution("-100123", "u1", "Mik", "build", "B");
    clearContributions("-100123");
    expect(getContributions("-100123")).toEqual([]);
  });

  it("does not affect other chats", () => {
    recordContribution("-100123", "u1", "Mik", "build", "B");
    recordContribution("-100456", "u2", "Alisa", "build", "B");
    clearContributions("-100123");
    expect(getContributions("-100456")).toHaveLength(1);
  });
});
