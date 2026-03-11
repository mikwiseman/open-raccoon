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

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_USER_ID = '660e8400-e29b-41d4-a716-446655440001';
const AGENT_ID = '880e8400-e29b-41d4-a716-446655440003';
const MEMORY_ID = 'bb0e8400-e29b-41d4-a716-446655440020';

function makeMemoryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: MEMORY_ID,
    agent_id: AGENT_ID,
    user_id: USER_ID,
    memory_type: 'fact',
    content: 'The user prefers dark mode',
    embedding_key: null,
    importance: 0.7,
    access_count: 0,
    last_accessed_at: null,
    expires_at: null,
    metadata: {},
    inserted_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

/* -------------------------------------------------------------------------- */
/*  listMemories                                                              */
/* -------------------------------------------------------------------------- */

describe('memory.service — listMemories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns formatted memories for the user', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. assertAgentOwner
    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    // 2. SELECT memories
    sqlMock.mockResolvedValueOnce([makeMemoryRow()] as any);

    const { listMemories } = await import('./memory.service.js');
    const memories = await listMemories(AGENT_ID, USER_ID);

    expect(memories).toHaveLength(1);
    expect(memories[0].id).toBe(MEMORY_ID);
    expect(memories[0].content).toBe('The user prefers dark mode');
    expect(memories[0].created_at).toBe(new Date('2026-01-01').toISOString());
  });

  it('returns empty array when no memories exist', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { listMemories } = await import('./memory.service.js');
    const memories = await listMemories(AGENT_ID, USER_ID);

    expect(memories).toHaveLength(0);
  });

  it('throws NOT_FOUND when user does not own the agent', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { listMemories } = await import('./memory.service.js');
    await expect(listMemories(AGENT_ID, OTHER_USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('passes filter options correctly', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeMemoryRow({ memory_type: 'preference' })] as any);

    const { listMemories } = await import('./memory.service.js');
    const memories = await listMemories(AGENT_ID, USER_ID, {
      type: 'preference',
      search: 'dark',
      minImportance: 0.5,
    });

    expect(memories).toHaveLength(1);
    expect(memories[0].memory_type).toBe('preference');
  });
});

/* -------------------------------------------------------------------------- */
/*  createMemory                                                              */
/* -------------------------------------------------------------------------- */

describe('memory.service — createMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a memory with required fields', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. assertAgentOwner
    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    // 2. INSERT memory
    sqlMock.mockResolvedValueOnce([] as any);
    // 3. SELECT created memory
    sqlMock.mockResolvedValueOnce([makeMemoryRow()] as any);

    const { createMemory } = await import('./memory.service.js');
    const result = await createMemory(AGENT_ID, USER_ID, {
      memory_type: 'fact',
      content: 'The user prefers dark mode',
    });

    expect(result.id).toBe(MEMORY_ID);
    expect(result.content).toBe('The user prefers dark mode');
    expect(result.memory_type).toBe('fact');
  });

  it('creates a memory with all optional fields', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([
      makeMemoryRow({
        memory_type: 'preference',
        importance: 0.9,
        embedding_key: 'emb-123',
        expires_at: new Date('2027-01-01'),
        metadata: { source: 'chat' },
      }),
    ] as any);

    const { createMemory } = await import('./memory.service.js');
    const result = await createMemory(AGENT_ID, USER_ID, {
      memory_type: 'preference',
      content: 'Likes TypeScript',
      importance: 0.9,
      embedding_key: 'emb-123',
      expires_at: '2027-01-01T00:00:00.000Z',
      metadata: { source: 'chat' },
    });

    expect(result.memory_type).toBe('preference');
    expect(result.importance).toBe(0.9);
    expect(result.embedding_key).toBe('emb-123');
  });

  it('throws NOT_FOUND when user does not own the agent', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { createMemory } = await import('./memory.service.js');
    await expect(
      createMemory(AGENT_ID, OTHER_USER_ID, {
        memory_type: 'fact',
        content: 'Test',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('defaults importance to 0.5 when not provided', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([makeMemoryRow({ importance: 0.5 })] as any);

    const { createMemory } = await import('./memory.service.js');
    const result = await createMemory(AGENT_ID, USER_ID, {
      memory_type: 'fact',
      content: 'Default importance test',
    });

    expect(result.importance).toBe(0.5);
  });
});

/* -------------------------------------------------------------------------- */
/*  getMemory                                                                 */
/* -------------------------------------------------------------------------- */

describe('memory.service — getMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the memory for the owner', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([makeMemoryRow()] as any);

    const { getMemory } = await import('./memory.service.js');
    const memory = await getMemory(MEMORY_ID, USER_ID);

    expect(memory.id).toBe(MEMORY_ID);
    expect(memory.content).toBe('The user prefers dark mode');
  });

  it('throws NOT_FOUND for non-existent memory', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { getMemory } = await import('./memory.service.js');
    await expect(getMemory('nonexistent-id', USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws NOT_FOUND when non-owner tries to access', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { getMemory } = await import('./memory.service.js');
    await expect(getMemory(MEMORY_ID, OTHER_USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

/* -------------------------------------------------------------------------- */
/*  updateMemory                                                              */
/* -------------------------------------------------------------------------- */

describe('memory.service — updateMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates memory content', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. assertMemoryOwner
    sqlMock.mockResolvedValueOnce([{ id: MEMORY_ID }] as any);
    // 2. UPDATE RETURNING
    sqlMock.mockResolvedValueOnce([makeMemoryRow({ content: 'Updated content' })] as any);

    const { updateMemory } = await import('./memory.service.js');
    const result = await updateMemory(MEMORY_ID, USER_ID, { content: 'Updated content' });

    expect(result.content).toBe('Updated content');
  });

  it('updates memory importance', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: MEMORY_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeMemoryRow({ importance: 0.9 })] as any);

    const { updateMemory } = await import('./memory.service.js');
    const result = await updateMemory(MEMORY_ID, USER_ID, { importance: 0.9 });

    expect(result.importance).toBe(0.9);
  });

  it('updates memory type', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: MEMORY_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeMemoryRow({ memory_type: 'preference' })] as any);

    const { updateMemory } = await import('./memory.service.js');
    const result = await updateMemory(MEMORY_ID, USER_ID, { memory_type: 'preference' });

    expect(result.memory_type).toBe('preference');
  });

  it('throws NOT_FOUND when non-owner tries to update', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { updateMemory } = await import('./memory.service.js');
    await expect(
      updateMemory(MEMORY_ID, OTHER_USER_ID, { content: 'Hacked' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('clears embedding_key when set to null', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: MEMORY_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeMemoryRow({ embedding_key: null })] as any);

    const { updateMemory } = await import('./memory.service.js');
    const result = await updateMemory(MEMORY_ID, USER_ID, { embedding_key: null });

    expect(result.embedding_key).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/*  deleteMemory                                                              */
/* -------------------------------------------------------------------------- */

describe('memory.service — deleteMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes a memory', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. assertMemoryOwner
    sqlMock.mockResolvedValueOnce([{ id: MEMORY_ID }] as any);
    // 2. DELETE
    sqlMock.mockResolvedValueOnce([] as any);

    const { deleteMemory } = await import('./memory.service.js');
    await deleteMemory(MEMORY_ID, USER_ID);

    expect(sqlMock).toHaveBeenCalledTimes(2);
  });

  it('throws NOT_FOUND when non-owner tries to delete', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { deleteMemory } = await import('./memory.service.js');
    await expect(deleteMemory(MEMORY_ID, OTHER_USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

/* -------------------------------------------------------------------------- */
/*  bulkDeleteMemories                                                        */
/* -------------------------------------------------------------------------- */

describe('memory.service — bulkDeleteMemories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes all memories for an agent', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { bulkDeleteMemories } = await import('./memory.service.js');
    await bulkDeleteMemories(AGENT_ID, USER_ID);

    expect(sqlMock).toHaveBeenCalledTimes(2);
  });

  it('deletes memories filtered by type', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { bulkDeleteMemories } = await import('./memory.service.js');
    await bulkDeleteMemories(AGENT_ID, USER_ID, 'fact');

    expect(sqlMock).toHaveBeenCalledTimes(2);
  });

  it('throws NOT_FOUND when user does not own the agent', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { bulkDeleteMemories } = await import('./memory.service.js');
    await expect(bulkDeleteMemories(AGENT_ID, OTHER_USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

/* -------------------------------------------------------------------------- */
/*  recallMemories                                                            */
/* -------------------------------------------------------------------------- */

describe('memory.service — recallMemories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ranked memories and updates access counts', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. assertAgentOwner
    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    // 2. SELECT with relevance_score
    sqlMock.mockResolvedValueOnce([
      makeMemoryRow({ relevance_score: 0.8 }),
      makeMemoryRow({ id: 'mem-2', content: 'Another memory', relevance_score: 0.5 }),
    ] as any);
    // 3. UPDATE access_count
    sqlMock.mockResolvedValueOnce([] as any);

    const { recallMemories } = await import('./memory.service.js');
    const memories = await recallMemories(AGENT_ID, USER_ID, 'dark mode');

    expect(memories).toHaveLength(2);
    expect(memories[0].id).toBe(MEMORY_ID);
  });

  it('returns empty array when no memories match', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { recallMemories } = await import('./memory.service.js');
    const memories = await recallMemories(AGENT_ID, USER_ID, 'nonexistent query');

    expect(memories).toHaveLength(0);
  });

  it('recalls without query (returns top memories)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeMemoryRow()] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { recallMemories } = await import('./memory.service.js');
    const memories = await recallMemories(AGENT_ID, USER_ID, undefined);

    expect(memories).toHaveLength(1);
  });

  it('throws NOT_FOUND when user does not own the agent', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { recallMemories } = await import('./memory.service.js');
    await expect(recallMemories(AGENT_ID, OTHER_USER_ID, 'test')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('respects limit parameter', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeMemoryRow()] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { recallMemories } = await import('./memory.service.js');
    const memories = await recallMemories(AGENT_ID, USER_ID, undefined, 5);

    expect(memories).toHaveLength(1);
  });
});

/* -------------------------------------------------------------------------- */
/*  decayMemories                                                             */
/* -------------------------------------------------------------------------- */

describe('memory.service — decayMemories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs decay query without error', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([] as any);

    const { decayMemories } = await import('./memory.service.js');
    await decayMemories();

    expect(sqlMock).toHaveBeenCalledTimes(1);
  });
});

/* -------------------------------------------------------------------------- */
/*  deleteExpiredMemories                                                     */
/* -------------------------------------------------------------------------- */

describe('memory.service — deleteExpiredMemories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs cleanup query without error', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([] as any);

    const { deleteExpiredMemories } = await import('./memory.service.js');
    await deleteExpiredMemories();

    expect(sqlMock).toHaveBeenCalledTimes(1);
  });
});
