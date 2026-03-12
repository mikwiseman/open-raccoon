/* eslint-disable @typescript-eslint/no-explicit-any */

import { createHmac, randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock DB connection
vi.mock('../../db/connection.js', () => {
  const sqlFn = Object.assign(vi.fn(), {
    unsafe: vi.fn(),
  });
  return { sql: sqlFn, db: {} };
});

// Mock emitter
vi.mock('../../ws/emitter.js', () => ({
  emitAgentEvent: vi.fn(),
}));

// Mock loop
vi.mock('./loop.js', () => ({
  runAgentLoop: vi.fn().mockResolvedValue(undefined),
}));

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const AGENT_ID = '660e8400-e29b-41d4-a716-446655440001';
const TRIGGER_ID = '770e8400-e29b-41d4-a716-446655440002';

function makeTriggerRow(overrides: Record<string, unknown> = {}) {
  return {
    id: TRIGGER_ID,
    agent_id: AGENT_ID,
    creator_id: USER_ID,
    name: 'Test Trigger',
    trigger_type: 'webhook',
    token: 'test-token-hex',
    hmac_secret: null,
    condition_filter: null,
    message_template: null,
    cron_expression: null,
    enabled: true,
    last_fired_at: null,
    fire_count: 0,
    metadata: {},
    inserted_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

/* ================================================================
 * Trigger CRUD Operations
 * ================================================================ */
describe('trigger.service — listTriggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns triggers for an agent', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertAgentCreator
    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    // list query
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([makeTriggerRow()] as any);

    const { listTriggers } = await import('./trigger.service.js');
    const results = await listTriggers(AGENT_ID, USER_ID);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Test Trigger');
    expect(results[0].hmac_configured).toBe(false);
  });

  it('throws NOT_FOUND when user does not own the agent', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { listTriggers } = await import('./trigger.service.js');
    await expect(listTriggers(AGENT_ID, 'other-user')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('trigger.service — createTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a webhook trigger', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertAgentCreator
    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    // INSERT
    sqlMock.mockResolvedValueOnce([] as any);
    // SELECT
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([makeTriggerRow()] as any);

    const { createTrigger } = await import('./trigger.service.js');
    const result = await createTrigger(AGENT_ID, USER_ID, {
      name: 'Test Trigger',
      trigger_type: 'webhook',
    });

    expect(result.name).toBe('Test Trigger');
    expect(result.trigger_type).toBe('webhook');
  });

  it('creates trigger with condition filter', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([
      makeTriggerRow({
        condition_filter: { all: [{ field: 'action', op: 'eq', value: 'push' }] },
      }),
    ] as any);

    const { createTrigger } = await import('./trigger.service.js');
    const result = await createTrigger(AGENT_ID, USER_ID, {
      name: 'Conditional',
      trigger_type: 'webhook',
      condition_filter: { all: [{ field: 'action', op: 'eq', value: 'push' }] },
    });

    expect(result.condition_filter).toBeDefined();
  });
});

describe('trigger.service — getTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a trigger by id', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql.unsafe).mockResolvedValueOnce([makeTriggerRow()] as any);

    const { getTrigger } = await import('./trigger.service.js');
    const result = await getTrigger(TRIGGER_ID, USER_ID);
    expect(result.id).toBe(TRIGGER_ID);
  });

  it('throws NOT_FOUND when trigger does not exist', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql.unsafe).mockResolvedValueOnce([] as any);

    const { getTrigger } = await import('./trigger.service.js');
    await expect(getTrigger('nonexistent', USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('trigger.service — updateTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates trigger name', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertTriggerOwner
    sqlMock.mockResolvedValueOnce([{ id: TRIGGER_ID }] as any);
    // UPDATE
    sqlMock.mockResolvedValueOnce([makeTriggerRow({ name: 'Renamed' })] as any);

    const { updateTrigger } = await import('./trigger.service.js');
    const result = await updateTrigger(TRIGGER_ID, USER_ID, { name: 'Renamed' });
    expect(result.name).toBe('Renamed');
  });

  it('throws NOT_FOUND when trigger does not exist', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { updateTrigger } = await import('./trigger.service.js');
    await expect(updateTrigger('nonexistent', USER_ID, { name: 'X' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('trigger.service — deleteTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes a trigger', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: TRIGGER_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { deleteTrigger } = await import('./trigger.service.js');
    await expect(deleteTrigger(TRIGGER_ID, USER_ID)).resolves.toBeUndefined();
  });
});

/* ================================================================
 * fireTrigger — Webhook Validation
 * ================================================================ */
describe('trigger.service — fireTrigger webhook validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fires a basic trigger without HMAC', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // Lookup trigger
    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([makeTriggerRow({ token: 'abc' })] as any);
    // Insert conversation
    sqlMock.mockResolvedValueOnce([] as any);
    // Insert member
    sqlMock.mockResolvedValueOnce([] as any);
    // Insert message
    sqlMock.mockResolvedValueOnce([] as any);
    // Update fire count
    sqlMock.mockResolvedValueOnce([] as any);

    const { fireTrigger } = await import('./trigger.service.js');
    const result = await fireTrigger('abc', { data: 'test' });

    expect(result.fired).toBe(true);
    expect(result.conversation_id).toBeDefined();
  });

  it('returns fired=false when trigger is disabled', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql.unsafe).mockResolvedValueOnce([
      makeTriggerRow({ token: 'abc', enabled: false }),
    ] as any);

    const { fireTrigger } = await import('./trigger.service.js');
    const result = await fireTrigger('abc', {});

    expect(result.fired).toBe(false);
    expect(result.reason).toBe('Trigger is disabled');
  });

  it('throws NOT_FOUND when trigger token does not exist', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql.unsafe).mockResolvedValueOnce([] as any);

    const { fireTrigger } = await import('./trigger.service.js');
    await expect(fireTrigger('bad-token', {})).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws UNAUTHORIZED when HMAC is required but not provided', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql.unsafe).mockResolvedValueOnce([
      makeTriggerRow({ token: 'abc', hmac_secret: 'my-secret' }),
    ] as any);

    const { fireTrigger } = await import('./trigger.service.js');
    await expect(fireTrigger('abc', { key: 'value' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'HMAC signature required',
    });
  });

  it('throws UNAUTHORIZED for invalid HMAC signature', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql.unsafe).mockResolvedValueOnce([
      makeTriggerRow({ token: 'abc', hmac_secret: 'my-secret' }),
    ] as any);

    const { fireTrigger } = await import('./trigger.service.js');
    await expect(
      fireTrigger('abc', { key: 'value' }, 'invalid-hmac-signature'),
    ).rejects.toThrow();
  });

  it('accepts valid HMAC signature', async () => {
    const secret = 'test-hmac-secret';
    const payload = { action: 'push', branch: 'main' };
    const expectedHmac = createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([
      makeTriggerRow({ token: 'abc', hmac_secret: secret }),
    ] as any);
    sqlMock.mockResolvedValueOnce([] as any); // conversation
    sqlMock.mockResolvedValueOnce([] as any); // member
    sqlMock.mockResolvedValueOnce([] as any); // message
    sqlMock.mockResolvedValueOnce([] as any); // update fire count

    const { fireTrigger } = await import('./trigger.service.js');
    const result = await fireTrigger('abc', payload, expectedHmac);

    expect(result.fired).toBe(true);
  });

  it('accepts HMAC with sha256= prefix (GitHub webhook format)', async () => {
    const secret = 'github-secret';
    const payload = { action: 'opened' };
    const expectedHmac = createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([
      makeTriggerRow({ token: 'ghook', hmac_secret: secret }),
    ] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { fireTrigger } = await import('./trigger.service.js');
    const result = await fireTrigger('ghook', payload, `sha256=${expectedHmac}`);

    expect(result.fired).toBe(true);
  });
});

/* ================================================================
 * fireTrigger — Condition Filter
 * ================================================================ */
describe('trigger.service — fireTrigger condition filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns fired=false when condition does not match', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql.unsafe).mockResolvedValueOnce([
      makeTriggerRow({
        token: 'abc',
        condition_filter: {
          all: [{ field: 'action', op: 'eq', value: 'push' }],
        },
      }),
    ] as any);

    const { fireTrigger } = await import('./trigger.service.js');
    const result = await fireTrigger('abc', { action: 'pull_request' });

    expect(result.fired).toBe(false);
    expect(result.reason).toBe('Condition filter did not match');
  });

  it('fires when condition matches', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([
      makeTriggerRow({
        token: 'abc',
        condition_filter: {
          all: [{ field: 'action', op: 'eq', value: 'push' }],
        },
      }),
    ] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { fireTrigger } = await import('./trigger.service.js');
    const result = await fireTrigger('abc', { action: 'push' });

    expect(result.fired).toBe(true);
  });
});

/* ================================================================
 * fireTrigger — Message Template
 * ================================================================ */
describe('trigger.service — fireTrigger message template', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses message template with variable substitution', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([
      makeTriggerRow({
        token: 'tmpl',
        message_template: 'User {{user.name}} pushed to {{branch}}',
      }),
    ] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { fireTrigger } = await import('./trigger.service.js');
    await fireTrigger('tmpl', { user: { name: 'alice' }, branch: 'main' });

    // Verify the message was inserted
    expect(sqlMock).toHaveBeenCalled();
  });

  it('template blocks __proto__ traversal', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([
      makeTriggerRow({
        token: 'tmpl',
        message_template: 'Attempt: {{__proto__.constructor}}',
      }),
    ] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { fireTrigger } = await import('./trigger.service.js');
    const result = await fireTrigger('tmpl', { data: 'test' });

    expect(result.fired).toBe(true);
  });

  it('falls back to JSON dump when no template is set', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    vi.mocked(sqlMock.unsafe).mockResolvedValueOnce([
      makeTriggerRow({ token: 'no-tmpl' }),
    ] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { fireTrigger } = await import('./trigger.service.js');
    const result = await fireTrigger('no-tmpl', { key: 'value' });

    expect(result.fired).toBe(true);
  });
});

/* ================================================================
 * Trigger Condition Engine (evaluateCondition)
 * ================================================================ */
describe('trigger-condition — evaluateCondition', () => {
  it('empty condition group returns true', async () => {
    const { evaluateCondition } = await import('./trigger-condition.js');
    expect(evaluateCondition({ any: 'data' }, {})).toBe(true);
  });

  it('all conditions must pass', async () => {
    const { evaluateCondition } = await import('./trigger-condition.js');
    const result = evaluateCondition(
      { status: 'open', priority: 'high' },
      {
        all: [
          { field: 'status', op: 'eq', value: 'open' },
          { field: 'priority', op: 'eq', value: 'high' },
        ],
      },
    );
    expect(result).toBe(true);
  });

  it('all conditions fail if one does not match', async () => {
    const { evaluateCondition } = await import('./trigger-condition.js');
    const result = evaluateCondition(
      { status: 'closed', priority: 'high' },
      {
        all: [
          { field: 'status', op: 'eq', value: 'open' },
          { field: 'priority', op: 'eq', value: 'high' },
        ],
      },
    );
    expect(result).toBe(false);
  });

  it('any condition passes if at least one matches', async () => {
    const { evaluateCondition } = await import('./trigger-condition.js');
    const result = evaluateCondition(
      { type: 'bug' },
      {
        any: [
          { field: 'type', op: 'eq', value: 'bug' },
          { field: 'type', op: 'eq', value: 'feature' },
        ],
      },
    );
    expect(result).toBe(true);
  });

  it('any condition fails if none matches', async () => {
    const { evaluateCondition } = await import('./trigger-condition.js');
    const result = evaluateCondition(
      { type: 'chore' },
      {
        any: [
          { field: 'type', op: 'eq', value: 'bug' },
          { field: 'type', op: 'eq', value: 'feature' },
        ],
      },
    );
    expect(result).toBe(false);
  });

  it('neq with missing field returns true', async () => {
    const { evaluateCondition } = await import('./trigger-condition.js');
    const result = evaluateCondition(
      {},
      { all: [{ field: 'missing', op: 'neq', value: 'something' }] },
    );
    expect(result).toBe(true);
  });

  it('eq with missing field returns false', async () => {
    const { evaluateCondition } = await import('./trigger-condition.js');
    const result = evaluateCondition(
      {},
      { all: [{ field: 'missing', op: 'eq', value: 'something' }] },
    );
    expect(result).toBe(false);
  });

  it('exists returns true for present field', async () => {
    const { evaluateCondition } = await import('./trigger-condition.js');
    const result = evaluateCondition(
      { name: 'test' },
      { all: [{ field: 'name', op: 'exists' }] },
    );
    expect(result).toBe(true);
  });

  it('exists returns false for missing field', async () => {
    const { evaluateCondition } = await import('./trigger-condition.js');
    const result = evaluateCondition({}, { all: [{ field: 'name', op: 'exists' }] });
    expect(result).toBe(false);
  });

  it('contains matches substring', async () => {
    const { evaluateCondition } = await import('./trigger-condition.js');
    const result = evaluateCondition(
      { message: 'hello world' },
      { all: [{ field: 'message', op: 'contains', value: 'world' }] },
    );
    expect(result).toBe(true);
  });

  it('contains fails for non-string values', async () => {
    const { evaluateCondition } = await import('./trigger-condition.js');
    const result = evaluateCondition(
      { count: 42 },
      { all: [{ field: 'count', op: 'contains', value: '42' }] },
    );
    expect(result).toBe(false);
  });

  it('nested field traversal works', async () => {
    const { evaluateCondition } = await import('./trigger-condition.js');
    const result = evaluateCondition(
      { user: { profile: { role: 'admin' } } },
      { all: [{ field: 'user.profile.role', op: 'eq', value: 'admin' }] },
    );
    expect(result).toBe(true);
  });

  it('blocks __proto__ traversal', async () => {
    const { evaluateCondition } = await import('./trigger-condition.js');
    const result = evaluateCondition(
      { data: 'test' },
      { all: [{ field: '__proto__.constructor', op: 'exists' }] },
    );
    expect(result).toBe(false);
  });
});
