/**
 * Component Library — pre-built UI block definitions for site generation.
 *
 * Each component is a proven Tailwind + Alpine.js code snippet that
 * Claude can reference during generation. Injected into the prompt
 * when the component type is detected in the site plan.
 *
 * This is the shadcn/ui pattern: provide exact working code for
 * common UI patterns instead of hoping the model generates them correctly.
 */

import { log } from "@wai/core";

/** A reusable UI component definition. */
export interface Component {
  id: string;
  name: string;
  /** Keywords that trigger this component. */
  triggers: string[];
  /** Working code snippet (Tailwind + Alpine.js). */
  snippet: string;
  /** Description for the model. */
  description: string;
}

export const COMPONENTS: Component[] = [
  {
    id: "pricing-toggle",
    name: "Pricing Table with Toggle",
    triggers: ["pricing", "plans", "тарифы", "цены", "price"],
    description: "3-tier pricing table with monthly/annual toggle and savings badge",
    snippet: `<!-- Pricing with Monthly/Annual Toggle -->
<div x-data="{ annual: false }" class="py-20 px-6">
  <div class="text-center mb-12">
    <h2 class="text-3xl font-bold mb-4">Pricing</h2>
    <div class="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1">
      <button @click="annual = false" :class="!annual ? 'bg-white dark:bg-gray-700 shadow' : ''" class="px-4 py-2 rounded-full text-sm font-medium transition">Monthly</button>
      <button @click="annual = true" :class="annual ? 'bg-white dark:bg-gray-700 shadow' : ''" class="px-4 py-2 rounded-full text-sm font-medium transition">Annual <span class="text-green-500 text-xs font-bold">Save 20%</span></button>
    </div>
  </div>
  <!-- Cards: Basic / Pro / Enterprise -->
</div>`,
  },
  {
    id: "faq-accordion",
    name: "FAQ Accordion",
    triggers: ["faq", "questions", "вопросы", "чаво", "accordion"],
    description: "Expandable FAQ section with smooth animations",
    snippet: `<!-- FAQ Accordion -->
<div x-data="{ open: null }" class="max-w-3xl mx-auto py-20 px-6">
  <h2 class="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
  <template x-for="(item, index) in [
    { q: 'Question 1?', a: 'Answer 1.' },
    { q: 'Question 2?', a: 'Answer 2.' },
  ]">
    <div class="border-b border-gray-200 dark:border-gray-700">
      <button @click="open = open === index ? null : index" class="w-full py-4 flex justify-between items-center text-left font-medium">
        <span x-text="item.q"></span>
        <i data-lucide="chevron-down" class="w-5 h-5 transition-transform" :class="open === index && 'rotate-180'"></i>
      </button>
      <div x-show="open === index" x-transition:enter="transition ease-out duration-200"
           x-transition:enter-start="opacity-0 -translate-y-2" x-transition:enter-end="opacity-100 translate-y-0"
           class="pb-4 text-gray-600 dark:text-gray-400" x-text="item.a"></div>
    </div>
  </template>
</div>`,
  },
  {
    id: "testimonial-carousel",
    name: "Testimonial Carousel",
    triggers: ["testimonial", "review", "отзывы", "отзыв", "carousel"],
    description: "Auto-scrolling testimonial cards with avatars and star ratings",
    snippet: `<!-- Testimonial Carousel -->
<div x-data="{ current: 0, testimonials: [
  { name: 'User 1', role: 'CEO', text: 'Amazing!', stars: 5 },
  { name: 'User 2', role: 'CTO', text: 'Excellent!', stars: 5 },
  { name: 'User 3', role: 'Designer', text: 'Beautiful!', stars: 4 },
] }" x-init="setInterval(() => current = (current + 1) % testimonials.length, 5000)" class="py-20 px-6">
  <h2 class="text-3xl font-bold text-center mb-12">What People Say</h2>
  <div class="max-w-2xl mx-auto relative overflow-hidden">
    <template x-for="(t, i) in testimonials">
      <div x-show="current === i" x-transition:enter="transition ease-out duration-500"
           x-transition:enter-start="opacity-0 translate-x-8" x-transition:enter-end="opacity-100 translate-x-0"
           class="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg text-center">
        <div class="flex justify-center mb-4" x-html="'⭐'.repeat(t.stars)"></div>
        <p class="text-lg italic mb-6" x-text="t.text"></p>
        <p class="font-bold" x-text="t.name"></p>
        <p class="text-sm text-gray-500" x-text="t.role"></p>
      </div>
    </template>
    <div class="flex justify-center gap-2 mt-6">
      <template x-for="(_, i) in testimonials">
        <button @click="current = i" :class="current === i ? 'bg-primary-600 w-8' : 'bg-gray-300 w-2'" class="h-2 rounded-full transition-all"></button>
      </template>
    </div>
  </div>
</div>`,
  },
  {
    id: "contact-form",
    name: "Contact Form with Validation",
    triggers: ["contact", "form", "контакт", "форма", "feedback", "обратная связь"],
    description: "Contact form with real-time validation and success state",
    snippet: `<!-- Contact Form -->
<div x-data="{ name: '', email: '', message: '', errors: {}, sent: false,
  validate() {
    this.errors = {};
    if (!this.name.trim()) this.errors.name = 'Name is required';
    if (!this.email.match(/^[^@]+@[^@]+\\.[^@]+$/)) this.errors.email = 'Valid email required';
    if (this.message.length < 10) this.errors.message = 'Message too short (min 10 chars)';
    return Object.keys(this.errors).length === 0;
  }
}" class="max-w-xl mx-auto py-20 px-6">
  <h2 class="text-3xl font-bold text-center mb-8">Contact Us</h2>
  <form @submit.prevent="if(validate()) sent = true">
    <div class="mb-4">
      <input x-model="name" type="text" placeholder="Your Name" class="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-primary-500">
      <p x-show="errors.name" class="text-red-500 text-sm mt-1" x-text="errors.name"></p>
    </div>
    <div class="mb-4">
      <input x-model="email" type="email" placeholder="Email" class="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-primary-500">
      <p x-show="errors.email" class="text-red-500 text-sm mt-1" x-text="errors.email"></p>
    </div>
    <div class="mb-6">
      <textarea x-model="message" placeholder="Message" rows="4" class="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-primary-500"></textarea>
      <p x-show="errors.message" class="text-red-500 text-sm mt-1" x-text="errors.message"></p>
    </div>
    <button type="submit" class="w-full py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition">Send Message</button>
    <div x-show="sent" x-transition class="mt-4 p-4 bg-green-100 text-green-800 rounded-xl text-center font-medium">✓ Message sent successfully!</div>
  </form>
</div>`,
  },
  {
    id: "hero-gradient",
    name: "Hero with Gradient",
    triggers: ["hero", "header", "landing", "main", "заголовок"],
    description: "Bold hero section with gradient background, headline, and CTA",
    snippet: `<!-- Hero Section -->
<section class="relative min-h-[80vh] flex items-center bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-800 text-white overflow-hidden">
  <div class="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10"></div>
  <div class="container mx-auto px-6 py-20 relative z-10">
    <h1 class="text-5xl md:text-7xl font-bold mb-6 tracking-tight">Your Headline</h1>
    <p class="text-xl md:text-2xl text-white/80 mb-10 max-w-2xl">Subtext description goes here.</p>
    <div class="flex gap-4">
      <a href="#" class="px-8 py-4 bg-white text-primary-700 rounded-full font-bold hover:shadow-xl transition-all hover:-translate-y-1">Get Started</a>
      <a href="#" class="px-8 py-4 border-2 border-white/30 rounded-full font-bold hover:bg-white/10 transition">Learn More</a>
    </div>
  </div>
</section>`,
  },
  {
    id: "countdown-timer",
    name: "Countdown Timer",
    triggers: ["countdown", "timer", "event", "launch", "обратный отсчёт", "мероприятие"],
    description: "Live countdown timer with days, hours, minutes, seconds",
    snippet: `<!-- Countdown Timer -->
<div x-data="countdown()" x-init="start()" class="flex gap-4 justify-center py-8">
  <template x-for="unit in [
    { value: days, label: 'Days' },
    { value: hours, label: 'Hours' },
    { value: minutes, label: 'Min' },
    { value: seconds, label: 'Sec' }
  ]">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 min-w-[80px] text-center">
      <div class="text-3xl font-bold text-primary-600" x-text="String(unit.value).padStart(2,'0')"></div>
      <div class="text-xs text-gray-500 mt-1" x-text="unit.label"></div>
    </div>
  </template>
</div>
<script>
function countdown() {
  const target = new Date(Date.now() + 30*24*60*60*1000);
  return { days:0, hours:0, minutes:0, seconds:0,
    start() { setInterval(() => {
      const diff = Math.max(0, target - Date.now());
      this.days = Math.floor(diff/86400000);
      this.hours = Math.floor((diff%86400000)/3600000);
      this.minutes = Math.floor((diff%3600000)/60000);
      this.seconds = Math.floor((diff%60000)/1000);
    }, 1000); }
  };
}
</script>`,
  },
];

/**
 * Find components relevant to a site description or plan.
 */
export function findRelevantComponents(text: string): Component[] {
  const lower = text.toLowerCase();
  const matched: Component[] = [];

  for (const comp of COMPONENTS) {
    if (comp.triggers.some((t) => lower.includes(t))) {
      matched.push(comp);
    }
  }

  log.info({ service: "components", action: "matched", count: matched.length, ids: matched.map((c) => c.id).join(",") });
  return matched;
}

/**
 * Build component reference section for the generation prompt.
 */
export function buildComponentPrompt(components: Component[]): string {
  if (components.length === 0) return "";

  const lines = ["\n## Reference Components (use these as-is or adapt)"];
  for (const comp of components) {
    lines.push(`\n### ${comp.name}`);
    lines.push(comp.description);
    lines.push("```html");
    lines.push(comp.snippet);
    lines.push("```");
  }

  return lines.join("\n");
}

/**
 * Get a component by ID.
 */
export function getComponentById(id: string): Component | undefined {
  return COMPONENTS.find((c) => c.id === id);
}

/**
 * List all available components.
 */
export function listComponents(): string {
  return COMPONENTS.map((c) => `• *${c.name}* — ${c.description}`).join("\n");
}
