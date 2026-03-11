import { randomUUID } from 'node:crypto';
import { sql } from '../../db/connection.js';

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

export type TraceSpanType = 'llm_call' | 'tool_call' | 'thinking' | 'approval';
export type TraceStatus = 'running' | 'completed' | 'failed' | 'aborted';
export type SpanStatus = 'ok' | 'error' | 'denied' | 'timeout';

export class TraceRecorder {
  private spanSeq = 0;

  async startTrace(
    agentId: string,
    userId: string,
    conversationId: string | null,
    model: string,
    triggerType: string,
    runId: string,
  ): Promise<string> {
    const traceId = randomUUID();
    const now = new Date().toISOString();

    await sql`
      INSERT INTO agent_traces (
        id, run_id, agent_id, user_id, conversation_id,
        trigger_type, status, model,
        total_input_tokens, total_output_tokens,
        total_tool_calls, total_llm_calls,
        started_at, inserted_at
      ) VALUES (
        ${traceId}, ${runId}, ${agentId}, ${userId}, ${conversationId},
        ${triggerType}, 'running', ${model},
        0, 0, 0, 0,
        ${now}, ${now}
      )
    `;

    this.spanSeq = 0;
    return traceId;
  }

  async addSpan(
    traceId: string,
    spanType: TraceSpanType,
    name: string,
    input: unknown,
  ): Promise<string> {
    const spanId = randomUUID();
    const now = new Date().toISOString();
    const seq = this.spanSeq++;
    const inputJson = input != null ? JSON.stringify(input) : null;

    await sql`
      INSERT INTO agent_trace_spans (
        id, trace_id, span_type, name, seq,
        input, started_at
      ) VALUES (
        ${spanId}, ${traceId}, ${spanType}, ${name}, ${seq},
        ${inputJson}::jsonb, ${now}
      )
    `;

    return spanId;
  }

  async endSpan(
    spanId: string,
    status: SpanStatus,
    output: unknown,
    tokenUsage: TokenUsage | null,
    durationMs: number | null,
  ): Promise<void> {
    const now = new Date().toISOString();
    const outputJson = output != null ? JSON.stringify(output) : null;
    const tokenUsageJson = tokenUsage != null ? JSON.stringify(tokenUsage) : null;

    await sql`
      UPDATE agent_trace_spans SET
        status = ${status},
        output = ${outputJson}::jsonb,
        token_usage = ${tokenUsageJson}::jsonb,
        duration_ms = ${durationMs},
        finished_at = ${now}
      WHERE id = ${spanId}
    `;
  }

  async endTrace(traceId: string, status: TraceStatus, errorMessage?: string): Promise<void> {
    const now = new Date().toISOString();

    // Sum totals from spans
    const totals = await sql`
      SELECT
        COALESCE(SUM((token_usage->>'input_tokens')::int), 0)::int AS total_input_tokens,
        COALESCE(SUM((token_usage->>'output_tokens')::int), 0)::int AS total_output_tokens,
        COUNT(*) FILTER (WHERE span_type = 'tool_call')::int AS total_tool_calls,
        COUNT(*) FILTER (WHERE span_type = 'llm_call')::int AS total_llm_calls
      FROM agent_trace_spans
      WHERE trace_id = ${traceId}
    `;

    const row = totals[0] as Record<string, unknown>;

    // Calculate total duration from trace startedAt to now
    const traceRows = await sql`
      SELECT started_at FROM agent_traces WHERE id = ${traceId}
    `;
    let totalDurationMs: number | null = null;
    if (traceRows.length > 0) {
      const startedAt = new Date((traceRows[0] as Record<string, unknown>).started_at as string);
      totalDurationMs = Date.now() - startedAt.getTime();
    }

    await sql`
      UPDATE agent_traces SET
        status = ${status},
        total_input_tokens = ${row.total_input_tokens as number},
        total_output_tokens = ${row.total_output_tokens as number},
        total_tool_calls = ${row.total_tool_calls as number},
        total_llm_calls = ${row.total_llm_calls as number},
        total_duration_ms = ${totalDurationMs},
        error_message = ${errorMessage ?? null},
        finished_at = ${now}
      WHERE id = ${traceId}
    `;
  }
}
