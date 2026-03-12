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
const CONVERSATION_ID = '990e8400-e29b-41d4-a716-446655440004';

function makeAgentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: AGENT_ID,
    creator_id: USER_ID,
    name: 'Test Agent',
    slug: 'test-agent',
    description: 'A test agent',
    avatar_url: null,
    system_prompt: 'You are a test agent.',
    model: 'claude-sonnet-4-6',
    temperature: 0.7,
    max_tokens: 4096,
    tools: [],
    mcp_servers: [],
    visibility: 'private',
    category: 'productivity',
    usage_count: 0,
    rating_sum: 0,
    rating_count: 0,
    execution_mode: 'raw',
    metadata: {},
    inserted_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeCoreMemoryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mem-1',
    agent_id: AGENT_ID,
    block_label: 'identity',
    content: 'I am Test Agent.',
    inserted_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeConversationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CONVERSATION_ID,
    type: 'agent',
    title: null,
    avatar_url: null,
    creator_id: USER_ID,
    agent_id: AGENT_ID,
    metadata: {},
    last_message_at: null,
    inserted_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

/* -------------------------------------------------------------------------- */
/*  createAgent — all optional fields                                         */
/* -------------------------------------------------------------------------- */

describe('agent.service-edge — createAgent with all optional fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an agent with description, system_prompt, model, tools, mcp_servers, visibility, and category', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // slug check
    sqlMock.mockResolvedValueOnce([] as any);
    // insert
    sqlMock.mockResolvedValueOnce([] as any);
    // 4 core memories
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    // fetch agent
    sqlMock.mockResolvedValueOnce([
      makeAgentRow({
        name: 'Full Agent',
        description: 'All fields set',
        system_prompt: 'You are comprehensive.',
        model: 'gpt-4o',
        tools: [{ name: 'calculator' }],
        mcp_servers: [{ url: 'https://mcp.example.com', name: 'mem' }],
        visibility: 'public',
        category: 'research',
      }),
    ] as any);
    // fetch core memories
    sqlMock.mockResolvedValueOnce([makeCoreMemoryRow()] as any);

    const { createAgent } = await import('./agent.service.js');
    const result = await createAgent(USER_ID, {
      name: 'Full Agent',
      description: 'All fields set',
      system_prompt: 'You are comprehensive.',
      model: 'gpt-4o',
      tools: [{ name: 'calculator' }],
      mcp_servers: [{ url: 'https://mcp.example.com', name: 'mem' }],
      visibility: 'public',
      category: 'research',
    });

    expect(result.name).toBe('Full Agent');
    expect(result.description).toBe('All fields set');
    expect(result.system_prompt).toBe('You are comprehensive.');
    expect(result.model).toBe('gpt-4o');
    expect(result.visibility).toBe('public');
    expect(result.category).toBe('research');
    expect(result.tools).toEqual([{ name: 'calculator' }]);
    expect(result.mcp_servers).toEqual([{ url: 'https://mcp.example.com', name: 'mem' }]);
  });

  it('creates an agent with max length name (64 chars)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    const longName = 'A'.repeat(64);

    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([makeAgentRow({ name: longName })] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { createAgent } = await import('./agent.service.js');
    const result = await createAgent(USER_ID, { name: longName });

    expect((result as Record<string, unknown>).name).toBe(longName);
    expect((result as Record<string, unknown>).name as string).toHaveLength(64);
  });

  it('generates slug from special characters in name', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([makeAgentRow({ name: 'My Agent!!', slug: 'my-agent' })] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { createAgent } = await import('./agent.service.js');
    const result = await createAgent(USER_ID, { name: 'My Agent!!' });

    expect(result.slug).toBe('my-agent');
  });
});

/* -------------------------------------------------------------------------- */
/*  updateAgent — partial updates                                             */
/* -------------------------------------------------------------------------- */

describe('agent.service-edge — updateAgent partial updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates only category without touching other fields', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeAgentRow({ category: 'entertainment' })] as any);

    const { updateAgent } = await import('./agent.service.js');
    const result = await updateAgent(AGENT_ID, USER_ID, { category: 'entertainment' });

    expect(result.category).toBe('entertainment');
    expect(result.name).toBe('Test Agent'); // unchanged
  });

  it('clears avatar_url by setting it explicitly', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([
      makeAgentRow({ avatar_url: 'https://example.com/new.png' }),
    ] as any);

    const { updateAgent } = await import('./agent.service.js');
    const result = await updateAgent(AGENT_ID, USER_ID, {
      avatar_url: 'https://example.com/new.png',
    });

    expect(result.avatar_url).toBe('https://example.com/new.png');
  });

  it('updates tools to empty array', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeAgentRow({ tools: [] })] as any);

    const { updateAgent } = await import('./agent.service.js');
    const result = await updateAgent(AGENT_ID, USER_ID, { tools: [] });

    expect(result.tools).toEqual([]);
  });

  it('updates mcp_servers to a new list', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    const newServers = [
      { url: 'https://mcp1.example.com', name: 'search' },
      { url: 'https://mcp2.example.com', name: 'memory' },
    ];

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeAgentRow({ mcp_servers: newServers })] as any);

    const { updateAgent } = await import('./agent.service.js');
    const result = await updateAgent(AGENT_ID, USER_ID, { mcp_servers: newServers });

    expect(result.mcp_servers).toHaveLength(2);
  });
});

/* -------------------------------------------------------------------------- */
/*  deleteAgent — cascade behavior                                            */
/* -------------------------------------------------------------------------- */

describe('agent.service-edge — deleteAgent cascade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('nullifies agent_id on conversations before deleting', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertCreator
    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    // UPDATE conversations SET agent_id = NULL
    sqlMock.mockResolvedValueOnce([{ id: CONVERSATION_ID }] as any);
    // DELETE agent
    sqlMock.mockResolvedValueOnce([] as any);

    const { deleteAgent } = await import('./agent.service.js');
    await deleteAgent(AGENT_ID, USER_ID);

    // Verify the nullify query was called
    expect(sqlMock).toHaveBeenCalledTimes(3);
  });
});

/* -------------------------------------------------------------------------- */
/*  getAgent — visibility rules                                               */
/* -------------------------------------------------------------------------- */

describe('agent.service-edge — getAgent visibility rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows non-owner to access a public agent', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([
      makeAgentRow({ visibility: 'public', creator_id: OTHER_USER_ID }),
    ] as any);
    sqlMock.mockResolvedValueOnce([makeCoreMemoryRow()] as any);

    const { getAgent } = await import('./agent.service.js');
    const agent = await getAgent(AGENT_ID, USER_ID);

    expect(agent.id).toBe(AGENT_ID);
    expect(agent.visibility).toBe('public');
  });

  it('allows non-owner to access an unlisted agent', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([
      makeAgentRow({ visibility: 'unlisted', creator_id: OTHER_USER_ID }),
    ] as any);
    sqlMock.mockResolvedValueOnce([makeCoreMemoryRow()] as any);

    const { getAgent } = await import('./agent.service.js');
    const agent = await getAgent(AGENT_ID, USER_ID);

    expect(agent.visibility).toBe('unlisted');
  });

  it('blocks non-owner from accessing a private agent', async () => {
    const { sql } = await import('../../db/connection.js');
    // The SQL query filters by (creator_id = userId OR visibility IN ('public', 'unlisted'))
    // For a private agent owned by someone else, it returns no rows
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { getAgent } = await import('./agent.service.js');
    await expect(getAgent(AGENT_ID, OTHER_USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('owner can always access their own private agent', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([
      makeAgentRow({ visibility: 'private', creator_id: USER_ID }),
    ] as any);
    sqlMock.mockResolvedValueOnce([makeCoreMemoryRow()] as any);

    const { getAgent } = await import('./agent.service.js');
    const agent = await getAgent(AGENT_ID, USER_ID);

    expect(agent.visibility).toBe('private');
    expect(agent.creator_id).toBe(USER_ID);
  });
});

/* -------------------------------------------------------------------------- */
/*  startConversation — private agent access                                  */
/* -------------------------------------------------------------------------- */

describe('agent.service-edge — startConversation with private agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('non-owner cannot start conversation with private agent', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([
      { id: AGENT_ID, visibility: 'private', creator_id: OTHER_USER_ID },
    ] as any);

    const { startConversation } = await import('./agent.service.js');
    await expect(startConversation(AGENT_ID, USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('non-owner can start conversation with unlisted agent', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([
      { id: AGENT_ID, visibility: 'unlisted', creator_id: OTHER_USER_ID },
    ] as any);
    // No existing conversation
    sqlMock.mockResolvedValueOnce([] as any);
    // Insert conversation
    sqlMock.mockResolvedValueOnce([] as any);
    // Insert member
    sqlMock.mockResolvedValueOnce([] as any);
    // Fetch conversation
    sqlMock.mockResolvedValueOnce([makeConversationRow()] as any);

    const { startConversation } = await import('./agent.service.js');
    const result = await startConversation(AGENT_ID, USER_ID);

    expect(result.created).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/*  discoverAgents — edge cases                                               */
/* -------------------------------------------------------------------------- */

describe('agent.service-edge — discoverAgents filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses default limit of 10 when not provided', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { discoverAgents } = await import('./agent.service.js');
    const agents = await discoverAgents({});

    expect(agents).toHaveLength(0);
    expect(vi.mocked(sql)).toHaveBeenCalledTimes(1);
  });

  it('returns agents filtered by both query and limits properly', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([
      {
        id: 'a1',
        name: 'Matching Agent',
        description: 'Matches the search',
        model: 'claude-sonnet-4-6',
        tools: [],
        mcp_servers: [],
        category: null,
        visibility: 'public',
        rating_sum: 5,
        rating_count: 1,
        rating_avg: 5.0,
      },
    ] as any);

    const { discoverAgents } = await import('./agent.service.js');
    const agents = await discoverAgents({ query: 'matching', limit: 5 });

    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe('Matching Agent');
  });
});

/* -------------------------------------------------------------------------- */
/*  getAgentCard — edge cases                                                 */
/* -------------------------------------------------------------------------- */

describe('agent.service-edge — getAgentCard capabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes custom_tools capability and MCP server names', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([
      {
        id: AGENT_ID,
        name: 'Multi-cap Agent',
        description: 'Has everything',
        model: 'claude-sonnet-4-6',
        tools: [{ name: 'search' }, { name: 'compute' }],
        mcp_servers: [
          { url: 'https://a.com', name: 'memory' },
          { url: 'https://b.com', name: 'web-search' },
        ],
        category: 'general',
        visibility: 'public',
        rating_sum: 10,
        rating_count: 2,
        rating_avg: 5.0,
      },
    ] as any);

    const { getAgentCard } = await import('./agent.service.js');
    const card = await getAgentCard(AGENT_ID);

    expect(card.capabilities).toContain('custom_tools');
    expect(card.capabilities).toContain('memory');
    expect(card.capabilities).toContain('web-search');
    expect(card.capabilities).toHaveLength(3);
  });

  it('handles MCP server without name gracefully', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([
      {
        id: AGENT_ID,
        name: 'No Name MCP',
        description: null,
        model: 'claude-sonnet-4-6',
        tools: [],
        mcp_servers: [{ url: 'https://a.com' }], // no name field
        category: null,
        visibility: 'public',
        rating_sum: 0,
        rating_count: 0,
        rating_avg: 0,
      },
    ] as any);

    const { getAgentCard } = await import('./agent.service.js');
    const card = await getAgentCard(AGENT_ID);

    // Should not contain undefined or throw
    expect(card.capabilities).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/*  getAgentPerformance — additional edge cases                               */
/* -------------------------------------------------------------------------- */

describe('agent.service-edge — getAgentPerformance edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles zero total events (division by zero guard)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ rating_sum: 0, rating_count: 0, rating_avg: 0 }] as any);
    sqlMock.mockResolvedValueOnce([{ avg_rating: null }] as any);
    sqlMock.mockResolvedValueOnce([{ avg_rating: null }] as any);
    sqlMock.mockResolvedValueOnce([{ accuracy: null, helpfulness: null, speed: null }] as any);
    sqlMock.mockResolvedValueOnce([] as any); // no feedback
    sqlMock.mockResolvedValueOnce([
      { total_conversations: 0, avg_tokens_per_run: null, avg_duration_ms: null },
    ] as any);
    // total = 0, denominator should be set to 1 to avoid division by zero
    sqlMock.mockResolvedValueOnce([{ successes: 0, total: 0 }] as any);

    const { getAgentPerformance } = await import('./agent.service.js');
    const perf = await getAgentPerformance(AGENT_ID, USER_ID);

    expect(perf.usage_stats.success_rate).toBe(0);
    expect(perf.rating_trend).toBe('stable');
    expect(perf.dimensional_scores.accuracy).toBeNull();
  });

  it('counts feedback from multiple categories', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ rating_sum: 15, rating_count: 3, rating_avg: 5.0 }] as any);
    sqlMock.mockResolvedValueOnce([{ avg_rating: 5.0 }] as any);
    sqlMock.mockResolvedValueOnce([{ avg_rating: 5.0 }] as any);
    sqlMock.mockResolvedValueOnce([{ accuracy: 5.0, helpfulness: 4.5, speed: 4.0 }] as any);
    // Multiple feedback entries
    sqlMock.mockResolvedValueOnce([
      { feedback: 'positive', reason: 'accurate', cnt: 5 },
      { feedback: 'positive', reason: 'fast', cnt: 3 },
      { feedback: 'negative', reason: 'too_verbose', cnt: 2 },
      { feedback: 'negative', reason: 'off_topic', cnt: 1 },
    ] as any);
    sqlMock.mockResolvedValueOnce([
      { total_conversations: 10, avg_tokens_per_run: 500, avg_duration_ms: 1000 },
    ] as any);
    sqlMock.mockResolvedValueOnce([{ successes: 9, total: 10 }] as any);

    const { getAgentPerformance } = await import('./agent.service.js');
    const perf = await getAgentPerformance(AGENT_ID, USER_ID);

    expect(perf.feedback_summary.positive_count).toBe(8); // 5 + 3
    expect(perf.feedback_summary.negative_count).toBe(3); // 2 + 1
    expect(perf.feedback_summary.top_positive_reasons).toContain('accurate');
    expect(perf.feedback_summary.top_positive_reasons).toContain('fast');
    expect(perf.feedback_summary.top_negative_reasons).toContain('too_verbose');
    expect(perf.feedback_summary.top_negative_reasons).toContain('off_topic');
    // Only top 3 reasons
    expect(perf.feedback_summary.top_positive_reasons.length).toBeLessThanOrEqual(3);
    expect(perf.feedback_summary.top_negative_reasons.length).toBeLessThanOrEqual(3);
  });
});
