/**
 * Entity Extraction — people, amounts, dates, decisions from text.
 *
 * Fast pattern-based extraction (no LLM needed).
 * Works in English and Russian.
 */

import { log } from "@wai/core";

export type EntityType = "person" | "amount" | "date" | "decision";

export interface Entity {
  type: EntityType;
  name: string;
  confidence: number;
}

const PERSON_PATTERNS = [
  /@(\w{3,32})/g,
  /(?:with|from|told|asked|met|emailed)\s+([A-Z][a-z]{2,15}(?:\s+[A-Z][a-z]{2,15})?)/g,
  /(?:с|от|у|для|встретил[а]?)\s+([\p{Lu}][\p{Ll}]{2,15}(?:\s+[\p{Lu}][\p{Ll}]{2,15})?)/gu,
];

const AMOUNT_PATTERNS = [
  /\$\s*(\d[\d,]*(?:\.\d{2})?)\s*(?:k|K|M|B)?/g,
  /(\d[\d,]*(?:\.\d{2})?)\s*(?:dollars|USD|EUR|руб|₽|€)/g,
  /(\d[\d,.]+)\s*(?:k|K|тыс|млн|M)\b/g,
];

const DATE_PATTERNS = [
  /(?:on|at|by|before|after|от|до|с|к)\s+(\d{1,2}[/.\-]\d{1,2}(?:[/.\-]\d{2,4})?)/gi,
  /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s*\d{4})?)/gi,
  /(\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря))/gi,
];

const DECISION_PATTERNS = [
  /(?:we decided|agreed|the plan is|going with|решили|договорились)\s+(.{10,150})/gi,
];

/**
 * Extract entities from text using pattern matching.
 */
export function extractEntities(text: string): Entity[] {
  const entities: Entity[] = [];
  const seen = new Set<string>();

  function addEntity(type: EntityType, name: string, confidence: number) {
    const key = `${type}:${name.toLowerCase()}`;
    if (seen.has(key)) return;
    if (name.length < 2) return;
    // Skip common false positives
    if (["The", "This", "That", "Это", "Вот"].includes(name)) return;
    seen.add(key);
    entities.push({ type, name: name.trim(), confidence });
  }

  // People
  for (const pattern of PERSON_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      addEntity("person", match[1], 0.7);
    }
  }

  // Amounts
  for (const pattern of AMOUNT_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      addEntity("amount", match[0].trim(), 0.9);
    }
  }

  // Dates
  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      addEntity("date", match[1].trim(), 0.8);
    }
  }

  // Decisions
  for (const pattern of DECISION_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      addEntity("decision", match[1].trim().slice(0, 200), 0.8);
    }
  }

  if (entities.length > 0) {
    log.debug({ service: "entities", action: "extracted", count: entities.length });
  }

  return entities;
}

/**
 * Format entities for Telegram display.
 */
export function formatEntities(entities: Entity[]): string {
  if (!entities.length) return "No entities detected.";

  const icons: Record<EntityType, string> = {
    person: "👤", amount: "💰", date: "📅", decision: "✅",
  };

  const byType = new Map<EntityType, Entity[]>();
  for (const e of entities) {
    if (!byType.has(e.type)) byType.set(e.type, []);
    byType.get(e.type)!.push(e);
  }

  const lines: string[] = [];
  for (const [type, items] of byType) {
    const icon = icons[type] ?? "•";
    const typeName = type.charAt(0).toUpperCase() + type.slice(1) + "s";
    lines.push(`${icon} *${typeName}:*`);
    for (const e of items) {
      lines.push(`  • ${e.name}`);
    }
  }

  return lines.join("\n");
}
