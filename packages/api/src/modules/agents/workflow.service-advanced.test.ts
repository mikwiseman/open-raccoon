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
const AGENT_ID = '660e8400-e29b-41d4-a716-446655440001';
const WORKFLOW_ID = '770e8400-e29b-41d4-a716-446655440002';

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
    id: 'run-1',
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

/* ================================================================
 * Complex DAG Topologies
 * ================================================================ */
describe('workflow.service — complex DAG topologies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates diamond DAG (A->B, A->C, B->D, C->D)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    const steps = [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }];
    const edges = [
      { source_step_id: 'A', target_step_id: 'B' },
      { source_step_id: 'A', target_step_id: 'C' },
      { source_step_id: 'B', target_step_id: 'D' },
      { source_step_id: 'C', target_step_id: 'D' },
    ];

    sqlMock.mockResolvedValueOnce(steps as any);
    sqlMock.mockResolvedValueOnce(edges as any);

    const { validateDAG } = await import('./workflow.service.js');
    await expect(validateDAG(WORKFLOW_ID)).resolves.toBeUndefined();
  });

  it('validates fan-out DAG (A->B, A->C, A->D)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }] as any);
    sqlMock.mockResolvedValueOnce([
      { source_step_id: 'A', target_step_id: 'B' },
      { source_step_id: 'A', target_step_id: 'C' },
      { source_step_id: 'A', target_step_id: 'D' },
    ] as any);

    const { validateDAG } = await import('./workflow.service.js');
    await expect(validateDAG(WORKFLOW_ID)).resolves.toBeUndefined();
  });

  it('validates fan-in DAG (B->D, C->D, A->D)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }] as any);
    sqlMock.mockResolvedValueOnce([
      { source_step_id: 'A', target_step_id: 'D' },
      { source_step_id: 'B', target_step_id: 'D' },
      { source_step_id: 'C', target_step_id: 'D' },
    ] as any);

    const { validateDAG } = await import('./workflow.service.js');
    await expect(validateDAG(WORKFLOW_ID)).resolves.toBeUndefined();
  });

  it('validates deep chain (A->B->C->D->E->F)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    const ids = ['A', 'B', 'C', 'D', 'E', 'F'];
    sqlMock.mockResolvedValueOnce(ids.map((id) => ({ id })) as any);
    sqlMock.mockResolvedValueOnce(
      ids.slice(0, -1).map((id, i) => ({
        source_step_id: id,
        target_step_id: ids[i + 1],
      })) as any,
    );

    const { validateDAG } = await import('./workflow.service.js');
    await expect(validateDAG(WORKFLOW_ID)).resolves.toBeUndefined();
  });

  it('detects cycle in diamond with back-edge (A->B, A->C, B->D, C->D, D->A)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }] as any);
    sqlMock.mockResolvedValueOnce([
      { source_step_id: 'A', target_step_id: 'B' },
      { source_step_id: 'A', target_step_id: 'C' },
      { source_step_id: 'B', target_step_id: 'D' },
      { source_step_id: 'C', target_step_id: 'D' },
      { source_step_id: 'D', target_step_id: 'A' },
    ] as any);

    const { validateDAG } = await import('./workflow.service.js');
    await expect(validateDAG(WORKFLOW_ID)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('validates single-step workflow with no edges', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: 'A' }] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { validateDAG } = await import('./workflow.service.js');
    await expect(validateDAG(WORKFLOW_ID)).resolves.toBeUndefined();
  });

  it('validates empty workflow (no steps, no edges)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { validateDAG } = await import('./workflow.service.js');
    await expect(validateDAG(WORKFLOW_ID)).resolves.toBeUndefined();
  });

  it('detects self-loop in DAG validation', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: 'A' }] as any);
    sqlMock.mockResolvedValueOnce([{ source_step_id: 'A', target_step_id: 'A' }] as any);

    const { validateDAG } = await import('./workflow.service.js');
    await expect(validateDAG(WORKFLOW_ID)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('detects no entry point (all nodes have incoming edges)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: 'A' }, { id: 'B' }] as any);
    sqlMock.mockResolvedValueOnce([
      { source_step_id: 'A', target_step_id: 'B' },
      { source_step_id: 'B', target_step_id: 'A' },
    ] as any);

    const { validateDAG } = await import('./workflow.service.js');
    await expect(validateDAG(WORKFLOW_ID)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('validates multi-root DAG (two disconnected components)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([
      { id: 'A' },
      { id: 'B' },
      { id: 'C' },
      { id: 'D' },
    ] as any);
    sqlMock.mockResolvedValueOnce([
      { source_step_id: 'A', target_step_id: 'B' },
      { source_step_id: 'C', target_step_id: 'D' },
    ] as any);

    const { validateDAG } = await import('./workflow.service.js');
    await expect(validateDAG(WORKFLOW_ID)).resolves.toBeUndefined();
  });
});

/* ================================================================
 * Concurrent Workflow Execution Limit Enforcement
 * ================================================================ */
describe('workflow.service — concurrent execution limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows execution when active runs < max', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any); // assertWorkflowCreator
    sqlMock.mockResolvedValueOnce([{ status: 'active', max_concurrent_runs: 5 }] as any);
    // atomic CTE: count + INSERT (returns inserted row id when under limit)
    sqlMock.mockResolvedValueOnce([{ id: 'run-1' }] as any);
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([makeRunRow()] as any);

    const { executeWorkflow } = await import('./workflow.service.js');
    const result = await executeWorkflow(WORKFLOW_ID, AGENT_ID, USER_ID, {});

    expect(result.status).toBe('pending');
  });

  it('rejects when active runs = max concurrent runs', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ status: 'active', max_concurrent_runs: 3 }] as any);
    // atomic CTE returns empty when at limit
    sqlMock.mockResolvedValueOnce([] as any);

    const { executeWorkflow } = await import('./workflow.service.js');
    await expect(executeWorkflow(WORKFLOW_ID, AGENT_ID, USER_ID, {})).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Maximum concurrent runs reached',
    });
  });

  it('rejects when active runs > max concurrent runs', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ status: 'active', max_concurrent_runs: 1 }] as any);
    // atomic CTE returns empty when at limit
    sqlMock.mockResolvedValueOnce([] as any);

    const { executeWorkflow } = await import('./workflow.service.js');
    await expect(executeWorkflow(WORKFLOW_ID, AGENT_ID, USER_ID, {})).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('allows execution with max_concurrent_runs=1 when count=0', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ status: 'active', max_concurrent_runs: 1 }] as any);
    // atomic CTE: count + INSERT
    sqlMock.mockResolvedValueOnce([{ id: 'run-1' }] as any);
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([makeRunRow()] as any);

    const { executeWorkflow } = await import('./workflow.service.js');
    const result = await executeWorkflow(WORKFLOW_ID, AGENT_ID, USER_ID, {});

    expect(result.status).toBe('pending');
  });
});

/* ================================================================
 * Workflow State Transitions
 * ================================================================ */
describe('workflow.service — state transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects execution of draft workflow', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ status: 'draft', max_concurrent_runs: 1 }] as any);

    const { executeWorkflow } = await import('./workflow.service.js');
    await expect(executeWorkflow(WORKFLOW_ID, AGENT_ID, USER_ID, {})).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Workflow must be active to run',
    });
  });

  it('rejects execution of paused workflow', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ status: 'paused', max_concurrent_runs: 1 }] as any);

    const { executeWorkflow } = await import('./workflow.service.js');
    await expect(executeWorkflow(WORKFLOW_ID, AGENT_ID, USER_ID, {})).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('rejects execution of archived workflow', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ status: 'archived', max_concurrent_runs: 1 }] as any);

    const { executeWorkflow } = await import('./workflow.service.js');
    await expect(executeWorkflow(WORKFLOW_ID, AGENT_ID, USER_ID, {})).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('activation requires at least one step', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any); // no steps

    const { updateWorkflow } = await import('./workflow.service.js');
    await expect(
      updateWorkflow(WORKFLOW_ID, USER_ID, { status: 'active' }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Workflow must have at least one step to activate',
    });
  });

  it('activation with step and valid DAG succeeds', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any); // assertWorkflowCreator
    sqlMock.mockResolvedValueOnce([{ id: 'step-1' }] as any); // check steps
    // validateDAG
    sqlMock.mockResolvedValueOnce([{ id: 'step-1' }] as any); // steps
    sqlMock.mockResolvedValueOnce([] as any); // edges
    // UPDATE
    sqlMock.mockResolvedValueOnce([makeWorkflowRow({ status: 'active' })] as any);

    const { updateWorkflow } = await import('./workflow.service.js');
    const result = await updateWorkflow(WORKFLOW_ID, USER_ID, { status: 'active' });

    expect(result.status).toBe('active');
  });

  it('activation fails when DAG has cycle', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ id: 'step-1' }] as any);
    // validateDAG steps
    sqlMock.mockResolvedValueOnce([{ id: 'A' }, { id: 'B' }] as any);
    // validateDAG edges — cycle
    sqlMock.mockResolvedValueOnce([
      { source_step_id: 'A', target_step_id: 'B' },
      { source_step_id: 'B', target_step_id: 'A' },
    ] as any);

    const { updateWorkflow } = await import('./workflow.service.js');
    await expect(
      updateWorkflow(WORKFLOW_ID, USER_ID, { status: 'active' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

/* ================================================================
 * cancelRun Edge Cases
 * ================================================================ */
describe('workflow.service — cancelRun edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cancels a running run', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([makeRunRow({ status: 'running' })] as any);
    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeRunRow({ status: 'cancelled' })] as any);

    const { cancelRun } = await import('./workflow.service.js');
    const result = await cancelRun('run-1', USER_ID);

    expect(result.status).toBe('cancelled');
  });

  it('rejects cancellation of failed run', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([makeRunRow({ status: 'failed' })] as any);
    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);

    const { cancelRun } = await import('./workflow.service.js');
    await expect(cancelRun('run-1', USER_ID)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('rejects cancellation of cancelled run', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([makeRunRow({ status: 'cancelled' })] as any);
    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);

    const { cancelRun } = await import('./workflow.service.js');
    await expect(cancelRun('run-1', USER_ID)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });
});

/* ================================================================
 * Edge CRUD Advanced Cases
 * ================================================================ */
describe('workflow.service — edge creation advanced', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates edge with condition and label', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    const STEP_A = 'aa0e8400-e29b-41d4-a716-446655440010';
    const STEP_B = 'bb0e8400-e29b-41d4-a716-446655440011';

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any); // assertWorkflowCreator
    sqlMock.mockResolvedValueOnce([{ id: STEP_A }] as any); // source
    sqlMock.mockResolvedValueOnce([{ id: STEP_B }] as any); // target
    sqlMock.mockResolvedValueOnce([] as any); // INSERT
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([
      {
        id: 'edge-1',
        workflow_id: WORKFLOW_ID,
        source_step_id: STEP_A,
        target_step_id: STEP_B,
        condition: { status: 'success' },
        label: 'on-success',
        inserted_at: new Date(),
      },
    ] as any);

    const { createEdge } = await import('./workflow.service.js');
    const result = await createEdge(WORKFLOW_ID, USER_ID, {
      source_step_id: STEP_A,
      target_step_id: STEP_B,
      condition: { status: 'success' },
      label: 'on-success',
    });

    expect(result.condition).toEqual({ status: 'success' });
    expect(result.label).toBe('on-success');
  });
});

/* ================================================================
 * Step CRUD Advanced Cases
 * ================================================================ */
describe('workflow.service — step creation advanced', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates step with all optional fields', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any); // unique name check
    sqlMock.mockResolvedValueOnce([] as any); // INSERT
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([
      {
        id: 'step-new',
        workflow_id: WORKFLOW_ID,
        name: 'Complex Step',
        step_type: 'condition',
        config: { expression: 'x > 5' },
        position: 3,
        timeout_ms: 60000,
        retry_config: { max_retries: 3, delay_ms: 1000 },
        metadata: { version: 2 },
        inserted_at: new Date(),
        updated_at: new Date(),
      },
    ] as any);

    const { createStep } = await import('./workflow.service.js');
    const result = await createStep(WORKFLOW_ID, USER_ID, {
      name: 'Complex Step',
      step_type: 'condition',
      config: { expression: 'x > 5' },
      position: 3,
      timeout_ms: 60000,
      retry_config: { max_retries: 3, delay_ms: 1000 },
      metadata: { version: 2 },
    });

    expect(result.name).toBe('Complex Step');
    expect(result.step_type).toBe('condition');
    expect(result.timeout_ms).toBe(60000);
    expect(result.retry_config).toEqual({ max_retries: 3, delay_ms: 1000 });
  });

  it('default timeout is 300000ms', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([
      {
        id: 'step-default',
        workflow_id: WORKFLOW_ID,
        name: 'Default Step',
        step_type: 'prompt',
        config: {},
        position: 0,
        timeout_ms: 300000,
        retry_config: null,
        metadata: {},
        inserted_at: new Date(),
        updated_at: new Date(),
      },
    ] as any);

    const { createStep } = await import('./workflow.service.js');
    const result = await createStep(WORKFLOW_ID, USER_ID, {
      name: 'Default Step',
      step_type: 'prompt',
    });

    expect(result.timeout_ms).toBe(300000);
  });
});

/* ================================================================
 * Workflow Run with Input and Conversation
 * ================================================================ */
describe('workflow.service — executeWorkflow with input', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes input to the workflow run', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ status: 'active', max_concurrent_runs: 10 }] as any);
    // atomic CTE: count + INSERT
    sqlMock.mockResolvedValueOnce([{ id: 'run-1' }] as any);
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([
      makeRunRow({ input: { key: 'value' } }),
    ] as any);

    const { executeWorkflow } = await import('./workflow.service.js');
    const result = await executeWorkflow(WORKFLOW_ID, AGENT_ID, USER_ID, {
      input: { key: 'value' },
    });

    expect(result.input).toEqual({ key: 'value' });
  });

  it('passes conversation_id to the workflow run', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    const convId = 'cc0e8400-e29b-41d4-a716-446655440099';

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ status: 'active', max_concurrent_runs: 10 }] as any);
    // atomic CTE: count + INSERT
    sqlMock.mockResolvedValueOnce([{ id: 'run-1' }] as any);
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([
      makeRunRow({ conversation_id: convId }),
    ] as any);

    const { executeWorkflow } = await import('./workflow.service.js');
    const result = await executeWorkflow(WORKFLOW_ID, AGENT_ID, USER_ID, {
      conversation_id: convId,
    });

    expect(result.conversation_id).toBe(convId);
  });
});

/* ================================================================
 * listRuns
 * ================================================================ */
describe('workflow.service — listRuns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no runs exist', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([] as any);

    const { listRuns } = await import('./workflow.service.js');
    const results = await listRuns(WORKFLOW_ID, USER_ID);

    expect(results).toHaveLength(0);
  });

  it('returns multiple runs', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([
      makeRunRow({ id: 'run-1', status: 'completed' }),
      makeRunRow({ id: 'run-2', status: 'running' }),
    ] as any);

    const { listRuns } = await import('./workflow.service.js');
    const results = await listRuns(WORKFLOW_ID, USER_ID);

    expect(results).toHaveLength(2);
  });
});

/* ================================================================
 * Workflow Metadata Updates
 * ================================================================ */
describe('workflow.service — metadata and optional fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates workflow description', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    sqlMock.mockResolvedValueOnce([
      makeWorkflowRow({ description: 'Updated description' }),
    ] as any);

    const { updateWorkflow } = await import('./workflow.service.js');
    const result = await updateWorkflow(WORKFLOW_ID, USER_ID, {
      description: 'Updated description',
    });

    expect(result.description).toBe('Updated description');
  });

  it('updates workflow max_concurrent_runs', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeWorkflowRow({ max_concurrent_runs: 10 })] as any);

    const { updateWorkflow } = await import('./workflow.service.js');
    const result = await updateWorkflow(WORKFLOW_ID, USER_ID, { max_concurrent_runs: 10 });

    expect(result.max_concurrent_runs).toBe(10);
  });

  it('updates workflow metadata', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: WORKFLOW_ID }] as any);
    sqlMock.mockResolvedValueOnce([
      makeWorkflowRow({ metadata: { env: 'production', v: 3 } }),
    ] as any);

    const { updateWorkflow } = await import('./workflow.service.js');
    const result = await updateWorkflow(WORKFLOW_ID, USER_ID, {
      metadata: { env: 'production', v: 3 },
    });

    expect(result.metadata).toEqual({ env: 'production', v: 3 });
  });
});
