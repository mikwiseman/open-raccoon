/**
 * Rate Limiting + Usage Tracking — per-user quotas and cost monitoring.
 *
 * Tiers:
 * - Free: 5 builds/day, 20 edits/day
 * - Pro: 50 builds/day, 200 edits/day
 *
 * Tracks: builds, edits, API tokens consumed, sites deployed.
 * Resets daily at midnight UTC.
 */

import { log } from "@wai/core";

export type UserTier = "free" | "pro";

/** Usage record for a user. */
export interface UsageRecord {
  builds: number;
  edits: number;
  clones: number;
  tokensUsed: number;
  sitesDeployed: number;
  lastResetDate: string; // YYYY-MM-DD
}

/** Rate limits per tier. */
export interface TierLimits {
  buildsPerDay: number;
  editsPerDay: number;
  clonesPerDay: number;
}

const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: { buildsPerDay: 5, editsPerDay: 20, clonesPerDay: 3 },
  pro: { buildsPerDay: 50, editsPerDay: 200, clonesPerDay: 30 },
};

/** Per-user usage store. */
const usageStore = new Map<string, UsageRecord>();
/** Per-user tier. */
const tierStore = new Map<string, UserTier>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function getOrCreateUsage(userId: string): UsageRecord {
  const existing = usageStore.get(userId);
  const todayStr = today();

  // Reset if new day
  if (!existing || existing.lastResetDate !== todayStr) {
    const record: UsageRecord = {
      builds: 0, edits: 0, clones: 0,
      tokensUsed: existing?.tokensUsed ?? 0, // tokens are cumulative
      sitesDeployed: existing?.sitesDeployed ?? 0, // sites are cumulative
      lastResetDate: todayStr,
    };
    usageStore.set(userId, record);
    return record;
  }

  return existing;
}

/**
 * Get a user's tier.
 */
export function getUserTier(userId: string): UserTier {
  return tierStore.get(userId) ?? "free";
}

/**
 * Set a user's tier.
 */
export function setUserTier(userId: string, tier: UserTier) {
  tierStore.set(userId, tier);
  log.info({ service: "ratelimit", action: "tier-set", userId, tier });
}

/**
 * Check if a user can perform an action.
 */
export function checkLimit(userId: string, action: "build" | "edit" | "clone"): {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetIn: string;
} {
  const usage = getOrCreateUsage(userId);
  const tier = getUserTier(userId);
  const limits = TIER_LIMITS[tier];

  let current: number;
  let limit: number;

  switch (action) {
    case "build":
      current = usage.builds;
      limit = limits.buildsPerDay;
      break;
    case "edit":
      current = usage.edits;
      limit = limits.editsPerDay;
      break;
    case "clone":
      current = usage.clones;
      limit = limits.clonesPerDay;
      break;
  }

  const remaining = Math.max(0, limit - current);
  const allowed = current < limit;

  // Calculate reset time
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const resetMs = tomorrow.getTime() - now.getTime();
  const resetHours = Math.ceil(resetMs / (1000 * 60 * 60));
  const resetIn = `${resetHours}h`;

  if (!allowed) {
    log.warn({ service: "ratelimit", action: "limit-hit", userId, tier, limitAction: action, current, limit });
  }

  return { allowed, remaining, limit, resetIn };
}

/**
 * Record usage of an action.
 */
export function recordUsage(userId: string, action: "build" | "edit" | "clone", tokens?: number) {
  const usage = getOrCreateUsage(userId);

  switch (action) {
    case "build":
      usage.builds++;
      usage.sitesDeployed++;
      break;
    case "edit":
      usage.edits++;
      break;
    case "clone":
      usage.clones++;
      usage.sitesDeployed++;
      break;
  }

  if (tokens) {
    usage.tokensUsed += tokens;
  }

  log.info({ service: "ratelimit", action: "usage-recorded", userId, usageAction: action, builds: usage.builds, edits: usage.edits });
}

/**
 * Get usage stats for a user.
 */
export function getUsageStats(userId: string): {
  tier: UserTier;
  usage: UsageRecord;
  limits: TierLimits;
} {
  return {
    tier: getUserTier(userId),
    usage: getOrCreateUsage(userId),
    limits: TIER_LIMITS[getUserTier(userId)],
  };
}

/**
 * Format usage stats for Telegram.
 */
export function formatUsageStats(userId: string): string {
  const { tier, usage, limits } = getUsageStats(userId);
  const tierEmoji = tier === "pro" ? "⭐" : "🆓";

  const lines = [
    `📊 *Usage Today* ${tierEmoji} ${tier.toUpperCase()}\n`,
    `🔨 Builds: ${usage.builds}/${limits.buildsPerDay}`,
    `✏️ Edits: ${usage.edits}/${limits.editsPerDay}`,
    `🔍 Clones: ${usage.clones}/${limits.clonesPerDay}`,
    "",
    `📈 All time: ${usage.sitesDeployed} sites deployed`,
  ];

  if (tier === "free") {
    lines.push("\n💡 Upgrade to Pro for 10x more builds: /upgrade");
  }

  return lines.join("\n");
}

/**
 * Format rate limit error for user.
 */
export function formatLimitError(action: string, remaining: number, limit: number, resetIn: string, locale: "en" | "ru" = "en"): string {
  if (locale === "ru") {
    return `⏳ Лимит достигнут: ${action} (${limit}/${limit} за день).\n\nОбновится через ${resetIn}.\n\n💡 /upgrade для увеличения лимитов.`;
  }
  return `⏳ Daily limit reached: ${action} (${limit}/${limit} per day).\n\nResets in ${resetIn}.\n\n💡 /upgrade for higher limits.`;
}

/**
 * Clear usage for testing.
 */
export function clearUsage(userId: string) {
  usageStore.delete(userId);
  tierStore.delete(userId);
}
