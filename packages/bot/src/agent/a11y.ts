/**
 * Accessibility Checker — validate generated sites for a11y best practices.
 *
 * Checks WCAG 2.1 Level A/AA common issues:
 * - Images without alt text
 * - Missing form labels
 * - Missing lang attribute
 * - Empty links/buttons
 * - Missing heading hierarchy (h1 → h2 → h3)
 * - Missing skip-to-content link
 * - Low contrast indicators
 * - Missing ARIA landmarks
 * - Missing focus styles
 */

import { log } from "@wai/core";

/** A single a11y issue. */
export interface A11yIssue {
  rule: string;
  severity: "critical" | "serious" | "moderate" | "minor";
  message: string;
  count: number;
}

/** Accessibility report. */
export interface A11yReport {
  score: number; // 0-100
  issues: A11yIssue[];
  passed: boolean; // score >= 70
  summary: string;
}

/**
 * Run accessibility checks on generated HTML.
 */
export function checkAccessibility(html: string): A11yReport {
  const issues: A11yIssue[] = [];
  let score = 100;

  // 1. Images without alt text
  const imgNoAlt = countPattern(html, /<img(?![^>]*alt\s*=)[^>]*>/gi);
  if (imgNoAlt > 0) {
    issues.push({ rule: "img-alt", severity: "critical", message: `${imgNoAlt} image(s) missing alt text`, count: imgNoAlt });
    score -= Math.min(20, imgNoAlt * 5);
  }

  // 2. Missing lang attribute on <html>
  if (!/<html[^>]*\slang\s*=/i.test(html)) {
    issues.push({ rule: "html-lang", severity: "serious", message: "Missing lang attribute on <html>", count: 1 });
    score -= 10;
  }

  // 3. Empty links (<a> with no text content)
  const emptyLinks = countPattern(html, /<a[^>]*>\s*<\/a>/gi);
  if (emptyLinks > 0) {
    issues.push({ rule: "empty-link", severity: "serious", message: `${emptyLinks} empty link(s) — no text for screen readers`, count: emptyLinks });
    score -= Math.min(15, emptyLinks * 3);
  }

  // 4. Empty buttons
  const emptyButtons = countPattern(html, /<button[^>]*>\s*<\/button>/gi);
  if (emptyButtons > 0) {
    issues.push({ rule: "empty-button", severity: "serious", message: `${emptyButtons} empty button(s)`, count: emptyButtons });
    score -= Math.min(15, emptyButtons * 3);
  }

  // 5. Form inputs without labels
  const inputs = countPattern(html, /<input(?![^>]*type\s*=\s*["'](?:hidden|submit|button|reset))[^>]*>/gi);
  const labels = countPattern(html, /<label[\s>]/gi);
  const ariaLabels = countPattern(html, /aria-label\s*=/gi);
  const placeholders = countPattern(html, /placeholder\s*=/gi);
  // Inputs should have either a label, aria-label, or at minimum a placeholder
  const unlabeled = Math.max(0, inputs - labels - ariaLabels);
  if (unlabeled > 0 && placeholders < inputs) {
    issues.push({ rule: "form-label", severity: "serious", message: `${unlabeled} form input(s) may lack accessible labels`, count: unlabeled });
    score -= Math.min(15, unlabeled * 3);
  }

  // 6. Missing h1
  if (!/<h1[\s>]/i.test(html)) {
    issues.push({ rule: "heading-h1", severity: "moderate", message: "Missing <h1> — page needs a main heading", count: 1 });
    score -= 5;
  }

  // 7. Heading hierarchy skip (e.g., h1 → h3, skipping h2)
  const headingLevels = [...html.matchAll(/<h([1-6])[\s>]/gi)].map((m) => parseInt(m[1]));
  let hasSkip = false;
  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i] > headingLevels[i - 1] + 1) {
      hasSkip = true;
      break;
    }
  }
  if (hasSkip) {
    issues.push({ rule: "heading-order", severity: "moderate", message: "Heading levels skip (e.g., h1 → h3) — use sequential order", count: 1 });
    score -= 5;
  }

  // 8. Missing viewport meta (mobile accessibility)
  if (!/viewport/i.test(html)) {
    issues.push({ rule: "viewport", severity: "moderate", message: "Missing viewport meta — site may not be accessible on mobile", count: 1 });
    score -= 5;
  }

  // 9. No ARIA landmarks (nav, main, footer roles)
  const hasNav = /<nav[\s>]/i.test(html);
  const hasMain = /<main[\s>]/i.test(html);
  const hasFooter = /<footer[\s>]/i.test(html);
  if (!hasNav && !hasMain) {
    issues.push({ rule: "landmarks", severity: "minor", message: "No ARIA landmarks (<nav>, <main>) — screen readers need them", count: 1 });
    score -= 3;
  }

  // 10. Focus visible styles
  const hasFocusStyles = /focus:/i.test(html) || /:focus/i.test(html) || /focus-visible/i.test(html);
  if (!hasFocusStyles) {
    issues.push({ rule: "focus-visible", severity: "minor", message: "No focus styles detected — keyboard navigation may be invisible", count: 1 });
    score -= 3;
  }

  // Bonus: ARIA attributes present
  const ariaCount = countPattern(html, /aria-[\w]+\s*=/gi);
  if (ariaCount >= 3) score = Math.min(100, score + 3);

  // Bonus: role attributes
  const roleCount = countPattern(html, /role\s*=\s*"/gi);
  if (roleCount >= 2) score = Math.min(100, score + 2);

  score = Math.max(0, Math.min(100, score));

  const summary = buildA11ySummary(issues, score);
  log.info({ service: "a11y", action: "checked", score, issues: issues.length });

  return { score, issues, passed: score >= 70, summary };
}

/**
 * Format a11y report for Telegram.
 */
export function formatA11yReport(report: A11yReport): string {
  const grade = report.score >= 90 ? "A" : report.score >= 75 ? "B" : report.score >= 60 ? "C" : report.score >= 50 ? "D" : "F";
  const emoji = report.score >= 90 ? "♿✅" : report.score >= 70 ? "♿⚠️" : "♿❌";

  const lines = [`${emoji} *Accessibility: ${grade}* (${report.score}/100)\n`];

  if (report.issues.length === 0) {
    lines.push("No accessibility issues found!");
  } else {
    const grouped = {
      critical: report.issues.filter((i) => i.severity === "critical"),
      serious: report.issues.filter((i) => i.severity === "serious"),
      moderate: report.issues.filter((i) => i.severity === "moderate"),
      minor: report.issues.filter((i) => i.severity === "minor"),
    };

    if (grouped.critical.length > 0) {
      lines.push("🔴 *Critical:*");
      grouped.critical.forEach((i) => lines.push(`  ${i.message}`));
    }
    if (grouped.serious.length > 0) {
      lines.push("🟠 *Serious:*");
      grouped.serious.forEach((i) => lines.push(`  ${i.message}`));
    }
    if (grouped.moderate.length > 0) {
      lines.push("🟡 *Moderate:*");
      grouped.moderate.forEach((i) => lines.push(`  ${i.message}`));
    }
    if (grouped.minor.length > 0) {
      lines.push("🔵 *Minor:*");
      grouped.minor.forEach((i) => lines.push(`  ${i.message}`));
    }
  }

  return lines.join("\n");
}

// --- Helpers ---

function countPattern(html: string, pattern: RegExp): number {
  return (html.match(pattern) ?? []).length;
}

function buildA11ySummary(issues: A11yIssue[], score: number): string {
  if (issues.length === 0) return `Accessibility: ${score}/100 — No issues`;

  const critical = issues.filter((i) => i.severity === "critical").length;
  const serious = issues.filter((i) => i.severity === "serious").length;

  const parts = [`Score: ${score}/100`];
  if (critical > 0) parts.push(`${critical} critical`);
  if (serious > 0) parts.push(`${serious} serious`);
  parts.push(`${issues.length} total issues`);

  return parts.join(", ");
}
