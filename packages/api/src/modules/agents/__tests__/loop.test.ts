import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runAgentLoop } from '../loop.js';

// Mock DB
vi.mock('../../../db/connection.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([]),
  },
  sql: vi.fn(),
}));

// Mock Drizzle schema imports used in loop (eq, desc)
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ eq: true })),
  desc: vi.fn((_col: unknown) => ({ desc: true })),
}));

vi.mock('../../../db/schema/agents.js', () => ({
  agents: { id: 'id' },
  agentUsageLogs: {},
}));

vi.mock('../../../db/schema/conversations.js', () => ({
  messages: { conversationId: 'conversationId', senderType: 'senderType', content: 'content', createdAt: 'createdAt' },
}));

// Mock emitter
vi.mock('../../../ws/emitter.js', () => ({
  emitAgentEvent: vi.fn(),
}));

// Mock LLM
vi.mock('../llm/index.js', () => ({
  callLLM: vi.fn(),
}));

// Mock soul
vi.mock('../soul.js', () => ({
  assembleSoulPrompt: vi.fn().mockResolvedValue('[Identity]\nTest agent'),
}));

// Mock MCP manager
vi.mock('../mcp-manager.js', () => ({
  McpManager: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    getTools: vi.fn().mockReturnValue([]),
    executeTool: vi.fn(),
    disconnect: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { db } from '../../../db/connection.js';
import { emitAgentEvent } from '../../../ws/emitter.js';
import { callLLM } from '../llm/index.js';

const mockAgent = {
  id: 'agent-1',
  model: 'claude-sonnet-4-6',
  maxTokens: 4096,
  temperature: 0.7,
  mcpServers: [],
  systemPrompt: 'You are helpful.',
};

describe('runAgentLoop', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set up DB mock chain for agents.select
    const dbMock = db as any;
    dbMock.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockAgent]),
      }),
    });

    // Separate call for messages query (chained differently)
    // We'll track calls and respond based on call order
    let selectCallCount = 0;
    dbMock.select.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // First call: agents
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockAgent]),
          }),
        };
      }
      // Second call: messages history
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };
    });

    dbMock.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    });
  });

  it('emits run_started at the beginning', async () => {
    vi.mocked(callLLM).mockResolvedValueOnce({
      toolCalls: [],
      usage: { input_tokens: 10, output_tokens: 20 },
      stopReason: 'end_turn',
    });

    await runAgentLoop({
      agentId: 'agent-1',
      conversationId: 'conv-1',
      userId: 'user-1',
      message: 'Hello',
    });

    expect(emitAgentEvent).toHaveBeenCalledWith('conv-1', expect.objectContaining({ type: 'run_started' }));
  });

  it('emits run_finished with token usage on success', async () => {
    vi.mocked(callLLM).mockResolvedValueOnce({
      toolCalls: [],
      usage: { input_tokens: 10, output_tokens: 20 },
      stopReason: 'end_turn',
    });

    const result = await runAgentLoop({
      agentId: 'agent-1',
      conversationId: 'conv-1',
      userId: 'user-1',
      message: 'Hello',
    });

    expect(emitAgentEvent).toHaveBeenCalledWith('conv-1', expect.objectContaining({
      type: 'run_finished',
      usage: { input_tokens: 10, output_tokens: 20 },
    }));
    expect(result.usage.input_tokens).toBe(10);
    expect(result.usage.output_tokens).toBe(20);
  });

  it('emits text_delta events for streaming text', async () => {
    vi.mocked(callLLM).mockImplementationOnce(async (opts) => {
      opts.onTextDelta('Hello ');
      opts.onTextDelta('world');
      return {
        toolCalls: [],
        usage: { input_tokens: 5, output_tokens: 10 },
        stopReason: 'end_turn',
      };
    });

    const result = await runAgentLoop({
      agentId: 'agent-1',
      conversationId: 'conv-1',
      userId: 'user-1',
      message: 'Test',
    });

    expect(result.response).toBe('Hello world');
    expect(emitAgentEvent).toHaveBeenCalledWith('conv-1', { type: 'text_delta', text: 'Hello ' });
    expect(emitAgentEvent).toHaveBeenCalledWith('conv-1', { type: 'text_delta', text: 'world' });
  });

  it('throws and emits run_error when agent is not found', async () => {
    const dbMock = db as any;
    dbMock.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]), // empty = not found
      }),
    });

    await expect(
      runAgentLoop({
        agentId: 'nonexistent',
        conversationId: 'conv-1',
        userId: 'user-1',
        message: 'Hello',
      })
    ).rejects.toThrow('Agent nonexistent not found');
  });

  it('emits tool_call_start and tool_call_end when tool is used', async () => {
    const { McpManager } = await import('../mcp-manager.js');
    const mockExecuteTool = vi.fn().mockResolvedValue({ output: 'search result' });
    vi.mocked(McpManager).mockImplementationOnce(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      getTools: vi.fn().mockReturnValue([
        { name: 'web_search', description: 'Search', inputSchema: {} },
      ]),
      executeTool: mockExecuteTool,
      disconnect: vi.fn().mockResolvedValue(undefined),
    }) as any);

    // First call: returns a tool_use; second call: finishes
    vi.mocked(callLLM)
      .mockResolvedValueOnce({
        toolCalls: [{ id: 'tc1', name: 'web_search', input: { query: 'test' } }],
        usage: { input_tokens: 10, output_tokens: 15 },
        stopReason: 'tool_use',
      })
      .mockResolvedValueOnce({
        toolCalls: [],
        usage: { input_tokens: 5, output_tokens: 8 },
        stopReason: 'end_turn',
      });

    await runAgentLoop({
      agentId: 'agent-1',
      conversationId: 'conv-1',
      userId: 'user-1',
      message: 'Search for something',
    });

    expect(emitAgentEvent).toHaveBeenCalledWith('conv-1', expect.objectContaining({ type: 'tool_call_start', name: 'web_search' }));
    expect(emitAgentEvent).toHaveBeenCalledWith('conv-1', expect.objectContaining({ type: 'tool_call_end' }));
    expect(mockExecuteTool).toHaveBeenCalledWith('web_search', { query: 'test' });
  });

  it('accumulates token usage across multiple turns', async () => {
    vi.mocked(callLLM)
      .mockResolvedValueOnce({
        toolCalls: [{ id: 'tc1', name: 'web_search', input: {} }],
        usage: { input_tokens: 100, output_tokens: 50 },
        stopReason: 'tool_use',
      })
      .mockResolvedValueOnce({
        toolCalls: [],
        usage: { input_tokens: 200, output_tokens: 100 },
        stopReason: 'end_turn',
      });

    const result = await runAgentLoop({
      agentId: 'agent-1',
      conversationId: 'conv-1',
      userId: 'user-1',
      message: 'Do something',
    });

    expect(result.usage.input_tokens).toBe(300);
    expect(result.usage.output_tokens).toBe(150);
  });
});
