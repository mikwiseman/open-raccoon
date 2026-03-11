/* eslint-disable @typescript-eslint/no-explicit-any */
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { agentRoutes } from './agent.routes.js';

// Mock DB connection
vi.mock('../../db/connection.js', () => ({
  sql: Object.assign(vi.fn(), { unsafe: vi.fn() }),
  db: {},
}));

// Mock agent service
vi.mock('./agent.service.js', () => ({
  listAgents: vi.fn(),
  createAgent: vi.fn(),
  getAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
  getAgentPerformance: vi.fn(),
  startConversation: vi.fn(),
}));

// Mock templates
vi.mock('./templates.js', () => ({
  listTemplates: vi.fn(() => [
    {
      slug: 'pr_manager',
      name: 'PR Manager',
      description: 'Manages proposals',
      systemPrompt: 'You are a PR Manager',
      model: 'claude-sonnet-4-6',
      tools: [],
      mcpServers: [],
      coreMemories: [],
    },
  ]),
  getTemplate: vi.fn(),
}));

async function getTokenHeader(): Promise<Record<string, string>> {
  const { generateTokens } = await import('../auth/auth.service.js');
  const { access_token } = await generateTokens('user-uuid', 'user');
  return { Authorization: `Bearer ${access_token}` };
}

function buildApp() {
  const app = new Hono();
  app.route('/agents', agentRoutes);
  return app;
}

async function request(
  app: ReturnType<typeof buildApp>,
  method: string,
  path: string,
  opts: { body?: unknown; headers?: Record<string, string> } = {},
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...opts.headers,
  };
  const req = new Request(`http://localhost${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const res = await app.fetch(req);
  const json = (await res.json().catch(() => null)) as any;
  return { status: res.status, body: json };
}

let app: ReturnType<typeof buildApp>;

beforeEach(() => {
  vi.clearAllMocks();
  app = buildApp();
});

/* -------------------------------------------------------------------------- */
/*  Authentication                                                            */
/* -------------------------------------------------------------------------- */

describe('Agent Routes — Authentication', () => {
  it('GET /agents returns 401 without auth token', async () => {
    const { status, body } = await request(app, 'GET', '/agents');
    expect(status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('POST /agents returns 401 without auth token', async () => {
    const { status } = await request(app, 'POST', '/agents', {
      body: { name: 'Test' },
    });
    expect(status).toBe(401);
  });

  it('GET /agents/:id returns 401 without auth token', async () => {
    const { status } = await request(app, 'GET', '/agents/some-id');
    expect(status).toBe(401);
  });

  it('PATCH /agents/:id returns 401 without auth token', async () => {
    const { status } = await request(app, 'PATCH', '/agents/some-id', {
      body: { name: 'Updated' },
    });
    expect(status).toBe(401);
  });

  it('DELETE /agents/:id returns 401 without auth token', async () => {
    const { status } = await request(app, 'DELETE', '/agents/some-id');
    expect(status).toBe(401);
  });

  it('GET /agents/:id/performance returns 401 without auth token', async () => {
    const { status } = await request(app, 'GET', '/agents/some-id/performance');
    expect(status).toBe(401);
  });

  it('POST /agents/:id/conversation returns 401 without auth token', async () => {
    const { status } = await request(app, 'POST', '/agents/some-id/conversation');
    expect(status).toBe(401);
  });

  it('GET /agents/templates returns 401 without auth token', async () => {
    const { status } = await request(app, 'GET', '/agents/templates');
    expect(status).toBe(401);
  });

  it('rejects invalid auth token with 401', async () => {
    const { status } = await request(app, 'GET', '/agents', {
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    expect(status).toBe(401);
  });
});

/* -------------------------------------------------------------------------- */
/*  GET /agents/templates                                                     */
/* -------------------------------------------------------------------------- */

describe('GET /agents/templates', () => {
  it('returns 200 with list of templates', async () => {
    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'GET', '/agents/templates', {
      headers: authHeaders,
    });

    expect(status).toBe(200);
    expect(body.templates).toHaveLength(1);
    expect(body.templates[0].slug).toBe('pr_manager');
  });
});

/* -------------------------------------------------------------------------- */
/*  GET /agents                                                               */
/* -------------------------------------------------------------------------- */

describe('GET /agents', () => {
  it('returns 200 with agents list', async () => {
    const { listAgents } = await import('./agent.service.js');
    vi.mocked(listAgents).mockResolvedValueOnce([
      {
        id: 'agent-1',
        creator_id: 'user-uuid',
        name: 'My Agent',
        slug: 'my-agent',
        description: null,
        avatar_url: null,
        system_prompt: 'prompt',
        model: 'claude-sonnet-4-6',
        temperature: 0.7,
        max_tokens: 4096,
        tools: [],
        mcp_servers: [],
        visibility: 'private',
        category: null,
        usage_count: 0,
        rating_sum: 0,
        rating_count: 0,
        execution_mode: 'raw',
        metadata: {},
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'GET', '/agents', {
      headers: authHeaders,
    });

    expect(status).toBe(200);
    expect(body.agents).toHaveLength(1);
    expect(body.agents[0].name).toBe('My Agent');
  });

  it('returns 200 with empty list when user has no agents', async () => {
    const { listAgents } = await import('./agent.service.js');
    vi.mocked(listAgents).mockResolvedValueOnce([]);

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'GET', '/agents', {
      headers: authHeaders,
    });

    expect(status).toBe(200);
    expect(body.agents).toHaveLength(0);
  });
});

/* -------------------------------------------------------------------------- */
/*  POST /agents                                                              */
/* -------------------------------------------------------------------------- */

describe('POST /agents', () => {
  it('returns 201 with created agent', async () => {
    const { createAgent } = await import('./agent.service.js');
    vi.mocked(createAgent).mockResolvedValueOnce({
      id: 'new-agent',
      creator_id: 'user-uuid',
      name: 'New Agent',
      slug: 'new-agent',
      description: null,
      avatar_url: null,
      system_prompt: '',
      model: 'claude-sonnet-4-6',
      temperature: 0.7,
      max_tokens: 4096,
      tools: [],
      mcp_servers: [],
      visibility: 'private',
      category: null,
      usage_count: 0,
      rating_sum: 0,
      rating_count: 0,
      execution_mode: 'raw',
      metadata: {},
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      core_memories: [],
    } as any);

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'POST', '/agents', {
      headers: authHeaders,
      body: { name: 'New Agent' },
    });

    expect(status).toBe(201);
    expect(body.agent.name).toBe('New Agent');
  });

  it('returns 422 for missing name', async () => {
    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'POST', '/agents', {
      headers: authHeaders,
      body: {},
    });

    expect(status).toBe(422);
    expect(body.error).toBe('Validation error');
  });

  it('returns 422 for empty name', async () => {
    const authHeaders = await getTokenHeader();
    const { status } = await request(app, 'POST', '/agents', {
      headers: authHeaders,
      body: { name: '' },
    });

    expect(status).toBe(422);
  });

  it('returns 422 for name exceeding 64 chars', async () => {
    const authHeaders = await getTokenHeader();
    const { status } = await request(app, 'POST', '/agents', {
      headers: authHeaders,
      body: { name: 'a'.repeat(65) },
    });

    expect(status).toBe(422);
  });

  it('returns 422 for invalid model', async () => {
    const authHeaders = await getTokenHeader();
    const { status } = await request(app, 'POST', '/agents', {
      headers: authHeaders,
      body: { name: 'Test', model: 'invalid-model' },
    });

    expect(status).toBe(422);
  });

  it('returns 422 for invalid visibility', async () => {
    const authHeaders = await getTokenHeader();
    const { status } = await request(app, 'POST', '/agents', {
      headers: authHeaders,
      body: { name: 'Test', visibility: 'invalid' },
    });

    expect(status).toBe(422);
  });

  it('returns 422 for invalid mcp_servers format', async () => {
    const authHeaders = await getTokenHeader();
    const { status } = await request(app, 'POST', '/agents', {
      headers: authHeaders,
      body: { name: 'Test', mcp_servers: [{ url: 'not-a-url', name: 'test' }] },
    });

    expect(status).toBe(422);
  });

  it('returns 422 for temperature out of range', async () => {
    const authHeaders = await getTokenHeader();
    const { status } = await request(app, 'POST', '/agents', {
      headers: authHeaders,
      body: { name: 'Test', temperature: 3.0 },
    });

    expect(status).toBe(422);
  });

  it('returns 422 for max_tokens out of range', async () => {
    const authHeaders = await getTokenHeader();
    const { status } = await request(app, 'POST', '/agents', {
      headers: authHeaders,
      body: { name: 'Test', max_tokens: 0 },
    });

    expect(status).toBe(422);
  });

  it('returns 422 for invalid JSON body', async () => {
    const authHeaders = await getTokenHeader();
    const res = await app.fetch(
      new Request('http://localhost/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: 'not-json',
      }),
    );
    expect(res.status).toBe(422);
  });

  it('returns 400 for invalid template name', async () => {
    const { createAgent } = await import('./agent.service.js');
    vi.mocked(createAgent).mockRejectedValueOnce(
      Object.assign(new Error("Template 'bad' not found"), { code: 'BAD_REQUEST' }),
    );

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'POST', '/agents', {
      headers: authHeaders,
      body: { name: 'Agent', template: 'bad' },
    });

    expect(status).toBe(400);
    expect(body.error).toBe('Bad request');
  });

  it('accepts valid model values', async () => {
    const { createAgent } = await import('./agent.service.js');
    vi.mocked(createAgent).mockResolvedValueOnce({
      id: 'id',
      name: 'Test',
      model: 'gpt-4o',
    } as any);

    const authHeaders = await getTokenHeader();
    const { status } = await request(app, 'POST', '/agents', {
      headers: authHeaders,
      body: { name: 'Test', model: 'gpt-4o' },
    });

    expect(status).toBe(201);
  });

  it('creates agent with all optional fields', async () => {
    const { createAgent } = await import('./agent.service.js');
    vi.mocked(createAgent).mockResolvedValueOnce({
      id: 'id',
      name: 'Full Agent',
      model: 'claude-opus-4-6',
      tools: [{ name: 'web_search' }],
      mcp_servers: [{ url: 'https://mcp.example.com', name: 'mem' }],
      visibility: 'public',
      category: 'creative',
      system_prompt: 'Hello',
      description: 'A full agent',
    } as any);

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'POST', '/agents', {
      headers: authHeaders,
      body: {
        name: 'Full Agent',
        model: 'claude-opus-4-6',
        tools: [{ name: 'web_search' }],
        mcp_servers: [{ url: 'https://mcp.example.com', name: 'mem' }],
        visibility: 'public',
        category: 'creative',
        system_prompt: 'Hello',
        description: 'A full agent',
      },
    });

    expect(status).toBe(201);
    expect(body.agent.name).toBe('Full Agent');
  });
});

/* -------------------------------------------------------------------------- */
/*  GET /agents/:id                                                           */
/* -------------------------------------------------------------------------- */

describe('GET /agents/:id', () => {
  it('returns 200 with agent data', async () => {
    const { getAgent } = await import('./agent.service.js');
    vi.mocked(getAgent).mockResolvedValueOnce({
      id: 'agent-1',
      name: 'My Agent',
      core_memories: [{ id: 'mem-1', block_label: 'identity', content: 'test' }],
    } as any);

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'GET', '/agents/agent-1', {
      headers: authHeaders,
    });

    expect(status).toBe(200);
    expect(body.agent.name).toBe('My Agent');
    expect(body.agent.core_memories).toHaveLength(1);
  });

  it('returns 404 for non-existent agent', async () => {
    const { getAgent } = await import('./agent.service.js');
    vi.mocked(getAgent).mockRejectedValueOnce(
      Object.assign(new Error('Agent not found'), { code: 'NOT_FOUND' }),
    );

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'GET', '/agents/nonexistent', {
      headers: authHeaders,
    });

    expect(status).toBe(404);
    expect(body.error).toBe('Not found');
  });

  it('returns 404 when non-owner tries to access', async () => {
    const { getAgent } = await import('./agent.service.js');
    vi.mocked(getAgent).mockRejectedValueOnce(
      Object.assign(new Error('Agent not found'), { code: 'NOT_FOUND' }),
    );

    const authHeaders = await getTokenHeader();
    const { status } = await request(app, 'GET', '/agents/other-user-agent', {
      headers: authHeaders,
    });

    expect(status).toBe(404);
  });
});

/* -------------------------------------------------------------------------- */
/*  PATCH /agents/:id                                                         */
/* -------------------------------------------------------------------------- */

describe('PATCH /agents/:id', () => {
  it('returns 200 with updated agent', async () => {
    const { updateAgent } = await import('./agent.service.js');
    vi.mocked(updateAgent).mockResolvedValueOnce({
      id: 'agent-1',
      name: 'Updated Name',
    } as any);

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'PATCH', '/agents/agent-1', {
      headers: authHeaders,
      body: { name: 'Updated Name' },
    });

    expect(status).toBe(200);
    expect(body.agent.name).toBe('Updated Name');
  });

  it('returns 422 for invalid model in update', async () => {
    const authHeaders = await getTokenHeader();
    const { status } = await request(app, 'PATCH', '/agents/agent-1', {
      headers: authHeaders,
      body: { model: 'nonexistent-model' },
    });

    expect(status).toBe(422);
  });

  it('returns 422 for invalid visibility in update', async () => {
    const authHeaders = await getTokenHeader();
    const { status } = await request(app, 'PATCH', '/agents/agent-1', {
      headers: authHeaders,
      body: { visibility: 'secret' },
    });

    expect(status).toBe(422);
  });

  it('returns 422 for invalid avatar_url', async () => {
    const authHeaders = await getTokenHeader();
    const { status } = await request(app, 'PATCH', '/agents/agent-1', {
      headers: authHeaders,
      body: { avatar_url: 'not-a-url' },
    });

    expect(status).toBe(422);
  });

  it('returns 422 for temperature out of range', async () => {
    const authHeaders = await getTokenHeader();
    const { status } = await request(app, 'PATCH', '/agents/agent-1', {
      headers: authHeaders,
      body: { temperature: -1 },
    });

    expect(status).toBe(422);
  });

  it('returns 404 when updating non-existent agent', async () => {
    const { updateAgent } = await import('./agent.service.js');
    vi.mocked(updateAgent).mockRejectedValueOnce(
      Object.assign(new Error('Agent not found or access denied'), { code: 'NOT_FOUND' }),
    );

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'PATCH', '/agents/nonexistent', {
      headers: authHeaders,
      body: { name: 'Nope' },
    });

    expect(status).toBe(404);
    expect(body.error).toBe('Not found');
  });

  it('returns 404 when non-owner tries to update', async () => {
    const { updateAgent } = await import('./agent.service.js');
    vi.mocked(updateAgent).mockRejectedValueOnce(
      Object.assign(new Error('Agent not found or access denied'), { code: 'NOT_FOUND' }),
    );

    const authHeaders = await getTokenHeader();
    const { status } = await request(app, 'PATCH', '/agents/other-agent', {
      headers: authHeaders,
      body: { name: 'Hacked' },
    });

    expect(status).toBe(404);
  });

  it('returns 422 for invalid JSON body', async () => {
    const authHeaders = await getTokenHeader();
    const res = await app.fetch(
      new Request('http://localhost/agents/agent-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: 'not-json',
      }),
    );
    expect(res.status).toBe(422);
  });

  it('updates multiple fields', async () => {
    const { updateAgent } = await import('./agent.service.js');
    vi.mocked(updateAgent).mockResolvedValueOnce({
      id: 'agent-1',
      name: 'New Name',
      model: 'gpt-4o',
      visibility: 'public',
    } as any);

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'PATCH', '/agents/agent-1', {
      headers: authHeaders,
      body: { name: 'New Name', model: 'gpt-4o', visibility: 'public' },
    });

    expect(status).toBe(200);
    expect(body.agent.name).toBe('New Name');
    expect(body.agent.model).toBe('gpt-4o');
  });
});

/* -------------------------------------------------------------------------- */
/*  DELETE /agents/:id                                                        */
/* -------------------------------------------------------------------------- */

describe('DELETE /agents/:id', () => {
  it('returns 200 with ok true on successful deletion', async () => {
    const { deleteAgent } = await import('./agent.service.js');
    vi.mocked(deleteAgent).mockResolvedValueOnce(undefined);

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'DELETE', '/agents/agent-1', {
      headers: authHeaders,
    });

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it('returns 404 when deleting non-existent agent', async () => {
    const { deleteAgent } = await import('./agent.service.js');
    vi.mocked(deleteAgent).mockRejectedValueOnce(
      Object.assign(new Error('Agent not found or access denied'), { code: 'NOT_FOUND' }),
    );

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'DELETE', '/agents/nonexistent', {
      headers: authHeaders,
    });

    expect(status).toBe(404);
    expect(body.error).toBe('Not found');
  });

  it('returns 404 when non-owner tries to delete', async () => {
    const { deleteAgent } = await import('./agent.service.js');
    vi.mocked(deleteAgent).mockRejectedValueOnce(
      Object.assign(new Error('Agent not found or access denied'), { code: 'NOT_FOUND' }),
    );

    const authHeaders = await getTokenHeader();
    const { status } = await request(app, 'DELETE', '/agents/other-agent', {
      headers: authHeaders,
    });

    expect(status).toBe(404);
  });
});

/* -------------------------------------------------------------------------- */
/*  GET /agents/:id/performance                                               */
/* -------------------------------------------------------------------------- */

describe('GET /agents/:id/performance', () => {
  it('returns 200 with performance data', async () => {
    const { getAgentPerformance } = await import('./agent.service.js');
    vi.mocked(getAgentPerformance).mockResolvedValueOnce({
      overall_rating: 4.0,
      rating_count: 10,
      rating_trend: 'improving',
      dimensional_scores: { accuracy: 4.5, helpfulness: 4.0, speed: 3.5 },
      feedback_summary: {
        positive_count: 8,
        negative_count: 2,
        top_positive_reasons: ['helpful'],
        top_negative_reasons: ['slow'],
      },
      usage_stats: {
        total_conversations: 50,
        avg_tokens_per_run: 500,
        avg_duration_ms: 2000,
        success_rate: 0.9,
      },
    });

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'GET', '/agents/agent-1/performance', {
      headers: authHeaders,
    });

    expect(status).toBe(200);
    expect(body.performance.overall_rating).toBe(4.0);
    expect(body.performance.rating_trend).toBe('improving');
    expect(body.performance.usage_stats.success_rate).toBe(0.9);
  });

  it('returns 404 for non-existent or non-owned agent', async () => {
    const { getAgentPerformance } = await import('./agent.service.js');
    vi.mocked(getAgentPerformance).mockRejectedValueOnce(
      Object.assign(new Error('Agent not found or access denied'), { code: 'NOT_FOUND' }),
    );

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'GET', '/agents/nonexistent/performance', {
      headers: authHeaders,
    });

    expect(status).toBe(404);
    expect(body.error).toBe('Not found');
  });
});

/* -------------------------------------------------------------------------- */
/*  POST /agents/:id/conversation                                            */
/* -------------------------------------------------------------------------- */

describe('POST /agents/:id/conversation', () => {
  it('returns 201 when new conversation is created', async () => {
    const { startConversation } = await import('./agent.service.js');
    vi.mocked(startConversation).mockResolvedValueOnce({
      conversation: {
        id: 'conv-1',
        type: 'agent',
        title: null,
        avatar_url: null,
        creator_id: 'user-uuid',
        agent_id: 'agent-1',
        metadata: {},
        last_message_at: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      created: true,
    });

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'POST', '/agents/agent-1/conversation', {
      headers: authHeaders,
    });

    expect(status).toBe(201);
    expect(body.conversation.id).toBe('conv-1');
    expect(body.conversation.type).toBe('agent');
  });

  it('returns 200 when existing conversation is returned', async () => {
    const { startConversation } = await import('./agent.service.js');
    vi.mocked(startConversation).mockResolvedValueOnce({
      conversation: {
        id: 'conv-existing',
        type: 'agent',
        title: null,
        avatar_url: null,
        creator_id: 'user-uuid',
        agent_id: 'agent-1',
        metadata: {},
        last_message_at: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      created: false,
    });

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'POST', '/agents/agent-1/conversation', {
      headers: authHeaders,
    });

    expect(status).toBe(200);
    expect(body.conversation.id).toBe('conv-existing');
  });

  it('returns 404 for non-existent agent', async () => {
    const { startConversation } = await import('./agent.service.js');
    vi.mocked(startConversation).mockRejectedValueOnce(
      Object.assign(new Error('Agent not found'), { code: 'NOT_FOUND' }),
    );

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'POST', '/agents/nonexistent/conversation', {
      headers: authHeaders,
    });

    expect(status).toBe(404);
    expect(body.error).toBe('Not found');
  });

  it('returns 404 when accessing private agent owned by another user', async () => {
    const { startConversation } = await import('./agent.service.js');
    vi.mocked(startConversation).mockRejectedValueOnce(
      Object.assign(new Error('Agent not found'), { code: 'NOT_FOUND' }),
    );

    const authHeaders = await getTokenHeader();
    const { status } = await request(app, 'POST', '/agents/private-agent/conversation', {
      headers: authHeaders,
    });

    expect(status).toBe(404);
  });
});
