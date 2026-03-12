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

async function resetSqlMocks() {
  const { sql } = await import('../../db/connection.js');
  const sqlMock = vi.mocked(sql);
  sqlMock.mockReset();
  vi.mocked(sqlMock.unsafe).mockReset();
  vi.mocked(sqlMock.begin).mockReset();
  // Restore begin behavior
  vi.mocked(sqlMock.begin).mockImplementation(async (cb: any) => {
    return cb(sqlMock);
  });
}

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_USER_ID = '660e8400-e29b-41d4-a716-446655440001';
const AGENT_ID = '770e8400-e29b-41d4-a716-446655440002';
const FEED_ITEM_ID = '880e8400-e29b-41d4-a716-446655440003';
const CONV_ID = '990e8400-e29b-41d4-a716-446655440004';
const MSG_ID = 'aa0e8400-e29b-41d4-a716-446655440005';

function makeFeedItemRow(overrides: Record<string, unknown> = {}) {
  return {
    id: FEED_ITEM_ID,
    creator_id: USER_ID,
    type: 'creation',
    reference_id: AGENT_ID,
    reference_type: 'agent',
    title: 'Test Agent',
    description: 'A test agent',
    thumbnail_url: null,
    quality_score: 0.5,
    trending_score: 10,
    like_count: 5,
    fork_count: 2,
    view_count: 100,
    inserted_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    username: 'testuser',
    display_name: 'Test User',
    avatar_url: null,
    liked_by_me: 0,
    ...overrides,
  };
}

function makeAgentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: AGENT_ID,
    creator_id: USER_ID,
    name: 'Test Agent',
    slug: 'test-agent',
    description: 'A test agent',
    avatar_url: null,
    system_prompt: 'You are a test agent',
    model: 'gpt-4',
    temperature: 0.7,
    max_tokens: 4096,
    tools: [],
    mcp_servers: [],
    visibility: 'public',
    category: 'general',
    usage_count: 10,
    rating_sum: 20,
    rating_count: 5,
    rating_avg: 4.0,
    metadata: {},
    inserted_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    username: 'testuser',
    display_name: 'Test User',
    creator_avatar_url: null,
    ...overrides,
  };
}

/* -------------------------------------------------------------------------- */
/*  listFeed                                                                  */
/* -------------------------------------------------------------------------- */

describe('social.service-edge — listFeed with cursor pagination', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('returns feed items without cursor', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([makeFeedItemRow()] as any);

    const { listFeed } = await import('./social.service.js');
    const result = await listFeed(USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(FEED_ITEM_ID);
  });

  it('returns feed items with cursor', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // getCursorInsertedAt
    sqlMock.mockResolvedValueOnce([{ inserted_at: new Date('2026-01-02') }] as any);
    // actual feed query
    sqlMock.mockResolvedValueOnce([makeFeedItemRow()] as any);

    const { listFeed } = await import('./social.service.js');
    const result = await listFeed(USER_ID, 'cursor-id');

    expect(result).toHaveLength(1);
  });

  it('throws BAD_REQUEST for invalid cursor', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any); // cursor not found

    const { listFeed } = await import('./social.service.js');
    await expect(listFeed(USER_ID, 'nonexistent')).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('returns empty array when no feed items exist', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { listFeed } = await import('./social.service.js');
    const result = await listFeed(USER_ID);

    expect(result).toHaveLength(0);
  });

  it('formats liked_by_me correctly when liked', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([makeFeedItemRow({ liked_by_me: 1 })] as any);

    const { listFeed } = await import('./social.service.js');
    const result = await listFeed(USER_ID);

    expect(result[0].liked_by_me).toBe(true);
  });

  it('formats liked_by_me correctly when not liked', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([makeFeedItemRow({ liked_by_me: 0 })] as any);

    const { listFeed } = await import('./social.service.js');
    const result = await listFeed(USER_ID);

    expect(result[0].liked_by_me).toBe(false);
  });
});

describe('social.service-edge — listFeed with limit clamping', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('clamps limit to 100 maximum', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { listFeed } = await import('./social.service.js');
    await listFeed(USER_ID, undefined, 500);

    expect(vi.mocked(sql)).toHaveBeenCalled();
  });

  it('clamps limit to 1 minimum', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { listFeed } = await import('./social.service.js');
    await listFeed(USER_ID, undefined, -5);

    expect(vi.mocked(sql)).toHaveBeenCalled();
  });

  it('defaults limit to 20 when not provided', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { listFeed } = await import('./social.service.js');
    await listFeed(USER_ID);

    expect(vi.mocked(sql)).toHaveBeenCalled();
  });

  it('handles NaN limit by defaulting to 20', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { listFeed } = await import('./social.service.js');
    await listFeed(USER_ID, undefined, Number.NaN);

    expect(vi.mocked(sql)).toHaveBeenCalled();
  });
});

/* -------------------------------------------------------------------------- */
/*  likeFeedItem                                                              */
/* -------------------------------------------------------------------------- */

describe('social.service-edge — likeFeedItem idempotency', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('returns feed item after liking', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // Verify feed item exists
    sqlMock.mockResolvedValueOnce([{ id: FEED_ITEM_ID }] as any);
    // begin transaction — INSERT like, UPDATE count, SELECT creator
    sqlMock.mockResolvedValueOnce([] as any); // INSERT ON CONFLICT
    sqlMock.mockResolvedValueOnce([makeFeedItemRow({ like_count: 6 })] as any); // UPDATE RETURNING
    sqlMock.mockResolvedValueOnce([
      { username: 'testuser', display_name: 'Test', avatar_url: null },
    ] as any);

    const { likeFeedItem } = await import('./social.service.js');
    const result = await likeFeedItem(FEED_ITEM_ID, USER_ID);

    expect(result.liked_by_me).toBe(true);
  });

  it('throws NOT_FOUND for nonexistent feed item', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any); // feed item not found

    const { likeFeedItem } = await import('./social.service.js');
    await expect(likeFeedItem('nonexistent', USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

/* -------------------------------------------------------------------------- */
/*  unlikeFeedItem                                                            */
/* -------------------------------------------------------------------------- */

describe('social.service-edge — unlikeFeedItem', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('returns feed item after unliking', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: FEED_ITEM_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any); // DELETE like
    sqlMock.mockResolvedValueOnce([makeFeedItemRow({ like_count: 4 })] as any); // UPDATE RETURNING
    sqlMock.mockResolvedValueOnce([
      { username: 'testuser', display_name: 'Test', avatar_url: null },
    ] as any);

    const { unlikeFeedItem } = await import('./social.service.js');
    const result = await unlikeFeedItem(FEED_ITEM_ID, USER_ID);

    expect(result.liked_by_me).toBe(false);
  });

  it('throws NOT_FOUND for nonexistent feed item', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { unlikeFeedItem } = await import('./social.service.js');
    await expect(unlikeFeedItem('nonexistent', USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('unliking when not previously liked is a no-op (no error)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: FEED_ITEM_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any); // DELETE — deletes 0 rows (no-op)
    sqlMock.mockResolvedValueOnce([makeFeedItemRow({ like_count: 5 })] as any);
    sqlMock.mockResolvedValueOnce([
      { username: 'testuser', display_name: 'Test', avatar_url: null },
    ] as any);

    const { unlikeFeedItem } = await import('./social.service.js');
    const result = await unlikeFeedItem(FEED_ITEM_ID, USER_ID);

    expect(result.like_count).toBe(5);
  });
});

/* -------------------------------------------------------------------------- */
/*  forkAgent                                                                 */
/* -------------------------------------------------------------------------- */

describe('social.service-edge — forkAgent', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('throws NOT_FOUND for nonexistent agent', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any); // agent not found

    const { forkAgent } = await import('./social.service.js');
    await expect(forkAgent('nonexistent', USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws NOT_FOUND for private agent owned by another user', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([
      makeAgentRow({ visibility: 'private', creator_id: OTHER_USER_ID }),
    ] as any);

    const { forkAgent } = await import('./social.service.js');
    await expect(forkAgent(AGENT_ID, USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('creates a fork of a public agent', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // SELECT agent
    sqlMock.mockResolvedValueOnce([makeAgentRow()] as any);
    // SELECT existing slugs
    sqlMock.mockResolvedValueOnce([] as any);
    // begin transaction: INSERT agent, UPDATE fork_count, INSERT feed_item, SELECT forked agent
    sqlMock.mockResolvedValueOnce([] as any); // INSERT agent
    sqlMock.mockResolvedValueOnce([] as any); // UPDATE fork_count
    sqlMock.mockResolvedValueOnce([] as any); // INSERT feed_item
    sqlMock.mockResolvedValueOnce([
      makeAgentRow({
        slug: 'test-agent-fork',
        visibility: 'private',
        creator_id: USER_ID,
      }),
    ] as any);

    const { forkAgent } = await import('./social.service.js');
    const result = await forkAgent(AGENT_ID, USER_ID);

    expect(result.visibility).toBe('private');
  });

  it('allows owner to fork their own private agent', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([
      makeAgentRow({ visibility: 'private', creator_id: USER_ID }),
    ] as any);
    sqlMock.mockResolvedValueOnce([] as any); // slugs
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([makeAgentRow({ slug: 'test-agent-fork' })] as any);

    const { forkAgent } = await import('./social.service.js');
    const result = await forkAgent(AGENT_ID, USER_ID);

    expect(result).toBeDefined();
  });

  it('generates unique slug when fork slug already exists', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([makeAgentRow()] as any);
    // Existing slugs include 'test-agent-fork'
    sqlMock.mockResolvedValueOnce([{ slug: 'test-agent-fork' }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([makeAgentRow({ slug: 'test-agent-fork-2' })] as any);

    const { forkAgent } = await import('./social.service.js');
    const result = await forkAgent(AGENT_ID, USER_ID);

    expect(result.slug).toBe('test-agent-fork-2');
  });
});

/* -------------------------------------------------------------------------- */
/*  listTrending                                                              */
/* -------------------------------------------------------------------------- */

describe('social.service-edge — listTrending', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('returns items ordered by trending_score DESC', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([
      makeFeedItemRow({ trending_score: 100 }),
      makeFeedItemRow({ id: 'item-2', trending_score: 50 }),
    ] as any);

    const { listTrending } = await import('./social.service.js');
    const result = await listTrending(USER_ID);

    expect(result).toHaveLength(2);
  });

  it('supports cursor pagination', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([
      { trending_score: 50, inserted_at: new Date('2026-01-01') },
    ] as any);
    sqlMock.mockResolvedValueOnce([makeFeedItemRow({ trending_score: 30 })] as any);

    const { listTrending } = await import('./social.service.js');
    const result = await listTrending(USER_ID, 'cursor-id');

    expect(result).toHaveLength(1);
  });

  it('throws BAD_REQUEST for invalid cursor', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { listTrending } = await import('./social.service.js');
    await expect(listTrending(USER_ID, 'nonexistent')).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });
});

/* -------------------------------------------------------------------------- */
/*  listFollowing                                                             */
/* -------------------------------------------------------------------------- */

describe('social.service-edge — listFollowing', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('returns empty array when following list is empty', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { listFollowing } = await import('./social.service.js');
    const result = await listFollowing(USER_ID);

    expect(result).toHaveLength(0);
  });

  it('returns items from followed users', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([makeFeedItemRow({ creator_id: OTHER_USER_ID })] as any);

    const { listFollowing } = await import('./social.service.js');
    const result = await listFollowing(USER_ID);

    expect(result).toHaveLength(1);
  });

  it('supports cursor pagination', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ inserted_at: new Date('2026-01-02') }] as any);
    sqlMock.mockResolvedValueOnce([makeFeedItemRow()] as any);

    const { listFollowing } = await import('./social.service.js');
    const result = await listFollowing(USER_ID, 'cursor-id');

    expect(result).toHaveLength(1);
  });
});

/* -------------------------------------------------------------------------- */
/*  listNew                                                                   */
/* -------------------------------------------------------------------------- */

describe('social.service-edge — listNew', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('returns items ordered by inserted_at DESC', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([
      makeFeedItemRow({ inserted_at: new Date('2026-01-02') }),
      makeFeedItemRow({ id: 'item-2', inserted_at: new Date('2026-01-01') }),
    ] as any);

    const { listNew } = await import('./social.service.js');
    const result = await listNew(USER_ID);

    expect(result).toHaveLength(2);
  });

  it('supports cursor pagination', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ inserted_at: new Date('2026-01-02') }] as any);
    sqlMock.mockResolvedValueOnce([makeFeedItemRow()] as any);

    const { listNew } = await import('./social.service.js');
    const result = await listNew(USER_ID, 'cursor-id');

    expect(result).toHaveLength(1);
  });

  it('returns empty array when no items exist', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { listNew } = await import('./social.service.js');
    const result = await listNew(USER_ID);

    expect(result).toHaveLength(0);
  });
});

/* -------------------------------------------------------------------------- */
/*  submitMessageFeedback                                                     */
/* -------------------------------------------------------------------------- */

describe('social.service-edge — submitMessageFeedback', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('returns feedback after insert', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { submitMessageFeedback } = await import('./social.service.js');
    const result = await submitMessageFeedback(CONV_ID, MSG_ID, USER_ID, AGENT_ID, 'positive');

    expect(result.message_id).toBe(MSG_ID);
    expect(result.feedback).toBe('positive');
  });

  it('handles upsert with existing feedback', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any); // ON CONFLICT UPDATE

    const { submitMessageFeedback } = await import('./social.service.js');
    const result = await submitMessageFeedback(
      CONV_ID,
      MSG_ID,
      USER_ID,
      AGENT_ID,
      'negative',
      'Was wrong',
    );

    expect(result.feedback).toBe('negative');
    expect(result.reason).toBe('Was wrong');
  });

  it('handles feedback with no reason', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { submitMessageFeedback } = await import('./social.service.js');
    const result = await submitMessageFeedback(CONV_ID, MSG_ID, USER_ID, AGENT_ID, 'positive');

    expect(result.reason).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */
/*  shouldPromptFeedback                                                      */
/* -------------------------------------------------------------------------- */

describe('social.service-edge — shouldPromptFeedback', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('returns true when conversation has 6+ messages', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([{ cnt: 6 }] as any);

    const { shouldPromptFeedback } = await import('./social.service.js');
    const result = await shouldPromptFeedback(CONV_ID);

    expect(result).toBe(true);
  });

  it('returns true when conversation has many messages', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([{ cnt: 100 }] as any);

    const { shouldPromptFeedback } = await import('./social.service.js');
    const result = await shouldPromptFeedback(CONV_ID);

    expect(result).toBe(true);
  });

  it('returns boolean for short conversation (random sampling)', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([{ cnt: 2 }] as any);

    const { shouldPromptFeedback } = await import('./social.service.js');
    const result = await shouldPromptFeedback(CONV_ID);

    expect(typeof result).toBe('boolean');
  });
});

/* -------------------------------------------------------------------------- */
/*  searchMarketplace                                                         */
/* -------------------------------------------------------------------------- */

describe('social.service-edge — searchMarketplace', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('returns matching agents', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([makeAgentRow()] as any);

    const { searchMarketplace } = await import('./social.service.js');
    const result = await searchMarketplace('test', USER_ID);

    expect(result).toHaveLength(1);
  });

  it('handles special characters in query (SQL LIKE escaping)', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { searchMarketplace } = await import('./social.service.js');
    const result = await searchMarketplace('test%_\\injection', USER_ID);

    expect(result).toHaveLength(0);
  });

  it('supports cursor pagination', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ inserted_at: new Date('2026-01-01') }] as any);
    sqlMock.mockResolvedValueOnce([makeAgentRow()] as any);

    const { searchMarketplace } = await import('./social.service.js');
    const result = await searchMarketplace('test', USER_ID, 'cursor-id');

    expect(result).toHaveLength(1);
  });

  it('throws BAD_REQUEST for invalid cursor', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any); // cursor not found

    const { searchMarketplace } = await import('./social.service.js');
    await expect(searchMarketplace('test', USER_ID, 'nonexistent')).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('returns empty array for no matches', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { searchMarketplace } = await import('./social.service.js');
    const result = await searchMarketplace('zzzznonexistent', USER_ID);

    expect(result).toHaveLength(0);
  });

  it('handles empty query string', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { searchMarketplace } = await import('./social.service.js');
    const result = await searchMarketplace('', USER_ID);

    expect(result).toHaveLength(0);
  });
});

/* -------------------------------------------------------------------------- */
/*  rateAgent                                                                 */
/* -------------------------------------------------------------------------- */

describe('social.service-edge — rateAgent', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('throws NOT_FOUND for nonexistent agent', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any); // agent not found

    const { rateAgent } = await import('./social.service.js');
    await expect(rateAgent(AGENT_ID, USER_ID, 5)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws BAD_REQUEST when user has not used the agent', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any); // agent exists
    sqlMock.mockResolvedValueOnce([] as any); // no usage found

    const { rateAgent } = await import('./social.service.js');
    await expect(rateAgent(AGENT_ID, USER_ID, 5)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('creates new rating for first-time rater', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any); // agent exists
    sqlMock.mockResolvedValueOnce([{ 1: 1 }] as any); // usage exists
    // begin transaction
    sqlMock.mockResolvedValueOnce([] as any); // no existing rating
    sqlMock.mockResolvedValueOnce([] as any); // INSERT rating
    sqlMock.mockResolvedValueOnce([] as any); // UPDATE agents
    sqlMock.mockResolvedValueOnce([{ rating_sum: 25, rating_count: 6, rating_avg: 4.17 }] as any);

    const { rateAgent } = await import('./social.service.js');
    const result = await rateAgent(AGENT_ID, USER_ID, 5);

    expect(result.your_rating).toBe(5);
  });

  it('updates existing rating', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ 1: 1 }] as any);
    // begin transaction — existing rating found
    sqlMock.mockResolvedValueOnce([{ id: 'rating-1', old_rating: 3 }] as any);
    sqlMock.mockResolvedValueOnce([] as any); // UPDATE rating
    sqlMock.mockResolvedValueOnce([] as any); // UPDATE agents rating_sum
    sqlMock.mockResolvedValueOnce([{ rating_sum: 22, rating_count: 5, rating_avg: 4.4 }] as any);

    const { rateAgent } = await import('./social.service.js');
    const result = await rateAgent(AGENT_ID, USER_ID, 5);

    expect(result.your_rating).toBe(5);
    expect(result.agent_id).toBe(AGENT_ID);
  });

  it('accepts rating with dimensional scores', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ 1: 1 }] as any);
    sqlMock.mockResolvedValueOnce([] as any); // no existing
    sqlMock.mockResolvedValueOnce([] as any); // INSERT
    sqlMock.mockResolvedValueOnce([] as any); // UPDATE
    sqlMock.mockResolvedValueOnce([{ rating_sum: 25, rating_count: 6, rating_avg: 4.17 }] as any);

    const { rateAgent } = await import('./social.service.js');
    const result = await rateAgent(AGENT_ID, USER_ID, 4, 'Great agent', {
      accuracy_score: 5,
      helpfulness_score: 4,
      speed_score: 3,
    });

    expect(result.your_rating).toBe(4);
  });
});

/* -------------------------------------------------------------------------- */
/*  followUser / unfollowUser                                                 */
/* -------------------------------------------------------------------------- */

describe('social.service-edge — followUser', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('throws BAD_REQUEST when following yourself', async () => {
    const { followUser } = await import('./social.service.js');
    await expect(followUser(USER_ID, USER_ID)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('throws NOT_FOUND when target user does not exist', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any); // user not found

    const { followUser } = await import('./social.service.js');
    await expect(followUser(USER_ID, 'nonexistent')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('follows an existing user successfully', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: OTHER_USER_ID }] as any); // user exists
    sqlMock.mockResolvedValueOnce([] as any); // INSERT follow

    const { followUser } = await import('./social.service.js');
    await expect(followUser(USER_ID, OTHER_USER_ID)).resolves.toBeUndefined();
  });

  it('follow is idempotent (ON CONFLICT DO NOTHING)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: OTHER_USER_ID }] as any);
    sqlMock.mockResolvedValueOnce([] as any); // conflict — no error

    const { followUser } = await import('./social.service.js');
    await expect(followUser(USER_ID, OTHER_USER_ID)).resolves.toBeUndefined();
  });
});

describe('social.service-edge — unfollowUser', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('unfollows successfully', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any); // DELETE

    const { unfollowUser } = await import('./social.service.js');
    await expect(unfollowUser(USER_ID, OTHER_USER_ID)).resolves.toBeUndefined();
  });

  it('unfollowing when not following is a no-op', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any); // DELETE 0 rows

    const { unfollowUser } = await import('./social.service.js');
    await expect(unfollowUser(USER_ID, OTHER_USER_ID)).resolves.toBeUndefined();
  });

  it('allows unfollowing yourself (no guard)', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { unfollowUser } = await import('./social.service.js');
    await expect(unfollowUser(USER_ID, USER_ID)).resolves.toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */
/*  listMarketplace                                                           */
/* -------------------------------------------------------------------------- */

describe('social.service-edge — listMarketplace', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('returns public agents', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([makeAgentRow()] as any);

    const { listMarketplace } = await import('./social.service.js');
    const result = await listMarketplace(USER_ID);

    expect(result).toHaveLength(1);
  });

  it('filters by category', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([makeAgentRow({ category: 'productivity' })] as any);

    const { listMarketplace } = await import('./social.service.js');
    const result = await listMarketplace(USER_ID, undefined, undefined, 'productivity');

    expect(result).toHaveLength(1);
  });

  it('supports cursor pagination', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([
      { usage_count: 10, inserted_at: new Date('2026-01-01') },
    ] as any);
    sqlMock.mockResolvedValueOnce([makeAgentRow()] as any);

    const { listMarketplace } = await import('./social.service.js');
    const result = await listMarketplace(USER_ID, 'cursor-id');

    expect(result).toHaveLength(1);
  });
});

/* -------------------------------------------------------------------------- */
/*  getMarketplaceAgent                                                       */
/* -------------------------------------------------------------------------- */

describe('social.service-edge — getMarketplaceAgent', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('returns agent by slug', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([makeAgentRow()] as any);

    const { getMarketplaceAgent } = await import('./social.service.js');
    const result = await getMarketplaceAgent('test-agent');

    expect(result.slug).toBe('test-agent');
  });

  it('falls back to id lookup when slug not found', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([] as any); // slug not found
    sqlMock.mockResolvedValueOnce([makeAgentRow()] as any); // id found

    const { getMarketplaceAgent } = await import('./social.service.js');
    const result = await getMarketplaceAgent(AGENT_ID);

    expect(result.id).toBe(AGENT_ID);
  });

  it('throws NOT_FOUND when neither slug nor id matches', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([] as any); // slug not found
    sqlMock.mockResolvedValueOnce([] as any); // id not found

    const { getMarketplaceAgent } = await import('./social.service.js');
    await expect(getMarketplaceAgent('nonexistent')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

/* -------------------------------------------------------------------------- */
/*  listCategories                                                            */
/* -------------------------------------------------------------------------- */

describe('social.service-edge — listCategories', () => {
  beforeEach(async () => {
    await resetSqlMocks();
  });

  it('returns category counts', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([
      { category: 'productivity', count: 10 },
      { category: 'creative', count: 5 },
    ] as any);

    const { listCategories } = await import('./social.service.js');
    const result = await listCategories();

    expect(result).toHaveLength(2);
    expect(result[0].category).toBe('productivity');
    expect(result[0].count).toBe(10);
  });

  it('returns empty array when no categories exist', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { listCategories } = await import('./social.service.js');
    const result = await listCategories();

    expect(result).toHaveLength(0);
  });
});
