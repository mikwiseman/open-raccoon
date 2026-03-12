import { beforeEach, describe, expect, it } from 'vitest';

/**
 * Edge-case tests for the stream processor logic extracted from useAgentStream.
 * This tests the event-to-state mapping without React hooks.
 */

type AgentStreamEvent = {
  type: string;
  conversationId?: string;
  runId?: string;
  agentId?: string;
  text?: string;
  toolName?: string;
  toolCallId?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: unknown;
  durationMs?: number;
  usage?: { inputTokens: number; outputTokens: number };
  error?: string;
  message?: string;
};

type ContentBlock =
  | { type: 'text'; text: string }
  | {
      type: 'tool_call';
      toolName: string;
      toolCallId?: string;
      input?: Record<string, unknown>;
      status: 'running' | 'done';
    }
  | {
      type: 'tool_result';
      toolName: string;
      toolCallId?: string;
      result: unknown;
      durationMs?: number;
      isError: boolean;
    }
  | { type: 'thinking'; text: string };

type StreamingMessage = {
  runId: string;
  agentId?: string;
  blocks: ContentBlock[];
  usage: { inputTokens: number; outputTokens: number } | null;
};

function createStreamProcessor() {
  let current: StreamingMessage | null = null;
  let isStreaming = false;

  function processEvent(event: AgentStreamEvent) {
    switch (event.type) {
      case 'run_started': {
        current = {
          runId: event.runId || 'test-run-id',
          agentId: event.agentId,
          blocks: [],
          usage: null,
        };
        isStreaming = true;
        break;
      }
      case 'text_delta': {
        if (!current) {
          current = {
            runId: 'implicit-run',
            agentId: event.agentId,
            blocks: [],
            usage: null,
          };
          isStreaming = true;
        }
        const text = event.text || '';
        const blocks = [...current.blocks];
        const lastBlock = blocks[blocks.length - 1];

        if (lastBlock && lastBlock.type === 'text') {
          blocks[blocks.length - 1] = { ...lastBlock, text: lastBlock.text + text };
        } else {
          blocks.push({ type: 'text', text });
        }
        current = { ...current, blocks };
        break;
      }
      case 'tool_call_start': {
        if (!current) break;
        const blocks = [...current.blocks];
        blocks.push({
          type: 'tool_call',
          toolName: event.toolName || 'unknown',
          toolCallId: event.toolCallId,
          input: event.toolInput,
          status: 'running' as const,
        });
        current = { ...current, blocks };
        break;
      }
      case 'tool_call_end': {
        if (!current) break;
        const blocks = [...current.blocks];
        for (let i = blocks.length - 1; i >= 0; i--) {
          const block = blocks[i];
          if (
            block.type === 'tool_call' &&
            block.status === 'running' &&
            (!event.toolCallId || block.toolCallId === event.toolCallId)
          ) {
            blocks[i] = { ...block, status: 'done' as const };
            break;
          }
        }
        blocks.push({
          type: 'tool_result',
          toolName: event.toolName || 'unknown',
          toolCallId: event.toolCallId,
          result: event.toolResult,
          durationMs: event.durationMs,
          isError: false,
        });
        current = { ...current, blocks };
        break;
      }
      case 'thinking': {
        if (!current) break;
        const blocks = [...current.blocks];
        blocks.push({ type: 'thinking', text: event.text || '' });
        current = { ...current, blocks };
        break;
      }
      case 'run_finished': {
        if (!current) break;
        current = { ...current, usage: event.usage || null };
        isStreaming = false;
        break;
      }
      case 'run_error': {
        if (current) {
          const blocks = [...current.blocks];
          blocks.push({
            type: 'text',
            text: `Error: ${event.error || event.message || 'Agent run failed'}`,
          });
          current = { ...current, blocks };
        }
        isStreaming = false;
        break;
      }
    }
  }

  return {
    processEvent,
    getState: () => ({ streamingMessage: current, isStreaming }),
    reset: () => {
      current = null;
      isStreaming = false;
    },
  };
}

function blocksOf(proc: ReturnType<typeof createStreamProcessor>): ContentBlock[] {
  const msg = proc.getState().streamingMessage;
  if (!msg) throw new Error('Expected streamingMessage to exist');
  return msg.blocks;
}

describe('StreamProcessor — malformed SSE data', () => {
  let processor: ReturnType<typeof createStreamProcessor>;

  beforeEach(() => {
    processor = createStreamProcessor();
  });

  it('handles event with all undefined fields', () => {
    processor.processEvent({ type: 'run_started' });
    expect(processor.getState().streamingMessage?.runId).toBe('test-run-id');
    expect(processor.getState().streamingMessage?.agentId).toBeUndefined();
  });

  it('handles text_delta with null-like text', () => {
    processor.processEvent({ type: 'run_started', runId: 'r1' });
    processor.processEvent({ type: 'text_delta', text: undefined });
    const blocks = blocksOf(processor);
    expect(blocks[0]).toEqual({ type: 'text', text: '' });
  });

  it('handles tool_call_start with missing toolName', () => {
    processor.processEvent({ type: 'run_started', runId: 'r1' });
    processor.processEvent({ type: 'tool_call_start' });
    const blocks = blocksOf(processor);
    expect((blocks[0] as Record<string, unknown>).toolName).toBe('unknown');
  });

  it('handles tool_call_end with missing toolName', () => {
    processor.processEvent({ type: 'run_started', runId: 'r1' });
    processor.processEvent({ type: 'tool_call_start', toolName: 'fn', toolCallId: 'tc1' });
    processor.processEvent({ type: 'tool_call_end', toolCallId: 'tc1' });
    const blocks = blocksOf(processor);
    expect(blocks[1].type).toBe('tool_result');
    expect((blocks[1] as Record<string, unknown>).toolName).toBe('unknown');
  });

  it('handles run_error with both error and message (error takes priority)', () => {
    processor.processEvent({ type: 'run_started', runId: 'r1' });
    processor.processEvent({
      type: 'run_error',
      error: 'primary error',
      message: 'secondary message',
    });
    const blocks = blocksOf(processor);
    expect((blocks[0] as { type: string; text: string }).text).toBe('Error: primary error');
  });
});

describe('StreamProcessor — partial content blocks', () => {
  let processor: ReturnType<typeof createStreamProcessor>;

  beforeEach(() => {
    processor = createStreamProcessor();
  });

  it('accumulates many small text deltas correctly', () => {
    processor.processEvent({ type: 'run_started', runId: 'r1' });
    const chars = 'Hello, World!'.split('');
    for (const char of chars) {
      processor.processEvent({ type: 'text_delta', text: char });
    }
    const blocks = blocksOf(processor);
    expect(blocks).toHaveLength(1);
    expect((blocks[0] as { type: string; text: string }).text).toBe('Hello, World!');
  });

  it('handles interleaved text and thinking blocks', () => {
    processor.processEvent({ type: 'run_started', runId: 'r1' });
    processor.processEvent({ type: 'text_delta', text: 'part1' });
    processor.processEvent({ type: 'thinking', text: 'analyzing' });
    processor.processEvent({ type: 'text_delta', text: 'part2' });
    const blocks = blocksOf(processor);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe('text');
    expect(blocks[1].type).toBe('thinking');
    expect(blocks[2].type).toBe('text');
  });

  it('handles multiple consecutive thinking blocks', () => {
    processor.processEvent({ type: 'run_started', runId: 'r1' });
    processor.processEvent({ type: 'thinking', text: 'step 1' });
    processor.processEvent({ type: 'thinking', text: 'step 2' });
    processor.processEvent({ type: 'thinking', text: 'step 3' });
    const blocks = blocksOf(processor);
    expect(blocks).toHaveLength(3);
    expect(blocks.every((b) => b.type === 'thinking')).toBe(true);
  });
});

describe('StreamProcessor — reconnection handling', () => {
  let processor: ReturnType<typeof createStreamProcessor>;

  beforeEach(() => {
    processor = createStreamProcessor();
  });

  it('new run_started after run_finished starts fresh', () => {
    // First run
    processor.processEvent({ type: 'run_started', runId: 'r1' });
    processor.processEvent({ type: 'text_delta', text: 'first' });
    processor.processEvent({ type: 'run_finished', usage: { inputTokens: 1, outputTokens: 1 } });

    expect(processor.getState().isStreaming).toBe(false);

    // Second run
    processor.processEvent({ type: 'run_started', runId: 'r2' });
    const state = processor.getState();
    expect(state.isStreaming).toBe(true);
    expect(state.streamingMessage?.runId).toBe('r2');
    expect(state.streamingMessage?.blocks).toHaveLength(0);
  });

  it('text_delta after run_finished appends to existing stream (no new implicit stream)', () => {
    processor.processEvent({ type: 'run_started', runId: 'r1' });
    processor.processEvent({ type: 'run_finished' });

    // After run_finished, current is still set so text_delta appends to it
    // rather than creating a new implicit stream
    processor.processEvent({ type: 'text_delta', text: 'reconnected' });

    const state = processor.getState();
    // isStreaming stays false because the implicit stream path requires current === null
    expect(state.isStreaming).toBe(false);
    expect(state.streamingMessage?.runId).toBe('r1');
    expect(blocksOf(processor)[0]).toEqual({ type: 'text', text: 'reconnected' });
  });

  it('run_error after run_finished is handled gracefully', () => {
    processor.processEvent({ type: 'run_started', runId: 'r1' });
    processor.processEvent({ type: 'run_finished' });
    // Double finish scenario
    processor.processEvent({ type: 'run_error', error: 'late error' });

    const state = processor.getState();
    expect(state.isStreaming).toBe(false);
    // Error adds a text block to the existing stream message
    const blocks = blocksOf(processor);
    expect(blocks).toHaveLength(1);
    expect((blocks[0] as { type: string; text: string }).text).toBe('Error: late error');
  });
});

describe('StreamProcessor — memory cleanup after stream end', () => {
  let processor: ReturnType<typeof createStreamProcessor>;

  beforeEach(() => {
    processor = createStreamProcessor();
  });

  it('reset clears all state', () => {
    processor.processEvent({ type: 'run_started', runId: 'r1' });
    processor.processEvent({ type: 'text_delta', text: 'data' });

    processor.reset();

    const state = processor.getState();
    expect(state.streamingMessage).toBeNull();
    expect(state.isStreaming).toBe(false);
  });

  it('reset after run_finished clears everything', () => {
    processor.processEvent({ type: 'run_started', runId: 'r1' });
    processor.processEvent({ type: 'run_finished' });

    processor.reset();

    expect(processor.getState().streamingMessage).toBeNull();
  });

  it('state is independent after reset and new events', () => {
    processor.processEvent({ type: 'run_started', runId: 'r1' });
    processor.processEvent({ type: 'text_delta', text: 'old data' });
    processor.reset();

    processor.processEvent({ type: 'run_started', runId: 'r2' });
    processor.processEvent({ type: 'text_delta', text: 'new data' });

    expect(processor.getState().streamingMessage?.runId).toBe('r2');
    expect(blocksOf(processor)).toHaveLength(1);
    expect((blocksOf(processor)[0] as { type: string; text: string }).text).toBe('new data');
  });
});

describe('StreamProcessor — multiple concurrent tool calls', () => {
  let processor: ReturnType<typeof createStreamProcessor>;

  beforeEach(() => {
    processor = createStreamProcessor();
  });

  it('handles three parallel tool calls completing in reverse order', () => {
    processor.processEvent({ type: 'run_started', runId: 'r1' });
    processor.processEvent({ type: 'tool_call_start', toolName: 'a', toolCallId: 'tc1' });
    processor.processEvent({ type: 'tool_call_start', toolName: 'b', toolCallId: 'tc2' });
    processor.processEvent({ type: 'tool_call_start', toolName: 'c', toolCallId: 'tc3' });

    // Complete in reverse order
    processor.processEvent({
      type: 'tool_call_end',
      toolName: 'c',
      toolCallId: 'tc3',
      toolResult: 'c-done',
    });
    processor.processEvent({
      type: 'tool_call_end',
      toolName: 'a',
      toolCallId: 'tc1',
      toolResult: 'a-done',
    });
    processor.processEvent({
      type: 'tool_call_end',
      toolName: 'b',
      toolCallId: 'tc2',
      toolResult: 'b-done',
    });

    const blocks = blocksOf(processor);
    // 3 tool_calls + 3 tool_results = 6 blocks
    expect(blocks).toHaveLength(6);
    // All tool_calls should be done
    const toolCalls = blocks.filter((b) => b.type === 'tool_call');
    expect(toolCalls.every((b) => (b as { status: string }).status === 'done')).toBe(true);
  });

  it('handles tool_call_end without toolCallId matching the last running call', () => {
    processor.processEvent({ type: 'run_started', runId: 'r1' });
    processor.processEvent({ type: 'tool_call_start', toolName: 'a', toolCallId: 'tc1' });
    processor.processEvent({ type: 'tool_call_start', toolName: 'b', toolCallId: 'tc2' });

    // End without toolCallId — should match tc2 (last running)
    processor.processEvent({ type: 'tool_call_end', toolName: 'b', toolResult: 'b-result' });

    const blocks = blocksOf(processor);
    const tc1 = blocks[0] as { type: string; status: string };
    const tc2 = blocks[1] as { type: string; status: string };
    expect(tc1.status).toBe('running');
    expect(tc2.status).toBe('done');
  });
});
