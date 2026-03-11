import { integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { agents } from './agents.js';
import { users } from './users.js';

export const agentTraces = pgTable('agent_traces', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').unique().notNull(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id'),
  triggerType: varchar('trigger_type', { length: 20 }),
  status: varchar('status', { length: 16 }).notNull(),
  model: varchar('model', { length: 64 }),
  totalInputTokens: integer('total_input_tokens').default(0),
  totalOutputTokens: integer('total_output_tokens').default(0),
  totalDurationMs: integer('total_duration_ms'),
  totalToolCalls: integer('total_tool_calls').default(0),
  totalLlmCalls: integer('total_llm_calls').default(0),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  insertedAt: timestamp('inserted_at', { withTimezone: true }).defaultNow(),
});

export type AgentTraceRow = typeof agentTraces.$inferSelect;
export type NewAgentTraceRow = typeof agentTraces.$inferInsert;

export const agentTraceSpans = pgTable('agent_trace_spans', {
  id: uuid('id').primaryKey().defaultRandom(),
  traceId: uuid('trace_id')
    .notNull()
    .references(() => agentTraces.id, { onDelete: 'cascade' }),
  spanType: varchar('span_type', { length: 20 }).notNull(),
  name: varchar('name', { length: 128 }),
  seq: integer('seq').notNull(),
  status: varchar('status', { length: 16 }),
  input: jsonb('input'),
  output: jsonb('output'),
  tokenUsage: jsonb('token_usage'),
  durationMs: integer('duration_ms'),
  metadata: jsonb('metadata').default({}),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
});

export type AgentTraceSpanRow = typeof agentTraceSpans.$inferSelect;
export type NewAgentTraceSpanRow = typeof agentTraceSpans.$inferInsert;
