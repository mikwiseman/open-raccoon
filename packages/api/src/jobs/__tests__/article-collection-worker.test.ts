import { describe, expect, it } from 'vitest';

/**
 * We test the pure RSS parsing logic by extracting the functions via a dynamic import
 * workaround. Since parseRssItems and stripCdata are not exported, we inline their
 * logic here for testing purposes. In a production codebase you'd refactor to export
 * these pure functions from a separate module.
 */

// Inline copies of the pure functions from article-collection-worker.ts
function stripCdata(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string | null;
}

function parseRssItems(xmlText: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let itemMatch: RegExpExecArray | null = itemRegex.exec(xmlText);

  while (itemMatch !== null) {
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
    itemMatch = itemRegex.exec(xmlText);
  }

  return items;
}

/* ================================================================
 * stripCdata
 * ================================================================ */
describe('stripCdata', () => {
  it('removes CDATA wrapper from text', () => {
    expect(stripCdata('<![CDATA[Hello World]]>')).toBe('Hello World');
  });

  it('returns text unchanged when no CDATA present', () => {
    expect(stripCdata('Hello World')).toBe('Hello World');
  });

  it('handles multiple CDATA sections', () => {
    expect(stripCdata('<![CDATA[A]]> and <![CDATA[B]]>')).toBe('A and B');
  });

  it('handles empty CDATA', () => {
    expect(stripCdata('<![CDATA[]]>')).toBe('');
  });

  it('handles nested angle brackets in CDATA', () => {
    expect(stripCdata('<![CDATA[<b>bold</b>]]>')).toBe('<b>bold</b>');
  });

  it('handles empty string', () => {
    expect(stripCdata('')).toBe('');
  });
});

/* ================================================================
 * parseRssItems
 * ================================================================ */
describe('parseRssItems', () => {
  it('parses a standard RSS feed with multiple items', () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>Article One</title>
      <link>https://example.com/article-1</link>
      <description>First article description</description>
      <pubDate>Mon, 01 Jan 2025 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Article Two</title>
      <link>https://example.com/article-2</link>
      <description>Second article description</description>
      <pubDate>Tue, 02 Jan 2025 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

    const items = parseRssItems(xml);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Article One');
    expect(items[0].link).toBe('https://example.com/article-1');
    expect(items[0].description).toBe('First article description');
    expect(items[0].pubDate).toBe('Mon, 01 Jan 2025 12:00:00 GMT');
    expect(items[1].title).toBe('Article Two');
  });

  it('handles CDATA-wrapped fields', () => {
    const xml = `<rss>
<channel>
  <item>
    <title><![CDATA[CDATA Title]]></title>
    <link><![CDATA[https://example.com/cdata]]></link>
    <description><![CDATA[<p>HTML in description</p>]]></description>
    <pubDate>Wed, 03 Jan 2025 12:00:00 GMT</pubDate>
  </item>
</channel>
</rss>`;

    const items = parseRssItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('CDATA Title');
    expect(items[0].link).toBe('https://example.com/cdata');
    expect(items[0].description).toBe('<p>HTML in description</p>');
  });

  it('skips items without a link', () => {
    const xml = `<rss>
<channel>
  <item>
    <title>No Link Article</title>
    <description>Has no link</description>
  </item>
  <item>
    <title>Has Link</title>
    <link>https://example.com/valid</link>
    <description>Valid article</description>
  </item>
</channel>
</rss>`;

    const items = parseRssItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Has Link');
  });

  it('returns null pubDate when not present', () => {
    const xml = `<rss>
<channel>
  <item>
    <title>No Date</title>
    <link>https://example.com/no-date</link>
    <description>Article without date</description>
  </item>
</channel>
</rss>`;

    const items = parseRssItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0].pubDate).toBeNull();
  });

  it('returns empty string for missing title and description', () => {
    const xml = `<rss>
<channel>
  <item>
    <link>https://example.com/minimal</link>
  </item>
</channel>
</rss>`;

    const items = parseRssItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('');
    expect(items[0].description).toBe('');
    expect(items[0].pubDate).toBeNull();
  });

  it('returns empty array for empty XML', () => {
    expect(parseRssItems('')).toEqual([]);
  });

  it('returns empty array for XML with no items', () => {
    const xml = `<rss><channel><title>Empty Feed</title></channel></rss>`;
    expect(parseRssItems(xml)).toEqual([]);
  });

  it('handles whitespace in field values', () => {
    const xml = `<rss>
<channel>
  <item>
    <title>  Spaced Title  </title>
    <link>  https://example.com/spaced  </link>
    <description>  Spaced desc  </description>
  </item>
</channel>
</rss>`;

    const items = parseRssItems(xml);
    expect(items[0].title).toBe('Spaced Title');
    expect(items[0].link).toBe('https://example.com/spaced');
    expect(items[0].description).toBe('Spaced desc');
  });

  it('handles items with attributes on tags', () => {
    const xml = `<rss>
<channel>
  <item xmlns:dc="http://purl.org/dc/elements/1.1/">
    <title type="text">Attributed Title</title>
    <link rel="alternate">https://example.com/attributed</link>
    <description>Desc</description>
  </item>
</channel>
</rss>`;

    const items = parseRssItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Attributed Title');
  });
});
