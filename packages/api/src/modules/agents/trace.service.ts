import { sql } from '../../db/connection.js';
import { toISO } from '../../lib/utils.js';

function formatTrace(row: Record<string, unknown>) {
  return {
    id: row.id,
    run_id: row.run_id,
    agent_id: row.agent_id,
    user_id: row.user_id,
    conversation_id: row.conversation_id,
    trigger_type: row.trigger_type,
    status: row.status,
    model: row.model,
    total_input_tokens: row.total_input_tokens,
    total_output_tokens: row.total_output_tokens,
    total_duration_ms: row.total_duration_ms,
    total_tool_calls: row.total_tool_calls,
    total_llm_calls: row.total_llm_calls,
    error_message: row.error_message,
    started_at: toISO(row.started_at),
    finished_at: toISO(row.finished_at),
    created_at: toISO(row.inserted_at),
  };
}

function formatSpan(row: Record<string, unknown>) {
  return {
    id: row.id,
    trace_id: row.trace_id,
    span_type: row.span_type,
    name: row.name,
    seq: row.seq,
    status: row.status,
    input: row.input,
    output: row.output,
    token_usage: row.token_usage,
    duration_ms: row.duration_ms,
    metadata: row.metadata,
    started_at: toISO(row.started_at),
    finished_at: toISO(row.finished_at),
  };
}

async function assertAgentCreator(agentId: string, userId: string): Promise<void> {
  const rows = await sql`
    SELECT id FROM agents WHERE id = ${agentId} AND creator_id = ${userId} LIMIT 1
  `;
  if (rows.length === 0) {
    throw Object.assign(new Error('Agent not found or access denied'), { code: 'NOT_FOUND' });
  }
}

export interface ListTracesOptions {
  limit?: number;
  offset?: number;
  status?: string;
}

export async function listTraces(agentId: string, userId: string, options?: ListTracesOptions) {
  await assertAgentCreator(agentId, userId);

  const limit = Math.min(options?.limit ?? 20, 100);
  const offset = options?.offset ?? 0;
  const status = options?.status ?? null;

  const rows = await sql`
    SELECT id, run_id, agent_id, user_id, conversation_id,
           trigger_type, status, model,
           total_input_tokens, total_output_tokens,
           total_duration_ms, total_tool_calls, total_llm_calls,
           error_message, started_at, finished_at, inserted_at
    FROM agent_traces
    WHERE agent_id = ${agentId} AND user_id = ${userId}
      AND (${status} IS NULL OR status = ${status})
    ORDER BY started_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return rows.map((row) => formatTrace(row as Record<string, unknown>));
}

export async function getTrace(traceId: string, userId: string) {
  const rows = await sql`
    SELECT id, run_id, agent_id, user_id, conversation_id,
           trigger_type, status, model,
           total_input_tokens, total_output_tokens,
           total_duration_ms, total_tool_calls, total_llm_calls,
           error_message, started_at, finished_at, inserted_at
    FROM agent_traces
    WHERE id = ${traceId} AND user_id = ${userId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    throw Object.assign(new Error('Trace not found'), { code: 'NOT_FOUND' });
  }

  const trace = formatTrace(rows[0] as Record<string, unknown>);

  const spanRows = await sql`
    SELECT id, trace_id, span_type, name, seq, status,
           input, output, token_usage, duration_ms,
           metadata, started_at, finished_at
    FROM agent_trace_spans
    WHERE trace_id = ${traceId}
    ORDER BY seq ASC
  `;

  return {
    ...trace,
    spans: spanRows.map((row) => formatSpan(row as Record<string, unknown>)),
  };
}

export async function getTraceSpans(traceId: string, userId: string) {
  // Verify the trace belongs to the user
  const traceRows = await sql`
    SELECT id FROM agent_traces WHERE id = ${traceId} AND user_id = ${userId} LIMIT 1
  `;
  if (traceRows.length === 0) {
    throw Object.assign(new Error('Trace not found'), { code: 'NOT_FOUND' });
  }

  const rows = await sql`
    SELECT id, trace_id, span_type, name, seq, status,
           input, output, token_usage, duration_ms,
           metadata, started_at, finished_at
    FROM agent_trace_spans
    WHERE trace_id = ${traceId}
    ORDER BY seq ASC
  `;

  return rows.map((row) => formatSpan(row as Record<string, unknown>));
}
