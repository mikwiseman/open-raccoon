import {
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { agents } from './agents.js';
import { users } from './users.js';

export const agentEvalSuites = pgTable('agent_eval_suites', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  creatorId: uuid('creator_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 128 }).notNull(),
  description: text('description'),
  scoringRubric: jsonb('scoring_rubric'),
  metadata: jsonb('metadata').default({}),
  insertedAt: timestamp('inserted_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type AgentEvalSuite = typeof agentEvalSuites.$inferSelect;
export type NewAgentEvalSuite = typeof agentEvalSuites.$inferInsert;

export const evalTestCases = pgTable('eval_test_cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  suiteId: uuid('suite_id')
    .notNull()
    .references(() => agentEvalSuites.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 128 }).notNull(),
  input: jsonb('input').notNull(),
  expectedOutput: jsonb('expected_output'),
  weight: doublePrecision('weight').default(1.0),
  tags: jsonb('tags').default([]),
  metadata: jsonb('metadata').default({}),
  insertedAt: timestamp('inserted_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type EvalTestCase = typeof evalTestCases.$inferSelect;
export type NewEvalTestCase = typeof evalTestCases.$inferInsert;

export const evalRuns = pgTable('eval_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  suiteId: uuid('suite_id')
    .notNull()
    .references(() => agentEvalSuites.id, { onDelete: 'cascade' }),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 16 }).notNull().default('pending'),
  overallScore: doublePrecision('overall_score'),
  totalTestCases: integer('total_test_cases').default(0),
  passedTestCases: integer('passed_test_cases').default(0),
  failedTestCases: integer('failed_test_cases').default(0),
  totalLatencyMs: integer('total_latency_ms'),
  metadata: jsonb('metadata').default({}),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  insertedAt: timestamp('inserted_at', { withTimezone: true }).defaultNow(),
});

export type EvalRun = typeof evalRuns.$inferSelect;
export type NewEvalRun = typeof evalRuns.$inferInsert;

export const evalResults = pgTable('eval_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id')
    .notNull()
    .references(() => evalRuns.id, { onDelete: 'cascade' }),
  testCaseId: uuid('test_case_id')
    .notNull()
    .references(() => evalTestCases.id, { onDelete: 'cascade' }),
  actualOutput: jsonb('actual_output'),
  score: doublePrecision('score'),
  passed: varchar('passed', { length: 8 }),
  latencyMs: integer('latency_ms'),
  tokenUsage: jsonb('token_usage'),
  error: text('error'),
  metadata: jsonb('metadata').default({}),
  insertedAt: timestamp('inserted_at', { withTimezone: true }).defaultNow(),
});

export type EvalResult = typeof evalResults.$inferSelect;
export type NewEvalResult = typeof evalResults.$inferInsert;
