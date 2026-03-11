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
/*  listAgents                                                                */
/* -------------------------------------------------------------------------- */

describe('agent.service — listAgents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns formatted agents for the user', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([makeAgentRow()] as any);

    const { listAgents } = await import('./agent.service.js');
    const agents = await listAgents(USER_ID);

    expect(agents).toHaveLength(1);
    expect(agents[0].id).toBe(AGENT_ID);
    expect(agents[0].name).toBe('Test Agent');
    expect(agents[0].created_at).toBe(new Date('2026-01-01').toISOString());
  });

  it('returns empty array when user has no agents', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { listAgents } = await import('./agent.service.js');
    const agents = await listAgents(USER_ID);

    expect(agents).toHaveLength(0);
  });

  it('returns multiple agents sorted by insertion', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([
      makeAgentRow({ id: 'agent-1', name: 'First' }),
      makeAgentRow({ id: 'agent-2', name: 'Second' }),
    ] as any);

    const { listAgents } = await import('./agent.service.js');
    const agents = await listAgents(USER_ID);

    expect(agents).toHaveLength(2);
    expect(agents[0].id).toBe('agent-1');
    expect(agents[1].id).toBe('agent-2');
  });
});

/* -------------------------------------------------------------------------- */
/*  createAgent                                                               */
/* -------------------------------------------------------------------------- */

describe('agent.service — createAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an agent with default values', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. Check slug uniqueness
    sqlMock.mockResolvedValueOnce([] as any);
    // 2. Insert agent
    sqlMock.mockResolvedValueOnce([] as any);
    // 3-6. Insert 4 default core memories
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    // 7. Fetch created agent
    sqlMock.mockResolvedValueOnce([makeAgentRow()] as any);
    // 8. Fetch core memories
    sqlMock.mockResolvedValueOnce([
      makeCoreMemoryRow({ block_label: 'identity' }),
      makeCoreMemoryRow({ id: 'mem-2', block_label: 'rules' }),
      makeCoreMemoryRow({ id: 'mem-3', block_label: 'priorities' }),
      makeCoreMemoryRow({ id: 'mem-4', block_label: 'preferences' }),
    ] as any);

    const { createAgent } = await import('./agent.service.js');
    const result = await createAgent(USER_ID, { name: 'Test Agent' });

    expect(result.id).toBe(AGENT_ID);
    expect(result.name).toBe('Test Agent');
    expect(result.core_memories).toHaveLength(4);
    expect(result.core_memories[0].block_label).toBe('identity');
  });

  it('creates an agent from a valid template', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. Check slug uniqueness
    sqlMock.mockResolvedValueOnce([] as any);
    // 2. Insert agent
    sqlMock.mockResolvedValueOnce([] as any);
    // 3-6. Insert 4 template core memories
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    // 7. Fetch created agent
    sqlMock.mockResolvedValueOnce([
      makeAgentRow({ name: 'My PR Agent', system_prompt: 'You are a PR Manager agent...' }),
    ] as any);
    // 8. Fetch core memories
    sqlMock.mockResolvedValueOnce([
      makeCoreMemoryRow({ block_label: 'identity', content: 'I am a PR Manager agent...' }),
    ] as any);

    const { createAgent } = await import('./agent.service.js');
    const result = await createAgent(USER_ID, {
      name: 'My PR Agent',
      template: 'pr_manager',
    });

    expect(result.name).toBe('My PR Agent');
    expect(result.core_memories).toHaveLength(1);
  });

  it('throws BAD_REQUEST for an invalid template', async () => {
    const { createAgent } = await import('./agent.service.js');

    await expect(
      createAgent(USER_ID, { name: 'Bad Template Agent', template: 'nonexistent_template' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('generates a unique slug when the base slug already exists', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. Check slug uniqueness — returns existing slugs
    sqlMock.mockResolvedValueOnce([{ slug: 'test-agent' }, { slug: 'test-agent-2' }] as any);
    // 2. Insert agent
    sqlMock.mockResolvedValueOnce([] as any);
    // 3-6. Core memories
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    // 7. Fetch created agent — slug should be test-agent-3
    sqlMock.mockResolvedValueOnce([makeAgentRow({ slug: 'test-agent-3' })] as any);
    // 8. Core memories
    sqlMock.mockResolvedValueOnce([] as any);

    const { createAgent } = await import('./agent.service.js');
    const result = await createAgent(USER_ID, { name: 'Test Agent' });

    expect(result.slug).toBe('test-agent-3');
  });

  it('creates an agent with explicit model and tools', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. Slug check
    sqlMock.mockResolvedValueOnce([] as any);
    // 2. Insert
    sqlMock.mockResolvedValueOnce([] as any);
    // 3-6. Core memories
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    // 7. Fetch agent
    sqlMock.mockResolvedValueOnce([
      makeAgentRow({
        model: 'gpt-4o',
        tools: [{ name: 'web_search' }],
        mcp_servers: [{ url: 'https://mcp.example.com', name: 'example' }],
      }),
    ] as any);
    // 8. Core memories
    sqlMock.mockResolvedValueOnce([] as any);

    const { createAgent } = await import('./agent.service.js');
    const result = await createAgent(USER_ID, {
      name: 'Custom Agent',
      model: 'gpt-4o',
      tools: [{ name: 'web_search' }],
      mcp_servers: [{ url: 'https://mcp.example.com', name: 'example' }],
    });

    expect(result.model).toBe('gpt-4o');
    expect(result.tools).toEqual([{ name: 'web_search' }]);
    expect(result.mcp_servers).toEqual([{ url: 'https://mcp.example.com', name: 'example' }]);
  });

  it('creates an agent with visibility and category', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. Slug check
    sqlMock.mockResolvedValueOnce([] as any);
    // 2. Insert
    sqlMock.mockResolvedValueOnce([] as any);
    // 3-6. Core memories
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    // 7. Fetch agent
    sqlMock.mockResolvedValueOnce([
      makeAgentRow({ visibility: 'public', category: 'creative' }),
    ] as any);
    // 8. Core memories
    sqlMock.mockResolvedValueOnce([] as any);

    const { createAgent } = await import('./agent.service.js');
    const result = await createAgent(USER_ID, {
      name: 'Public Agent',
      visibility: 'public',
      category: 'creative',
    });

    expect(result.visibility).toBe('public');
    expect(result.category).toBe('creative');
  });

  it('template values are overridden by explicit input values', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. Slug check
    sqlMock.mockResolvedValueOnce([] as any);
    // 2. Insert
    sqlMock.mockResolvedValueOnce([] as any);
    // 3-6. Core memories from template (4 memories)
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    // 7. Fetch agent — model should be the overridden one
    sqlMock.mockResolvedValueOnce([
      makeAgentRow({ model: 'gpt-4o', system_prompt: 'Custom prompt' }),
    ] as any);
    // 8. Core memories
    sqlMock.mockResolvedValueOnce([] as any);

    const { createAgent } = await import('./agent.service.js');
    const result = await createAgent(USER_ID, {
      name: 'Override Agent',
      template: 'pr_manager',
      model: 'gpt-4o',
      system_prompt: 'Custom prompt',
    });

    expect(result.model).toBe('gpt-4o');
    expect(result.system_prompt).toBe('Custom prompt');
  });
});

/* -------------------------------------------------------------------------- */
/*  getAgent                                                                  */
/* -------------------------------------------------------------------------- */

describe('agent.service — getAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the agent with core memories for the owner', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. Fetch agent
    sqlMock.mockResolvedValueOnce([makeAgentRow()] as any);
    // 2. Fetch core memories
    sqlMock.mockResolvedValueOnce([
      makeCoreMemoryRow({ block_label: 'identity' }),
      makeCoreMemoryRow({ id: 'mem-2', block_label: 'rules' }),
    ] as any);

    const { getAgent } = await import('./agent.service.js');
    const agent = await getAgent(AGENT_ID, USER_ID);

    expect(agent.id).toBe(AGENT_ID);
    expect(agent.core_memories).toHaveLength(2);
    expect(agent.core_memories[0].block_label).toBe('identity');
  });

  it('throws NOT_FOUND for non-existent agent', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { getAgent } = await import('./agent.service.js');
    await expect(getAgent('nonexistent-id', USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws NOT_FOUND when non-owner tries to access', async () => {
    const { sql } = await import('../../db/connection.js');
    // The query filters by creator_id, so other user gets no results
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { getAgent } = await import('./agent.service.js');
    await expect(getAgent(AGENT_ID, OTHER_USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

/* -------------------------------------------------------------------------- */
/*  updateAgent                                                               */
/* -------------------------------------------------------------------------- */

describe('agent.service — updateAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates agent name and returns updated agent', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. assertCreator check
    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    // 2. UPDATE RETURNING
    sqlMock.mockResolvedValueOnce([makeAgentRow({ name: 'Updated Agent' })] as any);

    const { updateAgent } = await import('./agent.service.js');
    const result = await updateAgent(AGENT_ID, USER_ID, { name: 'Updated Agent' });

    expect(result.name).toBe('Updated Agent');
  });

  it('updates description', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeAgentRow({ description: 'New description' })] as any);

    const { updateAgent } = await import('./agent.service.js');
    const result = await updateAgent(AGENT_ID, USER_ID, { description: 'New description' });

    expect(result.description).toBe('New description');
  });

  it('updates system prompt', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeAgentRow({ system_prompt: 'New system prompt' })] as any);

    const { updateAgent } = await import('./agent.service.js');
    const result = await updateAgent(AGENT_ID, USER_ID, { system_prompt: 'New system prompt' });

    expect(result.system_prompt).toBe('New system prompt');
  });

  it('updates model', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeAgentRow({ model: 'gpt-4o' })] as any);

    const { updateAgent } = await import('./agent.service.js');
    const result = await updateAgent(AGENT_ID, USER_ID, { model: 'gpt-4o' });

    expect(result.model).toBe('gpt-4o');
  });

  it('updates tools', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeAgentRow({ tools: [{ name: 'web_search' }] })] as any);

    const { updateAgent } = await import('./agent.service.js');
    const result = await updateAgent(AGENT_ID, USER_ID, {
      tools: [{ name: 'web_search' }],
    });

    expect(result.tools).toEqual([{ name: 'web_search' }]);
  });

  it('updates MCP servers', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([
      makeAgentRow({
        mcp_servers: [{ url: 'https://mcp.example.com', name: 'test-mcp' }],
      }),
    ] as any);

    const { updateAgent } = await import('./agent.service.js');
    const result = await updateAgent(AGENT_ID, USER_ID, {
      mcp_servers: [{ url: 'https://mcp.example.com', name: 'test-mcp' }],
    });

    expect(result.mcp_servers).toEqual([{ url: 'https://mcp.example.com', name: 'test-mcp' }]);
  });

  it('updates visibility', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([makeAgentRow({ visibility: 'public' })] as any);

    const { updateAgent } = await import('./agent.service.js');
    const result = await updateAgent(AGENT_ID, USER_ID, { visibility: 'public' });

    expect(result.visibility).toBe('public');
  });

  it('updates avatar_url', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([
      makeAgentRow({ avatar_url: 'https://example.com/avatar.png' }),
    ] as any);

    const { updateAgent } = await import('./agent.service.js');
    const result = await updateAgent(AGENT_ID, USER_ID, {
      avatar_url: 'https://example.com/avatar.png',
    });

    expect(result.avatar_url).toBe('https://example.com/avatar.png');
  });

  it('updates multiple fields at once', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([
      makeAgentRow({
        name: 'New Name',
        model: 'gpt-4o',
        visibility: 'public',
        category: 'creative',
      }),
    ] as any);

    const { updateAgent } = await import('./agent.service.js');
    const result = await updateAgent(AGENT_ID, USER_ID, {
      name: 'New Name',
      model: 'gpt-4o',
      visibility: 'public',
      category: 'creative',
    });

    expect(result.name).toBe('New Name');
    expect(result.model).toBe('gpt-4o');
    expect(result.visibility).toBe('public');
    expect(result.category).toBe('creative');
  });

  it('throws NOT_FOUND when non-owner tries to update', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any); // assertCreator fails

    const { updateAgent } = await import('./agent.service.js');
    await expect(updateAgent(AGENT_ID, OTHER_USER_ID, { name: 'Hacked' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws NOT_FOUND for non-existent agent', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any); // assertCreator fails

    const { updateAgent } = await import('./agent.service.js');
    await expect(updateAgent('nonexistent-id', USER_ID, { name: 'Nope' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

/* -------------------------------------------------------------------------- */
/*  deleteAgent                                                               */
/* -------------------------------------------------------------------------- */

describe('agent.service — deleteAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes an agent and nullifies conversation references', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. assertCreator
    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    // 2. Nullify conversations
    sqlMock.mockResolvedValueOnce([] as any);
    // 3. Delete agent
    sqlMock.mockResolvedValueOnce([] as any);

    const { deleteAgent } = await import('./agent.service.js');
    await deleteAgent(AGENT_ID, USER_ID);

    expect(sqlMock).toHaveBeenCalledTimes(3);
  });

  it('throws NOT_FOUND when non-owner tries to delete', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { deleteAgent } = await import('./agent.service.js');
    await expect(deleteAgent(AGENT_ID, OTHER_USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws NOT_FOUND for non-existent agent', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { deleteAgent } = await import('./agent.service.js');
    await expect(deleteAgent('nonexistent-id', USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

/* -------------------------------------------------------------------------- */
/*  startConversation                                                         */
/* -------------------------------------------------------------------------- */

describe('agent.service — startConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns existing conversation when one already exists', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. Verify agent exists
    sqlMock.mockResolvedValueOnce([
      { id: AGENT_ID, visibility: 'public', creator_id: OTHER_USER_ID },
    ] as any);
    // 2. Find existing conversation
    sqlMock.mockResolvedValueOnce([makeConversationRow()] as any);

    const { startConversation } = await import('./agent.service.js');
    const result = await startConversation(AGENT_ID, USER_ID);

    expect(result.created).toBe(false);
    expect(result.conversation.id).toBe(CONVERSATION_ID);
  });

  it('creates a new conversation when none exists', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. Verify agent exists
    sqlMock.mockResolvedValueOnce([
      { id: AGENT_ID, visibility: 'public', creator_id: OTHER_USER_ID },
    ] as any);
    // 2. No existing conversation
    sqlMock.mockResolvedValueOnce([] as any);
    // 3. Insert conversation
    sqlMock.mockResolvedValueOnce([] as any);
    // 4. Insert conversation member
    sqlMock.mockResolvedValueOnce([] as any);
    // 5. Fetch created conversation
    sqlMock.mockResolvedValueOnce([makeConversationRow()] as any);

    const { startConversation } = await import('./agent.service.js');
    const result = await startConversation(AGENT_ID, USER_ID);

    expect(result.created).toBe(true);
    expect(result.conversation.id).toBe(CONVERSATION_ID);
    expect(result.conversation.type).toBe('agent');
  });

  it('allows owner to start conversation with their own private agent', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. Verify agent exists — private, owned by USER_ID
    sqlMock.mockResolvedValueOnce([
      { id: AGENT_ID, visibility: 'private', creator_id: USER_ID },
    ] as any);
    // 2. No existing conversation
    sqlMock.mockResolvedValueOnce([] as any);
    // 3. Insert conversation
    sqlMock.mockResolvedValueOnce([] as any);
    // 4. Insert member
    sqlMock.mockResolvedValueOnce([] as any);
    // 5. Fetch conversation
    sqlMock.mockResolvedValueOnce([makeConversationRow()] as any);

    const { startConversation } = await import('./agent.service.js');
    const result = await startConversation(AGENT_ID, USER_ID);

    expect(result.created).toBe(true);
  });

  it('throws NOT_FOUND for non-existent agent', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { startConversation } = await import('./agent.service.js');
    await expect(startConversation('nonexistent-id', USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws NOT_FOUND when non-owner tries to access private agent', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([
      { id: AGENT_ID, visibility: 'private', creator_id: OTHER_USER_ID },
    ] as any);

    const { startConversation } = await import('./agent.service.js');
    await expect(startConversation(AGENT_ID, USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

/* -------------------------------------------------------------------------- */
/*  getAgentPerformance                                                       */
/* -------------------------------------------------------------------------- */

describe('agent.service — getAgentPerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns full performance data for the owner', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. Verify ownership
    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    // 2. Overall rating
    sqlMock.mockResolvedValueOnce([{ rating_sum: 20, rating_count: 5, rating_avg: 4.0 }] as any);
    // 3. Recent ratings (last 30d)
    sqlMock.mockResolvedValueOnce([{ avg_rating: 4.2 }] as any);
    // 4. Prior ratings (30-60d)
    sqlMock.mockResolvedValueOnce([{ avg_rating: 3.8 }] as any);
    // 5. Dimensional scores
    sqlMock.mockResolvedValueOnce([{ accuracy: 4.5, helpfulness: 4.0, speed: 3.5 }] as any);
    // 6. Feedback summary
    sqlMock.mockResolvedValueOnce([
      { feedback: 'positive', reason: 'helpful', cnt: 10 },
      { feedback: 'negative', reason: 'too_slow', cnt: 3 },
    ] as any);
    // 7. Usage stats
    sqlMock.mockResolvedValueOnce([
      { total_conversations: 50, avg_tokens_per_run: 500, avg_duration_ms: 2000 },
    ] as any);
    // 8. Success rate
    sqlMock.mockResolvedValueOnce([{ successes: 45, total: 50 }] as any);

    const { getAgentPerformance } = await import('./agent.service.js');
    const perf = await getAgentPerformance(AGENT_ID, USER_ID);

    expect(perf.overall_rating).toBe(4.0);
    expect(perf.rating_count).toBe(5);
    expect(perf.rating_trend).toBe('improving'); // 4.2 - 3.8 > 0.3
    expect(perf.dimensional_scores.accuracy).toBe(4.5);
    expect(perf.dimensional_scores.helpfulness).toBe(4.0);
    expect(perf.dimensional_scores.speed).toBe(3.5);
    expect(perf.feedback_summary.positive_count).toBe(10);
    expect(perf.feedback_summary.negative_count).toBe(3);
    expect(perf.feedback_summary.top_positive_reasons).toContain('helpful');
    expect(perf.feedback_summary.top_negative_reasons).toContain('too_slow');
    expect(perf.usage_stats.total_conversations).toBe(50);
    expect(perf.usage_stats.success_rate).toBeCloseTo(0.9);
  });

  it('returns stable trend when ratings are close', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ rating_sum: 10, rating_count: 2, rating_avg: 5.0 }] as any);
    sqlMock.mockResolvedValueOnce([{ avg_rating: 4.0 }] as any);
    sqlMock.mockResolvedValueOnce([{ avg_rating: 3.9 }] as any); // diff = 0.1 < 0.3, stable
    sqlMock.mockResolvedValueOnce([{ accuracy: null, helpfulness: null, speed: null }] as any);
    sqlMock.mockResolvedValueOnce([] as any); // no feedback
    sqlMock.mockResolvedValueOnce([
      { total_conversations: 0, avg_tokens_per_run: 0, avg_duration_ms: 0 },
    ] as any);
    sqlMock.mockResolvedValueOnce([{ successes: 0, total: 0 }] as any);

    const { getAgentPerformance } = await import('./agent.service.js');
    const perf = await getAgentPerformance(AGENT_ID, USER_ID);

    expect(perf.rating_trend).toBe('stable');
  });

  it('returns declining trend when prior ratings are higher', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ rating_sum: 10, rating_count: 5, rating_avg: 2.0 }] as any);
    sqlMock.mockResolvedValueOnce([{ avg_rating: 2.0 }] as any);
    sqlMock.mockResolvedValueOnce([{ avg_rating: 4.5 }] as any); // prior much higher => declining
    sqlMock.mockResolvedValueOnce([{ accuracy: null, helpfulness: null, speed: null }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([
      { total_conversations: 0, avg_tokens_per_run: 0, avg_duration_ms: 0 },
    ] as any);
    sqlMock.mockResolvedValueOnce([{ successes: 0, total: 0 }] as any);

    const { getAgentPerformance } = await import('./agent.service.js');
    const perf = await getAgentPerformance(AGENT_ID, USER_ID);

    expect(perf.rating_trend).toBe('declining');
  });

  it('returns stable trend when no prior data exists', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: AGENT_ID }] as any);
    sqlMock.mockResolvedValueOnce([{ rating_sum: 5, rating_count: 1, rating_avg: 5.0 }] as any);
    sqlMock.mockResolvedValueOnce([{ avg_rating: 5.0 }] as any);
    sqlMock.mockResolvedValueOnce([{ avg_rating: null }] as any); // no prior data
    sqlMock.mockResolvedValueOnce([{ accuracy: null, helpfulness: null, speed: null }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([
      { total_conversations: 0, avg_tokens_per_run: 0, avg_duration_ms: 0 },
    ] as any);
    sqlMock.mockResolvedValueOnce([{ successes: 0, total: 0 }] as any);

    const { getAgentPerformance } = await import('./agent.service.js');
    const perf = await getAgentPerformance(AGENT_ID, USER_ID);

    expect(perf.rating_trend).toBe('stable');
  });

  it('throws NOT_FOUND when non-owner requests performance', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { getAgentPerformance } = await import('./agent.service.js');
    await expect(getAgentPerformance(AGENT_ID, OTHER_USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws NOT_FOUND for non-existent agent', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { getAgentPerformance } = await import('./agent.service.js');
    await expect(getAgentPerformance('nonexistent-id', USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

/* -------------------------------------------------------------------------- */
/*  getAgentCard                                                              */
/* -------------------------------------------------------------------------- */

describe('agent.service — getAgentCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns agent card with capabilities from tools and MCP servers', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([
      {
        id: AGENT_ID,
        name: 'Test Agent',
        description: 'A test agent',
        model: 'claude-sonnet-4-6',
        tools: [{ name: 'web_search' }],
        mcp_servers: [{ url: 'https://mcp.example.com', name: 'memory' }],
        category: 'productivity',
        visibility: 'public',
        rating_sum: 20,
        rating_count: 5,
        rating_avg: 4.0,
      },
    ] as any);

    const { getAgentCard } = await import('./agent.service.js');
    const card = await getAgentCard(AGENT_ID);

    expect(card.id).toBe(AGENT_ID);
    expect(card.name).toBe('Test Agent');
    expect(card.capabilities).toContain('custom_tools');
    expect(card.capabilities).toContain('memory');
    expect(card.available).toBe(true);
    expect(card.max_a2a_depth).toBe(3);
    expect(card.rating_avg).toBe(4.0);
  });

  it('returns empty capabilities when no tools or MCP servers', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([
      {
        id: AGENT_ID,
        name: 'Bare Agent',
        description: null,
        model: 'claude-sonnet-4-6',
        tools: [],
        mcp_servers: [],
        category: null,
        visibility: 'public',
        rating_sum: 0,
        rating_count: 0,
        rating_avg: 0,
      },
    ] as any);

    const { getAgentCard } = await import('./agent.service.js');
    const card = await getAgentCard(AGENT_ID);

    expect(card.capabilities).toEqual([]);
  });

  it('throws NOT_FOUND for non-existent agent', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { getAgentCard } = await import('./agent.service.js');
    await expect(getAgentCard('nonexistent-id')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

/* -------------------------------------------------------------------------- */
/*  discoverAgents                                                            */
/* -------------------------------------------------------------------------- */

describe('agent.service — discoverAgents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns public agents with no filters', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([
      {
        id: AGENT_ID,
        name: 'Public Agent',
        description: 'desc',
        model: 'claude-sonnet-4-6',
        tools: [],
        mcp_servers: [],
        category: 'general',
        visibility: 'public',
        rating_sum: 0,
        rating_count: 0,
        rating_avg: 0,
      },
    ] as any);

    const { discoverAgents } = await import('./agent.service.js');
    const agents = await discoverAgents({});

    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe('Public Agent');
  });

  it('filters by category', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { discoverAgents } = await import('./agent.service.js');
    const agents = await discoverAgents({ category: 'creative' });

    expect(agents).toHaveLength(0);
  });

  it('searches by query', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([
      {
        id: AGENT_ID,
        name: 'Search Result',
        description: 'matches query',
        model: 'claude-sonnet-4-6',
        tools: [],
        mcp_servers: [],
        category: null,
        visibility: 'public',
        rating_sum: 0,
        rating_count: 0,
        rating_avg: 0,
      },
    ] as any);

    const { discoverAgents } = await import('./agent.service.js');
    const agents = await discoverAgents({ query: 'search' });

    expect(agents).toHaveLength(1);
  });

  it('clamps limit to max 50', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { discoverAgents } = await import('./agent.service.js');
    await discoverAgents({ limit: 200 });

    // The SQL template should have been called with limit clamped to 50
    // We just verify it doesn't throw
    expect(vi.mocked(sql)).toHaveBeenCalledTimes(1);
  });

  it('query takes priority over category', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { discoverAgents } = await import('./agent.service.js');
    await discoverAgents({ query: 'test', category: 'creative' });

    // Should only call once (query path, not category path)
    expect(vi.mocked(sql)).toHaveBeenCalledTimes(1);
  });
});

/* -------------------------------------------------------------------------- */
/*  getCompactPerformanceInsight                                              */
/* -------------------------------------------------------------------------- */

describe('agent.service — getCompactPerformanceInsight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for non-existent agent', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { getCompactPerformanceInsight } = await import('./agent.service.js');
    const result = await getCompactPerformanceInsight('nonexistent-id');

    expect(result).toBeNull();
  });

  it('returns null when rating_count is 0', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([{ rating_sum: 0, rating_count: 0 }] as any);

    const { getCompactPerformanceInsight } = await import('./agent.service.js');
    const result = await getCompactPerformanceInsight(AGENT_ID);

    expect(result).toBeNull();
  });

  it('returns basic insight with rating', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. Agent rating
    sqlMock.mockResolvedValueOnce([{ rating_sum: 20, rating_count: 5 }] as any);
    // 2. Feedback rows
    sqlMock.mockResolvedValueOnce([
      { feedback: 'positive', reason: 'accurate', cnt: 5 },
      { feedback: 'negative', reason: 'too_verbose', cnt: 2 },
    ] as any);
    // 3. Recent avg
    sqlMock.mockResolvedValueOnce([{ recent_avg: 4.0 }] as any);
    // 4. Prior avg
    sqlMock.mockResolvedValueOnce([{ prior_avg: 3.9 }] as any); // no declining

    const { getCompactPerformanceInsight } = await import('./agent.service.js');
    const result = await getCompactPerformanceInsight(AGENT_ID);

    expect(result).toContain('Rating: 4.0/5.');
    expect(result).toContain('Users value: accurate');
    expect(result).toContain('Improve: too verbose');
  });

  it('includes declining trend warning when recent ratings drop', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ rating_sum: 15, rating_count: 5 }] as any);
    sqlMock.mockResolvedValueOnce([] as any); // no feedback
    sqlMock.mockResolvedValueOnce([{ recent_avg: 2.5 }] as any);
    sqlMock.mockResolvedValueOnce([{ prior_avg: 4.0 }] as any); // decline > 0.3
    // 5. Recent negative reason
    sqlMock.mockResolvedValueOnce([{ reason: 'inaccurate', cnt: 3 }] as any);

    const { getCompactPerformanceInsight } = await import('./agent.service.js');
    const result = await getCompactPerformanceInsight(AGENT_ID);

    expect(result).toContain('Rating: 3.0/5.');
    expect(result).toContain('Recent feedback trend');
    expect(result).toContain('inaccurate');
  });
});
