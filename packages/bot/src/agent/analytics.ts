/**
 * Site Analytics — lightweight visitor tracking for generated sites.
 *
 * Every generated site gets a small JS snippet that sends a beacon
 * on page load. Stats are stored in-memory per slug and shown via /stats.
 *
 * Privacy-first: no cookies, no personal data, just page views and referrers.
 */

import { log } from "@wai/core";

/** A single page view event. */
export interface PageView {
  timestamp: Date;
  path: string;
  referrer: string;
  userAgent: string;
}

/** Aggregated stats for a site. */
export interface SiteStats {
  slug: string;
  totalViews: number;
  uniqueVisitors: number;
  todayViews: number;
  topPages: Array<{ path: string; views: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  lastVisit: Date | null;
}

/** Per-slug analytics store. */
const analyticsStore = new Map<string, PageView[]>();
const MAX_EVENTS_PER_SLUG = 10000;

/**
 * Record a page view for a site.
 */
export function recordPageView(slug: string, view: Omit<PageView, "timestamp">) {
  if (!analyticsStore.has(slug)) {
    analyticsStore.set(slug, []);
  }

  const events = analyticsStore.get(slug)!;
  events.push({ ...view, timestamp: new Date() });

  // Trim old events
  if (events.length > MAX_EVENTS_PER_SLUG) {
    events.splice(0, events.length - MAX_EVENTS_PER_SLUG);
  }

  log.debug({ service: "analytics", action: "page-view", slug, path: view.path });
}

/**
 * Get aggregated stats for a site.
 */
export function getSiteStats(slug: string): SiteStats {
  const events = analyticsStore.get(slug) ?? [];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Count unique visitors by user agent (simple heuristic)
  const uniqueAgents = new Set(events.map((e) => e.userAgent));

  // Today's views
  const todayViews = events.filter((e) => e.timestamp >= todayStart).length;

  // Top pages
  const pageCounts = new Map<string, number>();
  for (const e of events) {
    pageCounts.set(e.path, (pageCounts.get(e.path) ?? 0) + 1);
  }
  const topPages = [...pageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, views]) => ({ path, views }));

  // Top referrers (exclude empty/direct)
  const refCounts = new Map<string, number>();
  for (const e of events) {
    if (e.referrer && e.referrer !== "direct") {
      refCounts.set(e.referrer, (refCounts.get(e.referrer) ?? 0) + 1);
    }
  }
  const topReferrers = [...refCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([referrer, count]) => ({ referrer, count }));

  const lastVisit = events.length > 0 ? events[events.length - 1].timestamp : null;

  return {
    slug,
    totalViews: events.length,
    uniqueVisitors: uniqueAgents.size,
    todayViews,
    topPages,
    topReferrers,
    lastVisit,
  };
}

/**
 * Clear analytics for a slug.
 */
export function clearAnalytics(slug: string) {
  analyticsStore.delete(slug);
}

/**
 * Format site stats for Telegram display.
 */
export function formatStats(stats: SiteStats): string {
  if (stats.totalViews === 0) {
    return `📊 *${stats.slug}*\n\nNo visitors yet. Share your site link to get traffic!`;
  }

  const parts: string[] = [
    `📊 *Analytics: ${stats.slug}.wai.computer*\n`,
    `👁 Total views: *${stats.totalViews}*`,
    `👤 Unique visitors: *${stats.uniqueVisitors}*`,
    `📅 Today: *${stats.todayViews}*`,
  ];

  if (stats.lastVisit) {
    const ago = timeSince(stats.lastVisit);
    parts.push(`🕐 Last visit: ${ago}`);
  }

  if (stats.topPages.length > 0) {
    parts.push("\n*Top Pages:*");
    for (const p of stats.topPages) {
      parts.push(`  ${p.path} — ${p.views} views`);
    }
  }

  if (stats.topReferrers.length > 0) {
    parts.push("\n*Top Referrers:*");
    for (const r of stats.topReferrers) {
      parts.push(`  ${r.referrer} — ${r.count}`);
    }
  }

  return parts.join("\n");
}

/**
 * Generate the analytics JS snippet to inject into sites.
 * Lightweight: ~200 bytes, no cookies, privacy-first.
 */
export function generateAnalyticsSnippet(slug: string, trackingEndpoint: string): string {
  return `<script>
(function(){
  var s='${slug}',e='${trackingEndpoint}';
  var d={s:s,p:location.hash||'/',r:document.referrer||'direct',u:navigator.userAgent};
  try{navigator.sendBeacon(e,JSON.stringify(d))}catch(x){
    var i=new Image();i.src=e+'?d='+encodeURIComponent(JSON.stringify(d));
  }
  window.addEventListener('hashchange',function(){
    d.p=location.hash||'/';
    try{navigator.sendBeacon(e,JSON.stringify(d))}catch(x){}
  });
})();
</script>`;
}

/** Human-readable time since a date. */
function timeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
