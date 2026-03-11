import type { CrewStep } from '@wai-agents/shared';
import { sql } from '../../db/connection.js';
import { emitCrewEvent } from '../../ws/emitter.js';
import { runAgentLoop } from './loop.js';

export interface RunCrewConfig {
  crewId: string;
  conversationId: string;
  userId: string;
  message: string;
}

export interface RunCrewResult {
  response: string;
  stepResults: Array<{ agentId: string; role: string; response: string }>;
}

export async function runCrew(config: RunCrewConfig): Promise<RunCrewResult> {
  const { crewId, conversationId, userId, message } = config;

  // 1. Load crew config + steps
  const crewRows = await sql`
    SELECT id, steps FROM agent_crews WHERE id = ${crewId} LIMIT 1
  `;
  if (crewRows.length === 0) {
    throw Object.assign(new Error('Crew not found'), { code: 'NOT_FOUND' });
  }

  const crew = crewRows[0] as Record<string, unknown>;
  const steps = crew.steps as CrewStep[];

  if (steps.length === 0) {
    throw Object.assign(new Error('Crew has no steps'), { code: 'BAD_REQUEST' });
  }

  // 2. Group steps: sequential steps (no parallelGroup) and parallel groups
  const stepGroups: Array<{
    steps: Array<CrewStep & { originalIndex: number }>;
    parallel: boolean;
  }> = [];
  let currentSequential: Array<CrewStep & { originalIndex: number }> | null = null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.parallelGroup) {
      // Flush any pending sequential step
      if (currentSequential) {
        for (const s of currentSequential) {
          stepGroups.push({ steps: [s], parallel: false });
        }
        currentSequential = null;
      }
      // Find or create parallel group
      const existingGroup = stepGroups.find(
        (g) => g.parallel && g.steps[0]?.parallelGroup === step.parallelGroup,
      );
      if (existingGroup) {
        existingGroup.steps.push({ ...step, originalIndex: i });
      } else {
        stepGroups.push({ steps: [{ ...step, originalIndex: i }], parallel: true });
      }
    } else {
      if (!currentSequential) {
        currentSequential = [];
      }
      currentSequential.push({ ...step, originalIndex: i });
    }
  }
  // Flush remaining sequential steps
  if (currentSequential) {
    for (const s of currentSequential) {
      stepGroups.push({ steps: [s], parallel: false });
    }
  }

  // 3. Execute step groups in order
  const allResults: Array<{ agentId: string; role: string; response: string }> = [];
  let contextMessage = message;

  for (const group of stepGroups) {
    if (group.parallel && group.steps.length > 1) {
      // Run parallel steps concurrently
      const promises = group.steps.map(async (step) => {
        emitCrewEvent(conversationId, {
          type: 'crew:step_started',
          crew_id: crewId,
          step_index: step.originalIndex,
          agent_id: step.agentId,
          role: step.role,
          parallel_group: step.parallelGroup,
        });

        const result = await runAgentLoop({
          agentId: step.agentId,
          conversationId,
          userId,
          message: `[Crew role: ${step.role}]\n\n${contextMessage}`,
        });

        emitCrewEvent(conversationId, {
          type: 'crew:step_completed',
          crew_id: crewId,
          step_index: step.originalIndex,
          agent_id: step.agentId,
          role: step.role,
          response: result.response,
        });

        return { agentId: step.agentId, role: step.role, response: result.response };
      });

      const results = await Promise.all(promises);
      allResults.push(...results);

      // Merge parallel outputs as context for next step
      contextMessage = results.map((r) => `[${r.role}]: ${r.response}`).join('\n\n');
    } else {
      // Sequential step
      const step = group.steps[0];
      emitCrewEvent(conversationId, {
        type: 'crew:step_started',
        crew_id: crewId,
        step_index: step.originalIndex,
        agent_id: step.agentId,
        role: step.role,
        parallel_group: step.parallelGroup,
      });

      const result = await runAgentLoop({
        agentId: step.agentId,
        conversationId,
        userId,
        message: `[Crew role: ${step.role}]\n\n${contextMessage}`,
      });

      emitCrewEvent(conversationId, {
        type: 'crew:step_completed',
        crew_id: crewId,
        step_index: step.originalIndex,
        agent_id: step.agentId,
        role: step.role,
        response: result.response,
      });

      allResults.push({ agentId: step.agentId, role: step.role, response: result.response });
      contextMessage = result.response;
    }
  }

  // 4. Increment usage count
  await sql`
    UPDATE agent_crews SET usage_count = usage_count + 1, updated_at = NOW()
    WHERE id = ${crewId}
  `;

  // 5. Final response is the last step's output
  const finalResponse = allResults.length > 0 ? allResults[allResults.length - 1].response : '';

  emitCrewEvent(conversationId, {
    type: 'crew:finished',
    crew_id: crewId,
    total_steps: steps.length,
    final_response: finalResponse,
  });

  return { response: finalResponse, stepResults: allResults };
}
