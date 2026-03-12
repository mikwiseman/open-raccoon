/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock DB connection
vi.mock('../../db/connection.js', () => {
  const sqlFn = Object.assign(vi.fn(), {
    unsafe: vi.fn(),
    begin: vi.fn(async (cb: (tx: any) => Promise<any>) => {
      return cb(sqlFn);
    }),
  });
  return { sql: sqlFn, db: {} };
});

// Mock emitter
vi.mock('../../ws/emitter.js', () => ({
  emitWorkflowEvent: vi.fn(),
}));

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_USER_ID = 'ff0e8400-e29b-41d4-a716-446655440099';
const AGENT_ID = '660e8400-e29b-41d4-a716-446655440001';
const WORKFLOW_ID = '770e8400-e29b-41d4-a716-446655440002';
const STEP_ID_1 = '880e8400-e29b-41d4-a716-446655440003';
const STEP_ID_2 = '990e8400-e29b-41d4-a716-446655440004';
const STEP_ID_3 = 'aa0e8400-e29b-41d4-a716-446655440005';
const STEP_ID_4 = 'bb0e8400-e29b-41d4-a716-446655440006';
const RUN_ID = 'cc0e8400-e29b-41d4-a716-446655440007';

function makeWorkflowRow(overrides: Record<string, unknown> = {}) {
  return {
    id: WORKFLOW_ID,
    agent_id: AGENT_ID,
    creator_id: USER_ID,
    name: 'Test Workflow',
    description: null,
    status: 'draft',
    trigger_config: null,
    max_concurrent_runs: 1,
    metadata: {},
    inserted_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
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
    status: 'pending',
    input: {},
    result: null,
    error_message: null,
    total_duration_ms: null,
    started_at: new Date('2026-01-01'),
    completed_at: null,
    inserted_at: new Date('2026-01-01'),
    ...overrides,
  };
}

/* -------------------------------------------------------------------------- */
/*  validateDAG — Edge Cases                                                  */
/* -------------------------------------------------------------------------- */

describe('workflow.service-edge — validateDAG edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates an empty graph (no steps, no edges)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // No steps
    sqlMock.mockResolvedValueOnce([] as any);
    // No edges
    sqlMock.mockResolvedValueOnce([] as any);

    const { validateDAG } = await import('./workflow.service.js');
    // Empty graph has no cycles and no entry-point check triggers
    await expect(validateDAG(WORKFLOW_ID)).resolves.toBeUndefined();
  });

  it('validates a single node with no edges', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: STEP_ID_1 }] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { validateDAG } = await import('./workflow.service.js');
    await expect(validateDAG(WORKFLOW_ID)).resolves.toBeUndefined();
  });

  it('validates a diamond pattern (A -> B, A -> C, B -> D, C -> D)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([
      { id: STEP_ID_1 },
      { id: STEP_ID_2 },
      { id: STEP_ID_3 },
      { id: STEP_ID_4 },
    ] as any);

    sqlMock.mockResolvedValueOnce([
      { source_step_id: STEP_ID_1, target_step_id: STEP_ID_2 },
      { source_step_id: STEP_ID_1, target_step_id: STEP_ID_3 },
      { source_step_id: STEP_ID_2, target_step_id: STEP_ID_4 },
      { source_step_id: STEP_ID_3, target_step_id: STEP_ID_4 },
    ] as any);

    const { validateDAG } = await import('./workflow.service.js');
    await expect(validateDAG(WORKFLOW_ID)).resolves.toBeUndefined();
  });

  it('validates multiple entry points (two independent chains)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([
      { id: STEP_ID_1 },
      { id: STEP_ID_2 },
      { id: STEP_ID_3 },
      { id: STEP_ID_4 },
    ] as any);

    // A -> B and C -> D (two parallel chains)
    sqlMock.mockResolvedValueOnce([
      { source_step_id: STEP_ID_1, target_step_id: STEP_ID_2 },
      { source_step_id: STEP_ID_3, target_step_id: STEP_ID_4 },
    ] as any);

    const { validateDAG } = await import('./workflow.service.js');
    await expect(validateDAG(WORKFLOW_ID)).resolves.toBeUndefined();
  });

  it('validates disconnected nodes (nodes with no edges at all)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // Three completely disconnected steps
    sqlMock.mockResolvedValueOnce([{ id: STEP_ID_1 }, { id: STEP_ID_2 }, { id: STEP_ID_3 }] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { validateDAG } = await import('./workflow.service.js');
    await expect(validateDAG(WORKFLOW_ID)).resolves.toBeUndefined();
  });

  it('throws BAD_REQUEST for a self-loop (A -> A)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: STEP_ID_1 }] as any);
    sqlMock.mockResolvedValueOnce([
      { source_step_id: STEP_ID_1, target_step_id: STEP_ID_1 },
    ] as any);

    const { validateDAG } = await import('./workflow.service.js');
    await expect(validateDAG(WORKFLOW_ID)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('throws BAD_REQUEST for a longer cycle (A -> B -> C -> A)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: STEP_ID_1 }, { id: STEP_ID_2 }, { id: STEP_ID_3 }] as any);
    sqlMock.mockResolvedValueOnce([
      { source_step_id: STEP_ID_1, target_step_id: STEP_ID_2 },
      { source_step_id: STEP_ID_2, target_step_id: STEP_ID_3 },
      { source_step_id: STEP_ID_3, target_step_id: STEP_ID_1 },
    ] as any);

    const { validateDAG } = await import('./workflow.service.js');
    await expect(validateDAG(WORKFLOW_ID)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('detects cycle in a subgraph even with valid entry points elsewhere', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // A has no incoming edges (valid entry), but B <-> C form a cycle
    sqlMock.mockResolvedValueOnce([{ id: STEP_ID_1 }, { id: STEP_ID_2 }, { id: STEP_ID_3 }] as any);
    sqlMock.mockResolvedValueOnce([
      { source_step_id: STEP_ID_1, target_step_id: STEP_ID_2 },
      { source_step_id: STEP_ID_2, target_step_id: STEP_ID_3 },
      { source_step_id: STEP_ID_3, target_step_id: STEP_ID_2 },
    ] as any);

    const { validateDAG } = await import('./workflow.service.js');
    await expect(validateDAG(WORKFLOW_ID)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });
});

/* -------------------------------------------------------------------------- */
/*  createWorkflow — Edge Cases                                               */
/* -------------------------------------------------------------------------- */

describe('workflow.service-edge — createWorkflow edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a workflow with trigger_config', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([
      makeWorkflowRow({
        trigger_config: { type: 'schedule', cron: '0 * * * *' },
      }),
    ] as any);

    const { createWorkflow } = await import('./workflow.service.js');
    const result = await createWorkflow(AGENT_ID, USER_ID, {
      name: 'Scheduled Workflow',
      trigger_config: { type: 'schedule', cron: '0 * * * *' },
    });

    expect(result.trigger_config).toEqual({ type: 'schedule', cron: '0 * * * *' });
  });

  it('creates a workflow with max_concurrent_runs set to 10', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([
      makeWorkflowRow({ max_concurrent_runs: 10 }),
    ] as any);

    const { createWorkflow } = await import('./workflow.service.js');
    const result = await createWorkflow(AGENT_ID, USER_ID, {
      name: 'High Concurrency',
      max_concurrent_runs: 10,
    });

    expect(result.max_concurrent_runs).toBe(10);
  });

  it('creates a workflow with status set to active (initial)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([makeWorkflowRow({ status: 'paused' })] as any);

    const { createWorkflow } = await import('./workflow.service.js');
    const result = await createWorkflow(AGENT_ID, USER_ID, {
      name: 'Paused Workflow',
      status: 'paused',
    });

    expect(result.status).toBe('paused');
  });

  it('creates a workflow with description', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([
      makeWorkflowRow({ description: 'A workflow description' }),
    ] as any);

    const { createWorkflow } = await import('./workflow.service.js');
    const result = await createWorkflow(AGENT_ID, USER_ID, {
      name: 'Described',
      description: 'A workflow description',
    });

    expect(result.description).toBe('A workflow description');
  });
});

/* -------------------------------------------------------------------------- */
/*  updateWorkflow — Edge Cases                                               */
/* -------------------------------------------------------------------------- */

describe('workflow.service-edge — updateWorkflow edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('activating a workflow with steps and valid DAG succeeds', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertWorkflowCreator
    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    // check steps — has at least one
    sqlMock.mockResolvedValueOnce([{ id: STEP_ID_1 }] as any);
    // validateDAG — steps
    sqlMock.mockResolvedValueOnce([{ id: STEP_ID_1 }] as any);
    // validateDAG — edges (none = valid)
    sqlMock.mockResolvedValueOnce([] as any);
    // UPDATE
    sqlMock.mockResolvedValueOnce([makeWorkflowRow({ status: 'active' })] as any);

    const { updateWorkflow } = await import('./workflow.service.js');
    const result = await updateWorkflow(WORKFLOW_ID, USER_ID, { status: 'active' });

    expect(result.status).toBe('active');
  });

  it('activating a workflow with a cycle throws BAD_REQUEST', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertWorkflowCreator
    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    // check steps — has steps
    sqlMock.mockResolvedValueOnce([{ id: STEP_ID_1 }] as any);
    // validateDAG — steps
    sqlMock.mockResolvedValueOnce([{ id: STEP_ID_1 }, { id: STEP_ID_2 }] as any);
    // validateDAG — edges with cycle
    sqlMock.mockResolvedValueOnce([
      { source_step_id: STEP_ID_1, target_step_id: STEP_ID_2 },
      { source_step_id: STEP_ID_2, target_step_id: STEP_ID_1 },
    ] as any);

    const { updateWorkflow } = await import('./workflow.service.js');
    await expect(updateWorkflow(WORKFLOW_ID, USER_ID, { status: 'active' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('updates only the description without triggering DAG validation', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertWorkflowCreator
    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    // UPDATE — no DAG validation since status is not being set to active
    sqlMock.mockResolvedValueOnce([makeWorkflowRow({ description: 'Updated description' })] as any);

    const { updateWorkflow } = await import('./workflow.service.js');
    const result = await updateWorkflow(WORKFLOW_ID, USER_ID, {
      description: 'Updated description',
    });

    expect(result.description).toBe('Updated description');
    // sql should only have been called twice (ownership + update)
    expect(sqlMock).toHaveBeenCalledTimes(2);
  });

  it('updates trigger_config to null', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeWorkflowRow({ trigger_config: null })] as any);

    const { updateWorkflow } = await import('./workflow.service.js');
    const result = await updateWorkflow(WORKFLOW_ID, USER_ID, {
      trigger_config: null,
    });

    expect(result.trigger_config).toBeNull();
  });

  it('updates max_concurrent_runs', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeWorkflowRow({ max_concurrent_runs: 5 })] as any);

    const { updateWorkflow } = await import('./workflow.service.js');
    const result = await updateWorkflow(WORKFLOW_ID, USER_ID, {
      max_concurrent_runs: 5,
    });

    expect(result.max_concurrent_runs).toBe(5);
  });

  it('updates metadata', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    sqlMock.mockResolvedValueOnce([
      makeWorkflowRow({ metadata: { env: 'production', version: 3 } }),
    ] as any);

    const { updateWorkflow } = await import('./workflow.service.js');
    const result = await updateWorkflow(WORKFLOW_ID, USER_ID, {
      metadata: { env: 'production', version: 3 },
    });

    expect(result.metadata).toEqual({ env: 'production', version: 3 });
  });
});

/* -------------------------------------------------------------------------- */
/*  executeWorkflow — Edge Cases                                              */
/* -------------------------------------------------------------------------- */

describe('workflow.service-edge — executeWorkflow edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('respects concurrent run limit (CTE returns empty when at limit)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. assertWorkflowCreator
    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    // 2. SELECT status/max_concurrent_runs
    sqlMock.mockResolvedValueOnce([{ status: 'active', max_concurrent_runs: 3 }] as any);
    // 3. CTE INSERT — returns empty when limit reached
    sqlMock.mockResolvedValueOnce([] as any);

    const { executeWorkflow } = await import('./workflow.service.js');
    await expect(executeWorkflow(WORKFLOW_ID, AGENT_ID, USER_ID, {})).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('allows execution when CTE INSERT succeeds', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. assertWorkflowCreator
    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    // 2. SELECT status/max_concurrent_runs
    sqlMock.mockResolvedValueOnce([{ status: 'active', max_concurrent_runs: 3 }] as any);
    // 3. CTE INSERT — returns inserted row id
    sqlMock.mockResolvedValueOnce([{ id: RUN_ID }] as any);
    // 4. sql.unsafe — SELECT the full run row
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([makeRunRow()] as any);

    const { executeWorkflow } = await import('./workflow.service.js');
    const result = await executeWorkflow(WORKFLOW_ID, AGENT_ID, USER_ID, {});

    expect(result.status).toBe('pending');
  });

  it('throws BAD_REQUEST for paused workflow', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. assertWorkflowCreator
    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    // 2. SELECT status — paused
    sqlMock.mockResolvedValueOnce([{ status: 'paused', max_concurrent_runs: 1 }] as any);

    const { executeWorkflow } = await import('./workflow.service.js');
    await expect(executeWorkflow(WORKFLOW_ID, AGENT_ID, USER_ID, {})).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('throws BAD_REQUEST for archived workflow', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. assertWorkflowCreator
    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    // 2. SELECT status — archived
    sqlMock.mockResolvedValueOnce([{ status: 'archived', max_concurrent_runs: 1 }] as any);

    const { executeWorkflow } = await import('./workflow.service.js');
    await expect(executeWorkflow(WORKFLOW_ID, AGENT_ID, USER_ID, {})).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('throws NOT_FOUND for non-existent workflow', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertWorkflowCreator — not found
    sqlMock.mockResolvedValueOnce([] as any);

    const { executeWorkflow } = await import('./workflow.service.js');
    await expect(executeWorkflow('nonexistent', AGENT_ID, USER_ID, {})).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('creates run with conversation_id when provided', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    const convId = 'dd0e8400-e29b-41d4-a716-446655440008';

    // 1. assertWorkflowCreator
    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    // 2. SELECT status
    sqlMock.mockResolvedValueOnce([{ status: 'active', max_concurrent_runs: 1 }] as any);
    // 3. CTE INSERT
    sqlMock.mockResolvedValueOnce([{ id: RUN_ID }] as any);
    // 4. sql.unsafe — SELECT run
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([
      makeRunRow({ conversation_id: convId }),
    ] as any);

    const { executeWorkflow } = await import('./workflow.service.js');
    const result = await executeWorkflow(WORKFLOW_ID, AGENT_ID, USER_ID, {
      conversation_id: convId,
    });

    expect(result.conversation_id).toBe(convId);
  });

  it('creates run with input data', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. assertWorkflowCreator
    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    // 2. SELECT status
    sqlMock.mockResolvedValueOnce([{ status: 'active', max_concurrent_runs: 1 }] as any);
    // 3. CTE INSERT
    sqlMock.mockResolvedValueOnce([{ id: RUN_ID }] as any);
    // 4. sql.unsafe — SELECT run
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([
      makeRunRow({ input: { query: 'test', temperature: 0.5 } }),
    ] as any);

    const { executeWorkflow } = await import('./workflow.service.js');
    const result = await executeWorkflow(WORKFLOW_ID, AGENT_ID, USER_ID, {
      input: { query: 'test', temperature: 0.5 },
    });

    expect(result.input).toEqual({ query: 'test', temperature: 0.5 });
  });
});

/* -------------------------------------------------------------------------- */
/*  cancelRun — Edge Cases                                                    */
/* -------------------------------------------------------------------------- */

describe('workflow.service-edge — cancelRun edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws BAD_REQUEST when run is already cancelled', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([makeRunRow({ status: 'cancelled' })] as any);
    // assertWorkflowCreator
    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);

    const { cancelRun } = await import('./workflow.service.js');
    await expect(cancelRun(RUN_ID, USER_ID)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('throws BAD_REQUEST when run has failed', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([makeRunRow({ status: 'failed' })] as any);
    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);

    const { cancelRun } = await import('./workflow.service.js');
    await expect(cancelRun(RUN_ID, USER_ID)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('cancels a running run successfully', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([makeRunRow({ status: 'running' })] as any);
    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeRunRow({ status: 'cancelled' })] as any);

    const { cancelRun } = await import('./workflow.service.js');
    const result = await cancelRun(RUN_ID, USER_ID);

    expect(result.status).toBe('cancelled');
  });

  it('error message includes the current status', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([makeRunRow({ status: 'completed' })] as any);
    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);

    const { cancelRun } = await import('./workflow.service.js');
    await expect(cancelRun(RUN_ID, USER_ID)).rejects.toThrow(
      "Cannot cancel run with status 'completed'",
    );
  });

  it('throws NOT_FOUND when wrong user tries to cancel', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([makeRunRow({ status: 'pending' })] as any);
    // assertWorkflowCreator — fails for wrong user
    sqlMock.mockResolvedValueOnce([] as any);

    const { cancelRun } = await import('./workflow.service.js');
    await expect(cancelRun(RUN_ID, OTHER_USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

/* -------------------------------------------------------------------------- */
/*  listRuns                                                                   */
/* -------------------------------------------------------------------------- */

describe('workflow.service-edge — listRuns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no runs exist', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertWorkflowCreator
    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([] as any);

    const { listRuns } = await import('./workflow.service.js');
    const runs = await listRuns(WORKFLOW_ID, USER_ID);

    expect(runs).toHaveLength(0);
  });

  it('returns multiple runs', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([
      makeRunRow({ id: 'run-1', status: 'completed' }),
      makeRunRow({ id: 'run-2', status: 'pending' }),
    ] as any);

    const { listRuns } = await import('./workflow.service.js');
    const runs = await listRuns(WORKFLOW_ID, USER_ID);

    expect(runs).toHaveLength(2);
    expect(runs[0].id).toBe('run-1');
    expect(runs[1].id).toBe('run-2');
  });

  it('throws NOT_FOUND for wrong user', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([] as any);

    const { listRuns } = await import('./workflow.service.js');
    await expect(listRuns(WORKFLOW_ID, OTHER_USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
