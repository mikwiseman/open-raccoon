/**
 * Site Builder — generate and deploy websites from Telegram prompts.
 *
 * Two modes:
 * 1. Simple: Claude generates single HTML file → deploy to Cloudflare Pages
 * 2. Agent: Claude Agent SDK builds multi-file site → deploy to Cloudflare Pages
 *
 * All sites deployed to {slug}.wai.computer via Cloudflare Pages.
 */

import Anthropic from "@anthropic-ai/sdk";
import { config, log } from "@wai/core";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

const DOMAIN = "wai.computer";

const SITE_PROMPT = `You are a web developer. Generate a complete, beautiful, modern single-page website.

Description: {description}

Requirements:
- Single HTML file with embedded CSS and JavaScript
- Modern, clean, responsive design (mobile-first)
- Beautiful typography and spacing, professional color scheme
- Smooth animations and hover effects
- Use emoji for icons (no external dependencies)
- Include a footer: "Made with Wai ✨"
- Do NOT use any external CDN, fonts, or frameworks
- The file must be self-contained and look stunning

Respond with ONLY the HTML code starting with <!DOCTYPE html>. No markdown, no explanation.`;

/**
 * Generate a URL-safe slug from a name.
 */
export function generateSlug(name: string): string {
  const translit: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
    ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
    н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
    ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };

  let slug = "";
  for (const char of name.toLowerCase()) {
    if (translit[char]) slug += translit[char];
    else if (/[a-z0-9]/.test(char)) slug += char;
    else if (/[\s\-_]/.test(char)) slug += "-";
  }

  return slug.replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 50)
    || `site-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Generate HTML for a site using Claude.
 */
export async function generateSiteHtml(description: string): Promise<string | null> {
  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  log.info({ service: "site-builder", action: "generating", description: description.slice(0, 100) });

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    messages: [
      { role: "user", content: SITE_PROMPT.replace("{description}", description.slice(0, 3000)) },
    ],
  });

  let html = response.content[0].type === "text" ? response.content[0].text.trim() : "";

  // Strip markdown code blocks
  if (html.startsWith("```")) {
    html = html.replace(/^```\w*\n?/, "").replace(/\n?```$/, "").trim();
  }

  // Extract HTML if wrapped
  if (!html.startsWith("<!DOCTYPE") && !html.startsWith("<html")) {
    const match = html.match(/<!DOCTYPE html[\s\S]*<\/html>/i);
    if (match) html = match[0];
    else return null;
  }

  log.info({ service: "site-builder", action: "generated", htmlSize: html.length });
  return html;
}

/**
 * Deploy HTML to Cloudflare Pages.
 */
export async function deployToCloudflare(slug: string, html: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  const { cloudflareApiToken, cloudflareAccountId } = config;

  if (!cloudflareApiToken || !cloudflareAccountId) {
    return { success: false, error: "Cloudflare credentials not configured" };
  }

  log.info({ service: "site-builder", action: "deploying", slug });

  try {
    const crypto = await import("crypto");
    const contentHash = crypto.createHash("md5").update(html).digest("hex");
    const manifest = JSON.stringify({ "/index.html": contentHash });

    const formData = new FormData();
    formData.append("manifest", manifest);
    formData.append(contentHash, new Blob([html], { type: "text/html" }), "index.html");

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/pages/projects/wai-sites/deployments`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${cloudflareApiToken}` },
        body: formData,
      },
    );

    const data = await response.json() as { success: boolean; result?: { url: string } };

    if (data.success) {
      const url = `https://${slug}.${DOMAIN}`;
      log.info({ service: "site-builder", action: "deployed", slug, url });
      return { success: true, url };
    }

    log.error({ service: "site-builder", action: "deploy-failed", error: JSON.stringify(data) });
    return { success: false, error: "Cloudflare deploy failed" };
  } catch (error) {
    log.error({ service: "site-builder", action: "deploy-error", error: String(error) });
    return { success: false, error: String(error) };
  }
}

/**
 * Deploy a directory of files to Cloudflare Pages.
 * Reads all files recursively, builds manifest with MD5 hashes.
 */
export async function deployDirectoryToCloudflare(slug: string, dir: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  const { cloudflareApiToken, cloudflareAccountId } = config;

  if (!cloudflareApiToken || !cloudflareAccountId) {
    return { success: false, error: "Cloudflare credentials not configured" };
  }

  log.info({ service: "site-builder", action: "deploying-directory", slug, dir });

  try {
    const files = await collectFiles(dir, dir);

    if (files.length === 0) {
      return { success: false, error: "No files generated" };
    }

    const manifest: Record<string, string> = {};
    const formData = new FormData();

    for (const file of files) {
      const content = await readFile(file.absolutePath);
      const hash = createHash("md5").update(content).digest("hex");
      manifest[file.relativePath] = hash;
      formData.append(hash, new Blob([content]), file.relativePath.slice(1));
    }

    formData.append("manifest", JSON.stringify(manifest));

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/pages/projects/wai-sites/deployments`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${cloudflareApiToken}` },
        body: formData,
      },
    );

    const data = await response.json() as { success: boolean; result?: { url: string } };

    if (data.success) {
      const url = `https://${slug}.${DOMAIN}`;
      log.info({ service: "site-builder", action: "deployed-directory", slug, url, fileCount: files.length });
      return { success: true, url };
    }

    log.error({ service: "site-builder", action: "deploy-directory-failed", error: JSON.stringify(data) });
    return { success: false, error: "Cloudflare deploy failed" };
  } catch (error) {
    log.error({ service: "site-builder", action: "deploy-directory-error", error: String(error) });
    return { success: false, error: String(error) };
  }
}

/** Recursively collect files from a directory. */
async function collectFiles(dir: string, root: string): Promise<Array<{ absolutePath: string; relativePath: string }>> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: Array<{ absolutePath: string; relativePath: string }> = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath, root));
    } else if (entry.isFile()) {
      const rel = "/" + fullPath.slice(root.length + 1);
      files.push({ absolutePath: fullPath, relativePath: rel });
    }
  }

  return files;
}

/**
 * Build a multi-file site using Claude Agent SDK.
 * Agent writes files to a temp directory, then we deploy all of them.
 */
export async function buildSiteWithAgent(description: string, slug: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
  fileCount?: number;
}> {
  const workdir = await mkdtemp(join(tmpdir(), "wai-site-"));

  log.info({ service: "site-builder", action: "agent-build-start", slug, workdir });

  try {
    const { query } = await import("@anthropic-ai/claude-agent-sdk");

    for await (const message of query({
      prompt: `Create a beautiful, modern static website based on this description:
${description}

Requirements:
- Write index.html, style.css, and any needed JS files
- Mobile-responsive design with modern aesthetics
- Good typography, spacing, and color scheme
- Smooth animations and transitions
- All assets inline or CDN-linked (no local images)
- Include footer: "Made with Wai ✨"
- The site must work as a standalone static site
- Write ALL files to the current directory`,
      options: {
        cwd: workdir,
        allowedTools: ["Write", "Read"],
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        maxTurns: 15,
        model: "claude-haiku-4-5",
      },
    })) {
      if ("result" in message) {
        log.info({ service: "site-builder", action: "agent-build-done", slug });
      }
    }

    const files = await collectFiles(workdir, workdir);
    log.info({ service: "site-builder", action: "agent-files-generated", slug, fileCount: files.length });

    if (files.length === 0) {
      return { success: false, error: "Agent produced no files" };
    }

    const result = await deployDirectoryToCloudflare(slug, workdir);
    return { ...result, fileCount: files.length };
  } catch (error) {
    log.error({ service: "site-builder", action: "agent-build-error", slug, error: String(error) });
    return { success: false, error: String(error) };
  } finally {
    // Clean up temp directory
    await rm(workdir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Build and deploy a site — the main entry point.
 * Uses simple mode (single HTML) by default, agent mode for complex descriptions.
 */
export async function buildSite(description: string, name?: string, mode: "simple" | "agent" = "simple"): Promise<{
  success: boolean;
  url?: string;
  slug?: string;
  error?: string;
  fileCount?: number;
}> {
  const slug = generateSlug(name ?? description.split(".")[0] ?? description.slice(0, 30));

  if (mode === "agent") {
    const result = await buildSiteWithAgent(description, slug);
    return { ...result, slug };
  }

  // Simple mode: single HTML file
  const html = await generateSiteHtml(description);
  if (!html) {
    return { success: false, slug, error: "Failed to generate HTML" };
  }

  const result = await deployToCloudflare(slug, html);
  return { ...result, slug, fileCount: 1 };
}
