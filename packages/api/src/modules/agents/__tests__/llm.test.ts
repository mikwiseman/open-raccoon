import { beforeEach, describe, expect, it, vi } from 'vitest';
import { callLLM } from '../llm/index.js';

// Mock the LLM providers
vi.mock('../llm/anthropic.js', () => ({
  callAnthropic: vi.fn().mockResolvedValue({
    toolCalls: [],
    usage: { input_tokens: 10, output_tokens: 20 },
    stopReason: 'end_turn',
  }),
}));

vi.mock('../llm/openai.js', () => ({
  callOpenAI: vi.fn().mockResolvedValue({
    toolCalls: [],
    usage: { input_tokens: 5, output_tokens: 15 },
    stopReason: 'stop',
  }),
}));

import { callAnthropic } from '../llm/anthropic.js';
import { callOpenAI } from '../llm/openai.js';

const baseOptions = {
  systemPrompt: 'You are a helpful assistant.',
  messages: [{ role: 'user', content: 'Hello' }],
  tools: [],
  onTextDelta: vi.fn(),
};

describe('callLLM factory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes claude-* models to Anthropic', async () => {
    await callLLM({ ...baseOptions, model: 'claude-sonnet-4-6' });
    expect(callAnthropic).toHaveBeenCalledOnce();
    expect(callOpenAI).not.toHaveBeenCalled();
  });

  it('routes gpt-* models to OpenAI', async () => {
    await callLLM({ ...baseOptions, model: 'gpt-4o' });
    expect(callOpenAI).toHaveBeenCalledOnce();
    expect(callAnthropic).not.toHaveBeenCalled();
  });

  it('routes o1/o3/o4 models to OpenAI', async () => {
    await callLLM({ ...baseOptions, model: 'o3-mini' });
    expect(callOpenAI).toHaveBeenCalledOnce();
  });

  it('throws for unknown model prefix', async () => {
    await expect(callLLM({ ...baseOptions, model: 'gemini-pro' })).rejects.toThrow(
      'Unsupported model: gemini-pro',
    );
  });

  it('returns usage from Anthropic response', async () => {
    const result = await callLLM({ ...baseOptions, model: 'claude-opus-4-6' });
    expect(result.usage.input_tokens).toBe(10);
    expect(result.usage.output_tokens).toBe(20);
  });

  it('returns usage from OpenAI response', async () => {
    const result = await callLLM({ ...baseOptions, model: 'gpt-4-turbo' });
    expect(result.usage.input_tokens).toBe(5);
    expect(result.usage.output_tokens).toBe(15);
  });
});
