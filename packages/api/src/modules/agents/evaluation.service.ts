import { randomUUID } from 'node:crypto';
import { sql } from '../../db/connection.js';
import { toISO } from '../../lib/utils.js';
import type {
  CreateEvalSuiteInput,
  CreateTestCaseInput,
  RunEvaluationInput,
  UpdateEvalSuiteInput,
  UpdateTestCaseInput,
} from './evaluation.schema.js';

/* -------------------------------------------------------------------------- */
/*  Formatters                                                                */
/* -------------------------------------------------------------------------- */

function formatSuite(row: Record<string, unknown>) {
  return {
    id: row.id,
    agent_id: row.agent_id,
    creator_id: row.creator_id,
    name: row.name,
    description: row.description ?? null,
    scoring_rubric: row.scoring_rubric ?? null,
    metadata: row.metadata ?? {},
    created_at: toISO(row.inserted_at),
    updated_at: toISO(row.updated_at),
  };
}

function formatTestCase(row: Record<string, unknown>) {
  return {
    id: row.id,
    suite_id: row.suite_id,
    name: row.name,
    input: row.input ?? {},
    expected_output: row.expected_output ?? null,
    weight: row.weight ?? 1.0,
    tags: row.tags ?? [],
    metadata: row.metadata ?? {},
    created_at: toISO(row.inserted_at),
    updated_at: toISO(row.updated_at),
  };
}

function formatRun(row: Record<string, unknown>) {
  return {
    id: row.id,
    suite_id: row.suite_id,
    agent_id: row.agent_id,
    user_id: row.user_id,
    status: row.status,
    overall_score: row.overall_score ?? null,
    total_test_cases: row.total_test_cases ?? 0,
    passed_test_cases: row.passed_test_cases ?? 0,
    failed_test_cases: row.failed_test_cases ?? 0,
    total_latency_ms: row.total_latency_ms ?? null,
    metadata: row.metadata ?? {},
    started_at: toISO(row.started_at),
    completed_at: toISO(row.completed_at),
    created_at: toISO(row.inserted_at),
  };
}

function formatResult(row: Record<string, unknown>) {
  return {
    id: row.id,
    run_id: row.run_id,
    test_case_id: row.test_case_id,
    actual_output: row.actual_output ?? null,
    score: row.score ?? null,
    passed: row.passed ?? null,
    latency_ms: row.latency_ms ?? null,
    token_usage: row.token_usage ?? null,
    error: row.error ?? null,
    metadata: row.metadata ?? {},
    created_at: toISO(row.inserted_at),
  };
}

/* -------------------------------------------------------------------------- */
/*  Column constants                                                          */
/* -------------------------------------------------------------------------- */

const SUITE_COLS = `id, agent_id, creator_id, name, description,
  scoring_rubric, metadata, inserted_at, updated_at`;

const TEST_CASE_COLS = `id, suite_id, name, input, expected_output,
  weight, tags, metadata, inserted_at, updated_at`;

const RUN_COLS = `id, suite_id, agent_id, user_id, status,
  overall_score, total_test_cases, passed_test_cases, failed_test_cases,
  total_latency_ms, metadata, started_at, completed_at, inserted_at`;

const RESULT_COLS = `id, run_id, test_case_id, actual_output, score,
  passed, latency_ms, token_usage, error, metadata, inserted_at`;

/* -------------------------------------------------------------------------- */
/*  Ownership Checks                                                          */
/* -------------------------------------------------------------------------- */

async function assertAgentCreator(agentId: string, userId: string): Promise<void> {
  const rows = await sql`
    SELECT id FROM agents WHERE id = ${agentId} AND creator_id = ${userId} LIMIT 1
  `;
  if (rows.length === 0) {
    throw Object.assign(new Error('Agent not found or access denied'), { code: 'NOT_FOUND' });
  }
}

async function assertSuiteCreator(suiteId: string, userId: string): Promise<void> {
  const rows = await sql`
    SELECT s.id FROM agent_eval_suites s
    JOIN agents a ON a.id = s.agent_id
    WHERE s.id = ${suiteId} AND a.creator_id = ${userId}
    LIMIT 1
  `;
  if (rows.length === 0) {
    throw Object.assign(new Error('Eval suite not found or access denied'), { code: 'NOT_FOUND' });
  }
}

/* -------------------------------------------------------------------------- */
/*  Suite CRUD                                                                */
/* -------------------------------------------------------------------------- */

export async function listSuites(agentId: string, userId: string) {
  await assertAgentCreator(agentId, userId);

  const rows = await sql`
    SELECT ${sql.unsafe(SUITE_COLS)}
    FROM agent_eval_suites
    WHERE agent_id = ${agentId} AND creator_id = ${userId}
    ORDER BY inserted_at DESC
    LIMIT 200
  `;

  return rows.map((row) => formatSuite(row as Record<string, unknown>));
}

export async function createSuite(agentId: string, userId: string, input: CreateEvalSuiteInput) {
  await assertAgentCreator(agentId, userId);

  const suiteId = randomUUID();
  const now = new Date().toISOString();
  const scoringRubricJson = input.scoring_rubric ? JSON.stringify(input.scoring_rubric) : null;
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : '{}';

  await sql`
    INSERT INTO agent_eval_suites (
      id, agent_id, creator_id, name, description,
      scoring_rubric, metadata, inserted_at, updated_at
    ) VALUES (
      ${suiteId}, ${agentId}, ${userId}, ${input.name},
      ${input.description ?? null},
      ${scoringRubricJson}::jsonb, ${metadataJson}::jsonb,
      ${now}, ${now}
    )
  `;

  const rows = await sql.unsafe(`SELECT ${SUITE_COLS} FROM agent_eval_suites WHERE id = $1`, [
    suiteId,
  ]);
  return formatSuite(rows[0] as Record<string, unknown>);
}

export async function getSuite(suiteId: string, userId: string) {
  await assertSuiteCreator(suiteId, userId);

  const suiteRows = await sql.unsafe(`SELECT ${SUITE_COLS} FROM agent_eval_suites WHERE id = $1`, [
    suiteId,
  ]);
  if (suiteRows.length === 0) {
    throw Object.assign(new Error('Eval suite not found'), { code: 'NOT_FOUND' });
  }

  const testCaseRows = await sql.unsafe(
    `SELECT ${TEST_CASE_COLS} FROM eval_test_cases WHERE suite_id = $1 ORDER BY inserted_at ASC`,
    [suiteId],
  );

  const suite = formatSuite(suiteRows[0] as Record<string, unknown>);
  return {
    ...suite,
    test_cases: testCaseRows.map((row) => formatTestCase(row as Record<string, unknown>)),
  };
}

export async function updateSuite(suiteId: string, userId: string, updates: UpdateEvalSuiteInput) {
  await assertSuiteCreator(suiteId, userId);

  const hasName = updates.name !== undefined;
  const hasDescription = updates.description !== undefined;
  const hasScoringRubric = updates.scoring_rubric !== undefined;
  const hasMetadata = updates.metadata !== undefined;

  const name: string | null = hasName ? (updates.name as string) : null;
  const description: string | null = hasDescription ? (updates.description ?? null) : null;
  const scoringRubricJson: string | null = hasScoringRubric
    ? updates.scoring_rubric
      ? JSON.stringify(updates.scoring_rubric)
      : null
    : null;
  const metadataJson: string | null = hasMetadata ? JSON.stringify(updates.metadata) : null;

  const rows = await sql`
    UPDATE agent_eval_suites SET
      name            = CASE WHEN ${hasName} THEN ${name} ELSE name END,
      description     = CASE WHEN ${hasDescription} THEN ${description} ELSE description END,
      scoring_rubric  = CASE WHEN ${hasScoringRubric} THEN ${scoringRubricJson}::jsonb ELSE scoring_rubric END,
      metadata        = CASE WHEN ${hasMetadata} THEN ${metadataJson}::jsonb ELSE metadata END,
      updated_at      = NOW()
    WHERE id = ${suiteId}
    RETURNING ${sql.unsafe(SUITE_COLS)}
  `;

  if (rows.length === 0) {
    throw Object.assign(new Error('Eval suite not found'), { code: 'NOT_FOUND' });
  }

  return formatSuite(rows[0] as Record<string, unknown>);
}

export async function deleteSuite(suiteId: string, userId: string) {
  await assertSuiteCreator(suiteId, userId);
  await sql`DELETE FROM agent_eval_suites WHERE id = ${suiteId}`;
}

/* -------------------------------------------------------------------------- */
/*  Test Case CRUD                                                            */
/* -------------------------------------------------------------------------- */

export async function listTestCases(suiteId: string, userId: string) {
  await assertSuiteCreator(suiteId, userId);

  const rows = await sql.unsafe(
    `SELECT ${TEST_CASE_COLS} FROM eval_test_cases WHERE suite_id = $1 ORDER BY inserted_at ASC`,
    [suiteId],
  );

  return rows.map((row) => formatTestCase(row as Record<string, unknown>));
}

export async function createTestCase(suiteId: string, userId: string, input: CreateTestCaseInput) {
  await assertSuiteCreator(suiteId, userId);

  const caseId = randomUUID();
  const now = new Date().toISOString();
  const inputJson = JSON.stringify(input.input);
  const expectedOutputJson = input.expected_output ? JSON.stringify(input.expected_output) : null;
  const weight = input.weight ?? 1.0;
  const tagsJson = input.tags ? JSON.stringify(input.tags) : '[]';
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : '{}';

  await sql`
    INSERT INTO eval_test_cases (
      id, suite_id, name, input, expected_output,
      weight, tags, metadata, inserted_at, updated_at
    ) VALUES (
      ${caseId}, ${suiteId}, ${input.name},
      ${inputJson}::jsonb, ${expectedOutputJson}::jsonb,
      ${weight}, ${tagsJson}::jsonb, ${metadataJson}::jsonb,
      ${now}, ${now}
    )
  `;

  const rows = await sql.unsafe(`SELECT ${TEST_CASE_COLS} FROM eval_test_cases WHERE id = $1`, [
    caseId,
  ]);
  return formatTestCase(rows[0] as Record<string, unknown>);
}

export async function updateTestCase(caseId: string, userId: string, updates: UpdateTestCaseInput) {
  // Verify ownership via suite → agent
  const caseRows = await sql`
    SELECT tc.suite_id FROM eval_test_cases tc
    JOIN agent_eval_suites s ON s.id = tc.suite_id
    JOIN agents a ON a.id = s.agent_id
    WHERE tc.id = ${caseId} AND a.creator_id = ${userId}
    LIMIT 1
  `;
  if (caseRows.length === 0) {
    throw Object.assign(new Error('Test case not found or access denied'), { code: 'NOT_FOUND' });
  }

  const hasName = updates.name !== undefined;
  const hasInput = updates.input !== undefined;
  const hasExpectedOutput = updates.expected_output !== undefined;
  const hasWeight = updates.weight !== undefined;
  const hasTags = updates.tags !== undefined;
  const hasMetadata = updates.metadata !== undefined;

  const name: string | null = hasName ? (updates.name as string) : null;
  const inputJson: string | null = hasInput ? JSON.stringify(updates.input) : null;
  const expectedOutputJson: string | null = hasExpectedOutput
    ? updates.expected_output
      ? JSON.stringify(updates.expected_output)
      : null
    : null;
  const weight: number | null = hasWeight ? (updates.weight as number) : null;
  const tagsJson: string | null = hasTags ? JSON.stringify(updates.tags) : null;
  const metadataJson: string | null = hasMetadata ? JSON.stringify(updates.metadata) : null;

  const rows = await sql`
    UPDATE eval_test_cases SET
      name            = CASE WHEN ${hasName} THEN ${name} ELSE name END,
      input           = CASE WHEN ${hasInput} THEN ${inputJson}::jsonb ELSE input END,
      expected_output = CASE WHEN ${hasExpectedOutput} THEN ${expectedOutputJson}::jsonb ELSE expected_output END,
      weight          = CASE WHEN ${hasWeight} THEN ${weight} ELSE weight END,
      tags            = CASE WHEN ${hasTags} THEN ${tagsJson}::jsonb ELSE tags END,
      metadata        = CASE WHEN ${hasMetadata} THEN ${metadataJson}::jsonb ELSE metadata END,
      updated_at      = NOW()
    WHERE id = ${caseId}
    RETURNING ${sql.unsafe(TEST_CASE_COLS)}
  `;

  if (rows.length === 0) {
    throw Object.assign(new Error('Test case not found'), { code: 'NOT_FOUND' });
  }

  return formatTestCase(rows[0] as Record<string, unknown>);
}

export async function deleteTestCase(caseId: string, userId: string) {
  const caseRows = await sql`
    SELECT tc.id FROM eval_test_cases tc
    JOIN agent_eval_suites s ON s.id = tc.suite_id
    JOIN agents a ON a.id = s.agent_id
    WHERE tc.id = ${caseId} AND a.creator_id = ${userId}
    LIMIT 1
  `;
  if (caseRows.length === 0) {
    throw Object.assign(new Error('Test case not found or access denied'), { code: 'NOT_FOUND' });
  }

  await sql`DELETE FROM eval_test_cases WHERE id = ${caseId}`;
}

/* -------------------------------------------------------------------------- */
/*  Run Evaluation                                                            */
/* -------------------------------------------------------------------------- */

export async function runEvaluation(
  suiteId: string,
  agentId: string,
  userId: string,
  input: RunEvaluationInput,
) {
  await assertSuiteCreator(suiteId, userId);

  // Verify agent exists and belongs to user
  await assertAgentCreator(agentId, userId);

  // Load test cases for this suite
  const testCaseRows = await sql.unsafe(
    `SELECT ${TEST_CASE_COLS} FROM eval_test_cases WHERE suite_id = $1 ORDER BY inserted_at ASC`,
    [suiteId],
  );
  if (testCaseRows.length === 0) {
    throw Object.assign(new Error('Suite has no test cases'), { code: 'BAD_REQUEST' });
  }

  const totalTestCases = testCaseRows.length;
  const runId = randomUUID();
  const now = new Date().toISOString();
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : '{}';

  // Create the run with 'pending' status
  await sql`
    INSERT INTO eval_runs (
      id, suite_id, agent_id, user_id, status,
      total_test_cases, metadata, started_at, inserted_at
    ) VALUES (
      ${runId}, ${suiteId}, ${agentId}, ${userId},
      'pending', ${totalTestCases}, ${metadataJson}::jsonb,
      ${now}, ${now}
    )
  `;

  // Emit Socket.IO event: eval started
  try {
    const { emitEvalEvent } = await import('../../ws/emitter.js');
    emitEvalEvent(userId, {
      type: 'eval:started',
      suite_id: suiteId,
      run_id: runId,
      agent_id: agentId,
      total_test_cases: totalTestCases,
    });
  } catch {
    // Socket.IO may not be initialized in tests
  }

  // Execute test cases asynchronously (fire-and-forget)
  executeTestCases(
    runId,
    suiteId,
    agentId,
    userId,
    testCaseRows as Record<string, unknown>[],
  ).catch((err) => {
    console.error(`Eval run ${runId} failed:`, (err as Error).message);
  });

  const rows = await sql.unsafe(`SELECT ${RUN_COLS} FROM eval_runs WHERE id = $1`, [runId]);
  return formatRun(rows[0] as Record<string, unknown>);
}

async function executeTestCases(
  runId: string,
  suiteId: string,
  agentId: string,
  userId: string,
  testCases: Record<string, unknown>[],
) {
  // Mark run as running
  await sql`UPDATE eval_runs SET status = 'running' WHERE id = ${runId}`;

  let passedCount = 0;
  let failedCount = 0;
  let totalLatency = 0;
  let weightedScoreSum = 0;
  let totalWeight = 0;
  let completedCount = 0;

  for (const tc of testCases) {
    const testCaseId = tc.id as string;
    const testCaseName = tc.name as string;
    const testInput = tc.input as Record<string, unknown>;
    const expectedOutput = tc.expected_output as Record<string, unknown> | null;
    const weight = (tc.weight as number) ?? 1.0;
    const resultId = randomUUID();
    const startTime = Date.now();

    try {
      // Run the agent with the test case input
      const { runAgentLoop } = await import('./loop.js');
      const message =
        typeof testInput.message === 'string' ? testInput.message : JSON.stringify(testInput);

      const result = await runAgentLoop({
        agentId,
        conversationId: runId, // Use runId as a virtual conversation
        userId,
        message,
        triggerType: 'eval',
      });

      const latency = Date.now() - startTime;
      totalLatency += latency;

      // Score the result
      const actualOutput = {
        response: result.response,
      };
      const tokenUsage = {
        input_tokens: result.usage.input_tokens,
        output_tokens: result.usage.output_tokens,
      };

      // Simple scoring: if expected_output is provided, check for keyword/content match
      let score = 1.0;
      let passed: 'pass' | 'fail' = 'pass';

      if (expectedOutput) {
        const expectedResponse = expectedOutput.response as string | undefined;
        const expectedContains = expectedOutput.contains as string[] | undefined;
        const expectedNotContains = expectedOutput.not_contains as string[] | undefined;

        if (expectedResponse !== undefined) {
          // Exact match scoring (case-insensitive, trimmed)
          const normalizedActual = result.response.trim().toLowerCase();
          const normalizedExpected = expectedResponse.trim().toLowerCase();
          score = normalizedActual === normalizedExpected ? 1.0 : 0.0;
        } else if (expectedContains) {
          // Keyword containment scoring
          const responseLower = result.response.toLowerCase();
          let matchCount = 0;
          for (const keyword of expectedContains) {
            if (responseLower.includes(keyword.toLowerCase())) {
              matchCount++;
            }
          }
          score = expectedContains.length > 0 ? matchCount / expectedContains.length : 1.0;
        }

        if (expectedNotContains) {
          const responseLower = result.response.toLowerCase();
          for (const keyword of expectedNotContains) {
            if (responseLower.includes(keyword.toLowerCase())) {
              score = Math.max(0, score - 0.25);
            }
          }
        }

        passed = score >= 0.5 ? 'pass' : 'fail';
      }

      if (passed === 'pass') {
        passedCount++;
      } else {
        failedCount++;
      }
      weightedScoreSum += score * weight;
      totalWeight += weight;

      // Insert result
      const actualOutputJson = JSON.stringify(actualOutput);
      const tokenUsageJson = JSON.stringify(tokenUsage);
      const now = new Date().toISOString();

      await sql`
        INSERT INTO eval_results (
          id, run_id, test_case_id, actual_output, score,
          passed, latency_ms, token_usage, metadata, inserted_at
        ) VALUES (
          ${resultId}, ${runId}, ${testCaseId},
          ${actualOutputJson}::jsonb, ${score},
          ${passed}, ${latency}, ${tokenUsageJson}::jsonb,
          '{}'::jsonb, ${now}
        )
      `;

      completedCount++;

      // Emit progress
      try {
        const { emitEvalEvent } = await import('../../ws/emitter.js');
        emitEvalEvent(userId, {
          type: 'eval:progress',
          suite_id: suiteId,
          run_id: runId,
          test_case_id: testCaseId,
          test_case_name: testCaseName,
          completed: completedCount,
          total: testCases.length,
          score,
          passed,
        });
      } catch {
        // Socket.IO may not be initialized
      }
    } catch (err) {
      const latency = Date.now() - startTime;
      totalLatency += latency;
      failedCount++;
      completedCount++;

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const now = new Date().toISOString();

      await sql`
        INSERT INTO eval_results (
          id, run_id, test_case_id, score, passed,
          latency_ms, error, metadata, inserted_at
        ) VALUES (
          ${resultId}, ${runId}, ${testCaseId}, ${0}, 'error',
          ${latency}, ${errorMessage}, '{}'::jsonb, ${now}
        )
      `;

      // Emit progress even on error
      try {
        const { emitEvalEvent } = await import('../../ws/emitter.js');
        emitEvalEvent(userId, {
          type: 'eval:progress',
          suite_id: suiteId,
          run_id: runId,
          test_case_id: testCaseId,
          test_case_name: testCaseName,
          completed: completedCount,
          total: testCases.length,
          score: 0,
          passed: 'error',
        });
      } catch {
        // Socket.IO may not be initialized
      }
    }
  }

  // Compute overall score
  const overallScore = totalWeight > 0 ? weightedScoreSum / totalWeight : null;
  const now = new Date().toISOString();

  // Mark run as completed
  await sql`
    UPDATE eval_runs SET
      status = 'completed',
      overall_score = ${overallScore},
      passed_test_cases = ${passedCount},
      failed_test_cases = ${failedCount},
      total_latency_ms = ${totalLatency},
      completed_at = ${now}
    WHERE id = ${runId}
  `;

  // Emit completed event
  try {
    const { emitEvalEvent } = await import('../../ws/emitter.js');
    emitEvalEvent(userId, {
      type: 'eval:completed',
      suite_id: suiteId,
      run_id: runId,
      agent_id: agentId,
      overall_score: overallScore,
      passed_test_cases: passedCount,
      failed_test_cases: failedCount,
      total_latency_ms: totalLatency,
    });
  } catch {
    // Socket.IO may not be initialized
  }
}

/* -------------------------------------------------------------------------- */
/*  Run Queries                                                               */
/* -------------------------------------------------------------------------- */

export async function listRuns(suiteId: string, userId: string) {
  await assertSuiteCreator(suiteId, userId);

  const rows = await sql.unsafe(
    `SELECT ${RUN_COLS} FROM eval_runs WHERE suite_id = $1 ORDER BY inserted_at DESC LIMIT 200`,
    [suiteId],
  );

  return rows.map((row) => formatRun(row as Record<string, unknown>));
}

export async function getRun(runId: string, userId: string) {
  const rows = await sql.unsafe(`SELECT ${RUN_COLS} FROM eval_runs WHERE id = $1`, [runId]);
  if (rows.length === 0) {
    throw Object.assign(new Error('Run not found'), { code: 'NOT_FOUND' });
  }

  const run = rows[0] as Record<string, unknown>;
  const suiteId = run.suite_id as string;
  await assertSuiteCreator(suiteId, userId);

  // Get results
  const resultRows = await sql.unsafe(
    `SELECT ${RESULT_COLS} FROM eval_results WHERE run_id = $1 ORDER BY inserted_at ASC`,
    [runId],
  );

  return {
    ...formatRun(run),
    results: resultRows.map((row) => formatResult(row as Record<string, unknown>)),
  };
}

/* -------------------------------------------------------------------------- */
/*  Leaderboard                                                               */
/* -------------------------------------------------------------------------- */

export async function getLeaderboard(userId: string) {
  const rows = await sql`
    SELECT
      r.agent_id,
      a.name AS agent_name,
      r.suite_id,
      s.name AS suite_name,
      MAX(r.overall_score) AS best_score,
      AVG(r.overall_score)::double precision AS avg_score,
      COUNT(r.id)::int AS total_runs,
      MAX(r.completed_at) AS last_run_at
    FROM eval_runs r
    JOIN agents a ON a.id = r.agent_id
    JOIN agent_eval_suites s ON s.id = r.suite_id
    WHERE a.creator_id = ${userId}
      AND r.status = 'completed'
      AND r.overall_score IS NOT NULL
    GROUP BY r.agent_id, a.name, r.suite_id, s.name
    ORDER BY best_score DESC, avg_score DESC
    LIMIT 100
  `;

  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      agent_id: r.agent_id,
      agent_name: r.agent_name ?? null,
      suite_id: r.suite_id,
      suite_name: r.suite_name,
      best_score: r.best_score ?? 0,
      avg_score: r.avg_score ?? 0,
      total_runs: r.total_runs ?? 0,
      last_run_at: toISO(r.last_run_at),
    };
  });
}
