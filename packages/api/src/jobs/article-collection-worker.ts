import { randomUUID } from 'node:crypto';
import { createQueue, createWorker } from './queue.js';
import { sql } from '../db/connection.js';

const QUEUE_NAME = 'article-collection';

export const articleCollectionQueue = createQueue(QUEUE_NAME);

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string | null;
}

/**
 * Parse RSS XML into an array of items. Uses basic string matching
 * to extract <item> elements and their child tags.
 */
function parseRssItems(xmlText: string): RssItem[] {
  const items: RssItem[] = [];

  // Match all <item>...</item> blocks
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let itemMatch: RegExpExecArray | null;

  while ((itemMatch = itemRegex.exec(xmlText)) !== null) {
    const block = itemMatch[1];

    const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(block);
    const linkMatch = /<link\b[^>]*>([\s\S]*?)<\/link>/i.exec(block);
    const descMatch = /<description\b[^>]*>([\s\S]*?)<\/description>/i.exec(block);
    const dateMatch = /<pubDate\b[^>]*>([\s\S]*?)<\/pubDate>/i.exec(block);

    const title = titleMatch ? stripCdata(titleMatch[1]).trim() : '';
    const link = linkMatch ? stripCdata(linkMatch[1]).trim() : '';
    const description = descMatch ? stripCdata(descMatch[1]).trim() : '';
    const pubDate = dateMatch ? stripCdata(dateMatch[1]).trim() : null;

    if (link) {
      items.push({ title, link, description, pubDate });
    }
  }

  return items;
}

function stripCdata(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

/**
 * Collect articles from all RSS agent sources.
 * For each agent_source with type='rss':
 *   - Fetch the RSS feed URL
 *   - Parse XML, extract articles
 *   - Insert new articles into agent_articles (skip duplicates by URL)
 *   - Update agent_sources.last_fetched_at
 */
export const articleCollectionWorker = createWorker(
  QUEUE_NAME,
  async () => {
    // Get all RSS sources
    const sources = await sql`
      SELECT id, agent_id, url FROM agent_sources WHERE type = 'rss' AND url IS NOT NULL
    `;

    for (const sourceRow of sources) {
      const source = sourceRow as Record<string, unknown>;
      const sourceId = source['id'] as string;
      const agentId = source['agent_id'] as string;
      const feedUrl = source['url'] as string;

      // Fetch the RSS feed
      const response = await fetch(feedUrl);
      if (!response.ok) {
        console.error(`Failed to fetch RSS feed ${feedUrl}: ${response.status}`);
        continue;
      }

      const xmlText = await response.text();
      const items = parseRssItems(xmlText);

      // Get existing URLs for this source to skip duplicates
      const existingRows = await sql`
        SELECT url FROM agent_articles WHERE source_id = ${sourceId}
      `;
      const existingUrls = new Set(
        (existingRows as Array<Record<string, unknown>>).map((r) => r['url'] as string),
      );

      const now = new Date().toISOString();

      for (const item of items) {
        if (existingUrls.has(item.link)) continue;

        const publishedAt = item.pubDate ? new Date(item.pubDate).toISOString() : null;

        await sql`
          INSERT INTO agent_articles (
            id, agent_id, source_id, title, url, content, published_at, collected_at,
            metadata, inserted_at, updated_at
          ) VALUES (
            ${randomUUID()}, ${agentId}, ${sourceId}, ${item.title}, ${item.link},
            ${item.description}, ${publishedAt}, ${now}, '{}', ${now}, ${now}
          )
        `;
      }

      // Update last_fetched_at
      await sql`
        UPDATE agent_sources SET last_fetched_at = ${now}, updated_at = ${now}
        WHERE id = ${sourceId}
      `;
    }
  },
);

/**
 * Schedule article collection to run every 30 minutes.
 */
export async function scheduleArticleCollection(): Promise<void> {
  const repeatableJobs = await articleCollectionQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await articleCollectionQueue.removeRepeatableByKey(job.key);
  }

  await articleCollectionQueue.add(
    'collect-articles',
    {},
    {
      repeat: { every: 30 * 60 * 1000 }, // 30 minutes
    },
  );
}
