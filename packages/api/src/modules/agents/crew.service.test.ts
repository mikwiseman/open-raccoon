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
const CREW_ID = '770e8400-e29b-41d4-a716-446655440002';
const AGENT_ID_1 = '880e8400-e29b-41d4-a716-446655440003';
const AGENT_ID_2 = '990e8400-e29b-41d4-a716-446655440004';

function makeCrewRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CREW_ID,
    creator_id: USER_ID,
    name: 'Test Crew',
    slug: 'test-crew',
    description: 'A test crew',
    visibility: 'private',
    steps: [
      { agentId: AGENT_ID_1, role: 'researcher' },
      { agentId: AGENT_ID_2, role: 'writer' },
    ],
    category: 'productivity',
    usage_count: 0,
    rating_sum: 0,
    rating_count: 0,
    metadata: {},
    inserted_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

/* -------------------------------------------------------------------------- */
/*  listCrews                                                                 */
/* -------------------------------------------------------------------------- */

describe('crew.service — listCrews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns formatted crews for the user', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([makeCrewRow()] as any);

    const { listCrews } = await import('./crew.service.js');
    const crews = await listCrews(USER_ID);

    expect(crews).toHaveLength(1);
    expect(crews[0].id).toBe(CREW_ID);
    expect(crews[0].name).toBe('Test Crew');
    expect(crews[0].created_at).toBe(new Date('2026-01-01').toISOString());
  });

  it('returns empty array when user has no crews', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { listCrews } = await import('./crew.service.js');
    const crews = await listCrews(USER_ID);

    expect(crews).toHaveLength(0);
  });

  it('returns multiple crews sorted by insertion', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([
      makeCrewRow({ id: 'crew-1', name: 'First' }),
      makeCrewRow({ id: 'crew-2', name: 'Second' }),
    ] as any);

    const { listCrews } = await import('./crew.service.js');
    const crews = await listCrews(USER_ID);

    expect(crews).toHaveLength(2);
    expect(crews[0].id).toBe('crew-1');
    expect(crews[1].id).toBe('crew-2');
  });
});

/* -------------------------------------------------------------------------- */
/*  createCrew                                                                */
/* -------------------------------------------------------------------------- */

describe('crew.service — createCrew', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a crew with valid steps', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. Validate agent IDs exist
    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID_1 }, { id: AGENT_ID_2 }] as any);
    // 2. Check slug uniqueness
    sqlMock.mockResolvedValueOnce([] as any);
    // 3. Insert crew
    sqlMock.mockResolvedValueOnce([] as any);
    // 4. Fetch created crew
    sqlMock.mockResolvedValueOnce([makeCrewRow()] as any);

    const { createCrew } = await import('./crew.service.js');
    const result = await createCrew(USER_ID, {
      name: 'Test Crew',
      steps: [
        { agentId: AGENT_ID_1, role: 'researcher' },
        { agentId: AGENT_ID_2, role: 'writer' },
      ],
    });

    expect(result.id).toBe(CREW_ID);
    expect(result.name).toBe('Test Crew');
    expect(result.steps).toHaveLength(2);
  });

  it('throws BAD_REQUEST when steps array is empty', async () => {
    const { createCrew } = await import('./crew.service.js');
    await expect(createCrew(USER_ID, { name: 'Empty Crew', steps: [] })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('throws BAD_REQUEST when steps exceed 5', async () => {
    const { createCrew } = await import('./crew.service.js');
    const steps = Array.from({ length: 6 }, (_, i) => ({
      agentId: `agent-${i}`,
      role: `role-${i}`,
    }));
    await expect(createCrew(USER_ID, { name: 'Too Many', steps })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('throws BAD_REQUEST when an agent ID does not exist', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // Only one agent found
    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID_1 }] as any);

    const { createCrew } = await import('./crew.service.js');
    await expect(
      createCrew(USER_ID, {
        name: 'Bad Crew',
        steps: [
          { agentId: AGENT_ID_1, role: 'researcher' },
          { agentId: AGENT_ID_2, role: 'writer' },
        ],
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('generates a unique slug when the base slug already exists', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. Validate agent IDs
    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID_1 }] as any);
    // 2. Slug check returns existing slugs
    sqlMock.mockResolvedValueOnce([{ slug: 'test-crew' }, { slug: 'test-crew-2' }] as any);
    // 3. Insert crew
    sqlMock.mockResolvedValueOnce([] as any);
    // 4. Fetch crew
    sqlMock.mockResolvedValueOnce([makeCrewRow({ slug: 'test-crew-3' })] as any);

    const { createCrew } = await import('./crew.service.js');
    const result = await createCrew(USER_ID, {
      name: 'Test Crew',
      steps: [{ agentId: AGENT_ID_1, role: 'researcher' }],
    });

    expect(result.slug).toBe('test-crew-3');
  });

  it('creates a crew with visibility and category', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID_1 }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([
      makeCrewRow({ visibility: 'public', category: 'creative' }),
    ] as any);

    const { createCrew } = await import('./crew.service.js');
    const result = await createCrew(USER_ID, {
      name: 'Public Crew',
      steps: [{ agentId: AGENT_ID_1, role: 'researcher' }],
      visibility: 'public',
      category: 'creative',
    });

    expect(result.visibility).toBe('public');
    expect(result.category).toBe('creative');
  });
});

/* -------------------------------------------------------------------------- */
/*  getCrew                                                                   */
/* -------------------------------------------------------------------------- */

describe('crew.service — getCrew', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the crew for the owner', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([makeCrewRow()] as any);

    const { getCrew } = await import('./crew.service.js');
    const crew = await getCrew(CREW_ID, USER_ID);

    expect(crew.id).toBe(CREW_ID);
    expect(crew.name).toBe('Test Crew');
  });

  it('throws NOT_FOUND for non-existent crew', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { getCrew } = await import('./crew.service.js');
    await expect(getCrew('nonexistent-id', USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws NOT_FOUND when non-owner tries to access', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { getCrew } = await import('./crew.service.js');
    await expect(getCrew(CREW_ID, OTHER_USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

/* -------------------------------------------------------------------------- */
/*  updateCrew                                                                */
/* -------------------------------------------------------------------------- */

describe('crew.service — updateCrew', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates crew name and returns updated crew', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. assertCreator check
    sqlMock.mockResolvedValueOnce([{ id: CREW_ID }] as any);
    // 2. UPDATE RETURNING
    sqlMock.mockResolvedValueOnce([makeCrewRow({ name: 'Updated Crew' })] as any);

    const { updateCrew } = await import('./crew.service.js');
    const result = await updateCrew(CREW_ID, USER_ID, { name: 'Updated Crew' });

    expect(result.name).toBe('Updated Crew');
  });

  it('updates crew steps with validation', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. assertCreator
    sqlMock.mockResolvedValueOnce([{ id: CREW_ID }] as any);
    // 2. Validate agent IDs
    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID_1 }] as any);
    // 3. UPDATE RETURNING
    sqlMock.mockResolvedValueOnce([
      makeCrewRow({ steps: [{ agentId: AGENT_ID_1, role: 'solo' }] }),
    ] as any);

    const { updateCrew } = await import('./crew.service.js');
    const result = await updateCrew(CREW_ID, USER_ID, {
      steps: [{ agentId: AGENT_ID_1, role: 'solo' }],
    });

    expect(result.steps).toHaveLength(1);
  });

  it('throws BAD_REQUEST when updated steps exceed 5', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([{ id: CREW_ID }] as any);

    const { updateCrew } = await import('./crew.service.js');
    const steps = Array.from({ length: 6 }, (_, i) => ({
      agentId: `agent-${i}`,
      role: `role-${i}`,
    }));
    await expect(updateCrew(CREW_ID, USER_ID, { steps })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('throws NOT_FOUND when non-owner tries to update', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { updateCrew } = await import('./crew.service.js');
    await expect(updateCrew(CREW_ID, OTHER_USER_ID, { name: 'Hacked' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws NOT_FOUND for non-existent crew', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { updateCrew } = await import('./crew.service.js');
    await expect(updateCrew('nonexistent-id', USER_ID, { name: 'Nope' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('updates visibility', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: CREW_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeCrewRow({ visibility: 'public' })] as any);

    const { updateCrew } = await import('./crew.service.js');
    const result = await updateCrew(CREW_ID, USER_ID, { visibility: 'public' });

    expect(result.visibility).toBe('public');
  });

  it('updates multiple fields at once', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: CREW_ID }] as any);
    sqlMock.mockResolvedValueOnce([
      makeCrewRow({ name: 'New Name', visibility: 'public', category: 'creative' }),
    ] as any);

    const { updateCrew } = await import('./crew.service.js');
    const result = await updateCrew(CREW_ID, USER_ID, {
      name: 'New Name',
      visibility: 'public',
      category: 'creative',
    });

    expect(result.name).toBe('New Name');
    expect(result.visibility).toBe('public');
    expect(result.category).toBe('creative');
  });
});

/* -------------------------------------------------------------------------- */
/*  deleteCrew                                                                */
/* -------------------------------------------------------------------------- */

describe('crew.service — deleteCrew', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes a crew', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. assertCreator
    sqlMock.mockResolvedValueOnce([{ id: CREW_ID }] as any);
    // 2. Delete crew
    sqlMock.mockResolvedValueOnce([] as any);

    const { deleteCrew } = await import('./crew.service.js');
    await deleteCrew(CREW_ID, USER_ID);

    expect(sqlMock).toHaveBeenCalledTimes(2);
  });

  it('throws NOT_FOUND when non-owner tries to delete', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { deleteCrew } = await import('./crew.service.js');
    await expect(deleteCrew(CREW_ID, OTHER_USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws NOT_FOUND for non-existent crew', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { deleteCrew } = await import('./crew.service.js');
    await expect(deleteCrew('nonexistent-id', USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
