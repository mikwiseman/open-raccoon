export type { McpTool, ToolCall, LLMResponse } from './anthropic.js';
import { callAnthropic } from './anthropic.js';
import { callOpenAI } from './openai.js';
import type { McpTool, LLMResponse } from './anthropic.js';

export interface CallLLMOptions {
  model: string;
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  tools: McpTool[];
  maxTokens?: number;
  temperature?: number;
  onTextDelta: (text: string) => void;
  onThinking?: (summary: string) => void;
  abortSignal?: AbortSignal;
}

export async function callLLM(options: CallLLMOptions): Promise<LLMResponse> {
  const { model } = options;

  if (model.startsWith('claude-') || model.startsWith('claude')) {
    return callAnthropic(options);
  }

  if (
    model.startsWith('gpt-') ||
    model.startsWith('o1') ||
    model.startsWith('o3') ||
    model.startsWith('o4')
  ) {
    return callOpenAI(options);
  }

  throw new Error(`Unsupported model: ${model}. Must start with 'claude-' or 'gpt-'.`);
}
