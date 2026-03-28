/**
 * SEO + Open Graph — inject professional meta tags into generated sites.
 *
 * Every site gets:
 * - <title> and <meta description>
 * - Open Graph tags (og:title, og:description, og:image, og:url)
 * - Twitter Card tags
 * - Favicon (emoji-based SVG)
 * - Canonical URL
 * - Language meta
 * - Viewport (should already be there from Tailwind)
 *
 * The OG image uses a dynamic service that generates preview images from text.
 */

import { log } from "@wai/core";

const DOMAIN = "wai.computer";

/** SEO metadata for a site. */
export interface SeoMeta {
  title: string;
  description: string;
  url: string;
  ogImageUrl: string;
  language: string;
  favicon: string;
}

/**
 * Generate SEO metadata from site description and HTML analysis.
 */
export function generateSeoMeta(
  slug: string,
  description: string,
  html: string,
): SeoMeta {
  // Extract or generate title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const title = titleMatch?.[1]?.trim()
    ?? h1Match?.[1]?.trim()
    ?? description.split(/[.,!?\n]/)[0]?.trim().slice(0, 60)
    ?? "Wai Site";

  // Generate description (from meta, first paragraph, or user description)
  const metaDescMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  const firstParagraph = html.match(/<p[^>]*>([^<]{20,200})/i);
  const seoDescription = metaDescMatch?.[1]?.trim()
    ?? firstParagraph?.[1]?.trim()
    ?? description.slice(0, 155);

  const url = `https://${slug}.${DOMAIN}`;

  // Generate OG image URL using a text-to-image service
  const ogImageUrl = generateOgImageUrl(title, seoDescription, slug);

  // Detect language
  const hasRussian = /[\u0400-\u04FF]/.test(title + seoDescription);
  const language = hasRussian ? "ru" : "en";

  // Generate emoji favicon based on content
  const favicon = detectFavicon(description, title);

  log.info({ service: "seo", action: "meta-generated", slug, title: title.slice(0, 30), language });

  return { title, description: seoDescription, url, ogImageUrl, language, favicon };
}

/**
 * Generate an OG image URL using dynamic text rendering.
 * Uses a free service that renders text onto a gradient background.
 */
export function generateOgImageUrl(title: string, description: string, slug: string): string {
  // Use og-image style service (or fallback to a gradient placeholder)
  const encodedTitle = encodeURIComponent(title.slice(0, 60));
  const encodedDesc = encodeURIComponent(description.slice(0, 100));
  return `https://og.wai.computer/${slug}?title=${encodedTitle}&desc=${encodedDesc}`;
}

/**
 * Detect an appropriate emoji favicon based on content.
 */
export function detectFavicon(description: string, title: string): string {
  const text = (description + " " + title).toLowerCase();

  const emojiMap: Array<[RegExp, string]> = [
    [/restaurant|cafe|кафе|ресторан|food|еда|coffee|кофе|pizza|пицца/, "☕"],
    [/shop|store|магазин|ecommerce|товар|buy|купить/, "🛍️"],
    [/portfolio|портфолио|designer|дизайнер|photographer|фотограф/, "🎨"],
    [/startup|saas|app|приложение|product|продукт|tool/, "🚀"],
    [/event|conference|хакатон|hackathon|meetup|конференция/, "🎪"],
    [/blog|блог|news|новости|article|статья/, "📝"],
    [/music|музыка|band|группа|concert|концерт/, "🎵"],
    [/fitness|фитнес|gym|спорт|health|здоров/, "💪"],
    [/travel|путешеств|hotel|отель|booking|бронир/, "✈️"],
    [/education|образовани|school|школа|course|курс/, "📚"],
    [/tech|технолог|ai|developer|разработ|code|код/, "💻"],
    [/medical|медицин|doctor|врач|health|clinic|клиник/, "🏥"],
    [/real.?estate|недвижимость|property|apartment|квартир/, "🏠"],
    [/legal|юридич|lawyer|адвокат|law|право/, "⚖️"],
    [/finance|финанс|bank|банк|money|деньги|invest/, "💰"],
  ];

  for (const [pattern, emoji] of emojiMap) {
    if (pattern.test(text)) return emoji;
  }

  return "✨"; // Default: Wai sparkle
}

/**
 * Build the meta tags HTML string.
 */
export function buildMetaTags(meta: SeoMeta): string {
  return `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${escapeAttr(meta.description)}">
    <meta name="language" content="${meta.language}">
    <link rel="canonical" href="${meta.url}">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${meta.url}">
    <meta property="og:title" content="${escapeAttr(meta.title)}">
    <meta property="og:description" content="${escapeAttr(meta.description)}">
    <meta property="og:image" content="${meta.ogImageUrl}">
    <meta property="og:site_name" content="Wai">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeAttr(meta.title)}">
    <meta name="twitter:description" content="${escapeAttr(meta.description)}">
    <meta name="twitter:image" content="${meta.ogImageUrl}">

    <!-- Favicon -->
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${meta.favicon}</text></svg>">`;
}

/**
 * Inject SEO meta tags into generated HTML.
 * Replaces or adds meta tags in the <head> section.
 */
export function injectSeoTags(html: string, slug: string, description: string): string {
  const meta = generateSeoMeta(slug, description, html);
  const tags = buildMetaTags(meta);

  // If <head> exists, inject after it
  if (html.includes("<head>")) {
    return html.replace("<head>", `<head>\n${tags}`);
  }

  // If <head ...> with attributes
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch) {
    return html.replace(headMatch[0], `${headMatch[0]}\n${tags}`);
  }

  // If no <head>, inject after <!DOCTYPE html> or <html>
  if (html.includes("<html")) {
    return html.replace(/<html[^>]*>/, (match) => `${match}\n<head>${tags}</head>`);
  }

  // Last resort: prepend
  return `<head>${tags}</head>\n${html}`;
}

/** Escape HTML attribute value. */
function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
