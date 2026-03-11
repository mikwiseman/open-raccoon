import { sql } from '../db/connection.js';
import { createQueue, createWorker } from './queue.js';

const QUEUE_NAME = 'agent-reflection';

interface ReflectionJobData {
  agentId: string;
}

export const reflectionQueue = createQueue(QUEUE_NAME);

export const reflectionWorker = createWorker<ReflectionJobData>(QUEUE_NAME, async (job) => {
  if (job.data.agentId === '__scan__') {
    // Find all agents with recent feedback or ratings
    const agentIds = await sql`
        SELECT DISTINCT agent_id FROM (
          SELECT agent_id FROM message_feedback WHERE inserted_at > NOW() - INTERVAL '6 hours'
          UNION
          SELECT agent_id FROM agent_ratings WHERE inserted_at > NOW() - INTERVAL '6 hours'
        ) AS recent
      `;
    for (const row of agentIds as Array<Record<string, unknown>>) {
      await reflectionQueue.add('reflect', { agentId: row.agent_id as string });
    }
    return;
  }

  const { agentId } = job.data;

  // 1. GATHER — Collect recent feedback and ratings
  const feedbackRows = await sql`
      SELECT feedback, reason, COUNT(*)::int AS cnt
      FROM message_feedback
      WHERE agent_id = ${agentId} AND inserted_at > NOW() - INTERVAL '7 days'
      GROUP BY feedback, reason
      ORDER BY cnt DESC
    `;

  const ratingRows = await sql`
      SELECT rating, review, accuracy_score, helpfulness_score, speed_score
      FROM agent_ratings
      WHERE agent_id = ${agentId} AND inserted_at > NOW() - INTERVAL '7 days'
      ORDER BY inserted_at DESC
      LIMIT 20
    `;

  const eventRows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'success')::int AS successes,
        COUNT(*) FILTER (WHERE status = 'error')::int AS failures,
        COUNT(*)::int AS total,
        AVG(duration_ms)::int AS avg_duration,
        AVG(input_tokens + output_tokens)::int AS avg_tokens
      FROM agent_events
      WHERE agent_id = ${agentId}
        AND event_type = 'run'
        AND inserted_at > NOW() - INTERVAL '7 days'
    `;

  // If no recent data, skip reflection
  if (feedbackRows.length === 0 && ratingRows.length === 0) {
    return;
  }

  // 2. ANALYZE — Build summary
  const negativePatterns: string[] = [];
  const positivePatterns: string[] = [];
  for (const row of feedbackRows as Array<Record<string, unknown>>) {
    const entry = `${row.reason ?? 'general'} (${row.cnt}x)`;
    if (row.feedback === 'negative') negativePatterns.push(entry);
    else positivePatterns.push(entry);
  }

  const avgRating =
    ratingRows.length > 0
      ? (ratingRows as Array<Record<string, unknown>>).reduce(
          (sum, r) => sum + (r.rating as number),
          0,
        ) / ratingRows.length
      : null;

  const _stats = eventRows[0] as Record<string, unknown>;

  // 3. Build observations (rule-based, no LLM call for now)
  const observations: string[] = [];
  const suggestedRules: string[] = [];
  const suggestedPreferences: string[] = [];

  if (negativePatterns.length > 0) {
    observations.push(`Negative feedback patterns: ${negativePatterns.join(', ')}`);
  }
  if (positivePatterns.length > 0) {
    observations.push(`Positive feedback patterns: ${positivePatterns.join(', ')}`);
  }

  // Check for specific negative reasons
  for (const row of feedbackRows as Array<Record<string, unknown>>) {
    if (row.feedback === 'negative' && (row.cnt as number) >= 2) {
      const reason = row.reason as string;
      if (reason === 'too_verbose') {
        suggestedRules.push('- Keep responses concise. Users report verbosity.');
        suggestedPreferences.push('Prefer shorter, more direct responses.');
      } else if (reason === 'hallucinated') {
        suggestedRules.push('- Verify claims before stating them. Users report inaccuracies.');
      } else if (reason === 'off_topic') {
        suggestedRules.push("- Stay focused on the user's question. Avoid tangents.");
      } else if (reason === 'didnt_understand') {
        suggestedRules.push('- Ask clarifying questions when the request is ambiguous.');
      }
    }
  }

  if (avgRating != null && avgRating < 3) {
    observations.push(`Average rating is ${avgRating.toFixed(1)}/5 — below threshold.`);
  }

  // 4. APPLY — Only if we have actionable suggestions
  if (suggestedRules.length > 0 || suggestedPreferences.length > 0) {
    if (suggestedRules.length > 0) {
      const rulesRows = await sql`
          SELECT id, content FROM agent_core_memories
          WHERE agent_id = ${agentId} AND block_label = 'rules'
          LIMIT 1
        `;
      if (rulesRows.length > 0) {
        const existing = (rulesRows[0] as Record<string, unknown>).content as string;
        const memId = (rulesRows[0] as Record<string, unknown>).id as string;
        const newContent = `${existing}\n${suggestedRules.join('\n')}`;
        await sql`
            UPDATE agent_core_memories SET content = ${newContent}, updated_at = NOW()
            WHERE id = ${memId}
          `;
      }
    }

    if (suggestedPreferences.length > 0) {
      const prefRows = await sql`
          SELECT id, content FROM agent_core_memories
          WHERE agent_id = ${agentId} AND block_label = 'preferences'
          LIMIT 1
        `;
      if (prefRows.length > 0) {
        const existing = (prefRows[0] as Record<string, unknown>).content as string;
        const memId = (prefRows[0] as Record<string, unknown>).id as string;
        const newContent = `${existing}\n${suggestedPreferences.join('\n')}`;
        await sql`
            UPDATE agent_core_memories SET content = ${newContent}, updated_at = NOW()
            WHERE id = ${memId}
          `;
      }
    }

    // Log the reflection as an agent event
    const agentOwnerRows = await sql`SELECT creator_id FROM agents WHERE id = ${agentId} LIMIT 1`;
    const ownerId =
      agentOwnerRows.length > 0
        ? ((agentOwnerRows[0] as Record<string, unknown>).creator_id as string)
        : agentId;

    await sql`
        INSERT INTO agent_events (id, agent_id, user_id, event_type, status, metadata, inserted_at, updated_at)
        VALUES (
          gen_random_uuid(), ${agentId}, ${ownerId}, 'reflection', 'success',
          ${JSON.stringify({ observations, rules_added: suggestedRules, preferences_added: suggestedPreferences })}::jsonb,
          NOW(), NOW()
        )
      `;
  }
});

/**
 * Schedule the agent reflection scan to run every 6 hours.
 */
export async function scheduleReflection(): Promise<void> {
  const repeatableJobs = await reflectionQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await reflectionQueue.removeRepeatableByKey(job.key);
  }

  await reflectionQueue.add(
    'scan-agents',
    { agentId: '__scan__' },
    {
      repeat: { every: 6 * 60 * 60 * 1000 }, // 6 hours
    },
  );
}
