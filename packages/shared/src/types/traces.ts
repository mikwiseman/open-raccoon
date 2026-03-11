export type TraceSpanType = 'llm_call' | 'tool_call' | 'thinking' | 'approval';
export type TraceStatus = 'running' | 'completed' | 'failed' | 'aborted';
export type SpanStatus = 'ok' | 'error' | 'denied' | 'timeout';
export type TraceTriggerType = 'manual' | 'webhook' | 'schedule' | 'a2a' | 'crew';

export interface AgentTrace {
  id: string;
  run_id: string;
  agent_id: string;
  user_id: string;
  conversation_id: string | null;
  trigger_type: TraceTriggerType;
  status: TraceStatus;
  model: string | null;
  total_input_tokens: number;
  total_output_tokens: number;
  total_duration_ms: number | null;
  total_tool_calls: number;
  total_llm_calls: number;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string | null;
}

export interface AgentTraceSpan {
  id: string;
  trace_id: string;
  span_type: TraceSpanType;
  name: string | null;
  seq: number;
  status: SpanStatus | null;
  input: unknown;
  output: unknown;
  token_usage: { input_tokens: number; output_tokens: number } | null;
  duration_ms: number | null;
  metadata: Record<string, unknown>;
  started_at: string | null;
  finished_at: string | null;
}

export interface AgentTraceWithSpans extends AgentTrace {
  spans: AgentTraceSpan[];
}
