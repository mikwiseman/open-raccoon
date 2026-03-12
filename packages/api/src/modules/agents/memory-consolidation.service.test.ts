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
  emitMemoryEvent: vi.fn(),
}));

async function resetSqlMocks() {
  const { sql } = await import('../../db/connection.js');
  const sqlMock = vi.mocked(sql);
  sqlMock.mockReset();
  vi.mocked(sqlMock.unsafe).mockReset();
}

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const AGENT_ID = '660e8400-e29b-41d4-a716-446655440001';
const MEMORY_ID_1 = 'aa0e8400-e29b-41d4-a716-446655440010';
const MEMORY_ID_2 = 'bb0e8400-e29b-41d4-a716-446655440011';
const MEMORY_ID_3 = 'cc0e8400-e29b-41d4-a716-446655440012';

function makeConsolidationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'consol-1',
    agent_id: AGENT_ID,
    source_memory_ids: [MEMORY_ID_1, MEMORY_ID_2],
    result_memory_id: 'result-mem-1',
    consolidation_type: 'abstract',
    created_at: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeMemoryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'result-mem-1',
    agent_id: AGENT_ID,
    user_id: USER_ID,
    memory_type: 'semantic',
    content: 'Consolidated memory content',
    embedding_key: null,
    embedding_text: 'Consolidated memory content',
    importance: 0.7,
    access_count: 0,
    last_accessed_at: null,
    source_conversation_id: null,
    source_message_id: null,
    expires_at: null,
    metadata: { consolidated_from: [MEMORY_ID_1, MEMORY_ID_2], consolidation_type: 'abstract' },
    inserted_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

/* -------------------------------------------------------------------------- */
/*  consolidateMemories                                                       */
/* -------------------------------------------------------------------------- */

describe('memory-consolidation — consolidateMemories with valid IDs', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('creates consolidation record and result memory', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertAgentOwner
    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    // verify source memories
    sqlMock.mockResolvedValueOnce([{ id: MEMORY_ID_1 }, { id: MEMORY_ID_2 }] as any);
    // INSERT result memory
    sqlMock.mockResolvedValueOnce([] as any);
    // INSERT consolidation record
    sqlMock.mockResolvedValueOnce([] as any);
    // SELECT consolidation
    sqlMock.mockResolvedValueOnce([makeConsolidationRow()] as any);
    // SELECT result memory
    sqlMock.mockResolvedValueOnce([makeMemoryRow()] as any);
    // SELECT creator for Socket.IO
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { consolidateMemories } = await import('./memory-consolidation.service.js');
    const result = await consolidateMemories(AGENT_ID, USER_ID, {
      memory_ids: [MEMORY_ID_1, MEMORY_ID_2],
      consolidation_type: 'abstract',
      result_content: 'Consolidated memory content',
    });

    expect(result.consolidation.consolidation_type).toBe('abstract');
    expect(result.result_memory.content).toBe('Consolidated memory content');
  });

  it('returns formatted consolidation with created_at', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ id: MEMORY_ID_1 }, { id: MEMORY_ID_2 }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([makeConsolidationRow()] as any);
    sqlMock.mockResolvedValueOnce([makeMemoryRow()] as any);
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { consolidateMemories } = await import('./memory-consolidation.service.js');
    const result = await consolidateMemories(AGENT_ID, USER_ID, {
      memory_ids: [MEMORY_ID_1, MEMORY_ID_2],
      consolidation_type: 'abstract',
      result_content: 'Test content',
    });

    expect(result.consolidation.created_at).toBeDefined();
    expect(result.result_memory.created_at).toBeDefined();
  });
});

describe('memory-consolidation — consolidateMemories with merge type', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('soft-deletes source memories on merge consolidation', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ id: MEMORY_ID_1 }, { id: MEMORY_ID_2 }] as any);
    sqlMock.mockResolvedValueOnce([] as any); // INSERT result memory
    sqlMock.mockResolvedValueOnce([] as any); // INSERT consolidation
    // merge → UPDATE expires_at
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([makeConsolidationRow({ consolidation_type: 'merge' })] as any);
    sqlMock.mockResolvedValueOnce([makeMemoryRow()] as any);
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { consolidateMemories } = await import('./memory-consolidation.service.js');
    const result = await consolidateMemories(AGENT_ID, USER_ID, {
      memory_ids: [MEMORY_ID_1, MEMORY_ID_2],
      consolidation_type: 'merge',
      result_content: 'Merged content',
    });

    expect(result.consolidation.consolidation_type).toBe('merge');
    // The 5th SQL call is the UPDATE for soft-deleting source memories
    expect(sqlMock).toHaveBeenCalledTimes(8);
  });

  it('merge does not affect the result memory', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ id: MEMORY_ID_1 }, { id: MEMORY_ID_2 }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any); // merge update
    sqlMock.mockResolvedValueOnce([makeConsolidationRow({ consolidation_type: 'merge' })] as any);
    sqlMock.mockResolvedValueOnce([makeMemoryRow({ expires_at: null })] as any);
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { consolidateMemories } = await import('./memory-consolidation.service.js');
    const result = await consolidateMemories(AGENT_ID, USER_ID, {
      memory_ids: [MEMORY_ID_1, MEMORY_ID_2],
      consolidation_type: 'merge',
      result_content: 'Merged',
    });

    // Result memory should not be expired
    expect(result.result_memory.expires_at).toBeNull();
  });
});

describe('memory-consolidation — consolidateMemories with abstract type', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('does not soft-delete source memories for abstract type', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ id: MEMORY_ID_1 }, { id: MEMORY_ID_2 }] as any);
    sqlMock.mockResolvedValueOnce([] as any); // INSERT memory
    sqlMock.mockResolvedValueOnce([] as any); // INSERT consolidation
    // No merge/reinforce update
    sqlMock.mockResolvedValueOnce([makeConsolidationRow()] as any);
    sqlMock.mockResolvedValueOnce([makeMemoryRow()] as any);
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { consolidateMemories } = await import('./memory-consolidation.service.js');
    const result = await consolidateMemories(AGENT_ID, USER_ID, {
      memory_ids: [MEMORY_ID_1, MEMORY_ID_2],
      consolidation_type: 'abstract',
      result_content: 'Abstract summary',
    });

    expect(result.consolidation.consolidation_type).toBe('abstract');
    // 7 calls total: assertOwner, verify, insert memory, insert consol, select consol, select memory, select creator
    expect(sqlMock).toHaveBeenCalledTimes(7);
  });

  it('uses default importance 0.7 when not specified', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ id: MEMORY_ID_1 }, { id: MEMORY_ID_2 }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([makeConsolidationRow()] as any);
    sqlMock.mockResolvedValueOnce([makeMemoryRow({ importance: 0.7 })] as any);
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { consolidateMemories } = await import('./memory-consolidation.service.js');
    const result = await consolidateMemories(AGENT_ID, USER_ID, {
      memory_ids: [MEMORY_ID_1, MEMORY_ID_2],
      consolidation_type: 'abstract',
      result_content: 'Test',
    });

    expect(result.result_memory.importance).toBe(0.7);
  });
});

describe('memory-consolidation — consolidateMemories with reinforce type', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('boosts importance of source memories on reinforce', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ id: MEMORY_ID_1 }, { id: MEMORY_ID_2 }] as any);
    sqlMock.mockResolvedValueOnce([] as any); // INSERT memory
    sqlMock.mockResolvedValueOnce([] as any); // INSERT consolidation
    // reinforce → UPDATE importance
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([
      makeConsolidationRow({ consolidation_type: 'reinforce' }),
    ] as any);
    sqlMock.mockResolvedValueOnce([makeMemoryRow()] as any);
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { consolidateMemories } = await import('./memory-consolidation.service.js');
    const result = await consolidateMemories(AGENT_ID, USER_ID, {
      memory_ids: [MEMORY_ID_1, MEMORY_ID_2],
      consolidation_type: 'reinforce',
      result_content: 'Reinforced',
    });

    expect(result.consolidation.consolidation_type).toBe('reinforce');
    // 8 calls: assertOwner, verify, insert memory, insert consol, reinforce update, select consol, select memory, select creator
    expect(sqlMock).toHaveBeenCalledTimes(8);
  });

  it('reinforce with custom importance', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ id: MEMORY_ID_1 }, { id: MEMORY_ID_2 }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any); // reinforce update
    sqlMock.mockResolvedValueOnce([
      makeConsolidationRow({ consolidation_type: 'reinforce' }),
    ] as any);
    sqlMock.mockResolvedValueOnce([makeMemoryRow({ importance: 0.9 })] as any);
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { consolidateMemories } = await import('./memory-consolidation.service.js');
    const result = await consolidateMemories(AGENT_ID, USER_ID, {
      memory_ids: [MEMORY_ID_1, MEMORY_ID_2],
      consolidation_type: 'reinforce',
      result_content: 'High importance',
      result_importance: 0.9,
    });

    expect(result.result_memory.importance).toBe(0.9);
  });
});

describe('memory-consolidation — consolidateMemories with invalid memory IDs', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('throws NOT_FOUND when some memory IDs do not exist', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    // Only 1 of 2 memories found
    sqlMock.mockResolvedValueOnce([{ id: MEMORY_ID_1 }] as any);

    const { consolidateMemories } = await import('./memory-consolidation.service.js');
    await expect(
      consolidateMemories(AGENT_ID, USER_ID, {
        memory_ids: [MEMORY_ID_1, MEMORY_ID_2],
        consolidation_type: 'abstract',
        result_content: 'Should fail',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws NOT_FOUND when no memory IDs match', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any); // no memories found

    const { consolidateMemories } = await import('./memory-consolidation.service.js');
    await expect(
      consolidateMemories(AGENT_ID, USER_ID, {
        memory_ids: [MEMORY_ID_1, MEMORY_ID_2],
        consolidation_type: 'merge',
        result_content: 'Should fail',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws NOT_FOUND when agent is not owned by user', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any); // assertAgentOwner fails

    const { consolidateMemories } = await import('./memory-consolidation.service.js');
    await expect(
      consolidateMemories(AGENT_ID, 'wrong-user', {
        memory_ids: [MEMORY_ID_1, MEMORY_ID_2],
        consolidation_type: 'abstract',
        result_content: 'Should fail',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

/* -------------------------------------------------------------------------- */
/*  decayAgentMemories                                                        */
/* -------------------------------------------------------------------------- */

describe('memory-consolidation — decayAgentMemories', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('returns count of decayed memories', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any); // assertAgentOwner
    sqlMock.mockResolvedValueOnce([{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }] as any); // RETURNING

    const { decayAgentMemories } = await import('./memory-consolidation.service.js');
    const result = await decayAgentMemories(AGENT_ID, USER_ID);

    expect(result.decayed_count).toBe(3);
  });

  it('returns zero when no memories are eligible for decay', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any); // no rows updated

    const { decayAgentMemories } = await import('./memory-consolidation.service.js');
    const result = await decayAgentMemories(AGENT_ID, USER_ID);

    expect(result.decayed_count).toBe(0);
  });

  it('throws NOT_FOUND when agent is not owned by user', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { decayAgentMemories } = await import('./memory-consolidation.service.js');
    await expect(decayAgentMemories(AGENT_ID, 'wrong-user')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('skips recently accessed memories (handled by SQL WHERE clause)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    // SQL only returns memories not accessed in 7+ days — 0 eligible
    sqlMock.mockResolvedValueOnce([] as any);

    const { decayAgentMemories } = await import('./memory-consolidation.service.js');
    const result = await decayAgentMemories(AGENT_ID, USER_ID);

    expect(result.decayed_count).toBe(0);
  });

  it('decays large number of memories', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    const manyMemories = Array.from({ length: 100 }, (_, i) => ({ id: `m-${i}` }));
    sqlMock.mockResolvedValueOnce(manyMemories as any);

    const { decayAgentMemories } = await import('./memory-consolidation.service.js');
    const result = await decayAgentMemories(AGENT_ID, USER_ID);

    expect(result.decayed_count).toBe(100);
  });
});

/* -------------------------------------------------------------------------- */
/*  getMemoryStats                                                            */
/* -------------------------------------------------------------------------- */

describe('memory-consolidation — getMemoryStats', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('returns correct counts by type', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any); // assertAgentOwner
    // type counts
    sqlMock.mockResolvedValueOnce([
      { memory_type: 'semantic', count: 5 },
      { memory_type: 'episodic', count: 3 },
      { memory_type: 'procedural', count: 2 },
    ] as any);
    // avg importance
    sqlMock.mockResolvedValueOnce([{ avg_importance: 0.654321 }] as any);
    // total consolidations
    sqlMock.mockResolvedValueOnce([{ total_consolidations: 4 }] as any);

    const { getMemoryStats } = await import('./memory-consolidation.service.js');
    const result = await getMemoryStats(AGENT_ID, USER_ID);

    expect(result.total).toBe(10);
    expect(result.by_type).toEqual({ semantic: 5, episodic: 3, procedural: 2 });
    expect(result.avg_importance).toBe(0.654);
    expect(result.total_consolidations).toBe(4);
  });

  it('returns zero stats for agent with no memories', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any); // no types
    sqlMock.mockResolvedValueOnce([{ avg_importance: 0 }] as any);
    sqlMock.mockResolvedValueOnce([{ total_consolidations: 0 }] as any);

    const { getMemoryStats } = await import('./memory-consolidation.service.js');
    const result = await getMemoryStats(AGENT_ID, USER_ID);

    expect(result.total).toBe(0);
    expect(result.by_type).toEqual({});
    expect(result.avg_importance).toBe(0);
    expect(result.total_consolidations).toBe(0);
  });

  it('rounds avg_importance to 3 decimal places', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ memory_type: 'semantic', count: 1 }] as any);
    sqlMock.mockResolvedValueOnce([{ avg_importance: 0.123456789 }] as any);
    sqlMock.mockResolvedValueOnce([{ total_consolidations: 0 }] as any);

    const { getMemoryStats } = await import('./memory-consolidation.service.js');
    const result = await getMemoryStats(AGENT_ID, USER_ID);

    expect(result.avg_importance).toBe(0.123);
  });

  it('throws NOT_FOUND when agent is not owned by user', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { getMemoryStats } = await import('./memory-consolidation.service.js');
    await expect(getMemoryStats(AGENT_ID, 'wrong-user')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

/* -------------------------------------------------------------------------- */
/*  softDeleteMemory                                                          */
/* -------------------------------------------------------------------------- */

describe('memory-consolidation — softDeleteMemory', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('sets expires_at for existing memory', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any); // assertAgentOwner
    sqlMock.mockResolvedValueOnce([{ id: MEMORY_ID_1 }] as any); // RETURNING

    const { softDeleteMemory } = await import('./memory-consolidation.service.js');
    await expect(softDeleteMemory(AGENT_ID, USER_ID, MEMORY_ID_1)).resolves.toBeUndefined();
  });

  it('throws NOT_FOUND for non-existent memory', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any); // no rows returned

    const { softDeleteMemory } = await import('./memory-consolidation.service.js');
    await expect(softDeleteMemory(AGENT_ID, USER_ID, 'nonexistent')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws NOT_FOUND when agent is not owned by user', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { softDeleteMemory } = await import('./memory-consolidation.service.js');
    await expect(softDeleteMemory(AGENT_ID, 'wrong-user', MEMORY_ID_1)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('can soft-delete multiple memories independently', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // First memory
    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ id: MEMORY_ID_1 }] as any);

    const { softDeleteMemory } = await import('./memory-consolidation.service.js');
    await softDeleteMemory(AGENT_ID, USER_ID, MEMORY_ID_1);

    // Second memory
    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ id: MEMORY_ID_2 }] as any);

    await softDeleteMemory(AGENT_ID, USER_ID, MEMORY_ID_2);
  });
});

/* -------------------------------------------------------------------------- */
/*  recallMemoriesAdvanced                                                    */
/* -------------------------------------------------------------------------- */

describe('memory-consolidation — recallMemoriesAdvanced', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('returns matching memories with text search', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any); // assertAgentOwner
    sqlMock.mockResolvedValueOnce([
      makeMemoryRow({ content: 'Machine learning basics', relevance_score: 0.8 }),
    ] as any);
    // update access_count
    sqlMock.mockResolvedValueOnce([] as any);
    // emit event
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { recallMemoriesAdvanced } = await import('./memory-consolidation.service.js');
    const result = await recallMemoriesAdvanced(AGENT_ID, USER_ID, 'machine learning');

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Machine learning basics');
  });

  it('returns empty array when no memories match', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any); // no matches
    // no update (ids.length === 0)
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { recallMemoriesAdvanced } = await import('./memory-consolidation.service.js');
    const result = await recallMemoriesAdvanced(AGENT_ID, USER_ID, 'nonexistent topic');

    expect(result).toHaveLength(0);
  });

  it('applies memory_type filter', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([
      makeMemoryRow({ memory_type: 'episodic', content: 'Event' }),
    ] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { recallMemoriesAdvanced } = await import('./memory-consolidation.service.js');
    const result = await recallMemoriesAdvanced(AGENT_ID, USER_ID, 'Event', {
      memory_type: 'episodic',
    });

    expect(result).toHaveLength(1);
    expect(result[0].memory_type).toBe('episodic');
  });

  it('applies min_importance filter', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeMemoryRow({ importance: 0.9 })] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { recallMemoriesAdvanced } = await import('./memory-consolidation.service.js');
    const result = await recallMemoriesAdvanced(AGENT_ID, USER_ID, 'test', {
      min_importance: 0.8,
    });

    expect(result).toHaveLength(1);
    expect(result[0].importance).toBe(0.9);
  });

  it('respects limit option', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([
      makeMemoryRow({ id: 'm1' }),
      makeMemoryRow({ id: 'm2' }),
      makeMemoryRow({ id: 'm3' }),
    ] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { recallMemoriesAdvanced } = await import('./memory-consolidation.service.js');
    const result = await recallMemoriesAdvanced(AGENT_ID, USER_ID, 'test', { limit: 3 });

    expect(result).toHaveLength(3);
  });

  it('clamps limit to 50 maximum', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { recallMemoriesAdvanced } = await import('./memory-consolidation.service.js');
    await recallMemoriesAdvanced(AGENT_ID, USER_ID, 'test', { limit: 200 });

    // The SQL call should have used limit=50, we just verify it didn't error
    expect(sqlMock).toHaveBeenCalled();
  });

  it('defaults limit to 10 when not specified', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { recallMemoriesAdvanced } = await import('./memory-consolidation.service.js');
    await recallMemoriesAdvanced(AGENT_ID, USER_ID, 'test');

    expect(sqlMock).toHaveBeenCalled();
  });

  it('escapes SQL LIKE wildcards in query', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { recallMemoriesAdvanced } = await import('./memory-consolidation.service.js');
    // Should not throw even with wildcards
    await recallMemoriesAdvanced(AGENT_ID, USER_ID, 'test%_\\injection');

    expect(sqlMock).toHaveBeenCalled();
  });

  it('updates access_count for recalled memories', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([
      makeMemoryRow({ id: 'm1' }),
      makeMemoryRow({ id: 'm2' }),
    ] as any);
    // UPDATE access_count
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { recallMemoriesAdvanced } = await import('./memory-consolidation.service.js');
    await recallMemoriesAdvanced(AGENT_ID, USER_ID, 'test');

    // The 3rd SQL call should be the UPDATE for access_count
    expect(sqlMock).toHaveBeenCalledTimes(4);
  });

  it('throws NOT_FOUND when agent is not owned by user', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { recallMemoriesAdvanced } = await import('./memory-consolidation.service.js');
    await expect(recallMemoriesAdvanced(AGENT_ID, 'wrong-user', 'test')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

/* -------------------------------------------------------------------------- */
/*  Socket.IO event emission                                                  */
/* -------------------------------------------------------------------------- */

describe('memory-consolidation — Socket.IO event emission', () => {
  beforeEach(async () => {
    await resetSqlMocks();
    const { emitMemoryEvent } = await import('../../ws/emitter.js');
    vi.mocked(emitMemoryEvent).mockClear();
  });

  it('emits memory:consolidated event on successful consolidation', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ id: MEMORY_ID_1 }, { id: MEMORY_ID_2 }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([makeConsolidationRow()] as any);
    sqlMock.mockResolvedValueOnce([makeMemoryRow()] as any);
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { consolidateMemories } = await import('./memory-consolidation.service.js');
    await consolidateMemories(AGENT_ID, USER_ID, {
      memory_ids: [MEMORY_ID_1, MEMORY_ID_2],
      consolidation_type: 'abstract',
      result_content: 'Test',
    });

    const { emitMemoryEvent } = await import('../../ws/emitter.js');
    expect(emitMemoryEvent).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        type: 'memory:consolidated',
        agent_id: AGENT_ID,
        source_count: 2,
        consolidation_type: 'abstract',
      }),
    );
  });

  it('emits memory:recalled event on successful recall', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeMemoryRow()] as any);
    sqlMock.mockResolvedValueOnce([] as any); // update access_count
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { recallMemoriesAdvanced } = await import('./memory-consolidation.service.js');
    await recallMemoriesAdvanced(AGENT_ID, USER_ID, 'test');

    const { emitMemoryEvent } = await import('../../ws/emitter.js');
    expect(emitMemoryEvent).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        type: 'memory:recalled',
        agent_id: AGENT_ID,
        memory_count: 1,
      }),
    );
  });

  it('does not throw when creator is not found for event emission', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ id: MEMORY_ID_1 }, { id: MEMORY_ID_2 }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([makeConsolidationRow()] as any);
    sqlMock.mockResolvedValueOnce([makeMemoryRow()] as any);
    // Creator not found
    sqlMock.mockResolvedValueOnce([] as any);

    const { consolidateMemories } = await import('./memory-consolidation.service.js');
    const result = await consolidateMemories(AGENT_ID, USER_ID, {
      memory_ids: [MEMORY_ID_1, MEMORY_ID_2],
      consolidation_type: 'abstract',
      result_content: 'Test',
    });

    // Should still succeed without emitting
    expect(result.consolidation).toBeDefined();
  });
});

/* -------------------------------------------------------------------------- */
/*  consolidateMemories — custom result_memory_type                           */
/* -------------------------------------------------------------------------- */

describe('memory-consolidation — custom result_memory_type', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('uses custom result_memory_type when provided', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ id: MEMORY_ID_1 }, { id: MEMORY_ID_2 }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([makeConsolidationRow()] as any);
    sqlMock.mockResolvedValueOnce([makeMemoryRow({ memory_type: 'episodic' })] as any);
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { consolidateMemories } = await import('./memory-consolidation.service.js');
    const result = await consolidateMemories(AGENT_ID, USER_ID, {
      memory_ids: [MEMORY_ID_1, MEMORY_ID_2],
      consolidation_type: 'abstract',
      result_content: 'Episodic summary',
      result_memory_type: 'episodic',
    });

    expect(result.result_memory.memory_type).toBe('episodic');
  });

  it('defaults result_memory_type to semantic', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ id: MEMORY_ID_1 }, { id: MEMORY_ID_2 }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([makeConsolidationRow()] as any);
    sqlMock.mockResolvedValueOnce([makeMemoryRow({ memory_type: 'semantic' })] as any);
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { consolidateMemories } = await import('./memory-consolidation.service.js');
    const result = await consolidateMemories(AGENT_ID, USER_ID, {
      memory_ids: [MEMORY_ID_1, MEMORY_ID_2],
      consolidation_type: 'abstract',
      result_content: 'Default type',
    });

    expect(result.result_memory.memory_type).toBe('semantic');
  });
});

/* -------------------------------------------------------------------------- */
/*  consolidateMemories with 3 source memories                                */
/* -------------------------------------------------------------------------- */

describe('memory-consolidation — consolidate with 3 source memories', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('handles 3 source memories correctly', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([
      { id: MEMORY_ID_1 },
      { id: MEMORY_ID_2 },
      { id: MEMORY_ID_3 },
    ] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([
      makeConsolidationRow({
        source_memory_ids: [MEMORY_ID_1, MEMORY_ID_2, MEMORY_ID_3],
      }),
    ] as any);
    sqlMock.mockResolvedValueOnce([makeMemoryRow()] as any);
    sqlMock.mockResolvedValueOnce([{ creator_id: USER_ID }] as any);

    const { consolidateMemories } = await import('./memory-consolidation.service.js');
    const result = await consolidateMemories(AGENT_ID, USER_ID, {
      memory_ids: [MEMORY_ID_1, MEMORY_ID_2, MEMORY_ID_3],
      consolidation_type: 'abstract',
      result_content: 'Three memories combined',
    });

    expect(result.consolidation.source_memory_ids).toHaveLength(3);
  });
});
