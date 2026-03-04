import Anthropic from '@anthropic-ai/sdk';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface LLMResponse {
  toolCalls: ToolCall[];
  usage: { input_tokens: number; output_tokens: number };
  stopReason: string;
}

export interface CallAnthropicOptions {
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

const client = new Anthropic();

export async function callAnthropic(options: CallAnthropicOptions): Promise<LLMResponse> {
  const {
    model,
    systemPrompt,
    messages,
    tools,
    maxTokens = 4096,
    temperature = 0.7,
    onTextDelta,
    onThinking,
    abortSignal,
  } = options;

  const anthropicTools: Anthropic.Tool[] = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema as Anthropic.Tool['input_schema'],
  }));

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  const toolCalls: ToolCall[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let stopReason = 'end_turn';

  const stream = await client.messages.stream({
    model,
    system: systemPrompt,
    messages: anthropicMessages,
    tools: anthropicTools.length > 0 ? anthropicTools : undefined,
    max_tokens: maxTokens,
    temperature,
  });

  const pendingToolUses = new Map<string, { name: string; inputJson: string }>();

  for await (const event of stream) {
    if (abortSignal?.aborted) break;

    if (event.type === 'content_block_start') {
      if (event.content_block.type === 'tool_use') {
        pendingToolUses.set(event.content_block.id, {
          name: event.content_block.name,
          inputJson: '',
        });
      } else if (event.content_block.type === 'thinking' && onThinking) {
        // thinking block start — will be emitted on stop
      }
    } else if (event.type === 'content_block_delta') {
      if (event.delta.type === 'text_delta') {
        onTextDelta(event.delta.text);
      } else if (event.delta.type === 'input_json_delta') {
        const pending = pendingToolUses.get(event.index.toString());
        if (pending) {
          pending.inputJson += event.delta.partial_json;
        } else {
          // Find by index in pending map — Anthropic uses numeric index
          for (const [id, p] of pendingToolUses) {
            // The index from the delta matches the content block index
            void id;
            p.inputJson += event.delta.partial_json;
            break;
          }
        }
      } else if (event.delta.type === 'thinking_delta' && onThinking) {
        onThinking(event.delta.thinking);
      }
    } else if (event.type === 'message_start') {
      inputTokens = event.message.usage.input_tokens;
    } else if (event.type === 'message_delta') {
      stopReason = event.delta.stop_reason ?? 'end_turn';
      if ('usage' in event) {
        outputTokens = (event as any).usage?.output_tokens ?? outputTokens;
      }
    }
  }

  // Finalize message to get complete usage
  const finalMessage = await stream.finalMessage();
  inputTokens = finalMessage.usage.input_tokens;
  outputTokens = finalMessage.usage.output_tokens;
  stopReason = finalMessage.stop_reason ?? 'end_turn';

  // Extract tool use blocks from the final message
  for (const block of finalMessage.content) {
    if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        name: block.name,
        input: block.input as Record<string, unknown>,
      });
    }
  }

  return {
    toolCalls,
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
    stopReason,
  };
}
