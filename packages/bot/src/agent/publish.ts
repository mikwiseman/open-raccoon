/**
 * Site Publish Controls — draft/published states + custom slugs.
 *
 * Workflow:
 * - /build → generates + deploys immediately (default behavior unchanged)
 * - /build --draft → generates but does NOT deploy (preview only)
 * - /publish → deploys the current draft
 * - /unpublish → removes site from Cloudflare
 * - /slug <new-slug> → change the site URL
 *
 * Sites have states: draft | published | unpublished
 */

import { log } from "@wai/core";

export type SiteState = "draft" | "published" | "unpublished";

/** Per-user site publish state. */
interface PublishRecord {
  slug: string;
  state: SiteState;
  url?: string;
  draftHtml?: string;
  publishedAt?: Date;
  unpublishedAt?: Date;
}

const publishStore = new Map<string, PublishRecord>();

/**
 * Set site state.
 */
export function setSiteState(userId: string, slug: string, state: SiteState, url?: string, html?: string) {
  const existing = publishStore.get(userId);
  const record: PublishRecord = {
    slug,
    state,
    url: url ?? existing?.url,
    draftHtml: html ?? existing?.draftHtml,
    publishedAt: state === "published" ? new Date() : existing?.publishedAt,
    unpublishedAt: state === "unpublished" ? new Date() : undefined,
  };
  publishStore.set(userId, record);
  log.info({ service: "publish", action: "state-set", userId, slug, state });
}

/**
 * Get site publish state.
 */
export function getSiteState(userId: string): PublishRecord | undefined {
  return publishStore.get(userId);
}

/**
 * Check if user has a draft waiting to be published.
 */
export function hasDraft(userId: string): boolean {
  const record = publishStore.get(userId);
  return record?.state === "draft" && !!record.draftHtml;
}

/**
 * Get draft HTML for publishing.
 */
export function getDraftHtml(userId: string): string | undefined {
  const record = publishStore.get(userId);
  if (record?.state === "draft") return record.draftHtml;
  return undefined;
}

/**
 * Validate a custom slug.
 * Rules: 3-50 chars, lowercase, alphanumeric + hyphens, no leading/trailing hyphens.
 */
export function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (slug.length < 3) {
    return { valid: false, error: "Slug must be at least 3 characters" };
  }
  if (slug.length > 50) {
    return { valid: false, error: "Slug must be 50 characters or less" };
  }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length > 2) {
    return { valid: false, error: "Slug must be lowercase, alphanumeric, hyphens only (no leading/trailing hyphens)" };
  }
  if (/--/.test(slug)) {
    return { valid: false, error: "Slug cannot have consecutive hyphens" };
  }

  // Reserved slugs
  const reserved = ["www", "api", "app", "admin", "mail", "ftp", "wai", "test", "staging", "dev"];
  if (reserved.includes(slug)) {
    return { valid: false, error: `"${slug}" is reserved. Choose a different slug.` };
  }

  return { valid: true };
}

/**
 * Detect if user message is a draft request.
 */
export function isDraftRequest(text: string): boolean {
  return /--draft\b/i.test(text) || /черновик|draft\s+mode/i.test(text);
}

/**
 * Strip --draft flag from text.
 */
export function stripDraftFlag(text: string): string {
  return text.replace(/--draft/gi, "").replace(/черновик/gi, "").trim();
}

/**
 * Format site state for Telegram display.
 */
export function formatSiteState(userId: string): string {
  const record = publishStore.get(userId);
  if (!record) return "No site found.";

  const stateEmoji: Record<SiteState, string> = {
    draft: "📝", published: "🟢", unpublished: "🔴",
  };

  const lines = [
    `${stateEmoji[record.state]} *${record.slug}* — ${record.state.toUpperCase()}`,
  ];

  if (record.url && record.state === "published") {
    lines.push(`🌐 ${record.url}`);
    if (record.publishedAt) {
      lines.push(`📅 Published: ${record.publishedAt.toISOString().slice(0, 16).replace("T", " ")}`);
    }
  }

  if (record.state === "draft") {
    lines.push("💡 Use /publish to deploy, or /edit to make changes first.");
  }

  if (record.state === "unpublished") {
    lines.push("💡 Use /publish to re-deploy.");
    if (record.unpublishedAt) {
      lines.push(`📅 Unpublished: ${record.unpublishedAt.toISOString().slice(0, 16).replace("T", " ")}`);
    }
  }

  return lines.join("\n");
}

/**
 * Clear publish state for testing.
 */
export function clearPublishState(userId: string) {
  publishStore.delete(userId);
}
