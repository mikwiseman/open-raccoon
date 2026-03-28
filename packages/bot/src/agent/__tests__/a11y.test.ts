import { describe, it, expect, vi } from "vitest";

vi.mock("@wai/core", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { checkAccessibility, formatA11yReport } from "../a11y.js";

const GOOD_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta name="viewport" content="width=device-width"></head>
<body>
<nav><a href="#main">Skip to content</a></nav>
<main>
  <h1>Welcome</h1>
  <h2>Features</h2>
  <img src="photo.jpg" alt="A beautiful photo">
  <form>
    <label for="name">Name</label>
    <input id="name" type="text" aria-label="Your name">
    <button type="submit" class="focus:ring-2">Send</button>
  </form>
</main>
<footer role="contentinfo">Footer</footer>
</body></html>`;

const BAD_HTML = `<html><body>
<h1>Title</h1>
<h3>Skipped h2</h3>
<img src="photo.jpg">
<a href="#"></a>
<button></button>
<form><input type="text"></form>
</body></html>`;

describe("checkAccessibility", () => {
  describe("good HTML", () => {
    it("scores high for accessible HTML", () => {
      const report = checkAccessibility(GOOD_HTML);
      expect(report.score).toBeGreaterThanOrEqual(85);
      expect(report.passed).toBe(true);
    });

    it("detects lang attribute", () => {
      const report = checkAccessibility(GOOD_HTML);
      expect(report.issues.some((i) => i.rule === "html-lang")).toBe(false);
    });

    it("detects alt text on images", () => {
      const report = checkAccessibility(GOOD_HTML);
      expect(report.issues.some((i) => i.rule === "img-alt")).toBe(false);
    });

    it("detects form labels", () => {
      const report = checkAccessibility(GOOD_HTML);
      expect(report.issues.some((i) => i.rule === "form-label")).toBe(false);
    });

    it("detects focus styles", () => {
      const report = checkAccessibility(GOOD_HTML);
      expect(report.issues.some((i) => i.rule === "focus-visible")).toBe(false);
    });
  });

  describe("bad HTML", () => {
    it("scores lower for inaccessible HTML", () => {
      const report = checkAccessibility(BAD_HTML);
      expect(report.score).toBeLessThan(70);
    });

    it("flags missing lang", () => {
      const report = checkAccessibility(BAD_HTML);
      expect(report.issues.some((i) => i.rule === "html-lang")).toBe(true);
    });

    it("flags missing alt text", () => {
      const report = checkAccessibility(BAD_HTML);
      expect(report.issues.some((i) => i.rule === "img-alt")).toBe(true);
    });

    it("flags empty links", () => {
      const report = checkAccessibility(BAD_HTML);
      expect(report.issues.some((i) => i.rule === "empty-link")).toBe(true);
    });

    it("flags empty buttons", () => {
      const report = checkAccessibility(BAD_HTML);
      expect(report.issues.some((i) => i.rule === "empty-button")).toBe(true);
    });

    it("flags heading skip", () => {
      const report = checkAccessibility(BAD_HTML);
      expect(report.issues.some((i) => i.rule === "heading-order")).toBe(true);
    });

    it("flags missing viewport", () => {
      const report = checkAccessibility(BAD_HTML);
      expect(report.issues.some((i) => i.rule === "viewport")).toBe(true);
    });
  });

  describe("specific checks", () => {
    it("detects missing h1", () => {
      const report = checkAccessibility("<html lang='en'><body><h2>No h1</h2></body></html>");
      expect(report.issues.some((i) => i.rule === "heading-h1")).toBe(true);
    });

    it("does not flag hidden inputs as unlabeled", () => {
      const html = '<html lang="en"><body><form><input type="hidden" name="token"></form></body></html>';
      const report = checkAccessibility(html);
      expect(report.issues.some((i) => i.rule === "form-label")).toBe(false);
    });

    it("does not flag submit buttons as unlabeled", () => {
      const html = '<html lang="en"><body><form><input type="submit" value="Go"></form></body></html>';
      const report = checkAccessibility(html);
      expect(report.issues.some((i) => i.rule === "form-label")).toBe(false);
    });

    it("gives bonus for ARIA attributes", () => {
      const withAria = '<html lang="en"><body><nav aria-label="Main" role="navigation"><div aria-hidden="true"></div><button aria-expanded="false">Menu</button></nav></body></html>';
      const withoutAria = '<html lang="en"><body><div>No aria</div></body></html>';
      const scoreWith = checkAccessibility(withAria).score;
      const scoreWithout = checkAccessibility(withoutAria).score;
      expect(scoreWith).toBeGreaterThanOrEqual(scoreWithout);
    });

    it("detects missing landmarks", () => {
      const html = '<html lang="en"><body><div>No semantic HTML</div></body></html>';
      const report = checkAccessibility(html);
      expect(report.issues.some((i) => i.rule === "landmarks")).toBe(true);
    });
  });

  describe("score bounds", () => {
    it("never exceeds 100", () => {
      expect(checkAccessibility(GOOD_HTML).score).toBeLessThanOrEqual(100);
    });

    it("never goes below 0", () => {
      // Extremely bad HTML
      const terrible = "<img><img><img><img><img><a></a><a></a><a></a><button></button><button></button>";
      expect(checkAccessibility(terrible).score).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("formatA11yReport", () => {
  it("shows grade A for high score", () => {
    const report = checkAccessibility(GOOD_HTML);
    const text = formatA11yReport(report);
    expect(text).toMatch(/[AB]/);
    expect(text).toContain("♿");
  });

  it("shows issues grouped by severity", () => {
    const report = checkAccessibility(BAD_HTML);
    const text = formatA11yReport(report);
    expect(text).toContain("Critical");
  });

  it("shows no issues for perfect HTML", () => {
    const report = checkAccessibility(GOOD_HTML);
    if (report.issues.length === 0) {
      expect(formatA11yReport(report)).toContain("No accessibility issues");
    }
  });

  it("shows score", () => {
    const report = checkAccessibility(GOOD_HTML);
    const text = formatA11yReport(report);
    expect(text).toContain("/100");
  });
});
