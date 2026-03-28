/**
 * Collaboration — multi-user site building in Telegram groups.
 *
 * When the bot is added to a group:
 * - Any member can /build, /edit, /undo
 * - The site is shared among all group members
 * - Each edit is attributed to the person who made it
 * - /contributors shows who did what
 *
 * Group sites use chatId (negative number) as the key instead of userId.
 * This allows shared state naturally.
 */

import { log } from "@wai/core";

/** A contribution to a group site. */
export interface Contribution {
  userId: string;
  userName: string;
  action: "build" | "edit" | "undo" | "redo";
  detail: string;
  timestamp: Date;
}

/** Per-group contribution history. Key = chatId (string, negative for groups). */
const contributionStore = new Map<string, Contribution[]>();
const MAX_CONTRIBUTIONS = 100;

/**
 * Record a contribution to a group site.
 */
export function recordContribution(
  chatId: string,
  userId: string,
  userName: string,
  action: Contribution["action"],
  detail: string,
) {
  if (!contributionStore.has(chatId)) {
    contributionStore.set(chatId, []);
  }

  const contributions = contributionStore.get(chatId)!;
  contributions.push({ userId, userName, action, detail, timestamp: new Date() });

  if (contributions.length > MAX_CONTRIBUTIONS) {
    contributions.splice(0, contributions.length - MAX_CONTRIBUTIONS);
  }

  log.info({ service: "collab", action: "contribution", chatId, userId, userName, contributionAction: action });
}

/**
 * Get all contributions for a group.
 */
export function getContributions(chatId: string): Contribution[] {
  return contributionStore.get(chatId) ?? [];
}

/**
 * Get unique contributors for a group.
 */
export function getContributors(chatId: string): Array<{ userId: string; userName: string; count: number }> {
  const contributions = contributionStore.get(chatId) ?? [];
  const counts = new Map<string, { userName: string; count: number }>();

  for (const c of contributions) {
    const existing = counts.get(c.userId);
    if (existing) {
      existing.count++;
    } else {
      counts.set(c.userId, { userName: c.userName, count: 1 });
    }
  }

  return [...counts.entries()]
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Format contributors list for Telegram display.
 */
export function formatContributors(chatId: string): string {
  const contributors = getContributors(chatId);

  if (contributors.length === 0) {
    return "👥 No contributions yet.";
  }

  const lines: string[] = [`👥 *Contributors* (${contributors.length} people)\n`];

  for (let i = 0; i < contributors.length; i++) {
    const c = contributors[i];
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  ";
    lines.push(`${medal} ${c.userName} — ${c.count} contribution${c.count > 1 ? "s" : ""}`);
  }

  // Show recent activity
  const recent = (contributionStore.get(chatId) ?? []).slice(-3).reverse();
  if (recent.length > 0) {
    lines.push("\n*Recent:*");
    for (const r of recent) {
      const icon = r.action === "build" ? "🔨" : r.action === "edit" ? "✏️" : "⏪";
      lines.push(`${icon} ${r.userName}: ${r.detail.slice(0, 50)}`);
    }
  }

  return lines.join("\n");
}

/**
 * Determine the effective "owner" ID for site operations.
 * In private chats: userId. In groups: chatId (shared site).
 */
export function getEffectiveOwnerId(chatId: number, userId: string): string {
  // Group chats have negative IDs
  if (chatId < 0) {
    return String(chatId);
  }
  return userId;
}

/**
 * Check if a chat is a group.
 */
export function isGroupChat(chatId: number): boolean {
  return chatId < 0;
}

/**
 * Clear contributions for a group.
 */
export function clearContributions(chatId: string) {
  contributionStore.delete(chatId);
}
