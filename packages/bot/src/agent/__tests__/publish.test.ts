import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@wai/core", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  setSiteState, getSiteState, hasDraft, getDraftHtml,
  validateSlug, isDraftRequest, stripDraftFlag,
  formatSiteState, clearPublishState,
} from "../publish.js";

beforeEach(() => {
  clearPublishState("user-1");
});

describe("setSiteState / getSiteState", () => {
  it("sets and gets state", () => {
    setSiteState("user-1", "my-cafe", "published", "https://my-cafe.wai.computer");
    const state = getSiteState("user-1");
    expect(state?.slug).toBe("my-cafe");
    expect(state?.state).toBe("published");
    expect(state?.url).toBe("https://my-cafe.wai.computer");
  });

  it("sets draft with HTML", () => {
    setSiteState("user-1", "test", "draft", undefined, "<html>Draft</html>");
    const state = getSiteState("user-1");
    expect(state?.state).toBe("draft");
    expect(state?.draftHtml).toBe("<html>Draft</html>");
  });

  it("sets publishedAt timestamp", () => {
    setSiteState("user-1", "test", "published");
    expect(getSiteState("user-1")?.publishedAt).toBeDefined();
  });

  it("sets unpublishedAt timestamp", () => {
    setSiteState("user-1", "test", "unpublished");
    expect(getSiteState("user-1")?.unpublishedAt).toBeDefined();
  });

  it("returns undefined for unknown user", () => {
    expect(getSiteState("unknown")).toBeUndefined();
  });
});

describe("hasDraft", () => {
  it("returns true for draft with HTML", () => {
    setSiteState("user-1", "test", "draft", undefined, "<html>Draft</html>");
    expect(hasDraft("user-1")).toBe(true);
  });

  it("returns false for published site", () => {
    setSiteState("user-1", "test", "published");
    expect(hasDraft("user-1")).toBe(false);
  });

  it("returns false for unknown user", () => {
    expect(hasDraft("unknown")).toBe(false);
  });

  it("returns false for draft without HTML", () => {
    setSiteState("user-1", "test", "draft");
    expect(hasDraft("user-1")).toBe(false);
  });
});

describe("getDraftHtml", () => {
  it("returns HTML for draft", () => {
    setSiteState("user-1", "test", "draft", undefined, "<html>My Draft</html>");
    expect(getDraftHtml("user-1")).toBe("<html>My Draft</html>");
  });

  it("returns undefined for published", () => {
    setSiteState("user-1", "test", "published", undefined, "<html>Published</html>");
    expect(getDraftHtml("user-1")).toBeUndefined();
  });
});

describe("validateSlug", () => {
  it("accepts valid slug", () => {
    expect(validateSlug("my-cafe").valid).toBe(true);
  });

  it("accepts alphanumeric slug", () => {
    expect(validateSlug("cafe2024").valid).toBe(true);
  });

  it("rejects too short", () => {
    const r = validateSlug("ab");
    expect(r.valid).toBe(false);
    expect(r.error).toContain("3 characters");
  });

  it("rejects too long", () => {
    const r = validateSlug("a".repeat(51));
    expect(r.valid).toBe(false);
    expect(r.error).toContain("50");
  });

  it("rejects uppercase", () => {
    const r = validateSlug("MyCafe");
    expect(r.valid).toBe(false);
  });

  it("rejects leading hyphen", () => {
    const r = validateSlug("-my-cafe");
    expect(r.valid).toBe(false);
  });

  it("rejects trailing hyphen", () => {
    const r = validateSlug("my-cafe-");
    expect(r.valid).toBe(false);
  });

  it("rejects consecutive hyphens", () => {
    const r = validateSlug("my--cafe");
    expect(r.valid).toBe(false);
    expect(r.error).toContain("consecutive");
  });

  it("rejects reserved slugs", () => {
    expect(validateSlug("www").valid).toBe(false);
    expect(validateSlug("api").valid).toBe(false);
    expect(validateSlug("admin").valid).toBe(false);
    expect(validateSlug("wai").valid).toBe(false);
  });

  it("accepts non-reserved slugs", () => {
    expect(validateSlug("my-cafe").valid).toBe(true);
    expect(validateSlug("portfolio-2024").valid).toBe(true);
  });
});

describe("isDraftRequest", () => {
  it("detects --draft flag", () => {
    expect(isDraftRequest("/build --draft cafe site")).toBe(true);
  });

  it("detects Russian черновик", () => {
    expect(isDraftRequest("Создай черновик сайта")).toBe(true);
  });

  it("detects 'draft mode'", () => {
    expect(isDraftRequest("Build in draft mode")).toBe(true);
  });

  it("returns false for normal build", () => {
    expect(isDraftRequest("/build cafe landing page")).toBe(false);
  });
});

describe("stripDraftFlag", () => {
  it("removes --draft", () => {
    expect(stripDraftFlag("cafe site --draft")).toBe("cafe site");
  });

  it("removes черновик", () => {
    expect(stripDraftFlag("черновик сайта кафе")).toBe("сайта кафе");
  });

  it("preserves text without flag", () => {
    expect(stripDraftFlag("normal description")).toBe("normal description");
  });
});

describe("formatSiteState", () => {
  it("shows published state", () => {
    setSiteState("user-1", "my-cafe", "published", "https://my-cafe.wai.computer");
    const text = formatSiteState("user-1");
    expect(text).toContain("PUBLISHED");
    expect(text).toContain("🟢");
    expect(text).toContain("my-cafe.wai.computer");
  });

  it("shows draft state with hint", () => {
    setSiteState("user-1", "test", "draft", undefined, "<html></html>");
    const text = formatSiteState("user-1");
    expect(text).toContain("DRAFT");
    expect(text).toContain("📝");
    expect(text).toContain("/publish");
  });

  it("shows unpublished state", () => {
    setSiteState("user-1", "test", "unpublished");
    const text = formatSiteState("user-1");
    expect(text).toContain("UNPUBLISHED");
    expect(text).toContain("🔴");
  });

  it("returns 'no site' for unknown user", () => {
    expect(formatSiteState("unknown")).toContain("No site");
  });
});

describe("clearPublishState", () => {
  it("clears state", () => {
    setSiteState("user-1", "test", "published");
    clearPublishState("user-1");
    expect(getSiteState("user-1")).toBeUndefined();
  });
});
