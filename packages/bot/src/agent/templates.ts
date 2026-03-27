/**
 * Site Templates — proven structures for common site types.
 *
 * Each template defines sections, color schemes, and interactive elements
 * optimized for a specific use case. The template is injected into the
 * site prompt as a SitePlan, giving Claude a strong starting structure.
 *
 * Templates are matched by keyword detection in the user's description.
 */

import { log } from "@wai/core";
import type { SitePlan } from "./site-builder.js";

export interface Template {
  /** Unique identifier. */
  id: string;
  /** Display name (shown to user). */
  name: string;
  /** Keywords that trigger this template (EN + RU). */
  keywords: string[];
  /** Pre-built plan optimized for this template type. */
  plan: SitePlan;
  /** Extra prompt hints appended to the generation prompt. */
  promptHints: string;
}

/**
 * Template library — curated, high-quality starting structures.
 */
export const TEMPLATES: Template[] = [
  {
    id: "restaurant",
    name: "Restaurant / Cafe",
    keywords: ["restaurant", "cafe", "кафе", "ресторан", "menu", "меню", "food", "еда", "bar", "бар", "bistro", "бистро", "pizza", "пицца", "coffee", "кофе", "кофейня"],
    plan: {
      sections: [
        "Hero with food photography background and reservation CTA",
        "About section with story and ambiance photos",
        "Menu with categories, prices, and dietary icons (🌱 vegan, 🌾 gluten-free)",
        "Photo gallery with lightbox (6-8 dish photos)",
        "Reviews from Google/TripAdvisor style cards (5-star ratings)",
        "Location map placeholder + hours + contact",
        "Reservation form (name, date, time, guests, phone)",
        "Footer with social links and 'Made with Wai ✨'",
      ],
      colorScheme: "Warm earth tones: deep brown primary (#44250e), cream accent (#fef3c7), olive green (#65712b), warm white background",
      typography: "Playfair Display for headings (elegant serif), Inter for body",
      interactiveElements: [
        "Sticky navigation that changes on scroll",
        "Menu category tabs (Appetizers, Main, Desserts, Drinks)",
        "Photo lightbox gallery with navigation arrows",
        "Reservation form with date picker and validation",
        "Smooth scroll between sections",
        "Dark mode toggle",
        "Mobile hamburger menu with slide animation",
      ],
      estimatedComplexity: "complex",
    },
    promptHints: `Generate realistic menu items with prices (local currency).
Use food-related emoji sparingly. Create a warm, inviting atmosphere.
The reservation form should have: name, email, phone, date, time (dropdown), number of guests (1-10).
Include opening hours in a clean format. Add Google Maps embed placeholder.`,
  },

  {
    id: "portfolio",
    name: "Portfolio / Personal",
    keywords: ["portfolio", "портфолио", "personal", "персональный", "freelance", "фриланс", "designer", "дизайнер", "developer", "разработчик", "photographer", "фотограф", "artist", "художник", "resume", "резюме", "cv"],
    plan: {
      sections: [
        "Hero with name, title, animated typing effect, and CTA",
        "About section with bio, photo, and skill tags",
        "Services/Skills grid with icons and descriptions",
        "Portfolio gallery with filterable categories and hover overlays",
        "Experience timeline (vertical, animated on scroll)",
        "Testimonials from clients (avatar, name, role, quote)",
        "Contact form with social links sidebar",
        "Footer with 'Made with Wai ✨'",
      ],
      colorScheme: "Minimalist dark: charcoal (#1a1a2e), electric blue accent (#4361ee), white text, subtle gray (#e5e5e5)",
      typography: "Space Grotesk for headings (modern geometric), Inter for body",
      interactiveElements: [
        "Typing animation in hero (role titles cycling)",
        "Portfolio filter tabs (All, Web, Mobile, Design)",
        "Image hover zoom with overlay text",
        "Scroll-triggered animations (fade up, slide in)",
        "Contact form with real-time validation",
        "Dark/light mode toggle",
        "Sticky nav with active section highlighting",
        "Mobile hamburger menu",
      ],
      estimatedComplexity: "complex",
    },
    promptHints: `Generate realistic project thumbnails using gradient placeholders with project names.
Include 4-6 portfolio items with categories. The typing animation should cycle through 3-4 titles.
Experience timeline should show 3-4 entries with company, role, dates, and 2-3 bullet points.
Use skill bars or tags for technologies.`,
  },

  {
    id: "saas",
    name: "SaaS / Startup",
    keywords: ["saas", "startup", "стартап", "app", "приложение", "product", "продукт", "platform", "платформа", "software", "service", "сервис", "tool", "инструмент", "api"],
    plan: {
      sections: [
        "Hero with headline, subtext, email capture form, and product screenshot",
        "Logos bar (trusted by / as seen in)",
        "Features grid (3 main features with icons and descriptions)",
        "How it works (3-step numbered process)",
        "Pricing table (3 tiers: Free, Pro, Enterprise)",
        "Testimonials carousel (3-5 customer quotes with photos)",
        "FAQ accordion (6-8 questions)",
        "CTA section with email capture",
        "Footer with links, social, 'Made with Wai ✨'",
      ],
      colorScheme: "Modern tech: indigo primary (#4f46e5), violet accent (#7c3aed), slate gray (#475569), white background, dark sections for contrast",
      typography: "Inter for everything (clean tech look), bold weights for headings",
      interactiveElements: [
        "Email capture form with validation and success state",
        "Pricing toggle (monthly/annual with discount badge)",
        "FAQ accordion with smooth expand/collapse",
        "Testimonial auto-scroll carousel",
        "Feature tabs or hover cards",
        "Scroll-triggered counters (users, uptime, etc.)",
        "Mobile hamburger menu",
        "Dark mode toggle",
        "Smooth scroll navigation",
      ],
      estimatedComplexity: "complex",
    },
    promptHints: `Generate realistic pricing (Free: $0, Pro: $29/mo, Enterprise: custom).
Include a "Save 20%" badge on annual pricing toggle. Feature icons should use Lucide.
The How It Works section should be a clear 3-step visual process.
Include realistic metrics in the hero (10K+ users, 99.9% uptime, etc.).`,
  },

  {
    id: "event",
    name: "Event / Conference",
    keywords: ["event", "мероприятие", "conference", "конференция", "hackathon", "хакатон", "meetup", "митап", "workshop", "воркшоп", "summit", "саммит", "festival", "фестиваль", "concert", "концерт", "webinar", "вебинар"],
    plan: {
      sections: [
        "Hero with event name, date, location, and countdown timer",
        "About the event with key highlights",
        "Speakers/lineup grid with photos, names, roles, and topics",
        "Schedule/agenda with timeline (Day 1, Day 2, etc.)",
        "Venue section with map and directions",
        "Sponsors/partners logo grid",
        "Registration form or ticket CTA",
        "FAQ accordion",
        "Footer with 'Made with Wai ✨'",
      ],
      colorScheme: "Vibrant energy: deep purple (#6d28d9), hot pink accent (#ec4899), dark background (#0f0e17), white text",
      typography: "Outfit for headings (bold, modern), Inter for body",
      interactiveElements: [
        "Live countdown timer (days, hours, minutes, seconds)",
        "Schedule day tabs (Day 1, Day 2)",
        "Speaker modal with full bio on click",
        "FAQ accordion",
        "Registration form with ticket type selection",
        "Mobile hamburger menu",
        "Scroll animations",
        "Smooth scroll navigation",
      ],
      estimatedComplexity: "complex",
    },
    promptHints: `The countdown timer should target a realistic future date.
Generate 4-6 speakers with realistic names, companies, and talk titles.
Schedule should have time slots (09:00, 10:30, etc.) with session titles and speaker names.
Include ticket types: Early Bird, Standard, VIP with different prices.`,
  },

  {
    id: "ecommerce",
    name: "E-commerce / Store",
    keywords: ["shop", "магазин", "store", "ecommerce", "e-commerce", "buy", "купить", "products", "товары", "товар", "sell", "продать", "продажа", "market", "маркет", "marketplace"],
    plan: {
      sections: [
        "Hero with featured product/collection and Shop Now CTA",
        "Featured products grid (4-8 items with images, names, prices)",
        "Categories section with image cards",
        "Product showcase with details, add-to-cart, size/color selectors",
        "Customer reviews section",
        "Shipping & returns info cards",
        "Newsletter signup with discount offer",
        "Footer with links, payment icons, 'Made with Wai ✨'",
      ],
      colorScheme: "Clean commerce: black primary (#0a0a0a), gold accent (#d4a574), white background, light gray (#f5f5f5) sections",
      typography: "DM Sans for headings (modern, friendly), Inter for body",
      interactiveElements: [
        "Product quick-view modal",
        "Add to cart animation",
        "Category filter tabs",
        "Size and color selectors",
        "Quantity stepper (+/-)",
        "Newsletter form with email validation",
        "Product image hover zoom",
        "Mobile hamburger menu",
        "Scroll animations",
      ],
      estimatedComplexity: "complex",
    },
    promptHints: `Generate realistic products with names, prices, and discount badges.
Include "Add to Cart" buttons (can be non-functional but should look real).
Product cards should show original price crossed out + sale price.
Use clean product photography placeholder gradients.`,
  },

  {
    id: "landing",
    name: "Landing Page",
    keywords: ["landing", "лендинг", "page", "страница", "promo", "промо", "launch", "запуск", "coming soon", "скоро"],
    plan: {
      sections: [
        "Hero with bold headline, subtext, and primary CTA button",
        "Problem/pain points section (what users struggle with)",
        "Solution section (how your product/service solves it)",
        "Benefits grid with icons (3-4 key benefits)",
        "Social proof (testimonials or trust badges)",
        "CTA section with form or button",
        "Footer with 'Made with Wai ✨'",
      ],
      colorScheme: "High-conversion: blue primary (#2563eb), orange CTA (#f97316), white background, dark text (#111827)",
      typography: "Inter for everything, extra bold headings",
      interactiveElements: [
        "Scroll-triggered animations",
        "CTA button with hover pulse animation",
        "Email capture form with validation",
        "Mobile hamburger menu",
        "Smooth scroll",
        "Dark mode toggle",
      ],
      estimatedComplexity: "medium",
    },
    promptHints: `Focus on conversion. The hero headline should be benefit-focused, not feature-focused.
Use action verbs in CTAs ("Get Started Free", "Start Now").
Keep sections short and scannable. Use bullet points over paragraphs.`,
  },
];

/**
 * Detect the best matching template from a description.
 * Returns undefined if no template matches strongly enough.
 */
export function detectTemplate(description: string): Template | undefined {
  const lower = description.toLowerCase();

  let bestMatch: Template | undefined;
  let bestScore = 0;

  for (const template of TEMPLATES) {
    let score = 0;
    for (const keyword of template.keywords) {
      if (lower.includes(keyword)) {
        score++;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  }

  if (bestMatch && bestScore > 0) {
    log.info({ service: "templates", action: "detected", template: bestMatch.id, score: bestScore });
    return bestMatch;
  }

  return undefined;
}

/**
 * Get a template by ID.
 */
export function getTemplateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/**
 * List all available templates (for /templates command).
 */
export function listTemplates(): string {
  return TEMPLATES.map((t) => `• *${t.name}* (\`${t.id}\`) — ${t.plan.sections.length} sections, ${t.plan.interactiveElements.length} interactive elements`).join("\n");
}
