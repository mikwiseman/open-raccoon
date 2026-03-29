/**
 * Conversation Context Extractor — mine chat history for site generation.
 *
 * When a user says "build me a site", we analyze their recent conversation
 * to extract business details, preferences, and content that should appear
 * on the generated site.
 *
 * This makes the bot smarter than Lovable: users don't need to describe
 * everything in one message — they can chat naturally and the bot picks up
 * context from the conversation.
 */

import { log } from "@wai/core";

/** Extracted context from conversation history. */
export interface ConversationContext {
  businessName?: string;
  businessType?: string;
  products?: string[];
  features?: string[];
  targetAudience?: string;
  colorPreferences?: string;
  stylePreferences?: string;
  contactInfo?: string[];
  keywords: string[];
  language: "en" | "ru";
  richDescription: string;
}

/**
 * Extract useful context from conversation history for site generation.
 */
export function extractBuildContext(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  currentMessage: string,
): ConversationContext {
  // Combine recent conversation (last 10 messages) + current message
  const recent = history.slice(-10);
  const userMessages = recent
    .filter((m) => m.role === "user")
    .map((m) => m.content);
  const allText = [...userMessages, currentMessage].join("\n");

  // Detect language
  const hasRussian = /[\u0400-\u04FF]/.test(allText);
  const language = hasRussian ? "ru" as const : "en" as const;

  // Extract business name (capitalized phrases, quoted names)
  const businessName = extractBusinessName(allText);

  // Extract business type
  const businessType = extractBusinessType(allText);

  // Extract products/services mentioned
  const products = extractProducts(allText);

  // Extract features mentioned
  const features = extractFeatures(allText);

  // Extract contact info
  const contactInfo = extractContactInfo(allText);

  // Extract preferences
  const colorPreferences = extractColorPreference(allText);
  const stylePreferences = extractStylePreference(allText);

  // Extract target audience
  const targetAudience = extractTargetAudience(allText);

  // Extract important keywords
  const keywords = extractKeywords(allText);

  // Build rich description from all context
  const richDescription = buildRichDescription({
    businessName, businessType, products, features,
    contactInfo, colorPreferences, stylePreferences,
    targetAudience, keywords, language, richDescription: "",
  }, currentMessage);

  log.info({
    service: "context", action: "extracted",
    hasBusinessName: !!businessName,
    productCount: products.length,
    featureCount: features.length,
    keywordCount: keywords.length,
    language,
  });

  return {
    businessName, businessType, products, features,
    targetAudience, colorPreferences, stylePreferences,
    contactInfo, keywords, language, richDescription,
  };
}

/**
 * Build a rich description by combining extracted context with the user's message.
 */
export function buildRichDescription(context: ConversationContext, originalMessage: string): string {
  const parts: string[] = [originalMessage];

  if (context.businessName && !originalMessage.includes(context.businessName)) {
    parts.push(`Business name: ${context.businessName}`);
  }
  if (context.businessType) {
    parts.push(`Business type: ${context.businessType}`);
  }
  if (context.products && context.products.length > 0) {
    parts.push(`Products/services: ${context.products.join(", ")}`);
  }
  if (context.features && context.features.length > 0) {
    parts.push(`Key features: ${context.features.join(", ")}`);
  }
  if (context.targetAudience) {
    parts.push(`Target audience: ${context.targetAudience}`);
  }
  if (context.colorPreferences) {
    parts.push(`Color preference: ${context.colorPreferences}`);
  }
  if (context.stylePreferences) {
    parts.push(`Style preference: ${context.stylePreferences}`);
  }
  if (context.contactInfo && context.contactInfo.length > 0) {
    parts.push(`Contact: ${context.contactInfo.join(", ")}`);
  }

  return parts.join("\n");
}

// --- Extraction helpers ---

function extractBusinessName(text: string): string | undefined {
  // Look for quoted names
  const quoted = text.match(/["«]([^"»]{2,40})["»]/);
  if (quoted) return quoted[1];

  // Look for "called/named/называется" patterns
  const named = text.match(/(?:called|named|it's|это|называется|название)\s+["']?([A-ZА-ЯЁ][\w\s]{1,30}?)["']?(?:\.|,|!|\?|\n|$)/i);
  if (named) return named[1].trim();

  return undefined;
}

function extractBusinessType(text: string): string | undefined {
  const types: Array<[RegExp, string]> = [
    [/(?:restaurant|ресторан)/i, "restaurant"],
    [/(?:cafe|кафе|кофейн)/i, "cafe"],
    [/(?:shop|store|магазин)/i, "store"],
    [/(?:agency|агентств)/i, "agency"],
    [/(?:clinic|клиник)/i, "clinic"],
    [/(?:salon|салон)/i, "salon"],
    [/(?:studio|студи)/i, "studio"],
    [/(?:school|школ|курс)/i, "school"],
    [/(?:startup|стартап)/i, "startup"],
    [/(?:portfolio|портфолио)/i, "portfolio"],
  ];

  for (const [pattern, type] of types) {
    if (pattern.test(text)) return type;
  }
  return undefined;
}

function extractProducts(text: string): string[] {
  const products: string[] = [];
  // Look for lists: "we have X, Y, and Z"
  const listMatch = text.match(/(?:we (?:have|offer|sell|make)|у нас|мы (?:предлагаем|делаем|продаём))\s+(.{10,200})/i);
  if (listMatch) {
    const items = listMatch[1].split(/,|и\s|and\s/).map((s) => s.trim()).filter((s) => s.length > 2 && s.length < 50);
    products.push(...items.slice(0, 8));
  }

  // Look for price mentions
  const priceItems = text.matchAll(/([A-ZА-ЯЁ][\wа-яё\s]{2,30})\s*[-–—:]\s*\$?\d+/gi);
  for (const m of priceItems) {
    const item = m[1].trim();
    if (item.length > 2 && !products.includes(item)) {
      products.push(item);
    }
    if (products.length >= 8) break;
  }

  return products;
}

function extractFeatures(text: string): string[] {
  const features: string[] = [];
  const patterns = [
    /(?:free|бесплатн)\s+(\w[\w\s]{2,30})/gi,
    /(?:24\/7|круглосуточн)/gi,
    /(?:delivery|доставк)/gi,
    /(?:online|онлайн)\s+(\w[\w\s]{2,20})/gi,
    /(?:discount|скидк)/gi,
    /(?:wifi|вай-фай|wi-fi)/gi,
  ];

  for (const p of patterns) {
    if (p.test(text)) {
      features.push(text.match(p)?.[0]?.trim() ?? "");
    }
  }

  return features.filter((f) => f.length > 0).slice(0, 6);
}

function extractContactInfo(text: string): string[] {
  const contacts: string[] = [];

  // Emails
  const emails = text.match(/[\w.-]+@[\w.-]+\.\w{2,}/g);
  if (emails) contacts.push(...emails.slice(0, 2));

  // Phone numbers
  const phones = text.match(/\+?\d[\d\s()-]{7,15}/g);
  if (phones) contacts.push(...phones.slice(0, 2));

  // Addresses
  const address = text.match(/(?:address|адрес)[:\s]+(.{10,80})/i);
  if (address) contacts.push(address[1].trim());

  return contacts;
}

function extractColorPreference(text: string): string | undefined {
  const match = text.match(/(?:colou?r|цвет)[:\s]+([^.,\n]{3,30})/i);
  return match?.[1]?.trim();
}

function extractStylePreference(text: string): string | undefined {
  const match = text.match(/(?:style|стиль|дизайн|design)[:\s]+([^.,\n]{3,30})/i);
  return match?.[1]?.trim();
}

function extractTargetAudience(text: string): string | undefined {
  const match = text.match(/(?:target|audience|для|целевая)\s+([^.,\n]{3,50})/i);
  return match?.[1]?.trim();
}

function extractKeywords(text: string): string[] {
  // Extract significant words (capitalized, or after important prepositions)
  const words = text.match(/\b[A-ZА-ЯЁ][\wа-яё]{3,}\b/g) ?? [];
  const unique = [...new Set(words)].filter((w) =>
    !["The", "This", "That", "What", "When", "How", "Why", "Who", "Это", "Вот", "Как", "Что"].includes(w)
  );
  return unique.slice(0, 10);
}
