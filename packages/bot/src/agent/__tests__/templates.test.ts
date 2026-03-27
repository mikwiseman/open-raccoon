import { describe, it, expect, vi } from "vitest";

vi.mock("@wai/core", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  TEMPLATES, detectTemplate, getTemplateById, listTemplates,
} from "../templates.js";

describe("TEMPLATES", () => {
  it("has at least 5 templates", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(5);
  });

  it("each template has required fields", () => {
    for (const t of TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.keywords.length).toBeGreaterThan(0);
      expect(t.plan.sections.length).toBeGreaterThan(0);
      expect(t.plan.colorScheme).toBeTruthy();
      expect(t.plan.typography).toBeTruthy();
      expect(t.plan.interactiveElements.length).toBeGreaterThan(0);
      expect(t.plan.estimatedComplexity).toBeTruthy();
      expect(t.promptHints).toBeTruthy();
    }
  });

  it("has unique IDs", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each template has both EN and RU keywords", () => {
    for (const t of TEMPLATES) {
      const hasEnglish = t.keywords.some((k) => /^[a-z]+$/.test(k));
      const hasRussian = t.keywords.some((k) => /[\u0400-\u04FF]/.test(k));
      expect(hasEnglish).toBe(true);
      expect(hasRussian).toBe(true);
    }
  });
});

describe("detectTemplate", () => {
  it("detects restaurant template", () => {
    const t = detectTemplate("Лендинг для ресторана итальянской кухни");
    expect(t?.id).toBe("restaurant");
  });

  it("detects restaurant from English", () => {
    const t = detectTemplate("Landing page for my cafe with menu");
    expect(t?.id).toBe("restaurant");
  });

  it("detects portfolio template", () => {
    const t = detectTemplate("Personal portfolio for a web developer");
    expect(t?.id).toBe("portfolio");
  });

  it("detects portfolio from Russian", () => {
    const t = detectTemplate("Портфолио дизайнера с проектами");
    expect(t?.id).toBe("portfolio");
  });

  it("detects SaaS template", () => {
    const t = detectTemplate("Landing for our SaaS product, project management tool");
    expect(t?.id).toBe("saas");
  });

  it("detects event template", () => {
    const t = detectTemplate("Сайт для хакатона по AI");
    expect(t?.id).toBe("event");
  });

  it("detects event from English", () => {
    const t = detectTemplate("Conference website for tech summit 2026");
    expect(t?.id).toBe("event");
  });

  it("detects ecommerce template", () => {
    const t = detectTemplate("Онлайн магазин одежды с товарами");
    expect(t?.id).toBe("ecommerce");
  });

  it("detects landing template", () => {
    const t = detectTemplate("Простой лендинг для промо-акции");
    expect(t?.id).toBe("landing");
  });

  it("returns undefined for unrecognized description", () => {
    const t = detectTemplate("Something completely random about quantum physics");
    expect(t).toBeUndefined();
  });

  it("picks highest scoring template on multiple keyword matches", () => {
    // "coffee cafe menu" matches restaurant (3 keywords) more than anything else
    const t = detectTemplate("Coffee cafe with full menu and bar");
    expect(t?.id).toBe("restaurant");
  });

  it("handles empty string", () => {
    const t = detectTemplate("");
    expect(t).toBeUndefined();
  });
});

describe("getTemplateById", () => {
  it("returns template by ID", () => {
    const t = getTemplateById("restaurant");
    expect(t?.name).toBe("Restaurant / Cafe");
  });

  it("returns undefined for unknown ID", () => {
    expect(getTemplateById("nonexistent")).toBeUndefined();
  });

  it("returns all templates by their IDs", () => {
    for (const template of TEMPLATES) {
      const found = getTemplateById(template.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(template.id);
    }
  });
});

describe("listTemplates", () => {
  it("returns markdown formatted list", () => {
    const list = listTemplates();
    expect(list).toContain("Restaurant");
    expect(list).toContain("Portfolio");
    expect(list).toContain("SaaS");
    expect(list).toContain("Event");
    expect(list).toContain("E-commerce");
    expect(list).toContain("Landing");
  });

  it("includes template IDs in backticks", () => {
    const list = listTemplates();
    expect(list).toContain("`restaurant`");
    expect(list).toContain("`portfolio`");
  });

  it("includes section and interactive element counts", () => {
    const list = listTemplates();
    expect(list).toContain("sections");
    expect(list).toContain("interactive elements");
  });
});
