/**
 * Site Cloner — analyze a reference URL and create a similar site.
 *
 * "Сделай как у airbnb.com но для моего кафе"
 *
 * Flow:
 * 1. Detect URL in user's message
 * 2. Fetch the reference site (via fetch or screenshot API)
 * 3. Extract structure: sections, colors, layout style
 * 4. Generate a new site inspired by the reference, customized for the user's business
 *
 * Privacy: we only analyze publicly accessible pages.
 */

import { log } from "@wai/core";
import type { SitePlan } from "./site-builder.js";

/** Result of analyzing a reference site. */
export interface SiteAnalysis {
  url: string;
  title: string;
  sections: string[];
  colorHints: string;
  layoutStyle: string;
  features: string[];
}

/** Extract URLs from text. */
export function extractUrls(text: string): string[] {
  const urlPattern = /https?:\/\/[^\s<>"')\]]+/gi;
  const matches = text.match(urlPattern) ?? [];
  // Also match bare domains like "airbnb.com"
  const domainPattern = /(?:^|\s)([\w-]+\.(?:com|org|net|io|dev|co|ru|me|app|site|xyz|tech)(?:\/\S*)?)/gi;
  const domainMatches = [...text.matchAll(domainPattern)].map((m) => `https://${m[1].trim()}`);
  const all = [...matches, ...domainMatches];
  // Deduplicate
  return [...new Set(all)];
}

/** Detect if a message is a "clone/inspiration" request. */
export function isCloneRequest(text: string): boolean {
  const lower = text.toLowerCase();
  const clonePatterns = [
    /(?:like|similar to|inspired by|based on|copy|clone)\s+(?:https?:\/\/|[\w-]+\.(?:com|org|net|io))/i,
    /(?:как у|похож[\p{L}]* на|по мотивам|вдохновл[её]н|скопируй|сделай как)\s/iu,
    /(?:https?:\/\/|[\w-]+\.(?:com|org|net|io)).*(?:but|но|для|for|with|с)\s/i,
  ];
  return clonePatterns.some((p) => p.test(text)) && extractUrls(text).length > 0;
}

/**
 * Analyze a reference URL by fetching its HTML and extracting structure.
 * Falls back to URL-based heuristics if fetch fails.
 */
export async function analyzeReferenceUrl(url: string): Promise<SiteAnalysis> {
  log.info({ service: "cloner", action: "analyzing", url });

  let title = extractDomainName(url);
  const sections: string[] = [];
  const features: string[] = [];
  let colorHints = "Modern, clean";
  let layoutStyle = "Standard business website";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      headers: { "User-Agent": "WaiBot/1.0 (site-analyzer)" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const html = await response.text();

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) title = titleMatch[1].trim();

      // Extract sections from h2/h3
      const headingMatches = html.matchAll(/<h[23][^>]*>([^<]{3,60})<\/h[23]>/gi);
      for (const m of headingMatches) {
        const text = m[1].trim().replace(/&\w+;/g, "");
        if (text.length > 2 && text.length < 60 && !sections.includes(text)) {
          sections.push(text);
        }
        if (sections.length >= 10) break;
      }

      // Detect features
      if (/<form[\s>]/i.test(html)) features.push("Contact/signup form");
      if (/carousel|slider|swiper/i.test(html)) features.push("Image carousel");
      if (/accordion|collapse|expand/i.test(html)) features.push("FAQ accordion");
      if (/pricing|price|plan/i.test(html)) features.push("Pricing section");
      if (/testimonial|review|feedback/i.test(html)) features.push("Testimonials");
      if (/dark-mode|dark-theme|theme-toggle/i.test(html)) features.push("Dark mode");
      if (/grid|masonry/i.test(html)) features.push("Grid/masonry layout");
      if (/video|youtube|vimeo/i.test(html)) features.push("Video embed");

      // Detect colors from CSS
      const colorMatches = html.matchAll(/(?:--primary|--accent|--brand)[^:]*:\s*([^;]+)/g);
      const colors: string[] = [];
      for (const cm of colorMatches) {
        colors.push(cm[1].trim());
        if (colors.length >= 3) break;
      }
      if (colors.length > 0) colorHints = `Inspired by: ${colors.join(", ")}`;

      // Detect layout style
      if (/tailwind/i.test(html)) layoutStyle = "Tailwind CSS, utility-first";
      else if (/bootstrap/i.test(html)) layoutStyle = "Bootstrap, grid-based";
      else if (/material/i.test(html)) layoutStyle = "Material Design";

      log.info({ service: "cloner", action: "analyzed", url, title, sections: sections.length, features: features.length });
    }
  } catch (error) {
    log.warn({ service: "cloner", action: "fetch-failed", url, error: String(error) });
    // Continue with URL-based heuristics
  }

  // If no sections extracted, generate from domain name
  if (sections.length === 0) {
    sections.push("Hero", "Features", "About", "Contact");
  }

  return { url, title, sections, colorHints, layoutStyle, features };
}

/**
 * Convert a site analysis into a SitePlan for generation.
 */
export function analysisToSitePlan(analysis: SiteAnalysis): SitePlan {
  return {
    sections: analysis.sections.map((s, i) =>
      i === 0 ? `Hero section (inspired by ${analysis.title})` : s,
    ),
    colorScheme: analysis.colorHints,
    typography: "Inter for body, accent font matching the reference style",
    interactiveElements: [
      "Mobile hamburger menu",
      "Smooth scroll navigation",
      "Dark mode toggle",
      ...analysis.features,
    ],
    estimatedComplexity: analysis.features.length > 3 ? "complex" : "medium",
  };
}

/**
 * Build a clone prompt that references the analyzed site.
 */
export function buildClonePromptHints(analysis: SiteAnalysis, userDescription: string): string {
  return `This site should be INSPIRED BY ${analysis.url} (${analysis.title}).
Take the same layout style, section ordering, and design quality — but customize
ALL content for: ${userDescription}

Reference site analysis:
- Layout style: ${analysis.layoutStyle}
- Detected sections: ${analysis.sections.join(", ")}
- Detected features: ${analysis.features.join(", ") || "standard website features"}
- Color direction: ${analysis.colorHints}

IMPORTANT: Do NOT copy any text, images, or branding from the reference.
Create original content that matches the USER's business/project.
The reference is for DESIGN INSPIRATION only.`;
}

/** Extract a clean domain name from URL. */
function extractDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "").split(".")[0] ?? hostname;
  } catch {
    return url.slice(0, 30);
  }
}
