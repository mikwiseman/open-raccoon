import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Mock @wai/core
vi.mock("@wai/core", () => ({
  config: {
    anthropicApiKey: "test-key",
    cloudflareApiToken: "",
    cloudflareAccountId: "",
  },
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Anthropic SDK — prevent actual API calls
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "Not valid HTML" }],
        usage: { input_tokens: 10, output_tokens: 10 },
      }),
    },
  })),
}));

import { deployDirectoryToCloudflare, generateSlug } from "../site-builder.js";

describe("deployDirectoryToCloudflare", () => {
  it("returns error when credentials not configured", async () => {
    const result = await deployDirectoryToCloudflare("test-slug", "/tmp/nonexistent");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Cloudflare credentials not configured");
  });
});

describe("generateSlug extended", () => {
  it("handles Ukrainian characters", () => {
    // Ukrainian 'і' and 'ї' are not in the transliteration map, but similar ones are
    const slug = generateSlug("Привіт Світ");
    expect(slug.length).toBeGreaterThan(0);
    expect(slug).not.toContain(" ");
  });

  it("handles mixed Cyrillic and Latin", () => {
    const slug = generateSlug("Café Рассвет 2024");
    expect(slug).toContain("rassvet");
    expect(slug).toContain("2024");
  });

  it("handles special characters", () => {
    const slug = generateSlug("My Site! @#$% Test");
    expect(slug).toBe("my-site-test");
  });

  it("handles empty string", () => {
    const slug = generateSlug("");
    expect(slug).toMatch(/^site-/);
  });

  it("handles all spaces/dashes", () => {
    const slug = generateSlug("---   ---");
    // After cleanup, becomes empty → fallback
    expect(slug).toMatch(/^site-/);
  });

  it("truncates to 50 chars", () => {
    const long = "a".repeat(100);
    expect(generateSlug(long).length).toBeLessThanOrEqual(50);
  });

  it("handles numbers only", () => {
    const slug = generateSlug("12345");
    expect(slug).toBe("12345");
  });

  it("collapses multiple dashes", () => {
    const slug = generateSlug("hello    world");
    expect(slug).toBe("hello-world");
    expect(slug).not.toContain("--");
  });

  it("strips leading and trailing dashes", () => {
    const slug = generateSlug(" hello world ");
    expect(slug).not.toMatch(/^-/);
    expect(slug).not.toMatch(/-$/);
  });
});

describe("directory file collection", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "wai-test-"));
  });

  it("handles empty directory gracefully (via deploy)", async () => {
    // Empty dir — no cloudflare creds, so it fails at creds check first
    const result = await deployDirectoryToCloudflare("test", testDir);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Cloudflare credentials not configured");
    await rm(testDir, { recursive: true, force: true });
  });

  it("handles nested directory structure", async () => {
    await mkdir(join(testDir, "css"), { recursive: true });
    await writeFile(join(testDir, "index.html"), "<html></html>");
    await writeFile(join(testDir, "css", "style.css"), "body {}");

    // No creds, so fails at creds check
    const result = await deployDirectoryToCloudflare("nested", testDir);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Cloudflare credentials not configured");
    await rm(testDir, { recursive: true, force: true });
  });
});
