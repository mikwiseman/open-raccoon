import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@wai/core", () => ({
  config: { anthropicApiKey: "", cloudflareApiToken: "", cloudflareAccountId: "" },
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: vi.fn() },
  })),
}));

import {
  registerSiteOwner, getSiteOwner,
  recordSubmission, getSubmissions, getSubmissionCount, clearSubmissions,
  formatSubmissionNotification, formatSubmissionsSummary,
  generateFormHandlerSnippet,
} from "../forms.js";

import { injectFormHandler } from "../site-builder.js";

beforeEach(() => {
  clearSubmissions("test-site");
});

describe("site owner registry", () => {
  it("registers and retrieves owner", () => {
    registerSiteOwner("my-cafe", "user-123");
    expect(getSiteOwner("my-cafe")).toBe("user-123");
  });

  it("returns undefined for unregistered slug", () => {
    expect(getSiteOwner("unknown")).toBeUndefined();
  });

  it("overwrites owner on re-register", () => {
    registerSiteOwner("my-site", "user-1");
    registerSiteOwner("my-site", "user-2");
    expect(getSiteOwner("my-site")).toBe("user-2");
  });
});

describe("recordSubmission", () => {
  it("records a submission", () => {
    recordSubmission({
      slug: "test-site",
      formId: "contact",
      fields: { name: "Mik", email: "mik@test.com" },
      submittedAt: new Date(),
      page: "/",
      userAgent: "Chrome",
    });
    expect(getSubmissionCount("test-site")).toBe(1);
  });

  it("records multiple submissions", () => {
    for (let i = 0; i < 3; i++) {
      recordSubmission({
        slug: "test-site", formId: "form", fields: { n: `${i}` },
        submittedAt: new Date(), page: "/", userAgent: "A",
      });
    }
    expect(getSubmissionCount("test-site")).toBe(3);
  });

  it("returns submissions in order", () => {
    recordSubmission({ slug: "test-site", formId: "f", fields: { n: "first" }, submittedAt: new Date(), page: "/", userAgent: "A" });
    recordSubmission({ slug: "test-site", formId: "f", fields: { n: "second" }, submittedAt: new Date(), page: "/", userAgent: "A" });
    const subs = getSubmissions("test-site");
    expect(subs[0].fields.n).toBe("first");
    expect(subs[1].fields.n).toBe("second");
  });
});

describe("getSubmissions", () => {
  it("returns empty array for unknown slug", () => {
    expect(getSubmissions("unknown")).toEqual([]);
  });

  it("returns count zero for unknown slug", () => {
    expect(getSubmissionCount("unknown")).toBe(0);
  });
});

describe("clearSubmissions", () => {
  it("clears all submissions", () => {
    recordSubmission({ slug: "test-site", formId: "f", fields: { a: "b" }, submittedAt: new Date(), page: "/", userAgent: "A" });
    clearSubmissions("test-site");
    expect(getSubmissionCount("test-site")).toBe(0);
  });
});

describe("formatSubmissionNotification", () => {
  it("includes site slug", () => {
    const text = formatSubmissionNotification({
      slug: "my-cafe", formId: "contact",
      fields: { name: "Mik", email: "mik@wai.com" },
      submittedAt: new Date(), page: "/", userAgent: "Chrome",
    });
    expect(text).toContain("my-cafe");
    expect(text).toContain("New form submission");
  });

  it("includes field values", () => {
    const text = formatSubmissionNotification({
      slug: "s", formId: "f",
      fields: { name: "Alice", message: "Hello there" },
      submittedAt: new Date(), page: "/", userAgent: "A",
    });
    expect(text).toContain("Alice");
    expect(text).toContain("Hello there");
  });

  it("formats field labels nicely", () => {
    const text = formatSubmissionNotification({
      slug: "s", formId: "f",
      fields: { first_name: "Bob", phone_number: "123" },
      submittedAt: new Date(), page: "/", userAgent: "A",
    });
    expect(text).toContain("First Name");
    expect(text).toContain("Phone Number");
  });
});

describe("formatSubmissionsSummary", () => {
  it("shows 'no submissions' for empty", () => {
    const text = formatSubmissionsSummary("empty-site");
    expect(text).toContain("No form submissions");
  });

  it("shows submission count", () => {
    recordSubmission({ slug: "test-site", formId: "f", fields: { a: "b" }, submittedAt: new Date(), page: "/", userAgent: "A" });
    recordSubmission({ slug: "test-site", formId: "f", fields: { a: "c" }, submittedAt: new Date(), page: "/", userAgent: "A" });
    const text = formatSubmissionsSummary("test-site");
    expect(text).toContain("2 total");
  });

  it("shows recent submissions preview", () => {
    recordSubmission({ slug: "test-site", formId: "f", fields: { name: "Mik" }, submittedAt: new Date(), page: "/", userAgent: "A" });
    const text = formatSubmissionsSummary("test-site");
    expect(text).toContain("Mik");
  });
});

describe("generateFormHandlerSnippet", () => {
  it("returns script tag", () => {
    const snippet = generateFormHandlerSnippet("my-site", "https://api.example.com/form");
    expect(snippet).toContain("<script>");
    expect(snippet).toContain("</script>");
  });

  it("includes slug", () => {
    const snippet = generateFormHandlerSnippet("my-cafe", "https://api.example.com");
    expect(snippet).toContain("my-cafe");
  });

  it("includes endpoint", () => {
    const snippet = generateFormHandlerSnippet("s", "https://api.example.com/form");
    expect(snippet).toContain("https://api.example.com/form");
  });

  it("intercepts form submit", () => {
    const snippet = generateFormHandlerSnippet("s", "https://x.com");
    expect(snippet).toContain("submit");
    expect(snippet).toContain("preventDefault");
  });

  it("shows success toast", () => {
    const snippet = generateFormHandlerSnippet("s", "https://x.com");
    expect(snippet).toContain("Sent!");
  });
});

describe("injectFormHandler", () => {
  it("injects handler when form exists", () => {
    const html = "<!DOCTYPE html><html><body><form><input></form></body></html>";
    const result = injectFormHandler(html, "test");
    expect(result).toContain("<script>");
    expect(result).toContain("test");
    expect(result).toContain("submit");
  });

  it("does NOT inject when no form", () => {
    const html = "<!DOCTYPE html><html><body><p>No forms</p></body></html>";
    const result = injectFormHandler(html, "test");
    expect(result).not.toContain("submit");
    expect(result).toBe(html);
  });

  it("injects before </body>", () => {
    const html = "<!DOCTYPE html><html><body><form></form></body></html>";
    const result = injectFormHandler(html, "test");
    expect(result.indexOf("<script>")).toBeLessThan(result.indexOf("</body>"));
  });
});
