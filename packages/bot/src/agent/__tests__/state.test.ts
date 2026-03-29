import { describe, it, expect, vi } from "vitest";

vi.mock("@wai/core", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  needsStatePersistence, generateStateSnippet, generateDarkModeSnippet,
  injectStateManagement,
} from "../state.js";

describe("needsStatePersistence", () => {
  it("returns true for site with Alpine.js and dark mode", () => {
    const html = '<body x-data="{ open: false }" class="dark:bg-gray-900">Content</body>';
    expect(needsStatePersistence(html)).toBe(true);
  });

  it("returns true for site with form and x-model", () => {
    const html = '<form><input x-model="name" type="text"></form>';
    expect(needsStatePersistence(html)).toBe(true);
  });

  it("returns true for site with cart keyword and x-data", () => {
    const html = '<div x-data="{ cart: [] }">Shopping cart</div>';
    expect(needsStatePersistence(html)).toBe(true);
  });

  it("returns false for plain HTML without interactivity", () => {
    const html = "<html><body><h1>Hello</h1><p>Static page</p></body></html>";
    expect(needsStatePersistence(html)).toBe(false);
  });

  it("returns false for single indicator only", () => {
    // Just dark: class without x-data isn't enough
    const html = '<div class="dark:bg-black">Just dark class</div>';
    expect(needsStatePersistence(html)).toBe(false);
  });

  it("returns true for Russian cart keyword with toggle", () => {
    const html = '<div x-data>Корзина покупок <button @click="toggle">Toggle</button></div>';
    expect(needsStatePersistence(html)).toBe(true);
  });
});

describe("generateStateSnippet", () => {
  it("returns a script tag", () => {
    const snippet = generateStateSnippet("my-cafe");
    expect(snippet).toContain("<script>");
    expect(snippet).toContain("</script>");
  });

  it("includes slug-based storage key", () => {
    const snippet = generateStateSnippet("my-cafe");
    expect(snippet).toContain("wai_my_cafe");
  });

  it("sanitizes slug for variable name", () => {
    const snippet = generateStateSnippet("my-special-site!");
    expect(snippet).toContain("wai_my_special_site_");
    expect(snippet).not.toContain("!");
  });

  it("includes Alpine.store initialization", () => {
    const snippet = generateStateSnippet("test");
    expect(snippet).toContain("Alpine.store");
    expect(snippet).toContain("alpine:init");
  });

  it("includes default state properties", () => {
    const snippet = generateStateSnippet("test");
    expect(snippet).toContain("darkMode");
    expect(snippet).toContain("formDraft");
    expect(snippet).toContain("cart");
    expect(snippet).toContain("visited");
  });

  it("includes localStorage persistence", () => {
    const snippet = generateStateSnippet("test");
    expect(snippet).toContain("localStorage");
    expect(snippet).toContain("setItem");
    expect(snippet).toContain("getItem");
  });

  it("includes debounced auto-save", () => {
    const snippet = generateStateSnippet("test");
    expect(snippet).toContain("setTimeout");
    expect(snippet).toContain("MutationObserver");
  });
});

describe("generateDarkModeSnippet", () => {
  it("returns a script tag", () => {
    const snippet = generateDarkModeSnippet("test");
    expect(snippet).toContain("<script>");
  });

  it("adds dark class before render", () => {
    const snippet = generateDarkModeSnippet("test");
    expect(snippet).toContain("classList.add('dark')");
  });

  it("reads from localStorage", () => {
    const snippet = generateDarkModeSnippet("test");
    expect(snippet).toContain("localStorage.getItem");
  });

  it("uses slug-based key", () => {
    const snippet = generateDarkModeSnippet("my-site");
    expect(snippet).toContain("wai_my_site");
  });
});

describe("injectStateManagement", () => {
  it("injects state for interactive sites", () => {
    const html = '<!DOCTYPE html><html><head></head><body x-data="{ test: true }" class="dark:bg-black"><form><input x-model="name"></form></body></html>';
    const result = injectStateManagement(html, "test-site");
    expect(result).toContain("Alpine.store");
    expect(result.length).toBeGreaterThan(html.length);
  });

  it("injects dark mode prevention for dark mode sites", () => {
    const html = '<!DOCTYPE html><html><head></head><body x-data class="dark:bg-gray-900"><form></form></body></html>';
    const result = injectStateManagement(html, "test");
    expect(result).toContain("classList.add('dark')");
    // Dark mode snippet should be in <head>
    expect(result.indexOf("classList")).toBeLessThan(result.indexOf("</head>"));
  });

  it("does NOT inject for static sites", () => {
    const html = "<!DOCTYPE html><html><body><h1>Static</h1></body></html>";
    const result = injectStateManagement(html, "test");
    expect(result).toBe(html);
  });

  it("injects before </body>", () => {
    const html = '<html><body x-data class="dark:text-white"><form></form></body></html>';
    const result = injectStateManagement(html, "test");
    expect(result.indexOf("Alpine.store")).toBeLessThan(result.indexOf("</body>"));
  });

  it("preserves original HTML content", () => {
    const html = '<html><head></head><body x-data="{ x: 1 }"><form><input x-model="v"></form><p>Important content</p></body></html>';
    const result = injectStateManagement(html, "test");
    expect(result).toContain("Important content");
    expect(result).toContain('x-data="{ x: 1 }"');
  });
});
