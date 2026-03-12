import { z } from 'zod';

/* ---- Status Types ---- */

export type EvalSuiteStatus = 'active' | 'archived';

export type EvalRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type EvalResultVerdict = 'pass' | 'fail' | 'error';

/* ---- Interfaces ---- */

export interface AgentEvalSuite {
  id: string;
  agent_id: string;
  creator_id: string;
  name: string;
  description: string | null;
  scoring_rubric: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export interface EvalTestCase {
  id: string;
  suite_id: string;
  name: string;
  input: Record<string, unknown>;
  expected_output: Record<string, unknown> | null;
  weight: number;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export interface EvalRun {
  id: string;
  suite_id: string;
  agent_id: string;
  user_id: string;
  status: EvalRunStatus;
  overall_score: number | null;
  total_test_cases: number;
  passed_test_cases: number;
  failed_test_cases: number;
  total_latency_ms: number | null;
  metadata: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
}

export interface EvalResult {
  id: string;
  run_id: string;
  test_case_id: string;
  actual_output: Record<string, unknown> | null;
  score: number | null;
  passed: EvalResultVerdict | null;
  latency_ms: number | null;
  token_usage: Record<string, unknown> | null;
  error: string | null;
  metadata: Record<string, unknown>;
  created_at: string | null;
}

export interface EvalRunWithResults extends EvalRun {
  results: EvalResult[];
}

export interface EvalSuiteWithTestCases extends AgentEvalSuite {
  test_cases: EvalTestCase[];
}

export interface LeaderboardEntry {
  agent_id: string;
  agent_name: string;
  suite_id: string;
  suite_name: string;
  best_score: number;
  avg_score: number;
  total_runs: number;
  last_run_at: string | null;
}

/* ---- Socket.IO Event Schemas ---- */

export const EvalStartedEventSchema = z.object({
  type: z.literal('eval:started'),
  suite_id: z.string(),
  run_id: z.string(),
  agent_id: z.string(),
  total_test_cases: z.number(),
});

export const EvalProgressEventSchema = z.object({
  type: z.literal('eval:progress'),
  suite_id: z.string(),
  run_id: z.string(),
  test_case_id: z.string(),
  test_case_name: z.string(),
  completed: z.number(),
  total: z.number(),
  score: z.number().nullable(),
  passed: z.enum(['pass', 'fail', 'error']).nullable(),
});

export const EvalCompletedEventSchema = z.object({
  type: z.literal('eval:completed'),
  suite_id: z.string(),
  run_id: z.string(),
  agent_id: z.string(),
  overall_score: z.number().nullable(),
  passed_test_cases: z.number(),
  failed_test_cases: z.number(),
  total_latency_ms: z.number().nullable(),
});

export const EvalFailedEventSchema = z.object({
  type: z.literal('eval:failed'),
  suite_id: z.string(),
  run_id: z.string(),
  error: z.string(),
});

export type EvalStartedEvent = z.infer<typeof EvalStartedEventSchema>;
export type EvalProgressEvent = z.infer<typeof EvalProgressEventSchema>;
export type EvalCompletedEvent = z.infer<typeof EvalCompletedEventSchema>;
export type EvalFailedEvent = z.infer<typeof EvalFailedEventSchema>;
export type EvalEvent = EvalStartedEvent | EvalProgressEvent | EvalCompletedEvent | EvalFailedEvent;
