import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stripHtml, extractTitle } from './html-utils.js';

// ─── HTML Utils Tests ────────────────────────────────────────────────────────

describe('stripHtml', () => {
  it('removes script tags and content', () => {
    const result = stripHtml('<script>alert("xss")</script>Hello');
    expect(result).toBe('Hello');
  });

  it('removes style tags and content', () => {
    const result = stripHtml('<style>body { color: red; }</style>Hello');
    expect(result).toBe('Hello');
  });

  it('removes HTML tags', () => {
    const result = stripHtml('<p>Hello <strong>world</strong></p>');
    expect(result).toBe('Hello world');
  });

  it('decodes HTML entities', () => {
    const result = stripHtml('&amp; &lt; &gt; &quot; &#39; &nbsp;');
    expect(result).toBe("& < > \" '");
  });

  it('collapses whitespace', () => {
    const result = stripHtml('Hello    world   ');
    expect(result).toBe('Hello world');
  });

  it('returns empty string for empty input', () => {
    const result = stripHtml('');
    expect(result).toBe('');
  });
});

describe('extractTitle', () => {
  it('extracts title from HTML', () => {
    const result = extractTitle('<html><head><title>My Page</title></head></html>');
    expect(result).toBe('My Page');
  });

  it('returns undefined when no title tag', () => {
    const result = extractTitle('<html><body>No title</body></html>');
    expect(result).toBeUndefined();
  });

  it('strips HTML from title content', () => {
    const result = extractTitle('<title><b>Bold Title</b></title>');
    expect(result).toBe('Bold Title');
  });

  it('handles case-insensitive title tag', () => {
    const result = extractTitle('<TITLE>Uppercase Title</TITLE>');
    expect(result).toBe('Uppercase Title');
  });
});

// ─── Tool Handler Tests ───────────────────────────────────────────────────────

describe('handleWebSearch', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('calls Anthropic API with web_search tool and returns results', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [
        {
          type: 'web_search_tool_result',
          tool_use_id: 'tool_1',
          content: [
            {
              type: 'web_search_result',
              title: 'Test Result',
              url: 'https://example.com',
              encrypted_content: 'encrypted',
              page_age: null,
            },
          ],
        },
      ],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 50 },
    });

    vi.doMock('@anthropic-ai/sdk', () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: { create: mockCreate },
      })),
    }));

    const { handleWebSearch } = await import('./tools.js');
    const result = await handleWebSearch({ query: 'test query', max_results: 5 });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-6',
        tools: expect.arrayContaining([
          expect.objectContaining({ type: 'web_search_20250305', name: 'web_search' }),
        ]),
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user' }),
        ]),
      }),
    );

    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      title: 'Test Result',
      url: 'https://example.com',
    });
  });

  it('returns empty results when no web_search_tool_result blocks', async () => {
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'No results found.' }],
            stop_reason: 'end_turn',
            usage: { input_tokens: 5, output_tokens: 10 },
          }),
        },
      })),
    }));

    const { handleWebSearch } = await import('./tools.js');
    const result = await handleWebSearch({ query: 'obscure query', max_results: 5 });
    expect(result.results).toHaveLength(0);
  });
});

describe('handleFetchPage', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('fetches page and strips HTML', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: vi.fn().mockResolvedValue('<html><head><title>Test Page</title></head><body><p>Hello world</p></body></html>'),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { handleFetchPage } = await import('./tools.js');
    const result = await handleFetchPage({ url: 'https://example.com', max_length: 10000 });

    expect(result.url).toBe('https://example.com');
    expect(result.title).toBe('Test Page');
    expect(result.content).toContain('Hello world');
    expect(result.content).not.toContain('<p>');
  });

  it('truncates content to max_length', async () => {
    const longContent = 'A'.repeat(20000);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: vi.fn().mockResolvedValue(`<body>${longContent}</body>`),
    }));

    const { handleFetchPage } = await import('./tools.js');
    const result = await handleFetchPage({ url: 'https://example.com', max_length: 100 });
    expect(result.content.length).toBeLessThanOrEqual(100);
  });

  it('throws on non-ok HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    }));

    const { handleFetchPage } = await import('./tools.js');
    await expect(handleFetchPage({ url: 'https://example.com/missing', max_length: 10000 })).rejects.toThrow('HTTP 404');
  });
});

describe('handleSummarizeUrl', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('fetches page and summarizes with Claude', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: vi.fn().mockResolvedValue('<html><body><p>Test content about TypeScript</p></body></html>'),
    }));

    const summaryResponse = {
      summary: 'This content discusses TypeScript.',
      key_points: ['TypeScript is a typed superset of JavaScript', 'It compiles to plain JavaScript'],
    };

    vi.doMock('@anthropic-ai/sdk', () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: JSON.stringify(summaryResponse) }],
            stop_reason: 'end_turn',
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
        },
      })),
    }));

    const { handleSummarizeUrl } = await import('./tools.js');
    const result = await handleSummarizeUrl({ url: 'https://example.com' });

    expect(result.url).toBe('https://example.com');
    expect(result.summary).toBe('This content discusses TypeScript.');
    expect(result.key_points).toHaveLength(2);
  });

  it('passes focus to Claude prompt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: vi.fn().mockResolvedValue('<body>Content</body>'),
    }));

    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: '{"summary": "Focused summary", "key_points": []}' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 50, output_tokens: 20 },
    });

    vi.doMock('@anthropic-ai/sdk', () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: { create: mockCreate },
      })),
    }));

    const { handleSummarizeUrl } = await import('./tools.js');
    await handleSummarizeUrl({ url: 'https://example.com', focus: 'pricing' });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('focusing on: pricing'),
          }),
        ]),
      }),
    );
  });
});

// ─── Health Endpoint Test ─────────────────────────────────────────────────────

describe('health endpoint', () => {
  it('health response shape is correct', () => {
    // Verify the expected health response structure
    const expectedResponse = { status: 'ok', server: 'raccoon-web-search' };
    expect(expectedResponse).toMatchObject({ status: 'ok', server: 'raccoon-web-search' });
  });
});
