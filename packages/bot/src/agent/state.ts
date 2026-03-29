/**
 * Site State Manager — localStorage persistence for generated sites.
 *
 * Injects a lightweight Alpine.js store that persists data to localStorage.
 * This gives generated sites real state: shopping carts, user preferences,
 * form drafts, dark mode toggle, counters, etc.
 *
 * The state snippet is ~300 bytes and provides:
 * - Alpine.store('app', { ... }) with auto-persist
 * - Dark mode persistence across reloads
 * - Form draft saving
 * - Cart/counter state
 */

import { log } from "@wai/core";

/**
 * Detect if a site needs state management.
 * Returns true if the site has interactive elements that benefit from persistence.
 */
export function needsStatePersistence(html: string): boolean {
  const indicators = [
    /x-data/i,                    // Alpine.js components
    /dark:/i,                     // Dark mode
    /<form[\s>]/i,                // Forms (draft saving)
    /cart|корзин/i,               // Shopping cart
    /counter|count|счётчик/i,     // Counters
    /toggle|переключ/i,           // Toggles
    /x-model/i,                   // Two-way bindings
    /localStorage/i,              // Already using localStorage
  ];

  const matchCount = indicators.filter((p) => p.test(html)).length;
  return matchCount >= 2;
}

/**
 * Generate the state persistence snippet.
 * Wraps Alpine.js store with localStorage auto-save/load.
 */
export function generateStateSnippet(slug: string): string {
  return `<script>
// Wai State Persistence — auto-saves Alpine.js state to localStorage
document.addEventListener('alpine:init', function() {
  var key = 'wai_${slug.replace(/[^a-z0-9]/g, "_")}';
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || '{}'); } catch(e) {}

  Alpine.store('app', Alpine.reactive(Object.assign({
    darkMode: false,
    formDraft: {},
    cart: [],
    visited: false,
    lastVisit: null
  }, saved)));

  // Mark as visited
  Alpine.store('app').visited = true;
  Alpine.store('app').lastVisit = new Date().toISOString();

  // Auto-save on any change (debounced)
  var timer;
  var save = function() {
    clearTimeout(timer);
    timer = setTimeout(function() {
      try {
        var state = JSON.parse(JSON.stringify(Alpine.store('app')));
        localStorage.setItem(key, JSON.stringify(state));
      } catch(e) {}
    }, 500);
  };

  // Watch for changes via MutationObserver on body
  new MutationObserver(save).observe(document.body, { subtree: true, attributes: true, childList: true });
  // Also save on input events
  document.addEventListener('input', save);
  document.addEventListener('click', save);
});
</script>`;
}

/**
 * Generate dark mode persistence snippet.
 * Loads saved dark mode preference before page renders (prevents flash).
 */
export function generateDarkModeSnippet(slug: string): string {
  return `<script>
// Prevent dark mode flash — load preference before render
(function() {
  var key = 'wai_${slug.replace(/[^a-z0-9]/g, "_")}';
  try {
    var saved = JSON.parse(localStorage.getItem(key) || '{}');
    if (saved.darkMode) document.documentElement.classList.add('dark');
  } catch(e) {}
})();
</script>`;
}

/**
 * Inject state management into generated HTML.
 * Adds:
 * 1. Dark mode flash prevention (in <head>)
 * 2. Alpine.js store with auto-persist (before </body>)
 */
export function injectStateManagement(html: string, slug: string): string {
  if (!needsStatePersistence(html)) return html;

  log.info({ service: "state", action: "injecting", slug });

  let result = html;

  // 1. Inject dark mode flash prevention in <head>
  if (/dark:/i.test(html)) {
    const darkSnippet = generateDarkModeSnippet(slug);
    if (result.includes("</head>")) {
      result = result.replace("</head>", `${darkSnippet}\n</head>`);
    }
  }

  // 2. Inject state persistence before </body>
  const stateSnippet = generateStateSnippet(slug);
  if (result.includes("</body>")) {
    result = result.replace("</body>", `${stateSnippet}\n</body>`);
  } else {
    result += stateSnippet;
  }

  log.info({ service: "state", action: "injected", slug, addedBytes: result.length - html.length });
  return result;
}
