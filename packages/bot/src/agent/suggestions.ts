/**
 * Smart Suggestions — proactive improvement recommendations after build.
 *
 * Analyzes generated sites using quality/a11y/perf scores and suggests
 * specific improvements the user can apply with one tap.
 *
 * Each suggestion is an inline button that triggers an /edit command.
 */

import { log } from "@wai/core";
import type { QualityReport } from "./validator.js";
import type { A11yReport } from "./a11y.js";
import type { PerfReport } from "./perf.js";

/** A single improvement suggestion. */
export interface Suggestion {
  id: string;
  emoji: string;
  label: string;
  editCommand: string;
  priority: number; // higher = more important
  category: "quality" | "a11y" | "perf" | "content" | "ux";
}

/**
 * Generate suggestions based on site analysis.
 * Returns top 3 most impactful suggestions.
 */
export function generateSuggestions(
  html: string,
  quality?: QualityReport,
  a11y?: A11yReport,
  perf?: PerfReport,
): Suggestion[] {
  const all: Suggestion[] = [];

  // Quality-based suggestions
  if (quality) {
    if (!quality.stats.hasDarkMode) {
      all.push({
        id: "add-dark-mode", emoji: "🌙", label: "Add dark mode",
        editCommand: "Add a dark mode toggle with smooth transition. Use Tailwind dark: prefix for all sections.",
        priority: 85, category: "ux",
      });
    }

    if (!quality.stats.hasForm) {
      all.push({
        id: "add-contact-form", emoji: "📝", label: "Add contact form",
        editCommand: "Add a contact section with a form (name, email, message) with real-time validation and a submit button.",
        priority: 80, category: "content",
      });
    }

    if (quality.stats.interactiveCount < 3) {
      all.push({
        id: "add-animations", emoji: "✨", label: "Add animations",
        editCommand: "Add smooth scroll-triggered animations: sections fade in from below, cards lift on hover, counters animate up on scroll.",
        priority: 70, category: "ux",
      });
    }

    if (quality.stats.sectionCount < 4) {
      all.push({
        id: "add-testimonials", emoji: "⭐", label: "Add testimonials",
        editCommand: "Add a testimonials section with 3 customer reviews including avatar, name, role, star rating, and quote.",
        priority: 75, category: "content",
      });
    }
  }

  // A11y-based suggestions
  if (a11y) {
    const criticalIssues = a11y.issues.filter((i) => i.severity === "critical");
    if (criticalIssues.length > 0) {
      all.push({
        id: "fix-a11y-critical", emoji: "♿", label: "Fix accessibility",
        editCommand: `Fix accessibility issues: ${criticalIssues.map((i) => i.message).join(". ")}. Add alt text to all images, aria-labels to buttons.`,
        priority: 95, category: "a11y",
      });
    }

    if (a11y.issues.some((i) => i.rule === "focus-visible")) {
      all.push({
        id: "add-focus-styles", emoji: "⌨️", label: "Add keyboard nav",
        editCommand: "Add visible focus styles: focus:ring-2 focus:ring-primary-500 to all interactive elements (links, buttons, inputs).",
        priority: 60, category: "a11y",
      });
    }
  }

  // Performance-based suggestions
  if (perf) {
    if (!perf.metrics.hasLazyImages && perf.metrics.imageCount > 2) {
      all.push({
        id: "add-lazy-loading", emoji: "🖼️", label: "Add lazy loading",
        editCommand: 'Add loading="lazy" to all images below the fold for faster page load.',
        priority: 65, category: "perf",
      });
    }
  }

  // Content-based suggestions (from HTML analysis)
  if (!/<section[^>]*id\s*=\s*["']faq/i.test(html) && !/<h2[^>]*>FAQ/i.test(html)) {
    all.push({
      id: "add-faq", emoji: "❓", label: "Add FAQ section",
      editCommand: "Add an FAQ section with 5-6 common questions and answers using an accordion with smooth expand/collapse animations.",
      priority: 65, category: "content",
    });
  }

  if (!/<section[^>]*id\s*=\s*["']pricing/i.test(html) && !/<h2[^>]*>Pricing/i.test(html) && !/<h2[^>]*>Цен/i.test(html)) {
    all.push({
      id: "add-pricing", emoji: "💰", label: "Add pricing",
      editCommand: "Add a pricing section with 3 tiers (Basic, Pro, Enterprise) with feature lists, prices, and a monthly/annual toggle.",
      priority: 60, category: "content",
    });
  }

  // Sort by priority and return top 3
  all.sort((a, b) => b.priority - a.priority);
  const top = all.slice(0, 3);

  log.info({ service: "suggestions", action: "generated", total: all.length, returned: top.length });
  return top;
}

/**
 * Build inline keyboard for suggestions.
 */
export function buildSuggestionKeyboard(suggestions: Suggestion[]): Array<Array<{ text: string; callback_data: string }>> {
  if (suggestions.length === 0) return [];

  return [
    suggestions.map((s) => ({
      text: `${s.emoji} ${s.label}`,
      callback_data: `suggest:${s.id}`,
    })),
  ];
}

/**
 * Parse suggestion callback data.
 */
export function parseSuggestionCallback(data: string): string | undefined {
  const match = data.match(/^suggest:(.+)$/);
  return match?.[1];
}

/**
 * Get the edit command for a suggestion by ID.
 */
export function getSuggestionEditCommand(suggestions: Suggestion[], id: string): string | undefined {
  return suggestions.find((s) => s.id === id)?.editCommand;
}

/**
 * Format suggestions as text (fallback if inline keyboard not available).
 */
export function formatSuggestionsText(suggestions: Suggestion[]): string {
  if (suggestions.length === 0) return "";

  const lines = ["💡 *Suggestions to improve your site:*\n"];
  for (const s of suggestions) {
    lines.push(`${s.emoji} *${s.label}*`);
    lines.push(`  → \`/edit ${s.editCommand.slice(0, 60)}...\`\n`);
  }

  return lines.join("\n");
}

/** Store suggestions per user for callback handling. */
const userSuggestions = new Map<string, Suggestion[]>();

export function storeSuggestions(userId: string, suggestions: Suggestion[]) {
  userSuggestions.set(userId, suggestions);
}

export function getStoredSuggestions(userId: string): Suggestion[] {
  return userSuggestions.get(userId) ?? [];
}

export function clearSuggestions(userId: string) {
  userSuggestions.delete(userId);
}
