import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@wai/core", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  VARIANT_STYLES, getVariantById,
  wantsVariants, stripVariantFlag,
  buildVariantKeyboard, formatVariantPreview, parseVariantCallback,
  setPendingVariant, getPendingVariant, clearPendingVariant,
} from "../variants.js";

describe("VARIANT_STYLES", () => {
  it("has 3 variants", () => {
    expect(VARIANT_STYLES).toHaveLength(3);
  });

  it("each has required fields", () => {
    for (const v of VARIANT_STYLES) {
      expect(v.id).toBeTruthy();
      expect(v.style).toBeTruthy();
      expect(v.label).toBeTruthy();
      expect(v.description).toBeTruthy();
      expect(v.styleHints.length).toBeGreaterThan(50);
    }
  });

  it("has A, B, C ids", () => {
    expect(VARIANT_STYLES.map((v) => v.id)).toEqual(["A", "B", "C"]);
  });

  it("has distinct styles", () => {
    const styles = VARIANT_STYLES.map((v) => v.style);
    expect(new Set(styles).size).toBe(3);
  });
});

describe("getVariantById", () => {
  it("finds variant A", () => {
    expect(getVariantById("A")?.style).toBe("bold");
  });

  it("finds variant B", () => {
    expect(getVariantById("B")?.style).toBe("minimal");
  });

  it("finds variant C", () => {
    expect(getVariantById("C")?.style).toBe("creative");
  });

  it("is case-insensitive", () => {
    expect(getVariantById("a")?.id).toBe("A");
    expect(getVariantById("b")?.id).toBe("B");
  });

  it("returns undefined for unknown", () => {
    expect(getVariantById("D")).toBeUndefined();
    expect(getVariantById("")).toBeUndefined();
  });
});

describe("wantsVariants", () => {
  it("detects --variants flag", () => {
    expect(wantsVariants("/build --variants cafe site")).toBe(true);
  });

  it("detects --variant (singular)", () => {
    expect(wantsVariants("Build a site --variant")).toBe(true);
  });

  it("detects 'show options'", () => {
    expect(wantsVariants("Show me options for a cafe")).toBe(true);
  });

  it("detects 'show variants'", () => {
    expect(wantsVariants("Show variants please")).toBe(true);
  });

  it("detects Russian 'покажи варианты'", () => {
    expect(wantsVariants("Покажи варианты для кафе")).toBe(true);
  });

  it("detects 'несколько вариантов'", () => {
    expect(wantsVariants("Сделай несколько вариантов")).toBe(true);
  });

  it("detects 'different styles'", () => {
    expect(wantsVariants("Show different styles for my portfolio")).toBe(true);
  });

  it("detects 'multiple versions'", () => {
    expect(wantsVariants("Generate multiple versions")).toBe(true);
  });

  it("returns false for normal build", () => {
    expect(wantsVariants("Build a landing page for my cafe")).toBe(false);
  });

  it("returns false for empty", () => {
    expect(wantsVariants("")).toBe(false);
  });
});

describe("stripVariantFlag", () => {
  it("removes --variants", () => {
    expect(stripVariantFlag("cafe site --variants")).toBe("cafe site");
  });

  it("removes --variant", () => {
    expect(stripVariantFlag("--variant my site")).toBe("my site");
  });

  it("preserves text without flag", () => {
    expect(stripVariantFlag("just a normal description")).toBe("just a normal description");
  });
});

describe("buildVariantKeyboard", () => {
  it("returns array of button rows", () => {
    const keyboard = buildVariantKeyboard();
    expect(keyboard).toHaveLength(1); // one row
    expect(keyboard[0]).toHaveLength(3); // three buttons
  });

  it("buttons have text and callback_data", () => {
    const keyboard = buildVariantKeyboard();
    for (const btn of keyboard[0]) {
      expect(btn.text).toBeTruthy();
      expect(btn.callback_data).toMatch(/^variant:[ABC]$/);
    }
  });
});

describe("formatVariantPreview", () => {
  it("includes all variant names", () => {
    const text = formatVariantPreview();
    expect(text).toContain("Bold");
    expect(text).toContain("Minimal");
    expect(text).toContain("Creative");
  });

  it("includes descriptions", () => {
    const text = formatVariantPreview();
    expect(text).toContain("Gradient");
    expect(text).toContain("whitespace");
    expect(text).toContain("Asymmetric");
  });

  it("includes call-to-action", () => {
    const text = formatVariantPreview();
    expect(text).toContain("Tap");
  });
});

describe("parseVariantCallback", () => {
  it("parses variant:A", () => {
    expect(parseVariantCallback("variant:A")).toBe("A");
  });

  it("parses variant:B", () => {
    expect(parseVariantCallback("variant:B")).toBe("B");
  });

  it("parses variant:C", () => {
    expect(parseVariantCallback("variant:C")).toBe("C");
  });

  it("returns undefined for invalid", () => {
    expect(parseVariantCallback("other:data")).toBeUndefined();
    expect(parseVariantCallback("variant:D")).toBeUndefined();
    expect(parseVariantCallback("")).toBeUndefined();
  });
});

describe("pending variants", () => {
  beforeEach(() => {
    clearPendingVariant("user-1");
  });

  it("stores and retrieves pending variant", () => {
    setPendingVariant("user-1", "Cafe site", "my-cafe");
    const pending = getPendingVariant("user-1");
    expect(pending?.description).toBe("Cafe site");
    expect(pending?.slug).toBe("my-cafe");
  });

  it("getPendingVariant clears after retrieval", () => {
    setPendingVariant("user-1", "Test");
    getPendingVariant("user-1");
    expect(getPendingVariant("user-1")).toBeUndefined();
  });

  it("returns undefined for unknown user", () => {
    expect(getPendingVariant("unknown")).toBeUndefined();
  });

  it("clearPendingVariant removes pending", () => {
    setPendingVariant("user-1", "Test");
    clearPendingVariant("user-1");
    expect(getPendingVariant("user-1")).toBeUndefined();
  });
});
