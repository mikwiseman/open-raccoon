/**
 * Site Variants — generate multiple style options for user to choose from.
 *
 * Instead of one result, generate 2-3 variants with different approaches:
 * - Variant A: Bold & modern (gradients, large typography, animations)
 * - Variant B: Clean & minimal (whitespace, subtle colors, elegant)
 * - Variant C: Creative & unique (asymmetric layouts, unusual colors)
 *
 * User picks via inline keyboard: [A] [B] [C]
 */

import { log } from "@wai/core";

export type VariantStyle = "bold" | "minimal" | "creative";

/** A single variant option. */
export interface Variant {
  id: string;
  style: VariantStyle;
  label: string;
  description: string;
  /** Extra prompt hints for this style. */
  styleHints: string;
}

/** Pre-defined variant styles. */
export const VARIANT_STYLES: Variant[] = [
  {
    id: "A",
    style: "bold",
    label: "🔥 Bold & Modern",
    description: "Gradients, large typography, bold colors, prominent CTAs, hero animations",
    styleHints: `Design style: BOLD & MODERN
- Large hero section with gradient background (from-indigo-600 to-purple-700)
- Oversized headings (text-5xl to text-7xl) with bold weight
- Bright accent colors for CTAs (orange, amber, or lime)
- Card shadows with hover lift effects (shadow-xl → shadow-2xl)
- Background patterns or abstract shapes
- Counter animations with large numbers
- Full-width sections with strong visual contrast`,
  },
  {
    id: "B",
    style: "minimal",
    label: "✨ Clean & Minimal",
    description: "Generous whitespace, subtle colors, elegant typography, understated animations",
    styleHints: `Design style: CLEAN & MINIMAL
- Lots of whitespace (py-24, px-8), breathing room between elements
- Muted color palette: slate gray, soft blue, white background
- Thin, elegant typography (font-light for headings, text-3xl max)
- Subtle borders instead of shadows (border border-gray-200)
- Minimal hover effects (just color change, no transform)
- No gradients — solid colors only
- Single accent color used sparingly
- Clean lines, no decorative elements`,
  },
  {
    id: "C",
    style: "creative",
    label: "🎨 Creative & Unique",
    description: "Asymmetric layouts, unexpected colors, artistic elements, distinctive personality",
    styleHints: `Design style: CREATIVE & UNIQUE
- Asymmetric layouts (grid with different column spans)
- Unexpected color combinations (coral + teal, yellow + black, pink + navy)
- Mixed typography (serif headings + sans-serif body, or monospace accents)
- Rotated elements or skewed sections (transform rotate-1, -skew-y-1)
- Overlapping elements with z-index layering
- Custom cursor or scroll effects
- Animated borders or underlines
- Unique section transitions (diagonal dividers, wave SVGs)`,
  },
];

/**
 * Get variant by ID (A, B, or C).
 */
export function getVariantById(id: string): Variant | undefined {
  return VARIANT_STYLES.find((v) => v.id.toUpperCase() === id.toUpperCase());
}

/**
 * Detect if user wants variants.
 * Triggered by: "покажи варианты", "show options", "generate variants", --variants flag
 */
export function wantsVariants(text: string): boolean {
  const patterns = [
    /--variants?\b/i,
    /show\s+(?:me\s+)?(?:options|variants|choices|alternatives)/i,
    /(?:покажи|дай|сделай)\s+(?:варианты|варианта|опции|выбор)/i,
    /(?:несколько|пара|два|три)\s+(?:варианто?в|версии|версий)/i,
    /multiple\s+(?:versions?|options?|variants?)/i,
    /(?:different|various)\s+(?:styles?|designs?|options?)/i,
  ];
  return patterns.some((p) => p.test(text));
}

/**
 * Strip variant flag from description.
 */
export function stripVariantFlag(text: string): string {
  return text.replace(/--variants?\b/gi, "").trim();
}

/**
 * Build variant selection keyboard for Telegram inline buttons.
 */
export function buildVariantKeyboard(): Array<Array<{ text: string; callback_data: string }>> {
  return [
    VARIANT_STYLES.map((v) => ({
      text: v.label,
      callback_data: `variant:${v.id}`,
    })),
  ];
}

/**
 * Format variant preview message for Telegram.
 */
export function formatVariantPreview(): string {
  const lines = ["🎨 *Choose your style:*\n"];

  for (const v of VARIANT_STYLES) {
    lines.push(`*${v.label}*`);
    lines.push(`${v.description}\n`);
  }

  lines.push("_Tap a button below to generate that style._");
  return lines.join("\n");
}

/**
 * Parse variant choice from callback data.
 */
export function parseVariantCallback(data: string): string | undefined {
  const match = data.match(/^variant:([ABC])$/i);
  return match?.[1]?.toUpperCase();
}

/** Per-user pending variant request. */
const pendingVariants = new Map<string, { description: string; slug?: string }>();

/**
 * Store a pending variant request for a user.
 */
export function setPendingVariant(userId: string, description: string, slug?: string) {
  pendingVariants.set(userId, { description, slug });
  log.info({ service: "variants", action: "pending-set", userId });
}

/**
 * Get and clear a pending variant request.
 */
export function getPendingVariant(userId: string): { description: string; slug?: string } | undefined {
  const pending = pendingVariants.get(userId);
  if (pending) {
    pendingVariants.delete(userId);
  }
  return pending;
}

/**
 * Clear pending variant.
 */
export function clearPendingVariant(userId: string) {
  pendingVariants.delete(userId);
}
