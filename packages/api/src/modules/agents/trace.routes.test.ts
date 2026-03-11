/* eslint-disable @typescript-eslint/no-explicit-any */
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { traceRoutes } from './trace.routes.js';

// Mock DB connection
vi.mock('../../db/connection.js', () => ({
  sql: Object.assign(vi.fn(), { unsafe: vi.fn() }),
  db: {},
}));

// Mock trace service
vi.mock('./trace.service.js', () => ({
  listTraces: vi.fn(),
  getTrace: vi.fn(),
  getTraceSpans: vi.fn(),
}));

async function getTokenHeader(): Promise<Record<string, string>> {
  const { generateTokens } = await import('../auth/auth.service.js');
  const { access_token } = await generateTokens('user-uuid', 'user');
  return { Authorization: `Bearer ${access_token}` };
}

function buildApp() {
  const app = new Hono();
  app.route('/agents', traceRoutes);
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

const AGENT_ID = '880e8400-e29b-41d4-a716-446655440003';
const TRACE_ID = 'bb0e8400-e29b-41d4-a716-446655440010';

beforeEach(() => {
  vi.clearAllMocks();
  app = buildApp();
});

/* -------------------------------------------------------------------------- */
/*  Authentication                                                            */
/* -------------------------------------------------------------------------- */

describe('Trace Routes — Authentication', () => {
  it('GET /agents/:agentId/traces returns 401 without auth', async () => {
    const { status, body } = await request(app, 'GET', `/agents/${AGENT_ID}/traces`);
    expect(status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('GET /agents/:agentId/traces/:traceId returns 401 without auth', async () => {
    const { status } = await request(app, 'GET', `/agents/${AGENT_ID}/traces/${TRACE_ID}`);
    expect(status).toBe(401);
  });

  it('rejects invalid auth token with 401', async () => {
    const { status } = await request(app, 'GET', `/agents/${AGENT_ID}/traces`, {
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    expect(status).toBe(401);
  });
});

/* -------------------------------------------------------------------------- */
/*  GET /agents/:agentId/traces                                               */
/* -------------------------------------------------------------------------- */

describe('GET /agents/:agentId/traces', () => {
  it('returns 200 with traces list', async () => {
    const { listTraces } = await import('./trace.service.js');
    vi.mocked(listTraces).mockResolvedValueOnce([
      {
        id: TRACE_ID,
        run_id: 'run-1',
        agent_id: AGENT_ID,
        user_id: 'user-uuid',
        conversation_id: null,
        trigger_type: 'manual',
        status: 'completed',
        model: 'claude-sonnet-4-6',
        total_input_tokens: 100,
        total_output_tokens: 50,
        total_duration_ms: 1500,
        total_tool_calls: 1,
        total_llm_calls: 2,
        error_message: null,
        started_at: '2026-01-01T00:00:00.000Z',
        finished_at: '2026-01-01T00:00:01.500Z',
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'GET', `/agents/${AGENT_ID}/traces`, {
      headers: authHeaders,
    });

    expect(status).toBe(200);
    expect(body.traces).toHaveLength(1);
    expect(body.traces[0].status).toBe('completed');
  });

  it('returns 200 with empty list', async () => {
    const { listTraces } = await import('./trace.service.js');
    vi.mocked(listTraces).mockResolvedValueOnce([]);

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'GET', `/agents/${AGENT_ID}/traces`, {
      headers: authHeaders,
    });

    expect(status).toBe(200);
    expect(body.traces).toHaveLength(0);
  });

  it('returns 404 when agent not found', async () => {
    const { listTraces } = await import('./trace.service.js');
    vi.mocked(listTraces).mockRejectedValueOnce(
      Object.assign(new Error('Agent not found or access denied'), { code: 'NOT_FOUND' }),
    );

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'GET', `/agents/${AGENT_ID}/traces`, {
      headers: authHeaders,
    });

    expect(status).toBe(404);
    expect(body.error).toBe('Not found');
  });

  it('passes query params to service', async () => {
    const { listTraces } = await import('./trace.service.js');
    vi.mocked(listTraces).mockResolvedValueOnce([]);

    const authHeaders = await getTokenHeader();
    await request(app, 'GET', `/agents/${AGENT_ID}/traces?status=failed&limit=5&offset=10`, {
      headers: authHeaders,
    });

    expect(vi.mocked(listTraces)).toHaveBeenCalledWith(AGENT_ID, 'user-uuid', {
      status: 'failed',
      limit: 5,
      offset: 10,
    });
  });
});

/* -------------------------------------------------------------------------- */
/*  GET /agents/:agentId/traces/:traceId                                      */
/* -------------------------------------------------------------------------- */

describe('GET /agents/:agentId/traces/:traceId', () => {
  it('returns 200 with trace and spans', async () => {
    const { getTrace } = await import('./trace.service.js');
    vi.mocked(getTrace).mockResolvedValueOnce({
      id: TRACE_ID,
      run_id: 'run-1',
      agent_id: AGENT_ID,
      user_id: 'user-uuid',
      conversation_id: null,
      trigger_type: 'manual',
      status: 'completed',
      model: 'claude-sonnet-4-6',
      total_input_tokens: 100,
      total_output_tokens: 50,
      total_duration_ms: 1500,
      total_tool_calls: 1,
      total_llm_calls: 2,
      error_message: null,
      started_at: '2026-01-01T00:00:00.000Z',
      finished_at: '2026-01-01T00:00:01.500Z',
      created_at: '2026-01-01T00:00:00.000Z',
      spans: [
        {
          id: 'span-1',
          trace_id: TRACE_ID,
          span_type: 'llm_call',
          name: 'claude-sonnet-4-6',
          seq: 0,
          status: 'ok',
          input: { turn: 0 },
          output: { stop_reason: 'end_turn' },
          token_usage: { input_tokens: 100, output_tokens: 50 },
          duration_ms: 500,
          metadata: {},
          started_at: '2026-01-01T00:00:00.000Z',
          finished_at: '2026-01-01T00:00:00.500Z',
        },
      ],
    });

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'GET', `/agents/${AGENT_ID}/traces/${TRACE_ID}`, {
      headers: authHeaders,
    });

    expect(status).toBe(200);
    expect(body.trace.id).toBe(TRACE_ID);
    expect(body.trace.spans).toHaveLength(1);
    expect(body.trace.spans[0].span_type).toBe('llm_call');
  });

  it('returns 404 for non-existent trace', async () => {
    const { getTrace } = await import('./trace.service.js');
    vi.mocked(getTrace).mockRejectedValueOnce(
      Object.assign(new Error('Trace not found'), { code: 'NOT_FOUND' }),
    );

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'GET', `/agents/${AGENT_ID}/traces/nonexistent`, {
      headers: authHeaders,
    });

    expect(status).toBe(404);
    expect(body.error).toBe('Not found');
  });

  it('returns 404 when non-owner tries to access', async () => {
    const { getTrace } = await import('./trace.service.js');
    vi.mocked(getTrace).mockRejectedValueOnce(
      Object.assign(new Error('Trace not found'), { code: 'NOT_FOUND' }),
    );

    const authHeaders = await getTokenHeader();
    const { status } = await request(app, 'GET', `/agents/${AGENT_ID}/traces/${TRACE_ID}`, {
      headers: authHeaders,
    });

    expect(status).toBe(404);
  });
});
