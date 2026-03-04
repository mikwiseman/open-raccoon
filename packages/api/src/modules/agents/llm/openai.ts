import OpenAI from 'openai';
import type { McpTool, ToolCall, LLMResponse } from './anthropic.js';

export interface CallOpenAIOptions {
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

const client = new OpenAI();

export async function callOpenAI(options: CallOpenAIOptions): Promise<LLMResponse> {
  const {
    model,
    systemPrompt,
    messages,
    tools,
    maxTokens = 4096,
    temperature = 0.7,
    onTextDelta,
    abortSignal,
  } = options;

  const openAITools: OpenAI.Chat.Completions.ChatCompletionTool[] = tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema as Record<string, unknown>,
    },
  }));

  const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
  ];

  const toolCalls: ToolCall[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let stopReason = 'stop';

  const stream = await client.chat.completions.create({
    model,
    messages: chatMessages,
    tools: openAITools.length > 0 ? openAITools : undefined,
    max_tokens: maxTokens,
    temperature,
    stream: true,
    stream_options: { include_usage: true },
  });

  const pendingToolCalls = new Map<
    number,
    { id: string; name: string; argumentsJson: string }
  >();

  for await (const chunk of stream) {
    if (abortSignal?.aborted) break;

    const choice = chunk.choices[0];
    if (!choice) continue;

    if (choice.delta.content) {
      onTextDelta(choice.delta.content);
    }

    if (choice.delta.tool_calls) {
      for (const tc of choice.delta.tool_calls) {
        const idx = tc.index;
        if (!pendingToolCalls.has(idx)) {
          pendingToolCalls.set(idx, {
            id: tc.id ?? '',
            name: tc.function?.name ?? '',
            argumentsJson: '',
          });
        }
        const pending = pendingToolCalls.get(idx)!;
        if (tc.id) pending.id = tc.id;
        if (tc.function?.name) pending.name = tc.function.name;
        if (tc.function?.arguments) pending.argumentsJson += tc.function.arguments;
      }
    }

    if (choice.finish_reason) {
      stopReason = choice.finish_reason;
    }

    if (chunk.usage) {
      inputTokens = chunk.usage.prompt_tokens;
      outputTokens = chunk.usage.completion_tokens;
    }
  }

  for (const [, pending] of pendingToolCalls) {
    let input: Record<string, unknown> = {};
    try {
      input = JSON.parse(pending.argumentsJson) as Record<string, unknown>;
    } catch {
      input = { _raw: pending.argumentsJson };
    }
    toolCalls.push({ id: pending.id, name: pending.name, input });
  }

  return {
    toolCalls,
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
    stopReason,
  };
}
