import { randomUUID } from 'node:crypto';
import { db, sql } from '../../db/connection.js';
import { agents, agentUsageLogs } from '../../db/schema/agents.js';
import { messages } from '../../db/schema/conversations.js';
import { eq, desc } from 'drizzle-orm';
import { emitAgentEvent } from '../../ws/emitter.js';
import { callLLM } from './llm/index.js';
import { assembleSoulPrompt } from './soul.js';
import { McpManager } from './mcp-manager.js';
import type { AgentEvent } from '@open-raccoon/shared';
import type { CallerContext } from './soul.js';

export interface AgentLoopConfig {
  agentId: string;
  conversationId: string;
  userId: string;
  message: string;
  abortSignal?: AbortSignal;
  a2aDepth?: number;
  callerContext?: CallerContext;
}

export interface AgentLoopResult {
  response: string;
  usage: { input_tokens: number; output_tokens: number };
}

const MAX_TURNS = 25;

export async function runAgentLoop(config: AgentLoopConfig): Promise<AgentLoopResult> {
  const { agentId, conversationId, userId, message, abortSignal, a2aDepth = 0, callerContext } = config;
  const runId = randomUUID();

  // 1. Load agent config from DB
  const agentRows = await db.select().from(agents).where(eq(agents.id, agentId));
  if (agentRows.length === 0) {
    throw new Error(`Agent ${agentId} not found`);
  }
  const agent = agentRows[0];

  // 2. Assemble system prompt with SOUL blocks
  const systemPrompt = await assembleSoulPrompt(agentId, userId, callerContext);

  // 3. Connect MCP servers and discover tools
  const mcpManager = new McpManager();
  const mcpServers = (agent.mcpServers as Array<{ url: string; name: string }>) ?? [];
  await mcpManager.connect(mcpServers);
  const tools = mcpManager.getTools();

  // 4. Load recent conversation history (last 20 messages, excluding current)
  const history = await db
    .select({
      senderType: messages.senderType,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(20);

  // Build messages array (oldest first)
  const chatMessages: Array<{ role: string; content: string }> = [];
  for (const msg of history.reverse()) {
    const role = msg.senderType === 'human' ? 'user' : 'assistant';
    const raw = msg.content;
    let text: string;
    if (typeof raw === 'string') {
      text = raw;
    } else if (Array.isArray(raw)) {
      text = (raw as Array<{ type: string; text?: string }>)
        .map((b) => b.text ?? '')
        .join('');
    } else {
      text = JSON.stringify(raw);
    }
    chatMessages.push({ role, content: text });
  }
  // Append the new user message
  chatMessages.push({ role: 'user', content: message });

  // 5. Emit run_started
  emitAgentEvent(conversationId, { type: 'run_started', runId, agentId });

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let fullResponse = '';

  try {
    // 6. Agentic loop
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      if (abortSignal?.aborted) break;

      const llmResponse = await callLLM({
        model: agent.model ?? 'claude-sonnet-4-6',
        systemPrompt,
        messages: chatMessages,
        tools,
        maxTokens: agent.maxTokens ?? 4096,
        temperature: agent.temperature ?? 0.7,
        onTextDelta: (text) => {
          emitAgentEvent(conversationId, { type: 'text_delta', text });
          fullResponse += text;
        },
        onThinking: (summary) => {
          emitAgentEvent(conversationId, { type: 'thinking', summary });
        },
        abortSignal,
      });

      totalInputTokens += llmResponse.usage.input_tokens;
      totalOutputTokens += llmResponse.usage.output_tokens;

      // No tool calls means the agent is done
      if (llmResponse.toolCalls.length === 0) break;

      // Process tool calls
      for (const toolCall of llmResponse.toolCalls) {
        const callId = randomUUID();
        emitAgentEvent(conversationId, {
          type: 'tool_call_start',
          name: toolCall.name,
          callId,
        });

        const startTime = Date.now();
        const result = await mcpManager.executeTool(toolCall.name, toolCall.input);
        const duration_ms = Date.now() - startTime;

        emitAgentEvent(conversationId, {
          type: 'tool_call_end',
          result: JSON.stringify(result),
          duration_ms,
        });

        // Feed tool use + result back into messages for next turn
        chatMessages.push({
          role: 'assistant',
          content: `[Tool: ${toolCall.name}] ${JSON.stringify(toolCall.input)}`,
        });
        chatMessages.push({
          role: 'user',
          content: `[Tool Result: ${toolCall.name}] ${JSON.stringify(result)}`,
        });
      }
    }

    // 7. Save agent response as a message in the conversation
    const messageId = randomUUID();
    await db.insert(messages).values({
      id: messageId,
      conversationId,
      senderId: agentId,
      senderType: 'agent',
      type: 'text',
      content: [{ type: 'text', text: fullResponse }],
      createdAt: new Date(),
    });

    // 8. Track usage in agent_usage_logs
    await db.insert(agentUsageLogs).values({
      userId,
      agentId,
      model: agent.model ?? 'claude-sonnet-4-6',
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    });

    // 9. Emit run_finished
    emitAgentEvent(conversationId, {
      type: 'run_finished',
      usage: { input_tokens: totalInputTokens, output_tokens: totalOutputTokens },
    });

    return {
      response: fullResponse,
      usage: { input_tokens: totalInputTokens, output_tokens: totalOutputTokens },
    };
  } catch (error) {
    emitAgentEvent(conversationId, {
      type: 'run_error',
      error: (error as Error).message,
    });
    throw error;
  } finally {
    await mcpManager.disconnect();
  }
}
