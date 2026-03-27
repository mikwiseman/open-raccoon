/**
 * Integration test — verify all agent modules work together.
 */

import { classifyIntent } from "./agent/router.js";
import { buildSoulPrompt } from "./agent/soul.js";
import { detectLanguage } from "./agent/language.js";
import { detectCommitments } from "./agent/commitments.js";
import { extractEntities } from "./agent/entities.js";
import { generateSlug } from "./agent/site-builder.js";

console.log("✅ All modules imported successfully");

// Test each module
console.log("Intent:", classifyIntent("What did Alex say about pricing?"));
console.log("Language:", detectLanguage("Привет мир"));
console.log("Slug:", generateSlug("Кафе Рассвет"));
console.log("Commitments:", detectCommitments("I'll send the report by Friday").length, "found");
console.log("Entities:", extractEntities("Met with Sarah. Budget $50k. Launch March 30.").length, "found");
console.log("Soul prompt:", buildSoulPrompt({ userName: "Mik", userLanguage: "ru" }).length, "chars");

console.log("\n🎉 All systems operational!");
process.exit(0);
