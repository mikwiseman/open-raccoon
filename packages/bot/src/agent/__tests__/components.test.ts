import { describe, it, expect, vi } from "vitest";

vi.mock("@wai/core", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  COMPONENTS, findRelevantComponents, buildComponentPrompt,
  getComponentById, listComponents,
} from "../components.js";

describe("COMPONENTS", () => {
  it("has at least 6 components", () => {
    expect(COMPONENTS.length).toBeGreaterThanOrEqual(6);
  });

  it("each has required fields", () => {
    for (const c of COMPONENTS) {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.triggers.length).toBeGreaterThan(0);
      expect(c.snippet.length).toBeGreaterThan(50);
      expect(c.description.length).toBeGreaterThan(10);
    }
  });

  it("has unique IDs", () => {
    const ids = COMPONENTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("snippets contain valid HTML", () => {
    for (const c of COMPONENTS) {
      expect(c.snippet).toMatch(/<[a-z]/i);
    }
  });

  it("snippets use Tailwind classes", () => {
    for (const c of COMPONENTS) {
      expect(c.snippet).toMatch(/class="/);
    }
  });

  it("most snippets use Alpine.js", () => {
    const alpineCount = COMPONENTS.filter((c) => /x-data|x-show|x-on|@click/i.test(c.snippet)).length;
    expect(alpineCount).toBeGreaterThanOrEqual(4);
  });

  it("includes both EN and RU triggers", () => {
    const allTriggers = COMPONENTS.flatMap((c) => c.triggers);
    const hasRussian = allTriggers.some((t) => /[\u0400-\u04FF]/.test(t));
    expect(hasRussian).toBe(true);
  });
});

describe("findRelevantComponents", () => {
  it("finds pricing component", () => {
    const comps = findRelevantComponents("Landing page with pricing plans");
    expect(comps.some((c) => c.id === "pricing-toggle")).toBe(true);
  });

  it("finds FAQ component", () => {
    const comps = findRelevantComponents("Site with FAQ section");
    expect(comps.some((c) => c.id === "faq-accordion")).toBe(true);
  });

  it("finds testimonial component", () => {
    const comps = findRelevantComponents("Add testimonials and reviews");
    expect(comps.some((c) => c.id === "testimonial-carousel")).toBe(true);
  });

  it("finds contact form component", () => {
    const comps = findRelevantComponents("Contact form for business");
    expect(comps.some((c) => c.id === "contact-form")).toBe(true);
  });

  it("finds hero component", () => {
    const comps = findRelevantComponents("Beautiful hero section");
    expect(comps.some((c) => c.id === "hero-gradient")).toBe(true);
  });

  it("finds countdown for events", () => {
    const comps = findRelevantComponents("Event page with countdown timer");
    expect(comps.some((c) => c.id === "countdown-timer")).toBe(true);
  });

  it("finds Russian triggers", () => {
    const comps = findRelevantComponents("Страница с отзывы и цены и контакт");
    expect(comps.some((c) => c.id === "testimonial-carousel")).toBe(true);
    expect(comps.some((c) => c.id === "pricing-toggle")).toBe(true);
  });

  it("returns empty for unrelated text", () => {
    const comps = findRelevantComponents("Something about quantum physics");
    expect(comps).toHaveLength(0);
  });

  it("finds multiple components", () => {
    const comps = findRelevantComponents("Site with pricing, FAQ, testimonials, and contact form");
    expect(comps.length).toBeGreaterThanOrEqual(4);
  });
});

describe("buildComponentPrompt", () => {
  it("returns empty for no components", () => {
    expect(buildComponentPrompt([])).toBe("");
  });

  it("includes component names", () => {
    const comps = findRelevantComponents("pricing FAQ");
    const prompt = buildComponentPrompt(comps);
    expect(prompt).toContain("Pricing");
    expect(prompt).toContain("FAQ");
  });

  it("includes code snippets", () => {
    const comps = findRelevantComponents("pricing");
    const prompt = buildComponentPrompt(comps);
    expect(prompt).toContain("```html");
    expect(prompt).toContain("x-data");
  });

  it("includes Reference Components header", () => {
    const comps = [COMPONENTS[0]];
    const prompt = buildComponentPrompt(comps);
    expect(prompt).toContain("Reference Components");
  });
});

describe("getComponentById", () => {
  it("finds by ID", () => {
    expect(getComponentById("pricing-toggle")?.name).toContain("Pricing");
  });

  it("returns undefined for unknown", () => {
    expect(getComponentById("nonexistent")).toBeUndefined();
  });
});

describe("listComponents", () => {
  it("includes all component names", () => {
    const list = listComponents();
    for (const c of COMPONENTS) {
      expect(list).toContain(c.name);
    }
  });

  it("includes descriptions", () => {
    const list = listComponents();
    expect(list).toContain("toggle");
  });
});
