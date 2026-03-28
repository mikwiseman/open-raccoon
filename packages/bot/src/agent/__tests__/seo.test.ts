import { describe, it, expect, vi } from "vitest";

vi.mock("@wai/core", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  generateSeoMeta, generateOgImageUrl, detectFavicon,
  buildMetaTags, injectSeoTags,
} from "../seo.js";

describe("generateSeoMeta", () => {
  it("extracts title from <title> tag", () => {
    const meta = generateSeoMeta("cafe", "A cafe site", "<html><head><title>Cafe Sunrise</title></head></html>");
    expect(meta.title).toBe("Cafe Sunrise");
  });

  it("extracts title from h1 when no <title>", () => {
    const meta = generateSeoMeta("cafe", "A cafe", "<html><body><h1>Welcome to Cafe</h1></body></html>");
    expect(meta.title).toBe("Welcome to Cafe");
  });

  it("falls back to description for title", () => {
    const meta = generateSeoMeta("test", "My amazing portfolio site.", "<html><body></body></html>");
    expect(meta.title).toBe("My amazing portfolio site");
  });

  it("extracts description from meta tag", () => {
    const meta = generateSeoMeta("s", "desc", '<html><head><meta name="description" content="Great cafe"></head></html>');
    expect(meta.description).toBe("Great cafe");
  });

  it("generates URL correctly", () => {
    const meta = generateSeoMeta("my-cafe", "desc", "<html></html>");
    expect(meta.url).toBe("https://my-cafe.wai.computer");
  });

  it("detects Russian language", () => {
    const meta = generateSeoMeta("kafe", "Кафе Рассвет", "<html><head><title>Кафе Рассвет</title></head></html>");
    expect(meta.language).toBe("ru");
  });

  it("defaults to English", () => {
    const meta = generateSeoMeta("cafe", "Cafe Sunrise", "<html><head><title>Cafe</title></head></html>");
    expect(meta.language).toBe("en");
  });

  it("generates OG image URL", () => {
    const meta = generateSeoMeta("test", "desc", "<html><head><title>Test</title></head></html>");
    expect(meta.ogImageUrl).toContain("test");
  });

  it("detects appropriate favicon", () => {
    const meta = generateSeoMeta("cafe", "Coffee cafe", "<html><head><title>Cafe</title></head></html>");
    expect(meta.favicon).toBe("☕");
  });
});

describe("generateOgImageUrl", () => {
  it("includes slug", () => {
    const url = generateOgImageUrl("Title", "Desc", "my-slug");
    expect(url).toContain("my-slug");
  });

  it("encodes title", () => {
    const url = generateOgImageUrl("Hello World", "Desc", "s");
    expect(url).toContain(encodeURIComponent("Hello World"));
  });

  it("truncates long title", () => {
    const long = "A".repeat(100);
    const url = generateOgImageUrl(long, "Desc", "s");
    expect(url.length).toBeLessThan(300);
  });
});

describe("detectFavicon", () => {
  it("returns coffee for cafe", () => {
    expect(detectFavicon("Coffee cafe", "Cafe")).toBe("☕");
  });

  it("returns rocket for startup", () => {
    expect(detectFavicon("SaaS startup platform", "MyApp")).toBe("🚀");
  });

  it("returns art for portfolio", () => {
    expect(detectFavicon("Portfolio designer", "Portfolio")).toBe("🎨");
  });

  it("returns shopping for store", () => {
    expect(detectFavicon("Online shop with products", "Store")).toBe("🛍️");
  });

  it("returns tent for event", () => {
    expect(detectFavicon("Conference hackathon", "Event")).toBe("🎪");
  });

  it("returns sparkle for unknown", () => {
    expect(detectFavicon("Something random", "Title")).toBe("✨");
  });

  it("detects Russian content", () => {
    expect(detectFavicon("Кафе с кофе", "Кафе")).toBe("☕");
  });

  it("detects fitness", () => {
    expect(detectFavicon("Fitness gym", "FitClub")).toBe("💪");
  });

  it("detects tech", () => {
    expect(detectFavicon("AI technology platform", "TechCo")).toBe("💻");
  });
});

describe("buildMetaTags", () => {
  const meta = {
    title: "Test Site",
    description: "A test description",
    url: "https://test.wai.computer",
    ogImageUrl: "https://og.wai.computer/test",
    language: "en",
    favicon: "✨",
  };

  it("includes og:title", () => {
    const tags = buildMetaTags(meta);
    expect(tags).toContain('og:title');
    expect(tags).toContain("Test Site");
  });

  it("includes og:description", () => {
    const tags = buildMetaTags(meta);
    expect(tags).toContain('og:description');
    expect(tags).toContain("A test description");
  });

  it("includes og:image", () => {
    const tags = buildMetaTags(meta);
    expect(tags).toContain('og:image');
    expect(tags).toContain("https://og.wai.computer/test");
  });

  it("includes twitter card", () => {
    const tags = buildMetaTags(meta);
    expect(tags).toContain('twitter:card');
    expect(tags).toContain("summary_large_image");
  });

  it("includes canonical URL", () => {
    const tags = buildMetaTags(meta);
    expect(tags).toContain('canonical');
    expect(tags).toContain("https://test.wai.computer");
  });

  it("includes favicon SVG", () => {
    const tags = buildMetaTags(meta);
    expect(tags).toContain("✨");
    expect(tags).toContain("data:image/svg+xml");
  });

  it("includes language meta", () => {
    const tags = buildMetaTags(meta);
    expect(tags).toContain('name="language"');
    expect(tags).toContain('"en"');
  });

  it("escapes HTML in attributes", () => {
    const special = { ...meta, title: 'Test "quotes" & <brackets>' };
    const tags = buildMetaTags(special);
    expect(tags).toContain("&quot;");
    expect(tags).toContain("&amp;");
    expect(tags).not.toContain('<brackets>');
  });
});

describe("injectSeoTags", () => {
  it("injects after <head>", () => {
    const html = "<!DOCTYPE html><html><head><title>Old</title></head><body></body></html>";
    const result = injectSeoTags(html, "test", "Test site");
    expect(result).toContain("og:title");
    expect(result).toContain("twitter:card");
    expect(result.indexOf("og:title")).toBeLessThan(result.indexOf("</head>"));
  });

  it("injects into <head> with attributes", () => {
    const html = '<!DOCTYPE html><html><head lang="en"></head><body></body></html>';
    const result = injectSeoTags(html, "test", "Test");
    expect(result).toContain("og:title");
  });

  it("creates <head> if none exists", () => {
    const html = "<!DOCTYPE html><html><body></body></html>";
    const result = injectSeoTags(html, "test", "Test");
    expect(result).toContain("<head>");
    expect(result).toContain("og:title");
  });

  it("preserves existing HTML", () => {
    const html = "<!DOCTYPE html><html><head></head><body><p>Content</p></body></html>";
    const result = injectSeoTags(html, "test", "Test");
    expect(result).toContain("Content");
  });

  it("uses slug in canonical URL", () => {
    const html = "<!DOCTYPE html><html><head></head><body></body></html>";
    const result = injectSeoTags(html, "my-cafe", "Cafe site");
    expect(result).toContain("my-cafe.wai.computer");
  });
});
