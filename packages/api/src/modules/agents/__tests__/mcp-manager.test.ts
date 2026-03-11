import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpManager } from '../mcp-manager.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeJsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(body),
  };
}

describe('McpManager', () => {
  let manager: McpManager;

  beforeEach(() => {
    manager = new McpManager();
    vi.clearAllMocks();
  });

  it('discovers tools from a server on connect', async () => {
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({
        result: {
          tools: [
            {
              name: 'web_search',
              description: 'Search the web',
              inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
            },
          ],
        },
      }),
    );

    await manager.connect([{ url: 'http://mcp-server', name: 'web-search' }]);
    const tools = manager.getTools();

    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('web_search');
    expect(tools[0].description).toBe('Search the web');
  });

  it('throws when server returns a non-2xx response', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({}, 500));

    await expect(manager.connect([{ url: 'http://bad-server', name: 'bad' }])).rejects.toThrow(
      '500',
    );
  });

  it('throws when server returns an MCP error', async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ error: { message: 'Method not found' } }));

    await expect(manager.connect([{ url: 'http://mcp-server', name: 'test' }])).rejects.toThrow(
      'Method not found',
    );
  });

  it('executes a tool by routing to the correct server', async () => {
    // Discovery
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({
        result: {
          tools: [{ name: 'web_search', description: 'Search', inputSchema: {} }],
        },
      }),
    );
    // Tool call
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({ result: { content: [{ type: 'text', text: 'results' }] } }),
    );

    await manager.connect([{ url: 'http://mcp-server', name: 'web-search' }]);
    const result = await manager.executeTool('web_search', { query: 'test' });

    expect(result).toEqual({ content: [{ type: 'text', text: 'results' }] });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [url, init] = mockFetch.mock.calls[1];
    expect(url).toBe('http://mcp-server/mcp');
    const body = JSON.parse(init.body as string);
    expect(body.method).toBe('tools/call');
    expect(body.params.name).toBe('web_search');
  });

  it('throws when executing an unknown tool', async () => {
    await manager.connect([]);
    await expect(manager.executeTool('nonexistent', {})).rejects.toThrow(
      "Tool 'nonexistent' not found",
    );
  });

  it('returns empty tools after disconnect', async () => {
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({ result: { tools: [{ name: 'test', description: '', inputSchema: {} }] } }),
    );

    await manager.connect([{ url: 'http://mcp-server', name: 'test' }]);
    expect(manager.getTools()).toHaveLength(1);

    await manager.disconnect();
    expect(manager.getTools()).toHaveLength(0);
  });

  it('merges tools from multiple servers', async () => {
    mockFetch
      .mockResolvedValueOnce(
        makeJsonResponse({
          result: { tools: [{ name: 'tool_a', description: 'A', inputSchema: {} }] },
        }),
      )
      .mockResolvedValueOnce(
        makeJsonResponse({
          result: { tools: [{ name: 'tool_b', description: 'B', inputSchema: {} }] },
        }),
      );

    await manager.connect([
      { url: 'http://server-a', name: 'a' },
      { url: 'http://server-b', name: 'b' },
    ]);

    const tools = manager.getTools();
    expect(tools).toHaveLength(2);
    expect(tools.map((t) => t.name)).toContain('tool_a');
    expect(tools.map((t) => t.name)).toContain('tool_b');
  });
});
