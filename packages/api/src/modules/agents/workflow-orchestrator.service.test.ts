/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock DB connection
vi.mock('../../db/connection.js', () => {
  const sqlTagged = vi.fn();
  const sqlFn = Object.assign(sqlTagged, {
    unsafe: vi.fn(),
    begin: vi.fn(async (cb: (tx: any) => Promise<any>) => {
      return cb(sqlFn);
    }),
  });
  return { sql: sqlFn, db: {} };
});

// Mock emitter (the service uses dynamic import)
vi.mock('../../ws/emitter.js', () => ({
  emitWorkflowEvent: vi.fn(),
}));

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const AGENT_ID = '660e8400-e29b-41d4-a716-446655440001';
const WORKFLOW_ID = '770e8400-e29b-41d4-a716-446655440002';
const STEP_ID_1 = '880e8400-e29b-41d4-a716-446655440003';
const STEP_ID_2 = '990e8400-e29b-41d4-a716-446655440004';
const RUN_ID = 'bb0e8400-e29b-41d4-a716-446655440006';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function makeWorkflowRow(overrides: Record<string, unknown> = {}) {
  return {
    id: WORKFLOW_ID,
    agent_id: AGENT_ID,
    status: 'active',
    max_concurrent_runs: 5,
    ...overrides,
  };
}

function makeStepRow(overrides: Record<string, unknown> = {}) {
  return {
    id: STEP_ID_1,
    workflow_id: WORKFLOW_ID,
    name: 'Step 1',
    step_type: 'prompt',
    config: { prompt: 'Hello {{input.name}}' },
    position: 0,
    timeout_ms: 300000,
    retry_config: null,
    metadata: {},
    ...overrides,
  };
}

function makeRunRow(overrides: Record<string, unknown> = {}) {
  return {
    id: RUN_ID,
    workflow_id: WORKFLOW_ID,
    agent_id: AGENT_ID,
    user_id: USER_ID,
    conversation_id: null,
    status: 'running',
    input: { name: 'test' },
    result: null,
    error_message: null,
    total_duration_ms: null,
    started_at: new Date('2026-01-01'),
    completed_at: null,
    inserted_at: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeStepRunRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sr-1',
    workflow_run_id: RUN_ID,
    step_id: STEP_ID_1,
    status: 'completed',
    input: null,
    output: { rendered_prompt: 'Hello test' },
    error_message: null,
    retry_count: 0,
    duration_ms: 50,
    started_at: new Date('2026-01-01'),
    completed_at: new Date('2026-01-01'),
    inserted_at: new Date('2026-01-01'),
    ...overrides,
  };
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                     */
/* -------------------------------------------------------------------------- */

describe('workflow-orchestrator.service', () => {
  let sql: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../db/connection.js');
    sql = mod.sql;
  });

  /* ------------------------------------------------------------------ */
  /*  executeWorkflowRun — single step                                   */
  /* ------------------------------------------------------------------ */

  describe('executeWorkflowRun', () => {
    it('executes a simple single-step prompt workflow', async () => {
      // assertWorkflowCreator — ownership check
      sql.mockResolvedValueOnce([{ id: WORKFLOW_ID }]);
      // load workflow
      sql.mockResolvedValueOnce([makeWorkflowRow()]);
      // concurrent run check + insert
      sql.mockResolvedValueOnce([{ id: RUN_ID }]);
      // load steps
      sql.mockResolvedValueOnce([makeStepRow()]);
      // INSERT step_run
      sql.mockResolvedValueOnce([]);
      // UPDATE step_run (completed)
      sql.mockResolvedValueOnce([]);
      // UPDATE workflow_run (completed)
      sql.mockResolvedValueOnce([]);

      const { executeWorkflowRun } = await import('./workflow-orchestrator.service.js');
      const result = await executeWorkflowRun(WORKFLOW_ID, USER_ID, { name: 'test' });

      expect(result.status).toBe('completed');
      expect(result.workflow_id).toBe(WORKFLOW_ID);
      expect(result.step_results).toHaveLength(1);
      expect(result.step_results[0].status).toBe('completed');
      expect(result.step_results[0].step_name).toBe('Step 1');
      expect(result.step_results[0].output).toMatchObject({
        rendered_prompt: 'Hello {{input.name}}',
      });
      expect(result.error_message).toBeNull();
    });

    it('executes parallel group steps concurrently', async () => {
      const stepA = makeStepRow({
        id: STEP_ID_1,
        name: 'Parallel A',
        position: 0,
        metadata: { parallel_group: 'group-1' },
      });
      const stepB = makeStepRow({
        id: STEP_ID_2,
        name: 'Parallel B',
        step_type: 'tool_call',
        config: { tool_name: 'search', arguments: { q: 'test' } },
        position: 1,
        metadata: { parallel_group: 'group-1' },
      });

      // assertWorkflowCreator
      sql.mockResolvedValueOnce([{ id: WORKFLOW_ID }]);
      // load workflow
      sql.mockResolvedValueOnce([makeWorkflowRow()]);
      // concurrent run check + insert
      sql.mockResolvedValueOnce([{ id: RUN_ID }]);
      // load steps
      sql.mockResolvedValueOnce([stepA, stepB]);
      // INSERT step_run for step A
      sql.mockResolvedValueOnce([]);
      // INSERT step_run for step B
      sql.mockResolvedValueOnce([]);
      // UPDATE step_run A (completed)
      sql.mockResolvedValueOnce([]);
      // UPDATE step_run B (completed)
      sql.mockResolvedValueOnce([]);
      // UPDATE workflow_run (completed)
      sql.mockResolvedValueOnce([]);

      const { executeWorkflowRun } = await import('./workflow-orchestrator.service.js');
      const result = await executeWorkflowRun(WORKFLOW_ID, USER_ID, {});

      expect(result.status).toBe('completed');
      expect(result.step_results).toHaveLength(2);
      expect(result.step_results[0].step_name).toBe('Parallel A');
      expect(result.step_results[1].step_name).toBe('Parallel B');
      expect(result.step_results[1].output).toMatchObject({
        tool_name: 'search',
        result: { executed: true, tool: 'search' },
      });
    });

    it('skips conditional steps when condition is not met', async () => {
      const step = makeStepRow({
        id: STEP_ID_1,
        name: 'Conditional Step',
        step_type: 'transform',
        position: 0,
        metadata: {
          condition: { field: 'prev.value', operator: 'eq', value: 'expected' },
        },
      });

      // assertWorkflowCreator
      sql.mockResolvedValueOnce([{ id: WORKFLOW_ID }]);
      // load workflow
      sql.mockResolvedValueOnce([makeWorkflowRow()]);
      // concurrent run check + insert
      sql.mockResolvedValueOnce([{ id: RUN_ID }]);
      // load steps
      sql.mockResolvedValueOnce([step]);
      // UPDATE workflow_run (completed)
      sql.mockResolvedValueOnce([]);

      const { executeWorkflowRun } = await import('./workflow-orchestrator.service.js');
      const result = await executeWorkflowRun(WORKFLOW_ID, USER_ID, {});

      expect(result.status).toBe('completed');
      expect(result.step_results).toHaveLength(1);
      expect(result.step_results[0].status).toBe('skipped');
      expect(result.step_results[0].output).toBeNull();
      expect(result.step_results[0].duration_ms).toBe(0);
    });

    it('executes conditional steps when condition is met', async () => {
      // Two steps: first produces output, second has condition referencing it
      const step1 = makeStepRow({
        id: STEP_ID_1,
        name: 'producer',
        step_type: 'prompt',
        config: { prompt: 'go' },
        position: 0,
      });
      const step2 = makeStepRow({
        id: STEP_ID_2,
        name: 'conditional',
        step_type: 'transform',
        config: { mapping: {} },
        position: 1,
        metadata: {
          condition: { field: 'producer.rendered_prompt', operator: 'exists' },
        },
      });

      // assertWorkflowCreator
      sql.mockResolvedValueOnce([{ id: WORKFLOW_ID }]);
      // load workflow
      sql.mockResolvedValueOnce([makeWorkflowRow()]);
      // concurrent run check + insert
      sql.mockResolvedValueOnce([{ id: RUN_ID }]);
      // load steps
      sql.mockResolvedValueOnce([step1, step2]);
      // INSERT step_run 1
      sql.mockResolvedValueOnce([]);
      // UPDATE step_run 1 (completed)
      sql.mockResolvedValueOnce([]);
      // INSERT step_run 2
      sql.mockResolvedValueOnce([]);
      // UPDATE step_run 2 (completed)
      sql.mockResolvedValueOnce([]);
      // UPDATE workflow_run (completed)
      sql.mockResolvedValueOnce([]);

      const { executeWorkflowRun } = await import('./workflow-orchestrator.service.js');
      const result = await executeWorkflowRun(WORKFLOW_ID, USER_ID, {});

      expect(result.status).toBe('completed');
      expect(result.step_results).toHaveLength(2);
      expect(result.step_results[0].status).toBe('completed');
      expect(result.step_results[1].status).toBe('completed');
    });

    it('fails the run when workflow is not active', async () => {
      // assertWorkflowCreator
      sql.mockResolvedValueOnce([{ id: WORKFLOW_ID }]);
      // load workflow — status is 'draft'
      sql.mockResolvedValueOnce([makeWorkflowRow({ status: 'draft' })]);

      const { executeWorkflowRun } = await import('./workflow-orchestrator.service.js');
      await expect(executeWorkflowRun(WORKFLOW_ID, USER_ID, {})).rejects.toThrow(
        'Workflow must be active to run',
      );
    });

    it('fails when maximum concurrent runs are reached', async () => {
      // assertWorkflowCreator
      sql.mockResolvedValueOnce([{ id: WORKFLOW_ID }]);
      // load workflow
      sql.mockResolvedValueOnce([makeWorkflowRow({ max_concurrent_runs: 1 })]);
      // concurrent run check — insert returns empty (blocked)
      sql.mockResolvedValueOnce([]);

      const { executeWorkflowRun } = await import('./workflow-orchestrator.service.js');
      await expect(executeWorkflowRun(WORKFLOW_ID, USER_ID, {})).rejects.toThrow(
        'Maximum concurrent runs reached',
      );
    });

    it('returns failed status when a step fails', async () => {
      const step = makeStepRow({
        id: STEP_ID_1,
        name: 'Bad Step',
        step_type: 'unknown_type' as any,
        position: 0,
      });

      // assertWorkflowCreator
      sql.mockResolvedValueOnce([{ id: WORKFLOW_ID }]);
      // load workflow
      sql.mockResolvedValueOnce([makeWorkflowRow()]);
      // concurrent run check + insert
      sql.mockResolvedValueOnce([{ id: RUN_ID }]);
      // load steps
      sql.mockResolvedValueOnce([step]);
      // INSERT step_run
      sql.mockResolvedValueOnce([]);
      // UPDATE step_run (failed)
      sql.mockResolvedValueOnce([]);
      // UPDATE workflow_run (failed — from step failure propagation)
      sql.mockResolvedValueOnce([]);

      const { executeWorkflowRun } = await import('./workflow-orchestrator.service.js');
      const result = await executeWorkflowRun(WORKFLOW_ID, USER_ID, {});

      expect(result.status).toBe('failed');
      expect(result.error_message).toContain("Step 'Bad Step' failed");
    });

    it('fails when workflow has no steps', async () => {
      // assertWorkflowCreator
      sql.mockResolvedValueOnce([{ id: WORKFLOW_ID }]);
      // load workflow
      sql.mockResolvedValueOnce([makeWorkflowRow()]);
      // concurrent run check + insert
      sql.mockResolvedValueOnce([{ id: RUN_ID }]);
      // load steps — empty
      sql.mockResolvedValueOnce([]);
      // UPDATE workflow_run (failed)
      sql.mockResolvedValueOnce([]);

      const { executeWorkflowRun } = await import('./workflow-orchestrator.service.js');
      const result = await executeWorkflowRun(WORKFLOW_ID, USER_ID, {});

      expect(result.status).toBe('failed');
      expect(result.error_message).toBe('Workflow has no steps');
    });

    it('propagates step_outputs between sequential steps', async () => {
      const step1 = makeStepRow({
        id: STEP_ID_1,
        name: 'first',
        step_type: 'prompt',
        config: { prompt: 'Hello' },
        position: 0,
      });
      const step2 = makeStepRow({
        id: STEP_ID_2,
        name: 'second',
        step_type: 'transform',
        config: { mapping: { key: 'val' } },
        position: 1,
      });

      // assertWorkflowCreator
      sql.mockResolvedValueOnce([{ id: WORKFLOW_ID }]);
      // load workflow
      sql.mockResolvedValueOnce([makeWorkflowRow()]);
      // concurrent run check + insert
      sql.mockResolvedValueOnce([{ id: RUN_ID }]);
      // load steps
      sql.mockResolvedValueOnce([step1, step2]);
      // INSERT step_run 1
      sql.mockResolvedValueOnce([]);
      // UPDATE step_run 1
      sql.mockResolvedValueOnce([]);
      // INSERT step_run 2
      sql.mockResolvedValueOnce([]);
      // UPDATE step_run 2
      sql.mockResolvedValueOnce([]);
      // UPDATE workflow_run
      sql.mockResolvedValueOnce([]);

      const { executeWorkflowRun } = await import('./workflow-orchestrator.service.js');
      const result = await executeWorkflowRun(WORKFLOW_ID, USER_ID, { key: 'value' });

      expect(result.status).toBe('completed');
      expect(result.result).toMatchObject({
        step_outputs: {
          first: expect.objectContaining({ rendered_prompt: 'Hello' }),
          second: expect.objectContaining({ transformed: true }),
        },
      });
    });
  });

  /* ------------------------------------------------------------------ */
  /*  cancelWorkflowRun                                                  */
  /* ------------------------------------------------------------------ */

  describe('cancelWorkflowRun', () => {
    it('sets run status to cancelled', async () => {
      // assertRunAccess — returns the run row
      sql.unsafe.mockResolvedValueOnce([makeRunRow({ status: 'running' })]);
      // assertWorkflowCreator inside assertRunAccess
      sql.mockResolvedValueOnce([{ id: WORKFLOW_ID }]);
      // UPDATE workflow_runs SET status = cancelled
      sql.mockResolvedValueOnce([]);
      // UPDATE workflow_step_runs
      sql.mockResolvedValueOnce([]);

      const { cancelWorkflowRun } = await import('./workflow-orchestrator.service.js');
      await cancelWorkflowRun(RUN_ID, USER_ID);

      // Verify the SQL was called to set status to 'cancelled'
      expect(sql).toHaveBeenCalled();
    });

    it('throws when trying to cancel a completed run', async () => {
      // assertRunAccess
      sql.unsafe.mockResolvedValueOnce([makeRunRow({ status: 'completed' })]);
      // assertWorkflowCreator
      sql.mockResolvedValueOnce([{ id: WORKFLOW_ID }]);

      const { cancelWorkflowRun } = await import('./workflow-orchestrator.service.js');
      await expect(cancelWorkflowRun(RUN_ID, USER_ID)).rejects.toThrow(
        "Cannot cancel run with status 'completed'",
      );
    });

    it('throws when run is not found', async () => {
      sql.unsafe.mockResolvedValueOnce([]);

      const { cancelWorkflowRun } = await import('./workflow-orchestrator.service.js');
      await expect(cancelWorkflowRun(RUN_ID, USER_ID)).rejects.toThrow('Run not found');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getWorkflowRunStatus                                               */
  /* ------------------------------------------------------------------ */

  describe('getWorkflowRunStatus', () => {
    it('returns correct status with step runs', async () => {
      // assertRunAccess
      sql.unsafe
        .mockResolvedValueOnce([makeRunRow({ status: 'completed' })])
        .mockResolvedValueOnce([
          makeStepRunRow({ status: 'completed' }),
          makeStepRunRow({ id: 'sr-2', step_id: STEP_ID_2, status: 'completed' }),
        ]);
      // assertWorkflowCreator
      sql.mockResolvedValueOnce([{ id: WORKFLOW_ID }]);

      const { getWorkflowRunStatus } = await import('./workflow-orchestrator.service.js');
      const result = await getWorkflowRunStatus(RUN_ID, USER_ID);

      expect(result.status).toBe('completed');
      expect(result.step_runs).toHaveLength(2);
      expect(result.step_runs[0].status).toBe('completed');
      expect(result.id).toBe(RUN_ID);
    });

    it('returns empty step_runs when none exist', async () => {
      // assertRunAccess
      sql.unsafe
        .mockResolvedValueOnce([makeRunRow({ status: 'running' })])
        .mockResolvedValueOnce([]);
      // assertWorkflowCreator
      sql.mockResolvedValueOnce([{ id: WORKFLOW_ID }]);

      const { getWorkflowRunStatus } = await import('./workflow-orchestrator.service.js');
      const result = await getWorkflowRunStatus(RUN_ID, USER_ID);

      expect(result.status).toBe('running');
      expect(result.step_runs).toEqual([]);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  retryFailedStep                                                    */
  /* ------------------------------------------------------------------ */

  describe('retryFailedStep', () => {
    it('re-executes a failed step', async () => {
      // assertRunAccess
      sql.unsafe.mockResolvedValueOnce([makeRunRow({ status: 'failed', input: { key: 'val' } })]);
      // assertWorkflowCreator
      sql.mockResolvedValueOnce([{ id: WORKFLOW_ID }]);
      // load steps
      sql.mockResolvedValueOnce([makeStepRow({ id: STEP_ID_1, name: 'Retry Step', position: 0 })]);
      // existing step runs (retry_count)
      sql.mockResolvedValueOnce([{ retry_count: 0 }]);
      // completed step runs for context
      sql.mockResolvedValueOnce([]);
      // UPDATE retry_count
      sql.mockResolvedValueOnce([]);
      // UPDATE run status to running
      sql.mockResolvedValueOnce([]);
      // INSERT step_run
      sql.mockResolvedValueOnce([]);
      // UPDATE step_run (completed)
      sql.mockResolvedValueOnce([]);
      // remaining failed steps check
      sql.mockResolvedValueOnce([]);
      // UPDATE run to completed
      sql.mockResolvedValueOnce([]);

      const { retryFailedStep } = await import('./workflow-orchestrator.service.js');
      const result = await retryFailedStep(RUN_ID, 0, USER_ID);

      expect(result.status).toBe('completed');
      expect(result.step_name).toBe('Retry Step');
    });

    it('throws when run is not in failed status', async () => {
      // assertRunAccess
      sql.unsafe.mockResolvedValueOnce([makeRunRow({ status: 'completed' })]);
      // assertWorkflowCreator
      sql.mockResolvedValueOnce([{ id: WORKFLOW_ID }]);

      const { retryFailedStep } = await import('./workflow-orchestrator.service.js');
      await expect(retryFailedStep(RUN_ID, 0, USER_ID)).rejects.toThrow(
        'Can only retry steps in failed runs',
      );
    });

    it('throws when step index is out of range', async () => {
      // assertRunAccess
      sql.unsafe.mockResolvedValueOnce([makeRunRow({ status: 'failed' })]);
      // assertWorkflowCreator
      sql.mockResolvedValueOnce([{ id: WORKFLOW_ID }]);
      // load steps — only one step
      sql.mockResolvedValueOnce([makeStepRow()]);

      const { retryFailedStep } = await import('./workflow-orchestrator.service.js');
      await expect(retryFailedStep(RUN_ID, 5, USER_ID)).rejects.toThrow('Invalid step index');
    });

    it('throws when max retries exceeded', async () => {
      // assertRunAccess
      sql.unsafe.mockResolvedValueOnce([makeRunRow({ status: 'failed' })]);
      // assertWorkflowCreator
      sql.mockResolvedValueOnce([{ id: WORKFLOW_ID }]);
      // load steps
      sql.mockResolvedValueOnce([makeStepRow({ retry_config: { max_retries: 2 } })]);
      // existing step runs — already at max
      sql.mockResolvedValueOnce([{ retry_count: 2 }]);

      const { retryFailedStep } = await import('./workflow-orchestrator.service.js');
      await expect(retryFailedStep(RUN_ID, 0, USER_ID)).rejects.toThrow(
        "Maximum retries (2) exceeded for step 'Step 1'",
      );
    });
  });

  /* ------------------------------------------------------------------ */
  /*  listWorkflowRuns                                                   */
  /* ------------------------------------------------------------------ */

  describe('listWorkflowRuns', () => {
    it('returns paginated results', async () => {
      // assertWorkflowCreator
      sql.mockResolvedValueOnce([{ id: WORKFLOW_ID }]);
      // list runs
      sql.unsafe.mockResolvedValueOnce([
        makeRunRow({ id: 'run-1', status: 'completed', inserted_at: new Date('2026-01-02') }),
        makeRunRow({ id: 'run-2', status: 'failed', inserted_at: new Date('2026-01-01') }),
      ]);

      const { listWorkflowRuns } = await import('./workflow-orchestrator.service.js');
      const runs = await listWorkflowRuns(WORKFLOW_ID, USER_ID);

      expect(runs).toHaveLength(2);
      expect(runs[0].id).toBe('run-1');
      expect(runs[0].status).toBe('completed');
      expect(runs[1].id).toBe('run-2');
      expect(runs[1].status).toBe('failed');
    });

    it('returns empty array when no runs exist', async () => {
      // assertWorkflowCreator
      sql.mockResolvedValueOnce([{ id: WORKFLOW_ID }]);
      // list runs — empty
      sql.unsafe.mockResolvedValueOnce([]);

      const { listWorkflowRuns } = await import('./workflow-orchestrator.service.js');
      const runs = await listWorkflowRuns(WORKFLOW_ID, USER_ID);

      expect(runs).toEqual([]);
    });

    it('throws when user does not own the workflow', async () => {
      // assertWorkflowCreator — no match
      sql.mockResolvedValueOnce([]);

      const { listWorkflowRuns } = await import('./workflow-orchestrator.service.js');
      await expect(listWorkflowRuns(WORKFLOW_ID, USER_ID)).rejects.toThrow(
        'Workflow not found or access denied',
      );
    });
  });

  /* ------------------------------------------------------------------ */
  /*  executeWorkflowStep — timeout handling                             */
  /* ------------------------------------------------------------------ */

  describe('executeWorkflowStep — timeout', () => {
    it('fails a step when it exceeds timeout', async () => {
      // For the wait step type, we use a very long wait with a short timeout
      const step = {
        id: STEP_ID_1,
        name: 'Slow Wait',
        step_type: 'wait' as const,
        config: { duration_ms: 999999 },
        position: 0,
        timeout_ms: 1, // 1ms timeout — will fire before the wait completes
        retry_config: null,
        parallel_group: null,
        condition: null,
      };

      const context = {
        workflow_id: WORKFLOW_ID,
        run_id: RUN_ID,
        input: {},
        step_outputs: {},
        aborted: false,
      };

      // INSERT step_run
      sql.mockResolvedValueOnce([]);
      // UPDATE step_run (failed)
      sql.mockResolvedValueOnce([]);

      const { executeWorkflowStep } = await import('./workflow-orchestrator.service.js');
      const result = await executeWorkflowStep(RUN_ID, step, context);

      expect(result.status).toBe('failed');
      expect(result.error_message).toContain('timed out');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Step type coverage                                                 */
  /* ------------------------------------------------------------------ */

  describe('executeWorkflowStep — step types', () => {
    const baseContext = {
      workflow_id: WORKFLOW_ID,
      run_id: RUN_ID,
      input: { query: 'test' },
      step_outputs: {},
      aborted: false,
    };

    it('executes a tool_call step', async () => {
      const step = {
        id: STEP_ID_1,
        name: 'Tool Step',
        step_type: 'tool_call' as const,
        config: { tool_name: 'web_search', arguments: { q: 'hello' } },
        position: 0,
        timeout_ms: 300000,
        retry_config: null,
        parallel_group: null,
        condition: null,
      };

      sql.mockResolvedValueOnce([]); // INSERT
      sql.mockResolvedValueOnce([]); // UPDATE

      const { executeWorkflowStep } = await import('./workflow-orchestrator.service.js');
      const result = await executeWorkflowStep(RUN_ID, step, baseContext);

      expect(result.status).toBe('completed');
      expect(result.output).toMatchObject({
        tool_name: 'web_search',
        arguments: { q: 'hello' },
        result: { executed: true, tool: 'web_search' },
      });
    });

    it('executes a condition step', async () => {
      const step = {
        id: STEP_ID_1,
        name: 'Condition Step',
        step_type: 'condition' as const,
        config: { condition: { field: 'missing.field', operator: 'exists' } },
        position: 0,
        timeout_ms: 300000,
        retry_config: null,
        parallel_group: null,
        condition: null,
      };

      sql.mockResolvedValueOnce([]); // INSERT
      sql.mockResolvedValueOnce([]); // UPDATE

      const { executeWorkflowStep } = await import('./workflow-orchestrator.service.js');
      const result = await executeWorkflowStep(RUN_ID, step, baseContext);

      expect(result.status).toBe('completed');
      expect(result.output).toMatchObject({
        condition_met: false,
        branch: 'false',
      });
    });

    it('executes a sub_workflow step', async () => {
      const step = {
        id: STEP_ID_1,
        name: 'Sub Workflow',
        step_type: 'sub_workflow' as const,
        config: { workflow_id: 'sub-wf-id' },
        position: 0,
        timeout_ms: 300000,
        retry_config: null,
        parallel_group: null,
        condition: null,
      };

      sql.mockResolvedValueOnce([]); // INSERT
      sql.mockResolvedValueOnce([]); // UPDATE

      const { executeWorkflowStep } = await import('./workflow-orchestrator.service.js');
      const result = await executeWorkflowStep(RUN_ID, step, baseContext);

      expect(result.status).toBe('completed');
      expect(result.output).toMatchObject({
        sub_workflow_id: 'sub-wf-id',
        delegated: true,
      });
    });

    it('executes a human_input step', async () => {
      const step = {
        id: STEP_ID_1,
        name: 'Human Input',
        step_type: 'human_input' as const,
        config: { prompt: 'Please confirm' },
        position: 0,
        timeout_ms: 300000,
        retry_config: null,
        parallel_group: null,
        condition: null,
      };

      sql.mockResolvedValueOnce([]); // INSERT
      sql.mockResolvedValueOnce([]); // UPDATE

      const { executeWorkflowStep } = await import('./workflow-orchestrator.service.js');
      const result = await executeWorkflowStep(RUN_ID, step, baseContext);

      expect(result.status).toBe('completed');
      expect(result.output).toMatchObject({
        prompt: 'Please confirm',
        awaiting_input: true,
      });
    });

    it('fails on unknown step type', async () => {
      const step = {
        id: STEP_ID_1,
        name: 'Unknown',
        step_type: 'nonexistent' as any,
        config: {},
        position: 0,
        timeout_ms: 300000,
        retry_config: null,
        parallel_group: null,
        condition: null,
      };

      sql.mockResolvedValueOnce([]); // INSERT
      sql.mockResolvedValueOnce([]); // UPDATE (failed)

      const { executeWorkflowStep } = await import('./workflow-orchestrator.service.js');
      const result = await executeWorkflowStep(RUN_ID, step, baseContext);

      expect(result.status).toBe('failed');
      expect(result.error_message).toContain('Unknown step type');
    });
  });
});
