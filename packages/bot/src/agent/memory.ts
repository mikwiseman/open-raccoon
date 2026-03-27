/**
 * User Memory — 3-layer memory system for the Wai bot.
 *
 * Layers (from wai-computer architecture):
 * 1. Identity — permanent facts about the user (name, business, brand colors)
 * 2. Working — current session context (what they're building, recent preferences)
 * 3. Recalled — semantic search results from past interactions
 *
 * In-memory store for now (will migrate to pgvector later).
 * Memory is automatically extracted from /build and /edit interactions.
 */

import { log } from "@wai/core";

/** A single memory entry. */
export interface MemoryEntry {
  key: string;
  value: string;
  updatedAt: Date;
}

/** Full memory context for a user. */
export interface UserMemory {
  identity: MemoryEntry[];
  working: MemoryEntry[];
  recalled: MemoryEntry[];
}

/** In-memory store. Key = userId. */
const memoryStore = new Map<string, UserMemory>();

function ensureUser(userId: string): UserMemory {
  if (!memoryStore.has(userId)) {
    memoryStore.set(userId, { identity: [], working: [], recalled: [] });
  }
  return memoryStore.get(userId)!;
}

/**
 * Set an identity memory (permanent facts about the user).
 */
export function setIdentityMemory(userId: string, key: string, value: string) {
  const mem = ensureUser(userId);
  const existing = mem.identity.find((e) => e.key === key);
  if (existing) {
    existing.value = value;
    existing.updatedAt = new Date();
  } else {
    mem.identity.push({ key, value, updatedAt: new Date() });
  }
  log.info({ service: "memory", action: "set-identity", userId, key });
}

/**
 * Set a working memory entry (current session context).
 */
export function setWorkingMemory(userId: string, key: string, value: string) {
  const mem = ensureUser(userId);
  const existing = mem.working.find((e) => e.key === key);
  if (existing) {
    existing.value = value;
    existing.updatedAt = new Date();
  } else {
    mem.working.push({ key, value, updatedAt: new Date() });
  }
  // Keep working memory bounded (last 20 entries)
  if (mem.working.length > 20) {
    mem.working.shift();
  }
  log.debug({ service: "memory", action: "set-working", userId, key });
}

/**
 * Get full memory context for a user.
 */
export function getUserMemory(userId: string): UserMemory {
  return ensureUser(userId);
}

/**
 * Get identity memories as formatted strings.
 */
export function getIdentityStrings(userId: string): string[] {
  return ensureUser(userId).identity.map((e) => `${e.key}: ${e.value}`);
}

/**
 * Get working memories as formatted strings.
 */
export function getWorkingStrings(userId: string): string[] {
  return ensureUser(userId).working.map((e) => `${e.key}: ${e.value}`);
}

/**
 * Clear all memory for a user.
 */
export function clearMemory(userId: string) {
  memoryStore.delete(userId);
  log.info({ service: "memory", action: "cleared", userId });
}

/**
 * Extract memories from a site build interaction.
 * Automatically learns brand, style, business info from the description.
 */
export function extractMemoriesFromBuild(userId: string, description: string, slug: string) {
  // Extract business/brand name (first sentence or phrase before period/comma)
  const businessMatch = description.match(/^(.+?)[.,!?\n]/);
  if (businessMatch) {
    const name = businessMatch[1].trim();
    if (name.length >= 3 && name.length <= 80) {
      setIdentityMemory(userId, "business_name", name);
    }
  }

  // Extract language preference
  const hasRussian = /[\u0400-\u04FF]/.test(description);
  if (hasRussian) {
    setIdentityMemory(userId, "preferred_language", "ru");
  }

  // Store last build context
  setWorkingMemory(userId, "last_site_slug", slug);
  setWorkingMemory(userId, "last_site_description", description.slice(0, 200));
  setWorkingMemory(userId, "last_build_time", new Date().toISOString());

  // Extract color preferences if mentioned
  const colorMatch = description.match(/(?:colou?r|цвет)[:\s]+([^.,]+)/i);
  if (colorMatch) {
    setIdentityMemory(userId, "preferred_colors", colorMatch[1].trim());
  }

  // Extract style preferences if mentioned
  const styleMatch = description.match(/(?:style|стиль|дизайн)[:\s]+([^.,]+)/i);
  if (styleMatch) {
    setIdentityMemory(userId, "preferred_style", styleMatch[1].trim());
  }

  log.info({ service: "memory", action: "extracted-from-build", userId, slug });
}

/**
 * Extract memories from a site edit interaction.
 * Learns preferences from what the user changes.
 */
export function extractMemoriesFromEdit(userId: string, editRequest: string) {
  // If user changes colors, remember the new preference
  const colorChange = editRequest.match(/(?:change|make|set|поменяй|сделай|измени).*(?:colou?r|цвет).*(?:to|на|в)\s+(.+)/i);
  if (colorChange) {
    setIdentityMemory(userId, "preferred_colors", colorChange[1].trim());
  }

  // If user changes theme
  if (/dark\s*(?:mode|theme)|тёмн|темн/i.test(editRequest)) {
    setIdentityMemory(userId, "preferred_theme", "dark");
  }
  if (/light\s*(?:mode|theme)|светл/i.test(editRequest)) {
    setIdentityMemory(userId, "preferred_theme", "light");
  }

  // Store edit as working memory
  setWorkingMemory(userId, "last_edit", editRequest.slice(0, 200));
  setWorkingMemory(userId, "last_edit_time", new Date().toISOString());

  log.info({ service: "memory", action: "extracted-from-edit", userId });
}

/**
 * Build a memory context string for the site generation prompt.
 * Returns empty string if no relevant memories exist.
 */
export function buildMemoryContext(userId: string): string {
  const mem = ensureUser(userId);
  const parts: string[] = [];

  if (mem.identity.length > 0) {
    parts.push("## What I know about you");
    for (const e of mem.identity) {
      parts.push(`- ${e.key}: ${e.value}`);
    }
  }

  if (mem.working.length > 0) {
    const recent = mem.working.slice(-5); // Last 5 working memories
    parts.push("\n## Recent context");
    for (const e of recent) {
      parts.push(`- ${e.key}: ${e.value}`);
    }
  }

  return parts.length > 0 ? parts.join("\n") : "";
}
