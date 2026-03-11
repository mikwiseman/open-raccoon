import { eq } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { agentCoreMemories } from '../../db/schema/agents.js';
import { getCompactPerformanceInsight } from './agent.service.js';

const BLOCK_ORDER = ['identity', 'rules', 'priorities', 'preferences'] as const;
type BlockLabel = (typeof BLOCK_ORDER)[number];

export interface CallerContext {
  caller_agent_id: string;
  caller_agent_name: string;
  caller_conversation_id?: string;
  task_summary: string;
  expected_output?: string;
}

export async function assembleSoulPrompt(
  agentId: string,
  userId: string,
  callerContext?: CallerContext,
): Promise<string> {
  const memories = await db
    .select()
    .from(agentCoreMemories)
    .where(eq(agentCoreMemories.agentId, agentId));

  const blocks: Partial<Record<BlockLabel, string>> = {};

  for (const memory of memories) {
    const label = memory.blockLabel as BlockLabel;
    if (BLOCK_ORDER.includes(label)) {
      blocks[label] = memory.content;
    }
  }

  const sections: string[] = [];

  for (const label of BLOCK_ORDER) {
    const content = blocks[label];
    if (content) {
      const heading = label.charAt(0).toUpperCase() + label.slice(1);
      sections.push(`[${heading}]\n${content}`);
    }
  }

  sections.push(`[Context]\nCurrent date: ${new Date().toISOString()}\nUser ID: ${userId}`);

  // Compact performance self-awareness (~50 tokens)
  const insight = await getCompactPerformanceInsight(agentId);
  if (insight) {
    sections.push(`[Self-Awareness]\n${insight}`);
  }

  if (callerContext) {
    sections.push(
      `[A2A Context]\nYou were called by agent "${callerContext.caller_agent_name}" (ID: ${callerContext.caller_agent_id}).\nTask: ${callerContext.task_summary}${callerContext.expected_output ? `\nExpected output format: ${callerContext.expected_output}` : ''}\nRespond concisely and return your findings directly.`,
    );
  }

  return sections.join('\n\n');
}
